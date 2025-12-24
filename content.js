// AI Text Lookup - Content Script
// Handles text selection, popup trigger, and dialogue box rendering

(function() {
  'use strict';

  // ============================================
  // CONSTANTS & STATE
  // ============================================
  
  const POPUP_ID = 'ai-lookup-popup-trigger';
  const DIALOG_ID = 'ai-lookup-dialog-box';
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
      if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'innerHTML') {
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
      viewportBottom: rect.bottom
    };
  }

  /**
   * Gets the selected text
   */
  function getSelectedText() {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
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
   * Creates the small popup trigger button
   */
  function createPopup(rect) {
    const popup = createElement('div', {
      position: 'absolute',
      zIndex: Z_INDEX,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '6px 12px',
      backgroundColor: '#1a1a2e',
      color: '#ffffff',
      fontSize: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontWeight: '500',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease',
      opacity: '0',
      transform: 'scale(0.9)',
      whiteSpace: 'nowrap'
    }, {
      id: POPUP_ID,
      role: 'button',
      'aria-label': 'Ask AI about selected text'
    });

    // Sparkle/AI icon SVG
    const iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
    </svg>`;

    popup.innerHTML = iconSvg + '<span>Ask AI</span>';

    // Hover effects
    popup.addEventListener('mouseenter', () => {
      popup.style.transform = 'scale(1.05)';
      popup.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3), 0 3px 6px rgba(0, 0, 0, 0.2)';
    });

    popup.addEventListener('mouseleave', () => {
      popup.style.transform = 'scale(1)';
      popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)';
    });

    // Click handler
    popup.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlePopupClick();
    });

    // Position the popup
    positionPopup(popup, rect);

    document.body.appendChild(popup);

    // Fade in animation
    requestAnimationFrame(() => {
      popup.style.opacity = '1';
      popup.style.transform = 'scale(1)';
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
    const left = rect.left + (rect.width / 2);

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.transform = 'translateX(-50%) scale(1)';
  }

  /**
   * Removes the popup
   */
  function removePopup() {
    if (currentPopup) {
      currentPopup.style.opacity = '0';
      currentPopup.style.transform = 'translateX(-50%) scale(0.9)';
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
    const dialog = createElement('div', {
      position: 'absolute',
      zIndex: Z_INDEX,
      width: '500px',
      maxWidth: 'calc(100vw - 40px)',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflow: 'hidden',
      opacity: '0',
      transform: 'translateY(-10px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease'
    }, {
      id: DIALOG_ID,
      role: 'dialog',
      'aria-label': 'AI Response'
    });

    // Header section
    const header = createElement('div', {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 16px 12px 16px',
      borderBottom: 'none'
    });

    // Title container
    const titleContainer = createElement('div', {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    // Format the selected text as title (truncated if needed)
    const displayText = formatDisplayText(selectedText);
    const titleText = createElement('span', {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a1a1a',
      lineHeight: '1.3'
    }, { textContent: displayText });

    titleContainer.appendChild(titleText);

    // Close button (X)
    const closeButton = createElement('button', {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '24px',
      padding: '0',
      margin: '0',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: '#999999',
      borderRadius: '4px',
      transition: 'color 0.15s ease, background-color 0.15s ease'
    }, {
      type: 'button',
      'aria-label': 'Close',
      innerHTML: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#333333';
      closeButton.style.backgroundColor = '#f0f0f0';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#999999';
      closeButton.style.backgroundColor = 'transparent';
    });

    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeDialog();
    });

    header.appendChild(titleContainer);
    header.appendChild(closeButton);

    // Content section (AI response)
    const content = createElement('div', {
      padding: '0 16px 12px 16px',
      fontSize: '14px',
      lineHeight: '1.6',
      color: '#444444',
      maxHeight: '200px',
      overflowY: 'auto'
    }, {
      id: 'ai-lookup-content'
    });

    // Loading state
    content.innerHTML = createLoadingSpinner();

    // Footer section (More link)
    const footer = createElement('div', {
      display: 'flex',
      justifyContent: 'flex-end',
      padding: '8px 16px 14px 16px',
      borderTop: 'none'
    });

    const moreLink = createElement('a', {
      fontSize: '13px',
      color: '#1a73e8',
      textDecoration: 'none',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'color 0.15s ease'
    }, {
      textContent: 'More »',
      href: '#'
    });

    moreLink.addEventListener('mouseenter', () => {
      moreLink.style.color = '#1557b0';
    });

    moreLink.addEventListener('mouseleave', () => {
      moreLink.style.color = '#1a73e8';
    });

    moreLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open search in new tab
      const searchQuery = encodeURIComponent(selectedText);
      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
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
      dialog.style.opacity = '1';
      dialog.style.transform = 'translateY(0)';
    });

    return dialog;
  }

  /**
   * Formats the selected text for display (truncates to max 5 words)
   */
  function formatDisplayText(text) {
    const words = text.split(/\s+/);
    if (words.length > 5) {
      return words.slice(0, 5).join(' ') + '...';
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
    return text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Code: `text`
      .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  /**
   * Updates the dialog content with AI response
   */
  function updateDialogContent(content, isError = false) {
    const contentEl = document.getElementById('ai-lookup-content');
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Removes the dialog
   */
  function removeDialog() {
    if (currentDialog) {
      currentDialog.style.opacity = '0';
      currentDialog.style.transform = 'translateY(-10px)';
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
      { type: 'AI_QUERY', text: selectedText },
      (response) => {
        if (chrome.runtime.lastError) {
          updateDialogContent('Failed to connect to extension. Please try again.', true);
          return;
        }

        if (response && response.success) {
          updateDialogContent(response.response);
        } else {
          updateDialogContent(response?.error || 'Failed to get AI response', true);
        }
      }
    );
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
  document.addEventListener('mouseup', (e) => {
    // Don't trigger if clicking on our UI elements
    if (e.target.closest(`#${POPUP_ID}`) || e.target.closest(`#${DIALOG_ID}`)) {
      return;
    }
    handleSelection();
  });

  // Click outside to close
  document.addEventListener('mousedown', (e) => {
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
  window.addEventListener('scroll', () => {
    removePopup();
  }, { passive: true });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  });

  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      removePopup();
    }
  });

  // Listen for keyboard shortcut from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'KEYBOARD_SHORTCUT') {
      const selectedText = getSelectedText();
      const rect = getSelectionRect();

      if (selectedText && rect) {
        selectionRect = rect;
        // Remove any existing UI
        removePopup();
        removeDialog();
        // Directly show dialog (skip popup for keyboard shortcut)
        currentDialog = createDialogBox(rect, selectedText);
        
        // Request AI response
        chrome.runtime.sendMessage(
          { type: 'AI_QUERY', text: selectedText },
          (response) => {
            if (chrome.runtime.lastError) {
              updateDialogContent('Failed to connect to extension. Please try again.', true);
              return;
            }

            if (response && response.success) {
              updateDialogContent(response.response);
            } else {
              updateDialogContent(response?.error || 'Failed to get AI response', true);
            }
          }
        );
      }
    }
  });

  // Log initialization
  console.log('[AI Text Lookup] Content script loaded');

})();
