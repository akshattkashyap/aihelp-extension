// Options page script - handles saving/loading API key and model

document.addEventListener("DOMContentLoaded", () => {
  const modelSelect = document.getElementById("model");
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Load existing settings
  chrome.storage.sync.get(["geminiApiKey", "geminiModel"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
    if (result.geminiModel) {
      modelSelect.value = result.geminiModel;
    }
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;

    if (!apiKey) {
      status.textContent = "Please enter an API key";
      status.className = "status error";
      return;
    }

    if (!apiKey.startsWith("AIza")) {
      status.textContent = 'Invalid API key format. Should start with "AIza"';
      status.className = "status error";
      return;
    }

    chrome.storage.sync.set(
      { geminiApiKey: apiKey, geminiModel: model },
      () => {
        status.textContent = `✓ Settings saved! Using ${model}`;
        status.className = "status success";

        // Hide after 3 seconds
        setTimeout(() => {
          status.className = "status";
        }, 3000);
      }
    );
  });
});
