// AI Text Lookup - Content Script
// Handles text selection, popup trigger, and dialogue box rendering

(function () {
  "use strict";

  // ============================================
  // CONSTANTS & STATE
  // ============================================

  const POPUP_ID = "ai-lookup-popup-trigger";
  const DIALOG_ID = "ai-lookup-dialog-box";
  const Z_INDEX = 2147483647;
  const POPUP_OFFSET = 8;
  const DEBOUNCE_DELAY = 150;

  let currentPopup = null;
  let currentDialog = null;
  let selectionRect = null;
  let debounceTimer = null;

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Creates a DOM element with inline styles
   */
  function createElement(tag, styles = {}, attributes = {}) {
    const element = document.createElement(tag);
    Object.assign(element.style, styles);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "textContent") {
        element.textContent = value;
      } else if (key === "innerHTML") {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    return element;
  }

  /**
   * Gets the bounding rect of the current selection
   */
  function getSelectionRect() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      return null;
    }

    return {
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      right: rect.right + window.scrollX,
      width: rect.width,
      height: rect.height,
      viewportTop: rect.top,
      viewportBottom: rect.bottom,
    };
  }

  /**
   * Gets the selected text
   */
  function getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : "";
  }

  /**
   * Removes an element from DOM if it exists
   */
  function removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  // ============================================
  // POPUP (SMALL TRIGGER BUTTON)
  // ============================================

  /**
   * Creates the small popup trigger button with wand icon and Ask AI button
   */
  function createPopup(rect) {
    const popup = createElement(
      "div",
      {
        position: "absolute",
        zIndex: Z_INDEX,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0",
        padding: "2px",
        backgroundColor: "#181822",
        color: "#ffffff",
        fontSize: "12px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontWeight: "500",
        borderRadius: "20px",
        boxShadow:
          "0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)",
        userSelect: "none",
        transition:
          "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease",
        opacity: "0",
        transform: "scale(0.9)",
        whiteSpace: "nowrap",
      },
      {
        id: POPUP_ID,
        role: "group",
        "aria-label": "AI actions for selected text",
      }
    );

    // Magic wand icon - using the wand.svg file from assets
    const wandIconUrl = chrome.runtime.getURL("assets/images/wand.svg");
    const wandImg = `<img src="${wandIconUrl}" style="width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; display: block; margin: 0; padding: 0; border: none; background: none;" alt="Explain" />`;

    // Wand button (auto-explain)
    const wandButton = createElement(
      "button",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "30px",
        padding: "0",
        margin: "0",
        appearance: "none",
        background: "transparent",
        border: "none",
        color: "#ffffff",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        borderRadius: "20px 0 0 20px",
      },
      {
        type: "button",
        "aria-label": "Auto-explain selected text",
        innerHTML: wandImg,
      }
    );

    wandButton.addEventListener("mouseenter", () => {
      wandButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });

    wandButton.addEventListener("mouseleave", () => {
      wandButton.style.backgroundColor = "transparent";
    });

    wandButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlePopupClick(); // Uses the default auto-explain prompt
    });

    // Separator
    const separator = createElement(
      "span",
      {
        color: "rgba(255, 255, 255, 0.3)",
        fontSize: "14px",
        padding: "0 2px",
        userSelect: "none",
      },
      { textContent: "|" }
    );

    // Ask AI button (custom question)
    const askButton = createElement(
      "button",
      {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        height: "30px",
        padding: "0 12px",
        background: "transparent",
        border: "none",
        color: "#ffffff",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "500",
        transition: "background-color 0.15s ease",
        borderRadius: "0 20px 20px 0",
      },
      {
        type: "button",
        "aria-label": "Ask AI a custom question",
        textContent: "Ask AI",
      }
    );

    askButton.addEventListener("mouseenter", () => {
      askButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    });

    askButton.addEventListener("mouseleave", () => {
      askButton.style.backgroundColor = "transparent";
    });

    askButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAskAIClick(); // Opens custom question dialog
    });

    popup.appendChild(wandButton);
    popup.appendChild(separator);
    popup.appendChild(askButton);

    // Position the popup
    positionPopup(popup, rect);

    document.body.appendChild(popup);

    // Fade in animation
    requestAnimationFrame(() => {
      popup.style.opacity = "1";
      popup.style.transform = "scale(1)";
    });

    return popup;
  }

  /**
   * Positions the popup relative to selection
   */
  function positionPopup(popup, rect) {
    const popupHeight = 32;
    const viewportHeight = window.innerHeight;

    // Prefer positioning above the selection
    let top = rect.top - popupHeight - POPUP_OFFSET;

    // If not enough space above, position below
    if (rect.viewportTop < popupHeight + POPUP_OFFSET + 10) {
      top = rect.bottom + POPUP_OFFSET;
    }

    // Center horizontally on selection
    const left = rect.left + rect.width / 2;

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.transform = "translateX(-50%) scale(1)";
  }

  /**
   * Removes the popup
   */
  function removePopup() {
    if (currentPopup) {
      currentPopup.style.opacity = "0";
      currentPopup.style.transform = "translateX(-50%) scale(0.9)";
      setTimeout(() => {
        removeElement(currentPopup);
        currentPopup = null;
      }, 150);
    }
  }

  // ============================================
  // DIALOG BOX (AI RESPONSE)
  // ============================================

  /**
   * Creates the dialogue box matching the screenshot design
   */
  function createDialogBox(rect, selectedText) {
    const dialog = createElement(
      "div",
      {
        position: "absolute",
        zIndex: Z_INDEX,
        width: "500px",
        maxWidth: "calc(100vw - 40px)",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow:
          "0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: "hidden",
        opacity: "0",
        transform: "translateY(-10px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      },
      {
        id: DIALOG_ID,
        role: "dialog",
        "aria-label": "AI Response",
      }
    );

    // Header section
    const header = createElement("div", {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 16px 12px 16px",
      borderBottom: "none",
    });

    // Title container
    const titleContainer = createElement("div", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    // Format the selected text as title (truncated if needed)
    const displayText = formatDisplayText(selectedText);
    const titleText = createElement(
      "span",
      {
        fontSize: "18px",
        fontWeight: "600",
        color: "#1a1a1a",
        lineHeight: "1.3",
      },
      { textContent: displayText }
    );

    titleContainer.appendChild(titleText);

    // Close button (X)
    const closeButton = createElement(
      "button",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        padding: "0",
        margin: "0",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "#999999",
        borderRadius: "4px",
        transition: "color 0.15s ease, background-color 0.15s ease",
      },
      {
        type: "button",
        "aria-label": "Close",
        innerHTML: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`,
      }
    );

    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.color = "#333333";
      closeButton.style.backgroundColor = "#f0f0f0";
    });

    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.color = "#999999";
      closeButton.style.backgroundColor = "transparent";
    });

    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeDialog();
    });

    header.appendChild(titleContainer);
    header.appendChild(closeButton);

    // Content section (AI response)
    const content = createElement(
      "div",
      {
        padding: "0 16px 12px 16px",
        fontSize: "14px",
        lineHeight: "1.6",
        color: "#444444",
        maxHeight: "400px",
        overflowY: "auto",
        paddingRight: "15px",
      },
      {
        id: "ai-lookup-content",
      }
    );

    // Loading state
    content.innerHTML = createLoadingSpinner();

    // Footer section (More link)
    const footer = createElement("div", {
      display: "flex",
      justifyContent: "flex-end",
      padding: "8px 16px 14px 16px",
      borderTop: "none",
    });

    const moreLink = createElement(
      "a",
      {
        fontSize: "13px",
        color: "#1a73e8",
        textDecoration: "none",
        cursor: "pointer",
        fontWeight: "500",
        transition: "color 0.15s ease",
      },
      {
        textContent: "More »",
        href: "#",
      }
    );

    moreLink.addEventListener("mouseenter", () => {
      moreLink.style.color = "#1557b0";
    });

    moreLink.addEventListener("mouseleave", () => {
      moreLink.style.color = "#1a73e8";
    });

    moreLink.addEventListener("click", (e) => {
      e.preventDefault();
      // Open search in new tab
      const searchQuery = encodeURIComponent(selectedText);
      window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
    });

    footer.appendChild(moreLink);

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(content);
    dialog.appendChild(footer);

    // Position the dialog
    positionDialog(dialog, rect);

    document.body.appendChild(dialog);

    // Fade in animation
    requestAnimationFrame(() => {
      dialog.style.opacity = "1";
      dialog.style.transform = "translateY(0)";
    });

    return dialog;
  }

  /**
   * Formats the selected text for display (truncates to max 5 words)
   */
  function formatDisplayText(text) {
    const words = text.split(/\s+/);
    if (words.length > 5) {
      return words.slice(0, 5).join(" ") + "...";
    }
    return text;
  }

  /**
   * Creates loading spinner HTML
   */
  function createLoadingSpinner() {
    return `
      <div style="display: flex; align-items: center; gap: 8px; color: #666666;">
        <div style="
          width: 16px;
          height: 16px;
          border: 2px solid #e0e0e0;
          border-top-color: #1a73e8;
          border-radius: 50%;
          animation: ai-lookup-spin 0.8s linear infinite;
        "></div>
        <span>Getting AI response...</span>
      </div>
      <style>
        @keyframes ai-lookup-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * Positions the dialog relative to selection
   */
  function positionDialog(dialog, rect) {
    const dialogHeight = 180; // Approximate height
    const dialogWidth = 320;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Prefer positioning below the selection
    let top = rect.bottom + POPUP_OFFSET;

    // If not enough space below, position above
    if (rect.viewportBottom + dialogHeight + POPUP_OFFSET > viewportHeight) {
      top = rect.top - dialogHeight - POPUP_OFFSET;
    }

    // Position horizontally - prefer left-aligned with selection start
    let left = rect.left;

    // Ensure dialog doesn't go off-screen right
    if (left + dialogWidth > viewportWidth + window.scrollX - 20) {
      left = viewportWidth + window.scrollX - dialogWidth - 20;
    }

    // Ensure dialog doesn't go off-screen left
    if (left < window.scrollX + 20) {
      left = window.scrollX + 20;
    }

    dialog.style.top = `${top}px`;
    dialog.style.left = `${left}px`;
  }

  /**
   * Simple markdown to HTML converter
   */
  function parseMarkdown(text) {
    return (
      text
        // Escape HTML first
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<strong>$1</strong>")
        // Italic: *text* or _text_
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>")
        // Code: `text`
        .replace(
          /`(.+?)`/g,
          '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>'
        )
        // Line breaks
        .replace(/\n/g, "<br>")
    );
  }

  /**
   * Updates the dialog content with AI response
   */
  function updateDialogContent(content, isError = false) {
    const contentEl = document.getElementById("ai-lookup-content");
    if (!contentEl) return;

    if (isError) {
      contentEl.innerHTML = `
        <div style="color: #d32f2f; display: flex; align-items: flex-start; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>${escapeHtml(content)}</span>
        </div>
      `;
    } else {
      contentEl.innerHTML = parseMarkdown(content);
    }
  }

  /**
   * Escapes HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Removes the dialog
   */
  function removeDialog() {
    if (currentDialog) {
      currentDialog.style.opacity = "0";
      currentDialog.style.transform = "translateY(-10px)";
      setTimeout(() => {
        removeElement(currentDialog);
        currentDialog = null;
      }, 200);
    }
  }

  // ============================================
  // MAIN HANDLERS
  // ============================================

  /**
   * Handles popup click - triggers AI lookup
   */
  function handlePopupClick() {
    const selectedText = getSelectedText();
    const rect = selectionRect;

    if (!selectedText || !rect) {
      removePopup();
      return;
    }

    // Remove popup
    removePopup();

    // Create dialog
    currentDialog = createDialogBox(rect, selectedText);

    // Request AI response
    chrome.runtime.sendMessage(
      { type: "AI_QUERY", text: selectedText },
      (response) => {
        if (chrome.runtime.lastError) {
          updateDialogContent(
            "Failed to connect to extension. Please try again.",
            true
          );
          return;
        }

        if (response && response.success) {
          updateDialogContent(response.response);
        } else {
          updateDialogContent(
            response?.error || "Failed to get AI response",
            true
          );
        }
      }
    );
  }

  /**
   * Handles Ask AI click - opens dialog with custom question input
   */
  function handleAskAIClick() {
    const selectedText = getSelectedText();
    const rect = selectionRect;

    if (!selectedText || !rect) {
      removePopup();
      return;
    }

    // Remove popup
    removePopup();

    // Create dialog with input
    currentDialog = createAskAIDialogBox(rect, selectedText);
  }

  /**
   * Creates a dialog box with a text input for custom questions
   */
  function createAskAIDialogBox(rect, selectedText) {
    const dialog = createElement(
      "div",
      {
        position: "absolute",
        zIndex: Z_INDEX,
        width: "500px",
        maxWidth: "calc(100vw - 40px)",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow:
          "0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: "hidden",
        opacity: "0",
        transform: "translateY(-10px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      },
      {
        id: DIALOG_ID,
        role: "dialog",
        "aria-label": "Ask AI",
      }
    );

    // Header section
    const header = createElement("div", {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 16px 12px 16px",
      borderBottom: "none",
    });

    // Title container
    const titleContainer = createElement("div", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    const displayText = formatDisplayText(selectedText);
    const titleText = createElement(
      "span",
      {
        fontSize: "18px",
        fontWeight: "600",
        color: "#1a1a1a",
        lineHeight: "1.3",
      },
      { textContent: `Ask about: ${displayText}` }
    );

    titleContainer.appendChild(titleText);

    // Close button (X)
    const closeButton = createElement(
      "button",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "24px",
        height: "24px",
        padding: "0",
        margin: "0",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "#999999",
        borderRadius: "4px",
        transition: "color 0.15s ease, background-color 0.15s ease",
      },
      {
        type: "button",
        "aria-label": "Close",
        innerHTML: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`,
      }
    );

    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.color = "#333333";
      closeButton.style.backgroundColor = "#f0f0f0";
    });

    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.color = "#999999";
      closeButton.style.backgroundColor = "transparent";
    });

    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeDialog();
    });

    header.appendChild(titleContainer);
    header.appendChild(closeButton);

    // Input section
    const inputSection = createElement("div", {
      padding: "0 16px 12px 16px",
    });

    const inputWrapper = createElement("div", {
      display: "flex",
      gap: "8px",
    });

    const textInput = createElement(
      "input",
      {
        flex: "1",
        padding: "10px 12px",
        fontSize: "14px",
        color: "#1b1a1aff",
        backgroundColor: "#ffffff",
        border: "1px solid #e0e0e0",
        borderRadius: "6px",
        outline: "none",
        fontFamily: "inherit",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      },
      {
        type: "text",
        placeholder: "Ask a question about the selected text...",
        id: "ai-lookup-question-input",
      }
    );

    textInput.addEventListener("focus", () => {
      textInput.style.borderColor = "#1a73e8";
      textInput.style.boxShadow = "0 0 0 2px rgba(26, 115, 232, 0.2)";
    });

    textInput.addEventListener("blur", () => {
      textInput.style.borderColor = "#e0e0e0";
      textInput.style.boxShadow = "none";
    });

    const submitButton = createElement(
      "button",
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 16px",
        backgroundColor: "#1a73e8",
        color: "#ffffff",
        border: "none",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        whiteSpace: "nowrap",
      },
      {
        type: "button",
        textContent: "Ask",
      }
    );

    submitButton.addEventListener("mouseenter", () => {
      submitButton.style.backgroundColor = "#1557b0";
    });

    submitButton.addEventListener("mouseleave", () => {
      submitButton.style.backgroundColor = "#1a73e8";
    });

    const submitQuestion = () => {
      const question = textInput.value.trim();
      if (!question) return;

      // Replace input section with loading/response
      inputSection.innerHTML = "";
      const content = createElement(
        "div",
        {
          fontSize: "14px",
          lineHeight: "1.6",
          color: "#444444",
          maxHeight: "400px",
          overflowY: "auto",
          paddingRight: "15px",
        },
        { id: "ai-lookup-content" }
      );
      content.innerHTML = createLoadingSpinner();
      inputSection.appendChild(content);

      // Send custom question to AI
      chrome.runtime.sendMessage(
        { type: "AI_QUERY_CUSTOM", text: selectedText, question: question },
        (response) => {
          if (chrome.runtime.lastError) {
            updateDialogContent(
              "Failed to connect to extension. Please try again.",
              true
            );
            return;
          }

          if (response && response.success) {
            updateDialogContent(response.response);
          } else {
            updateDialogContent(
              response?.error || "Failed to get AI response",
              true
            );
          }

          // Show the footer after response
          const footerEl = document.getElementById("ai-lookup-footer");
          if (footerEl) {
            footerEl.style.display = "flex";
          }
        }
      );
    };

    submitButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      submitQuestion();
    });

    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitQuestion();
      }
    });

    inputWrapper.appendChild(textInput);
    inputWrapper.appendChild(submitButton);
    inputSection.appendChild(inputWrapper);

    // Footer section (hidden initially, shown after response)
    const footer = createElement(
      "div",
      {
        display: "none",
        justifyContent: "flex-end",
        padding: "8px 16px 14px 16px",
        borderTop: "none",
      },
      { id: "ai-lookup-footer" }
    );

    const moreLink = createElement(
      "a",
      {
        fontSize: "13px",
        color: "#1a73e8",
        textDecoration: "none",
        cursor: "pointer",
        fontWeight: "500",
        transition: "color 0.15s ease",
      },
      {
        textContent: "More »",
        href: "#",
      }
    );

    moreLink.addEventListener("mouseenter", () => {
      moreLink.style.color = "#1557b0";
    });

    moreLink.addEventListener("mouseleave", () => {
      moreLink.style.color = "#1a73e8";
    });

    moreLink.addEventListener("click", (e) => {
      e.preventDefault();
      const searchQuery = encodeURIComponent(selectedText);
      window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
    });

    footer.appendChild(moreLink);

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(inputSection);
    dialog.appendChild(footer);

    // Position the dialog
    positionDialog(dialog, rect);

    document.body.appendChild(dialog);

    // Fade in animation
    requestAnimationFrame(() => {
      dialog.style.opacity = "1";
      dialog.style.transform = "translateY(0)";
    });

    // Focus the input after animation
    setTimeout(() => {
      textInput.focus();
    }, 200);

    return dialog;
  }

  /**
   * Handles text selection
   */
  function handleSelection() {
    // Clear any existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      const selectedText = getSelectedText();
      const rect = getSelectionRect();

      // Remove existing popup first
      removePopup();

      // Don't show popup if there's an active dialog
      if (currentDialog) {
        return;
      }

      // Show popup only if text is selected
      if (selectedText && selectedText.length > 0 && rect) {
        selectionRect = rect;
        currentPopup = createPopup(rect);
      }
    }, DEBOUNCE_DELAY);
  }

  /**
   * Cleans up all UI elements
   */
  function cleanup() {
    removePopup();
    removeDialog();
    selectionRect = null;
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  // Text selection
  document.addEventListener("mouseup", (e) => {
    // Don't trigger if clicking on our UI elements
    if (e.target.closest(`#${POPUP_ID}`) || e.target.closest(`#${DIALOG_ID}`)) {
      return;
    }
    handleSelection();
  });

  // Click outside to close
  document.addEventListener("mousedown", (e) => {
    const clickedPopup = e.target.closest(`#${POPUP_ID}`);
    const clickedDialog = e.target.closest(`#${DIALOG_ID}`);

    if (!clickedPopup && currentPopup) {
      removePopup();
    }

    if (!clickedDialog && currentDialog) {
      removeDialog();
    }
  });

  // Scroll to close popup (dialog stays)
  window.addEventListener(
    "scroll",
    () => {
      removePopup();
    },
    { passive: true }
  );

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      cleanup();
    }
  });

  // Handle visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      removePopup();
    }
  });

  // Log initialization
  console.log("[AI Text Lookup] Content script loaded");
})();
