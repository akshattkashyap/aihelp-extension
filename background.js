// AI Text Lookup - Background Service Worker
// Handles AI API calls and message passing using Gemini API

/**
 * Gets API key and model from Chrome storage
 */
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['geminiApiKey', 'geminiModel'], (result) => {
      resolve({
        apiKey: result.geminiApiKey || null,
        model: result.geminiModel || 'gemini-2.5-flash' // Default model
      });
    });
  });
}

/**
 * Makes a Gemini API call to get explanation for the selected text
 * @param {string} text - The selected text to explain
 * @returns {Promise<{success: boolean, response?: string, error?: string}>}
 */
async function getAIResponse(text) {
  try {
    const { apiKey, model } = await getSettings();
    
    if (!apiKey) {
      return {
        success: false,
        error: 'API key not configured. Right-click the extension icon → Options to set your API key.'
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a helpful assistant that provides clear, concise explanations. When given a word or phrase, provide a brief definition or explanation. Keep responses under 100 words unless more detail is necessary.\n\nExplain or define: "${text}"`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!aiResponse) {
      throw new Error('No response received from AI');
    }

    return {
      success: true,
      response: aiResponse
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get AI response'
    };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AI_QUERY') {
    const selectedText = request.text;

    if (!selectedText || selectedText.trim().length === 0) {
      sendResponse({
        success: false,
        error: 'No text selected'
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
          error: error.message || 'Unknown error occurred'
        });
      });

    // Return true to indicate async response
    return true;
  }
});
