// popup.js — MapScraper

(function () {
  "use strict";

  let currentData = null;
  let isPretty = true;
  let activeMode = "auto";
  const HISTORY_KEY = "mapscraper_history";

  // ── DOM refs ──
  const extractBtn = document.getElementById("extractBtn");
  const btnLoader  = document.getElementById("btnLoader");
  const btnText    = extractBtn.querySelector(".btn-text");
  const resultArea = document.getElementById("resultArea");
  const jsonPreview= document.getElementById("jsonPreview");
  const resultBadge= document.getElementById("resultBadge");
  const resultType = document.getElementById("resultType");
  const copyBtn    = document.getElementById("copyBtn");
  const downloadBtn= document.getElementById("downloadBtn");
  const clearBtn   = document.getElementById("clearBtn");
  const statusDot  = document.getElementById("statusDot");
  const pageStatus = document.getElementById("pageStatus");
  const statusText = document.getElementById("statusText");
  const historyList= document.getElementById("historyList");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");

  // ── Init ──
  checkCurrentTab();
  loadHistory();

  // ── Tab Check ──
  async function checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      if (tab.url && tab.url.includes("google.com/maps")) {
        setStatus("ok", "◉ Google Maps detected — ready to extract");
        statusDot.className = "status-dot ok";
      } else {
        setStatus("warn", "⚠ Navigate to google.com/maps first");
        statusDot.className = "status-dot warn";
        extractBtn.disabled = true;
        extractBtn.style.opacity = "0.5";
        extractBtn.style.cursor = "not-allowed";
      }
    } catch (e) {
      setStatus("error", "✕ Cannot access current tab");
      statusDot.className = "status-dot error";
    }
  }

  function setStatus(type, text) {
    pageStatus.className = "page-status " + type;
    statusText.textContent = text;
  }

  // ── Mode toggles ──
  document.querySelectorAll(".toggle-btn[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".toggle-btn[data-mode]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeMode = btn.dataset.mode;
    });
  });

  document.querySelectorAll(".toggle-btn[data-fmt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".toggle-btn[data-fmt]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      isPretty = btn.dataset.fmt === "pretty";
      if (currentData) renderJSON(currentData);
    });
  });

  // ── Extract ──
  extractBtn.addEventListener("click", async () => {
    setLoading(true);
    removeError();

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("No active tab found.");

      // Inject content script if needed
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      }).catch(() => {}); // may already be injected — ignore error

      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: "extract" }, (resp) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp);
          }
        });
      });

      if (!response || !response.success) {
        throw new Error(response?.error || "Extraction failed. Try reloading the Maps page.");
      }

      currentData = response.result;
      renderJSON(currentData);
      showResult(currentData);
      saveToHistory(currentData, tab.url);
      setStatus("ok", `◉ Extracted ${currentData.count} record(s)`);

    } catch (err) {
      showError(err.message);
      setStatus("error", "✕ " + err.message.substring(0, 60));
    } finally {
      setLoading(false);
    }
  });

  // ── Render JSON with syntax highlighting ──
  function renderJSON(data) {
    const raw = isPretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    jsonPreview.innerHTML = syntaxHighlight(raw);
  }

  function syntaxHighlight(json) {
    return json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\]])/g,
        (match) => {
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              return `<span class="json-key">${match}</span>`;
            }
            return `<span class="json-string">${match}</span>`;
          }
          if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
          if (/null/.test(match)) return `<span class="json-null">${match}</span>`;
          if (/[{}\[\]]/.test(match)) return `<span class="json-brace">${match}</span>`;
          return `<span class="json-number">${match}</span>`;
        }
      );
  }

  function showResult(data) {
    const count = data.count || 0;
    const type  = data.type === "search_results" ? "search results" : "place detail";
    resultBadge.textContent = `${count} record${count !== 1 ? "s" : ""}`;
    resultType.textContent  = type;
    resultArea.style.display = "block";
    // Remove existing error
    removeError();
  }

  // ── Copy ──
  copyBtn.addEventListener("click", async () => {
    if (!currentData) return;
    const raw = isPretty
      ? JSON.stringify(currentData, null, 2)
      : JSON.stringify(currentData);
    try {
      await navigator.clipboard.writeText(raw);
      copyBtn.classList.add("copied");
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      showToast("✓ Copied to clipboard");
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      }, 2000);
    } catch (e) {
      showToast("✕ Clipboard error");
    }
  });

  // ── Download ──
  downloadBtn.addEventListener("click", () => {
    if (!currentData) return;
    const raw = isPretty
      ? JSON.stringify(currentData, null, 2)
      : JSON.stringify(currentData);
    const blob = new Blob([raw], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const ts   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href     = url;
    a.download = `maps_data_${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("↓ Download started");
  });

  // ── Clear result ──
  clearBtn.addEventListener("click", () => {
    currentData = null;
    resultArea.style.display = "none";
    jsonPreview.innerHTML = "";
  });

  // ── Loading state ──
  function setLoading(state) {
    if (state) {
      extractBtn.classList.add("loading");
      btnText.textContent = "Extracting…";
    } else {
      extractBtn.classList.remove("loading");
      btnText.textContent = "Extract Data";
    }
  }

  // ── Error display ──
  function showError(msg) {
    removeError();
    const box = document.createElement("div");
    box.className = "error-box";
    box.id = "errorBox";
    box.innerHTML = `<strong>Extraction Error</strong>${escapeHtml(msg)}`;
    extractBtn.insertAdjacentElement("afterend", box);
  }

  function removeError() {
    document.getElementById("errorBox")?.remove();
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Toast ──
  function showToast(msg) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // ── History ──
  function saveToHistory(data, url) {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
      const history = result[HISTORY_KEY] || [];
      const entry = {
        id: Date.now(),
        url,
        count: data.count,
        type: data.type,
        timestamp: new Date().toISOString(),
        preview: getPreviewTitle(data),
        data,
      };
      history.unshift(entry);
      const trimmed = history.slice(0, 10); // keep last 10
      chrome.storage.local.set({ [HISTORY_KEY]: trimmed }, () => {
        renderHistory(trimmed);
      });
    });
  }

  function getPreviewTitle(data) {
    if (data.type === "place_detail" && data.data?.name) {
      return data.data.name;
    }
    if (data.type === "search_results" && data.data?.length) {
      return data.data[0]?.name || "Search results";
    }
    return "Unknown";
  }

  function loadHistory() {
    chrome.storage.local.get([HISTORY_KEY], (result) => {
      const history = result[HISTORY_KEY] || [];
      renderHistory(history);
    });
  }

  function renderHistory(history) {
    historyList.innerHTML = "";
    if (!history.length) {
      historyList.innerHTML = `<div class="history-empty">No extractions yet</div>`;
      return;
    }
    history.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";
      const relTime = getRelTime(entry.timestamp);
      const typeLabel = entry.type === "search_results" ? "search" : "detail";
      item.innerHTML = `
        <div class="history-info">
          <div class="history-title">${escapeHtml(entry.preview)}</div>
          <div class="history-meta">${entry.count} record(s) · ${typeLabel} · ${relTime}</div>
        </div>
        <div class="history-actions">
          <button class="history-btn" data-action="load" data-id="${entry.id}">Load</button>
          <button class="history-btn" data-action="dl" data-id="${entry.id}">↓</button>
        </div>
      `;
      historyList.appendChild(item);

      // Load button
      item.querySelector('[data-action="load"]').addEventListener("click", (e) => {
        e.stopPropagation();
        currentData = entry.data;
        renderJSON(currentData);
        showResult(currentData);
        showToast("Loaded from history");
      });

      // Download button
      item.querySelector('[data-action="dl"]').addEventListener("click", (e) => {
        e.stopPropagation();
        const raw = JSON.stringify(entry.data, null, 2);
        const blob = new Blob([raw], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        const ts   = entry.timestamp.replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        a.download = `maps_data_${ts}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("↓ Download started");
      });
    });
  }

  clearHistoryBtn.addEventListener("click", () => {
    chrome.storage.local.set({ [HISTORY_KEY]: [] }, () => {
      renderHistory([]);
      showToast("History cleared");
    });
  });

  function getRelTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
})();