document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const text = urlParams.get("text");

  if (!text) {
    updateDialogContent("Error: No text provided.", true);
    document.getElementById("titleText").textContent = "Error";
    return;
  }

  // Set title
  document.getElementById("titleText").textContent = formatDisplayText(text);

  // Set up "More" link
  document.getElementById("moreLink").addEventListener("click", (e) => {
    e.preventDefault();
    const searchQuery = encodeURIComponent(text);
    window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
  });

  // Fetch AI explanation
  chrome.runtime.sendMessage(
    { type: "AI_QUERY", text: text },
    (response) => {
      if (chrome.runtime.lastError) {
        updateDialogContent(
          "Error: " + chrome.runtime.lastError.message,
          true
        );
        return;
      }

      if (response && response.success) {
        updateDialogContent(response.response);
      } else {
        updateDialogContent(
          response?.error || "An unknown error occurred.",
          true
        );
      }
    }
  );
});

function formatDisplayText(text) {
  const words = text.split(/\s+/);
  if (words.length > 5) {
    return words.slice(0, 5).join(" ") + "...";
  }
  return text;
}

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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Markdown parser matched with content.js
function parseMarkdown(text) {
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inlineFmt(line) {
    return line
      .replace(
        /`(.+?)`/g,
        '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>',
      )
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");
  }

  function isTableRow(line) {
    return /^\|.*\|$/.test(line.trim());
  }

  function isTableSeparator(line) {
    return /^\|[\s\-:|]+\|$/.test(line.trim());
  }

  function parseCells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  }

  const lines = text.split("\n");
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    if (isTableRow(trimmed)) {
      const tableRows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        tableRows.push(lines[i].trim());
        i++;
      }

      if (tableRows.length >= 2) {
        html.push('<table style="border-collapse:collapse;margin:10px 0;width:100%;font-size:13px;">');
        const headerCells = parseCells(tableRows[0]);
        html.push("<thead><tr>");
        for (const cell of headerCells) {
          html.push(`<th style="border:1px solid #ddd;padding:8px 10px;background:#f5f5f5;font-weight:600;text-align:left;color:#1a1a1a;">${inlineFmt(esc(cell))}</th>`);
        }
        html.push("</tr></thead>");

        let bodyStart = 1;
        if (tableRows.length > 1 && isTableSeparator(tableRows[1])) {
          bodyStart = 2;
        }

        if (bodyStart < tableRows.length) {
          html.push("<tbody>");
          for (let r = bodyStart; r < tableRows.length; r++) {
            if (isTableSeparator(tableRows[r])) continue;
            const cells = parseCells(tableRows[r]);
            html.push("<tr>");
            for (const cell of cells) {
              html.push(`<td style="border:1px solid #ddd;padding:8px 10px;color:#444444;">${inlineFmt(esc(cell))}</td>`);
            }
            html.push("</tr>");
          }
          html.push("</tbody>");
        }
        html.push("</table>");
      } else {
        html.push(`<p style="margin:8px 0;line-height:1.6;">${inlineFmt(esc(tableRows[0]))}</p>`);
      }
      continue;
    }

    if (/^[-*_]{3,}\s*$/.test(trimmed)) {
      html.push('<hr style="border:none;border-top:1px solid #e0e0e0;margin:12px 0;">');
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes = { 1: "20px", 2: "17px", 3: "15px" };
      const margins = { 1: "18px 0 8px", 2: "14px 0 6px", 3: "12px 0 4px" };
      html.push(`<h${level} style="font-size:${sizes[level]};font-weight:600;color:#1a1a1a;margin:${margins[level]};line-height:1.3;">${inlineFmt(esc(headingMatch[2]))}</h${level}>`);
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      html.push('<ol style="margin:8px 0;padding-left:24px;color:#444444;">');
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^\d+\.\s+/, "");
        html.push(`<li style="margin:4px 0;">${inlineFmt(esc(content))}</li>`);
        i++;
      }
      html.push("</ol>");
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      html.push('<ul style="margin:8px 0;padding-left:24px;color:#444444;">');
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const content = lines[i].trim().replace(/^[-*]\s+/, "");
        html.push(`<li style="margin:4px 0;">${inlineFmt(esc(content))}</li>`);
        i++;
      }
      html.push("</ul>");
      continue;
    }

    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*_]{3,}\s*$/.test(lines[i].trim()) &&
      !/^#{1,3}\s/.test(lines[i].trim()) &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !isTableRow(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      html.push(`<p style="margin:8px 0;line-height:1.6;">${inlineFmt(esc(paraLines.join(" ")))}</p>`);
    }
  }

  return html.join("");
}
