// /**
//  * YouTube Hover Preview — content.js
//  * Manifest V3 · Content-script only · No external APIs
//  *
//  * Features:
//  *  · Hover-triggered iframe preview positioned over thumbnail
//  *  · Mute / Unmute toggle
//  *  · Volume slider (UI state + mute approximation)
//  *  · Playback speed dropdown (UI state; reload-based reload hint)
//  *  · Focus mode on /watch pages: hides recommendations & like/dislike UI
//  *  · MutationObserver for dynamic content
//  *  · Duplicate-binding guard via dataset flags
//  */

// (function () {
//     'use strict';



//     /* ─────────────────────────────────────────────
//        SHOW / DESTROY OVERLAY
//     ───────────────────────────────────────────── */
//     function showOverlay(anchor, videoId) {
//         destroyOverlay(currentOverlay);  // remove any existing

//         const overlay = createOverlay(anchor, videoId);
//         document.body.appendChild(overlay);
//         currentOverlay = overlay;

//         /* fade in */
//         requestAnimationFrame(() => {
//             requestAnimationFrame(() => { overlay.style.opacity = '1'; });
//         });

//         /* keep alive while hovering over the overlay itself */
//         overlay.addEventListener('mouseenter', cancelHideTimer);
//         overlay.addEventListener('mouseleave', scheduleHide);
//     }

//     function destroyOverlay(overlay) {
//         if (!overlay) return;
//         overlay.style.opacity = '0';
//         setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, FADE_DURATION_MS);
//         if (currentOverlay === overlay) currentOverlay = null;
//     }

//     function scheduleHide() {
//         cancelHideTimer();
//         hoverTimer = setTimeout(() => destroyOverlay(currentOverlay), 200);
//     }

//     function cancelHideTimer() {
//         clearTimeout(hoverTimer);
//         hoverTimer = null;
//     }

//     /* ─────────────────────────────────────────────
//        ATTACH HOVER LISTENERS TO A THUMBNAIL ANCHOR
//     ───────────────────────────────────────────── */
//     function bindThumbnail(anchor) {
//         if (anchor.dataset.yhpBound) return;   // guard — prevent double-binding
//         anchor.dataset.yhpBound = '1';

//         let entryTimer = null;

//         anchor.addEventListener('mouseenter', () => {
//             cancelHideTimer();
//             clearTimeout(entryTimer);

//             entryTimer = setTimeout(() => {
//                 const videoId = extractVideoId(anchor.href);
//                 if (videoId) showOverlay(anchor, videoId);
//             }, HOVER_DELAY_MS);
//         });

//         anchor.addEventListener('mouseleave', () => {
//             clearTimeout(entryTimer);
//             // Give the user a moment to move into the overlay before hiding
//             scheduleHide();
//         });
//     }

//     /* ─────────────────────────────────────────────
//        SCAN DOM FOR THUMBNAIL ANCHORS
//     ───────────────────────────────────────────── */
//     function scanThumbnails() {
//         document.getElementById("description").style.display = "none";
//         // Primary selector used by YouTube for video card thumbnails
//         document.querySelectorAll('a#thumbnail[href]').forEach(bindThumbnail);
//         // Fallback for search-result thumbnails and mix cards
//         document.querySelectorAll('a.yt-simple-endpoint[href*="watch"]').forEach(el => {
//             if (el.querySelector('img') || el.querySelector('yt-image')) bindThumbnail(el);
//         });
//     }

//     /* ─────────────────────────────────────────────
//        FOCUS MODE — applied on /watch pages
//        Hides: recommendation sidebar, like/dislike row
//        Keeps: player, progress bar, captions/subtitles
//     ───────────────────────────────────────────── */
//     const FOCUS_STYLE_ID = 'yhp-focus-mode';

//     const FOCUS_CSS = `
//     /* ── Recommendation sidebar & related panel ── */
//     #secondary,
//     #related,
//     ytd-watch-next-secondary-results-renderer,
//     ytd-compact-video-renderer,
//     ytd-shelf-renderer {
//       display: none !important;
//     }

//     /* ── Like / Dislike / Share / More actions row ── */
//     #top-level-buttons-computed,
//     ytd-menu-renderer.ytd-video-primary-info-renderer,
//     yt-button-view-model,
//     segmented-like-dislike-button-view-model {
//       display: none !important;
//     }

//     /* ── Comments section ── */
//     ytd-comments#comments {
//       display: none !important;
//     }

//     /* ── Expand primary column to fill space ── */
//     ytd-watch-flexy #primary {
//       max-width: 100% !important;
//     }

//     /* ── Ensure player fills available width ── */
//     ytd-watch-flexy:not([theater]):not([fullscreen]) #player {
//       width: 100% !important;
//     }

//     /* ── Chips / filter bar below title ── */
//     #chips-wrapper,
//     yt-chip-cloud-renderer {
//       display: none !important;
//     }
//       #description {
//       display : none !important
//       }
//       #primary{
//             display : none !important
//       }
//             #end{
//                   display : none !important
//             }
//   `;

//     function applyFocusMode() {
//         if (document.getElementById(FOCUS_STYLE_ID)) return;
//         const style = document.createElement('style');
//         style.id = FOCUS_STYLE_ID;
//         style.textContent = FOCUS_CSS;
//         document.head.appendChild(style);
//     }

//     function removeFocusMode() {
//         const el = document.getElementById(FOCUS_STYLE_ID);
//         if (el) el.remove();
//     }

//     function syncFocusMode() {
//         if (location.pathname.startsWith('/watch')) {
//             applyFocusMode();
//         } else {
//             removeFocusMode();
//         }
//     }

//     /* ─────────────────────────────────────────────
//        MUTATION OBSERVER — watch for dynamic content
//     ───────────────────────────────────────────── */
//     const mutationObserver = new MutationObserver(() => {
//         scanThumbnails();
//         syncFocusMode();
//     });

//     mutationObserver.observe(document.documentElement, {
//         childList: true,
//         subtree: true,
//     });

//     /* ─────────────────────────────────────────────
//        SPA NAVIGATION DETECTION
//        YouTube navigates without full page reloads;
//        poll location.pathname to detect route changes.
//     ───────────────────────────────────────────── */
//     const navPoller = setInterval(() => {
//         if (location.pathname !== lastPath) {
//             lastPath = location.pathname;

//             // Discard any open preview when navigating
//             destroyOverlay(currentOverlay);

//             syncFocusMode();
//             scanThumbnails();
//         }
//     }, 400);

//     /* ─────────────────────────────────────────────
//        KEYBOARD SHORTCUT — Escape closes overlay
//     ───────────────────────────────────────────── */
//     document.addEventListener('keydown', (e) => {
//         if (e.key === 'Escape' && currentOverlay) {
//             destroyOverlay(currentOverlay);
//         }
//     });

//     /* ─────────────────────────────────────────────
//        INIT
//     ───────────────────────────────────────────── */
//     scanThumbnails();
//     syncFocusMode();

// })();

(function () {
    'use strict';

    const STYLE_ID = 'yt-clean-focus-mode';

    const CSS = `
    /* ─────────────────────────────
       RIGHT SIDEBAR / RECOMMENDED
    ───────────────────────────── */
    #secondary,
    #related,
    ytd-watch-next-secondary-results-renderer,
    ytd-compact-video-renderer,
    ytd-shelf-renderer {
        display: none !important;
    }

    /* ─────────────────────────────
       COMMENTS
    ───────────────────────────── */
    ytd-comments,
    #comments {
        display: none !important;
    }

    /* ─────────────────────────────
       ACTION BUTTONS
       Like · Share · Download etc.
    ───────────────────────────── */
    #top-level-buttons-computed,
    ytd-menu-renderer.ytd-video-primary-info-renderer,
    segmented-like-dislike-button-view-model,
    yt-button-view-model {
        display: none !important;
    }

    /* ─────────────────────────────
       DESCRIPTION
    ───────────────────────────── */
    #description,
    ytd-text-inline-expander {
        display: none !important;
    }

    /* ─────────────────────────────
       CHIPS / FILTERS
    ───────────────────────────── */
    #chips-wrapper,
    yt-chip-cloud-renderer {
        display: none !important;
    }
     #primary{
     display : none !important
     }
      #end{
     display : none !important
     }

    /* ─────────────────────────────
       END SCREEN ELEMENTS
    ───────────────────────────── */
    .ytp-ce-element,
    .ytp-ce-covering-overlay,
    .ytp-show-tiles {
        display: none !important;
    }

    /* ─────────────────────────────
       INFO CARDS
    ───────────────────────────── */
    .ytp-cards-teaser,
    .ytp-cards-button,
    .ytp-paid-content-overlay {
        display: none !important;
    }

    /* ─────────────────────────────
       FULL WIDTH PLAYER
    ───────────────────────────── */
    ytd-watch-flexy #primary {
        width: 100% !important;
        max-width: 100% !important;
    }

    ytd-watch-flexy:not([theater]):not([fullscreen]) #player {
        width: 100% !important;
    }
    
    `;

    function applyCleanMode() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;

        document.head.appendChild(style);
    }

    function removeCleanMode() {
        const style = document.getElementById(STYLE_ID);

        if (style) {
            style.remove();
        }
    }

    function syncMode() {
        if (location?.pathname.startsWith('/watch')) {
            applyCleanMode();
        } else {
            removeCleanMode();
        }
    }

    /* Initial */
    syncMode();

    /* YouTube SPA navigation */
    let lastPath = location?.pathname;

    setInterval(() => {
        if (location?.pathname !== lastPath) {
            lastPath = location.pathname;
            syncMode();
        }
    }, 500);

})();