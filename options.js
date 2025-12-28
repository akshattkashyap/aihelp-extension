// Options page script - handles saving/loading API key

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Load existing settings
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Save settings
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      status.textContent = "Please enter an API key";
      status.className = "status error";
      return;
    }

    // Reset status while saving
    status.textContent = "Saving...";
    status.className = "status";

    chrome.storage.sync.set(
      { geminiApiKey: apiKey },
      () => {
        if (chrome.runtime.lastError) {
          status.textContent =
            chrome.runtime.lastError.message || "Failed to save API key";
          status.className = "status error";
          return;
        }

        status.textContent = "✓ API key saved";
        status.className = "status success";

        // Hide after 3 seconds
        setTimeout(() => {
          status.className = "status";
          status.textContent = "";
        }, 3000);
      }
    );
  });
});
