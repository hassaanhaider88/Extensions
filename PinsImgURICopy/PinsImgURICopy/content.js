function getImageUrl(img) {
  const srcset = img.getAttribute("srcset");
  if (!srcset) return img.src;

  const parts = srcset.split(",");
  const last = parts[parts.length - 1].trim();
  return last.split(" ")[0];
}

function injectButtons() {
  const pinCards = document.querySelectorAll('[data-test-id="pin"]');

  pinCards.forEach(card => {
    if (card.querySelector(".copy-img-btn") || card.querySelector(".download-img-btn")) return;

    const img = card.querySelector("img");
    if (!img) return;

    card.style.position = "relative";

    // COPY BUTTON
    const copyBtn = document.createElement("button");
    copyBtn.innerText = "CopyImageURl";
    copyBtn.className = "copy-img-btn";

    // DOWNLOAD BUTTON (with SVG)
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "download-img-btn";

    downloadBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 3v12m0 0l-5-5m5 5l5-5M5 19h14" 
              stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    // Position both buttons
    copyBtn.style.position = "absolute";
    copyBtn.style.top = "8px";
    copyBtn.style.right = "8px";
    copyBtn.style.width = "120px";
    copyBtn.style.padding = "5px 8px";
    copyBtn.style.background = "#E60023";
    copyBtn.style.border = "1px solid #ccc";
    copyBtn.style.borderRadius = "6px";
    copyBtn.style.cursor = "pointer";
    copyBtn.style.fontSize = "12px";
    copyBtn.style.zIndex = 9999;

    downloadBtn.style.position = "absolute";
    downloadBtn.style.bottom = "8px";
    downloadBtn.style.right = "8px";
    downloadBtn.style.width = "32px";
    downloadBtn.style.height = "32px";
    downloadBtn.style.background = "rgba(0,0,0,0.6)";
    downloadBtn.style.borderRadius = "50%";
    downloadBtn.style.display = "flex";
    downloadBtn.style.alignItems = "center";
    downloadBtn.style.justifyContent = "center";
    downloadBtn.style.cursor = "pointer";
    downloadBtn.style.border = "none";
    downloadBtn.style.zIndex = 9999;

    card.appendChild(copyBtn);
    card.appendChild(downloadBtn);

    // COPY URL FUNCTION
    copyBtn.addEventListener("click", () => {
      const url = getImageUrl(img);
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.innerText = "Copied!";
        setTimeout(() => (copyBtn.innerText = "CopyImageURl"), 900);
      });
    });

    // ✅ DOWNLOAD IMAGE FUNCTION
    downloadBtn.addEventListener("click", async () => {
      const url = getImageUrl(img);

      const file = await fetch(url)
        .then(res => res.blob())
        .catch(() => null);

      if (!file) return;

      const ext = file.type.split("/")[1] || "jpg";
      const fileName = `PinsImgURICopireByHMKCodeWeb.${ext}`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.style.display = "none";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  });
}

// Auto observe new content
const observer = new MutationObserver(injectButtons);
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial run
injectButtons();
