// content.js — MapScraper
// Extracts structured business data from Google Maps listings

(function () {
  "use strict";

  /**
   * Safely query a selector and return text content
   */
  function getText(selector, root = document) {
    const el = root.querySelector(selector);
    return el ? el.textContent.trim() : null;
  }

  function getAttr(selector, attr, root = document) {
    const el = root.querySelector(selector);
    return el ? el.getAttribute(attr) : null;
  }

  /**
   * Extract rating value from aria-label
   * e.g. "4.5 stars 200 Reviews" → { rating: 4.5, reviewCount: 200 }
   */
  function parseRating(ariaLabel) {
    if (!ariaLabel) return { rating: null, reviewCount: null };
    const match = ariaLabel.match(/([\d.]+)\s*stars?\s*([\d,]+)\s*[Rr]eview/);
    if (match) {
      return {
        rating: parseFloat(match[1]),
        reviewCount: parseInt(match[2].replace(/,/g, ""), 10),
      };
    }
    return { rating: null, reviewCount: null };
  }

  /**
   * Extract hours status from the info blocks
   */
  function extractHours() {
    // Look for open/close status
    const openEl = document.querySelector('[style*="color: rgba(25,134,57"]');
    const closedEl = document.querySelector('[style*="color: rgba(209,49,25"]');
    const statusEl = openEl || closedEl;

    if (!statusEl) return null;

    const parentText = statusEl.closest(".W4Efsd")?.textContent?.trim();
    return parentText || statusEl.textContent.trim();
  }

  /**
   * Extract all reviews/featured snippets
   */
  function extractReviews() {
    const reviews = [];
    const snippets = document.querySelectorAll(".ah5Ghc");
    snippets.forEach((el) => {
      const text = el.textContent.trim().replace(/^"|"$/g, "");
      if (text) reviews.push(text);
    });
    return reviews;
  }

  /**
   * Extract multiple listings from search results view
   */
  function extractListings() {
    const cards = document.querySelectorAll('[role="article"]');
    if (!cards.length) return null;

    const results = [];

    cards.forEach((card) => {
      const nameEl = card.querySelector(".qBF1Pd, .fontHeadlineSmall");
      const name = nameEl ? nameEl.textContent.trim() : null;
      if (!name) return;

      // Rating
      const ratingEl = card.querySelector('[role="img"][aria-label*="stars"]');
      const { rating, reviewCount } = parseRating(
        ratingEl?.getAttribute("aria-label")
      );

      // Category & address
      const infoSpans = card.querySelectorAll(".W4Efsd .W4Efsd span span");
      let category = null;
      let address = null;

      if (infoSpans.length > 0) category = infoSpans[0]?.textContent?.trim();
      if (infoSpans.length > 1) address = infoSpans[1]?.textContent?.trim();

      // Phone
      const phone =
        card.querySelector(".UsdlK")?.textContent?.trim() || null;

      // Website
      const websiteEl = card.querySelector('a[data-value="Website"]');
      const website = websiteEl ? websiteEl.getAttribute("href") : null;

      // Hours
      const openEl = card.querySelector('[style*="color: rgba(25,134,57"]');
      const closedEl = card.querySelector('[style*="color: rgba(209,49,25"]');
      let hours = null;
      let isOpen = null;
      if (openEl) {
        isOpen = true;
        const parent = openEl.closest(".W4Efsd");
        hours = parent?.textContent?.trim() || "Open";
      } else if (closedEl) {
        isOpen = false;
        const parent = closedEl.closest(".W4Efsd");
        hours = parent?.textContent?.trim() || "Closed";
      }

      // Featured review
      const reviewEl = card.querySelector(".ah5Ghc span");
      const featuredReview = reviewEl
        ? reviewEl.textContent.trim().replace(/^"|"$/g, "")
        : null;

      // Maps URL from the card link
      const linkEl = card.querySelector("a.hfpxzc");
      const mapsUrl = linkEl ? linkEl.href : null;

      // Coordinates from data-* or URL
      let coordinates = null;
      if (mapsUrl) {
        const coordMatch = mapsUrl.match(/!3d([\d.-]+)!4d([\d.-]+)/);
        if (coordMatch) {
          coordinates = {
            lat: parseFloat(coordMatch[1]),
            lng: parseFloat(coordMatch[2]),
          };
        }
      }

      results.push({
        name,
        rating,
        reviewCount,
        category,
        address,
        phone,
        website,
        isOpen,
        hours,
        featuredReview,
        coordinates,
        mapsUrl,
        extractedAt: new Date().toISOString(),
      });
    });

    return results;
  }

  /**
   * Extract single place detail page data
   */
  function extractPlaceDetail() {
    // Name
    const name =
      document.querySelector("h1")?.textContent?.trim() ||
      getText(".DUwDvf, .fontHeadlineLarge");

    // Rating
    const ratingEl = document.querySelector(
      '[role="img"][aria-label*="stars"]'
    );
    const { rating, reviewCount } = parseRating(
      ratingEl?.getAttribute("aria-label")
    );

    // Address
    const addressEl = document.querySelector(
      '[data-item-id="address"] .Io6YTe, [aria-label*="Address"] .Io6YTe'
    );
    const address = addressEl?.textContent?.trim() || null;

    // Phone
    const phoneEl = document.querySelector(
      '[data-item-id^="phone"] .Io6YTe, [aria-label*="Phone"] .Io6YTe'
    );
    const phone = phoneEl?.textContent?.trim() || null;

    // Website
    const websiteEl = document.querySelector(
      '[data-item-id="authority"] a, [aria-label*="Website"] a'
    );
    const website = websiteEl?.href || null;

    // Category
    const categoryEl = document.querySelector(
      '.DkEaL, [jsaction*="category"] button'
    );
    const category = categoryEl?.textContent?.trim() || null;

    // Hours
    const hoursRows = [];
    document
      .querySelectorAll(".t39EBf .y0skZc, table.WgFkxc tr")
      .forEach((row) => {
        hoursRows.push(row.textContent.trim());
      });

    // Open status
    const openEl = document.querySelector(".dDoNo.tHH2me, .o0Svhf");
    const openStatus = openEl?.textContent?.trim() || null;

    // Coordinates from URL
    let coordinates = null;
    const urlMatch = window.location.href.match(/@([\d.-]+),([\d.-]+)/);
    if (urlMatch) {
      coordinates = {
        lat: parseFloat(urlMatch[1]),
        lng: parseFloat(urlMatch[2]),
      };
    }

    // Reviews
    const reviews = extractReviews();

    // Images
    const images = [];
    document
      .querySelectorAll('button[data-photo-index] img, .Uf0tqf img')
      .forEach((img) => {
        if (img.src && !img.src.includes("gstatic")) images.push(img.src);
      });

    return {
      name,
      rating,
      reviewCount,
      category,
      address,
      phone,
      website,
      openStatus,
      hours: hoursRows.length ? hoursRows : null,
      coordinates,
      reviews: reviews.length ? reviews : null,
      images: images.slice(0, 5),
      mapsUrl: window.location.href,
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Main extraction — detect context and extract accordingly
   */
  function extract() {
    const url = window.location.href;
    const isPlace = url.includes("/place/");
    const isSearch =
      url.includes("/search/") ||
      url.includes("/maps/search/") ||
      document.querySelectorAll('[role="article"]').length > 1;

    if (isSearch) {
      const listings = extractListings();
      return {
        type: "search_results",
        count: listings?.length || 0,
        data: listings,
      };
    } else if (isPlace) {
      return {
        type: "place_detail",
        count: 1,
        data: extractPlaceDetail(),
      };
    } else {
      // Try both
      const listings = extractListings();
      if (listings && listings.length > 0) {
        return {
          type: "search_results",
          count: listings.length,
          data: listings,
        };
      }
      return {
        type: "place_detail",
        count: 1,
        data: extractPlaceDetail(),
      };
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract") {
      try {
        const result = extract();
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true;
  });
})();