// AI Text Lookup - Background Service Worker
// Handles AI API calls and message passing using Gemini API

/**
 * Gets API key and model from Chrome storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["geminiApiKey", "geminiModel"], (result) => {
      resolve({
        apiKey: result.geminiApiKey || null,
        model: result.geminiModel || "gemini-2.5-flash-lite", // Default model
      });
    });
  });
}

/**
 * List of available Gemini models for fallback
 */
const AVAILABLE_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
];

/**
 * Makes a single API call to Gemini with a specific model
 * @param {string} text - The text to explain
 * @param {string} apiKey - The API key
 * @param {string} model - The model to use
 * @returns {Promise<{success: boolean, response?: string, error?: string, statusCode?: number}>}
 */
async function makeAPICall(text, apiKey, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Explain the following text in simple terms (in as much detail as needed depending on the text) as if to a beginner with no background knowledge. Focus only on what the text means. Respond directly with the explanation only, in plain text, concise, with no references to instructions, highlighting, or the act of explaining.\n\n"${text}"`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error?.message ||
          `API request failed with status ${response.status}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!aiResponse) {
      return {
        success: false,
        error: "No response received from AI",
      };
    }

    return {
      success: true,
      response: aiResponse,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error occurred",
    };
  }
}

/**
 * Makes a Gemini API call to get explanation for the selected text
 * Implements fallback to other models if 429 (rate limit) error occurs
 * @param {string} text - The selected text to explain
 * @returns {Promise<{success: boolean, response?: string, error?: string, modelUsed?: string}>}
 */
async function getAIResponse(text) {
  try {
    const { apiKey, model: selectedModel } = await getSettings();

    if (!apiKey) {
      return {
        success: false,
        error:
          "API key not configured. Right-click the extension icon → Options to set your API key.",
      };
    }

    // Try the selected model first
    console.log(`Trying selected model: ${selectedModel}`);
    let result = await makeAPICall(text, apiKey, selectedModel);

    if (result.success) {
      return {
        ...result,
        modelUsed: selectedModel,
      };
    }

    // If we got a 429 error, try other models
    if (result.statusCode === 429) {
      console.log(
        `Rate limit hit on ${selectedModel}, trying fallback models...`
      );

      // Get all models except the one that failed
      const fallbackModels = AVAILABLE_MODELS.filter(
        (m) => m !== selectedModel
      );

      for (const fallbackModel of fallbackModels) {
        console.log(`Trying fallback model: ${fallbackModel}`);
        result = await makeAPICall(text, apiKey, fallbackModel);

        if (result.success) {
          console.log(`Success with fallback model: ${fallbackModel}`);
          return {
            ...result,
            modelUsed: fallbackModel,
          };
        }

        // If this fallback also hit 429, continue to next model
        if (result.statusCode !== 429) {
          // If it's a different error, stop trying and return the error
          break;
        }
      }
    }

    // If all models failed or original error wasn't 429
    console.error("All models failed or non-429 error:", result);
    return {
      success: false,
      error: result.error || "Failed to get AI response",
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      success: false,
      error: error.message || "Failed to get AI response",
    };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "AI_QUERY") {
    const selectedText = request.text;

    if (!selectedText || selectedText.trim().length === 0) {
      sendResponse({
        success: false,
        error: "No text selected",
      });
      return true;
    }

    getAIResponse(selectedText)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || "Unknown error occurred",
        });
      });

    // Return true to indicate async response
    return true;
  }

  if (request.type === "AI_QUERY_CUSTOM") {
    const selectedText = request.text;
    const question = request.question;

    if (!selectedText || selectedText.trim().length === 0) {
      sendResponse({
        success: false,
        error: "No text selected",
      });
      return true;
    }

    if (!question || question.trim().length === 0) {
      sendResponse({
        success: false,
        error: "No question provided",
      });
      return true;
    }

    getCustomAIResponse(selectedText, question)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || "Unknown error occurred",
        });
      });

    // Return true to indicate async response
    return true;
  }
});

/**
 * Makes a single API call to Gemini with a custom prompt
 * @param {string} text - The selected text
 * @param {string} question - The user's question
 * @param {string} apiKey - The API key
 * @param {string} model - The model to use
 * @returns {Promise<{success: boolean, response?: string, error?: string, statusCode?: number}>}
 */
async function makeCustomAPICall(text, question, apiKey, model) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `Given the following text:\n\n"${text}"\n\nAnswer this question about it or Use the following text as Context: ${question}\n\nExplain and give a clear, helpful answer in plain text.`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.error?.message ||
          `API request failed with status ${response.status}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!aiResponse) {
      return {
        success: false,
        error: "No response received from AI",
      };
    }

    return {
      success: true,
      response: aiResponse,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Network error occurred",
    };
  }
}

/**
 * Gets AI response for a custom question about the selected text
 * Implements fallback to other models if 429 (rate limit) error occurs
 * @param {string} text - The selected text
 * @param {string} question - The user's question
 * @returns {Promise<{success: boolean, response?: string, error?: string, modelUsed?: string}>}
 */
async function getCustomAIResponse(text, question) {
  try {
    const { apiKey, model: selectedModel } = await getSettings();

    if (!apiKey) {
      return {
        success: false,
        error:
          "API key not configured. Right-click the extension icon → Options to set your API key.",
      };
    }

    // Try the selected model first
    console.log(`Trying selected model: ${selectedModel}`);
    let result = await makeCustomAPICall(text, question, apiKey, selectedModel);

    if (result.success) {
      return {
        ...result,
        modelUsed: selectedModel,
      };
    }

    // If we got a 429 error, try other models
    if (result.statusCode === 429) {
      console.log(
        `Rate limit hit on ${selectedModel}, trying fallback models...`
      );

      // Get all models except the one that failed
      const fallbackModels = AVAILABLE_MODELS.filter(
        (m) => m !== selectedModel
      );

      for (const fallbackModel of fallbackModels) {
        console.log(`Trying fallback model: ${fallbackModel}`);
        result = await makeCustomAPICall(text, question, apiKey, fallbackModel);

        if (result.success) {
          console.log(`Success with fallback model: ${fallbackModel}`);
          return {
            ...result,
            modelUsed: fallbackModel,
          };
        }

        // If this fallback also hit 429, continue to next model
        if (result.statusCode !== 429) {
          // If it's a different error, stop trying and return the error
          break;
        }
      }
    }

    // If all models failed or original error wasn't 429
    console.error("All models failed or non-429 error:", result);
    return {
      success: false,
      error: result.error || "Failed to get AI response",
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      success: false,
      error: error.message || "Failed to get AI response",
    };
  }
}
