document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");
  const togglePasswordBtn = document.getElementById("togglePasswordBtn");
  const eyeIcon = document.getElementById("eyeIcon");
  const eyeOffIcon = document.getElementById("eyeOffIcon");

  togglePasswordBtn.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      eyeIcon.style.display = "none";
      eyeOffIcon.style.display = "block";
    } else {
      apiKeyInput.type = "password";
      eyeIcon.style.display = "block";
      eyeOffIcon.style.display = "none";
    }
  });

  // Load existing settings
  chrome.storage.sync.get(["groqApiKey"], (result) => {
    if (result.groqApiKey) {
      apiKeyInput.value = result.groqApiKey;
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

    chrome.storage.sync.set({ groqApiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        status.textContent =
          chrome.runtime.lastError.message || "Failed to save API key";
        status.className = "status error";
        return;
      }

      status.textContent = "✓ API key saved";
      status.className = "status success";

      // Hide after 2 seconds
      setTimeout(() => {
        status.className = "status";
        status.textContent = "";
      }, 2000);
    });
  });
});
