function getImageUrl(img) {
  // Pick the highest quality URL available from srcset
  const srcset = img.getAttribute("srcset");
  
  if (!srcset) return img.src;

  const parts = srcset.split(",");
  const last = parts[parts.length - 1].trim();
  const url = last.split(" ")[0];

  return url;
}

function injectButtons() {
  const pinCards = document.querySelectorAll('[data-test-id="pin"]');

  pinCards.forEach(card => {
    if (card.querySelector(".copy-img-btn")) return;

    const img = card.querySelector("img");
    if (!img) return;

    card.style.position = "relative";

    const btn = document.createElement("button");
    btn.innerText = "CopyImageURl";
    btn.className = "copy-img-btn";

    card.appendChild(btn);

    btn.addEventListener("click", () => {
      const url = getImageUrl(img);

      navigator.clipboard.writeText(url).then(() => {
        btn.innerText = "Copied";
        setTimeout(() => btn.innerText = "CopyImageURl", 900);
      });
    });
  });
}

// Observe incoming new pins (Pinterest infinite scroll)
const observer = new MutationObserver(injectButtons);

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial run
injectButtons();
