// AI Text Lookup - Background Service Worker
// Handles AI API calls and message passing

/**
 * Gets API key from Chrome storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["geminiApiKey"], (result) => {
      resolve({
        apiKey: result.geminiApiKey || null,
      });
    });
  });
}

/**
 * Makes a single API call to the configured AI provider
 * @param {string} text - The text to explain
 * @param {string} apiKey - The API key
 * @returns {Promise<{success: boolean, response?: string, error?: string, statusCode?: number}>}
 */
async function makeAPICall(text, apiKey) {
  const endpoint = "https://api.groq.com/openai/v1/chat/completions";

  const prompt =
    "Explain the user's text clearly for a beginner. Respond with the explanation only in plain text. Do not ask questions or request more input.";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: prompt,
          },
          { 
            role: "user", 
            content: text 
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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
    // const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

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
 * Gets an AI response to explain the selected text
 * @param {string} text - The selected text to explain
 * @returns {Promise<{success: boolean, response?: string, error?: string, modelUsed?: string}>}
 */
async function getAIResponse(text) {
  try {
    const { apiKey } = await getSettings();

    if (!apiKey) {
      return {
        success: false,
        error:
          "API key not configured. Right-click the extension icon → Options to set your API key.",
      };
    }

    let result = await makeAPICall(text, apiKey);

    if (result.success) {
      return {
        ...result,
        modelUsed: "llama-3.1-8b-instant",
      };
    }

    // If all models failed or original error wasn't 429
    console.error("Model failed", result);
    return {
      success: false,
      error: result.error || "Failed to get AI response",
    };
  } catch (error) {
    console.error("Groq API Error:", error);
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
 * Makes a single API call with a custom prompt
 * @param {string} text - The selected text
 * @param {string} question - The user's question
 * @param {string} apiKey - The API key
 * @returns {Promise<{success: boolean, response?: string, error?: string, statusCode?: number}>}
 */
async function makeCustomAPICall(text, question, apiKey) {
  const endpoint = "https://api.groq.com/openai/v1/chat/completions";

  const prompt =
    "You will receive a PASSAGE and a FOLLOWUP. The FOLLOWUP may be (a) a direct question about the passage or (b) extra context/instructions for how to explain it. Respond immediately with a helpful answer/explanation that uses the PASSAGE as the main context and respects the FOLLOWUP. If the passage is short, still answer as best you can. Plain text only. Never ask the user to provide the passage/followup and never say you're ready for input.";

  try {

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: prompt,
          },
          { 
            role: "user", 
            content: `PASSAGE:\n${text}\n\nFOLLOWUP (question or context):\n${question}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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
    // const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

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
 * Gets AI response for a custom followup about the selected text
 * @param {string} text - The selected text
 * @param {string} question - The user's question
 * @returns {Promise<{success: boolean, response?: string, error?: string, modelUsed?: string}>}
 */
async function getCustomAIResponse(text, question) {
  try {
    const { apiKey } = await getSettings();

    if (!apiKey) {
      return {
        success: false,
        error:
          "API key not configured. Right-click the extension icon → Options to set your API key.",
      };
    }

    let result = await makeCustomAPICall(text, question, apiKey);

    if (result.success) {
      return {
        ...result,
        modelUsed: "llama-3.1-8b-instant",
      };
    }

    // If all models failed or original error wasn't 429
    console.error("Model failed or non-429 error:", result);
    return {
      success: false,
      error: result.error || "Failed to get AI response",
    };
  } catch (error) {
    console.error("Groq API Error:", error);
    return {
      success: false,
      error: error.message || "Failed to get AI response",
    };
  }
}
