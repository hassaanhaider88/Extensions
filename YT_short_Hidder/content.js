function hideShorts() {
  // Hide Shorts shelf on homepage
  const shortsShelves = document.querySelectorAll('ytd-rich-section-renderer, ytd-reel-shelf-renderer');
  shortsShelves.forEach(el => {
    if (el.innerText.toLowerCase().includes("shorts")) {
      el.style.display = "none";
    }
  });

  // Hide Shorts from sidebar
  const sidebarLinks = document.querySelectorAll('a[href*="/shorts"]');
  sidebarLinks.forEach(link => {
    const parent = link.closest('ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, ytd-compact-link-renderer');
    if (parent) parent.style.display = "none";
  });

  // Hide Shorts from search results
  const searchResults = document.querySelectorAll('ytd-video-renderer, ytd-reel-item-renderer');
  searchResults.forEach(item => {
    const link = item.querySelector('a[href*="/shorts"]');
    if (link) item.style.display = "none";
  });
}

// Run when the page first loads
hideShorts();

// Observe for new content (YouTube dynamically loads it)
const observer = new MutationObserver(hideShorts);
observer.observe(document.body, { childList: true, subtree: true });
