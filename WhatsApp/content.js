/**
 * WhatsApp Voice ↔ Text — content.js
 * ====================================
 * • Voice message  → click 💬 → transcribes using your mic (plays audio through speakers)
 * • Text message   → click 🎙️ → reads aloud using SpeechSynthesis
 *
 * 100 % browser-based. No third-party requests, no API keys.
 */
(function () {
    'use strict';

    // ─── Constants ────────────────────────────────────────────────────────────
    const ATTR = 'data-wacv';          // marks already-processed containers
    const BTN_CLS = 'wacv-btn';
    let LANG = 'en-US';              // updated from popup / storage

    // ─── Load saved language ──────────────────────────────────────────────────
    try {
        chrome.storage.sync.get(['wacv_lang'], (r) => {
            if (r && r.wacv_lang) LANG = r.wacv_lang;
        });
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg && msg.type === 'WACV_LANG' && msg.lang) LANG = msg.lang;
        });
    } catch (_) { /* extension context unavailable on reload */ }

    // ─── Utilities ────────────────────────────────────────────────────────────
    function debounce(fn, ms) {
        let t;
        return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Detect if text contains Arabic-script characters (Urdu / Arabic).
     * Used to auto-pick the right TTS voice when reading aloud.
     */
    function detectScriptLang(text) {
        return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
            ? 'ur-PK'
            : LANG;
    }

    // ─── Button factory ───────────────────────────────────────────────────────
    function makeBtn(emoji, title, handler) {
        const b = document.createElement('button');
        b.className = BTN_CLS;
        b.textContent = emoji;
        b.title = title;
        b.type = 'button';
        b.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handler(b);
        });
        return b;
    }

    // Insert button just before the timestamp/meta area
    function insertBtn(container, btn) {
        const meta = container.querySelector('[data-testid="msg-meta"]');
        if (meta) {
            meta.parentElement.insertBefore(btn, meta);
        } else {
            container.appendChild(btn);
        }
    }

    // Get (or create) the transcript result box for a voice message container
    function getResultBox(container) {
        let box = container.querySelector('.wacv-result');
        if (!box) {
            box = document.createElement('div');
            box.className = 'wacv-result';

            // Try to insert it after the main message row, before the next message
            const meta = container.querySelector('[data-testid="msg-meta"]');
            if (meta) {
                const row = meta.closest('._ak4s, ._amk6') || meta.parentElement;
                if (row && row.parentNode) {
                    row.parentNode.insertBefore(box, row.nextSibling);
                } else {
                    container.appendChild(box);
                }
            } else {
                container.appendChild(box);
            }
        }
        return box;
    }

    // ─── TEXT → VOICE ─────────────────────────────────────────────────────────
    function speakText(text, btn) {
        const ss = window.speechSynthesis;

        // Toggle off if already speaking
        if (ss.speaking || ss.pending) {
            ss.cancel();
            btn.classList.remove('wacv-active');
            return;
        }

        const utt = new SpeechSynthesisUtterance(text);
        const lang = detectScriptLang(text);
        utt.lang = lang;

        // Pick the best matching voice
        const voices = ss.getVoices();
        const base = lang.split('-')[0];
        const voice = voices.find(v => v.lang === lang)
            || voices.find(v => v.lang.startsWith(base))
            || voices.find(v => v.default);
        if (voice) utt.voice = voice;

        utt.rate = 1;
        utt.pitch = 1;
        utt.volume = 1;

        btn.classList.add('wacv-active');
        utt.onend = () => btn.classList.remove('wacv-active');
        utt.onerror = () => btn.classList.remove('wacv-active');

        ss.speak(utt);
    }

    // ─── VOICE → TEXT ─────────────────────────────────────────────────────────
    let activeRec = null;

    function transcribeVoice(container, playBtn, btn) {

        // ── Toggle off if already running ──
        if (activeRec) {
            activeRec.stop();
            return;
        }

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            const box = getResultBox(container);
            box.className = 'wacv-result wacv-error';
            box.textContent = '❌ Speech Recognition is not supported in this browser. Please use Chrome.';
            return;
        }

        const box = getResultBox(container);
        box.className = 'wacv-result wacv-listening';
        box.innerHTML = '<span class="wacv-hint">🎙️ Listening… make sure <b>speakers are ON</b></span>';
        btn.classList.add('wacv-active');
        btn.title = 'Stop transcription';

        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = LANG;
        activeRec = rec;

        let finalText = '';

        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalText += e.results[i][0].transcript;
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            box.innerHTML =
                `<span class="wacv-final">${esc(finalText)}</span>` +
                `<span class="wacv-interim">${esc(interim)}</span>`;
        };

        rec.onerror = (e) => {
            const MSGS = {
                'not-allowed':
                    '🔒 Microphone blocked.<br>' +
                    '<small>Allow in Chrome: <b>⋮ → Settings → Privacy → Microphone → Allow</b></small>',
                'network': '🌐 Network error while connecting to speech service.',
                'audio-capture': '🎤 No microphone detected.',
            };
            if (e.error in MSGS) {
                box.className = 'wacv-result wacv-error';
                box.innerHTML = MSGS[e.error];
            } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
                box.className = 'wacv-result wacv-error';
                box.textContent = `❌ Recognition error: ${e.error}`;
            }
            cleanup();
        };

        rec.onend = () => {
            cleanup();
            if (finalText.trim()) {
                box.className = 'wacv-result wacv-done';
                box.innerHTML =
                    `<span class="wacv-label">📝 Transcription:</span>` +
                    `<span class="wacv-text">${esc(finalText.trim())}</span>`;
            } else if (!box.classList.contains('wacv-error')) {
                box.className = 'wacv-result wacv-warn';
                box.textContent =
                    '⚠️ Nothing captured. Turn up volume and click 💬 again.';
            }
        };

        function cleanup() {
            btn.classList.remove('wacv-active');
            btn.title = 'Transcribe to text';
            activeRec = null;
        }

        // Start recognition first, then play the voice message
        rec.start();
        setTimeout(() => {
            if (!isVoicePlaying(playBtn)) playBtn.click();
        }, 400);

        // Auto-stop after message duration (+ 2 s buffer)
        const dur = parseDuration(container);
        if (dur > 0) {
            setTimeout(() => { if (activeRec) activeRec.stop(); }, dur * 1000 + 2000);
        }
    }

    function isVoicePlaying(playBtn) {
        const lbl = (playBtn.getAttribute('aria-label') || '').toLowerCase();
        return lbl.includes('pause');
    }

    function parseDuration(container) {
        // WhatsApp renders duration as "M:SS" in an aria-hidden span
        for (const el of container.querySelectorAll('[aria-hidden="true"]')) {
            const m = el.textContent.trim().match(/^(\d+):(\d{2})$/);
            if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        }
        return 0;
    }

    // ─── Detect & process message containers ──────────────────────────────────
    function processContainer(c) {
        if (c.getAttribute(ATTR)) return;   // already processed
        c.setAttribute(ATTR, '1');

        // ── Voice message ──
        const playBtn = c.querySelector('button[aria-label="Play voice message"]');
        if (playBtn) {
            const btn = makeBtn('💬', 'Transcribe to text', (b) => transcribeVoice(c, playBtn, b));
            insertBtn(c, btn);
            return;
        }

        // ── Text message ──
        // Skip system / notification containers
        if (c.closest('[data-testid="notification-container"]')) return;

        // Find the text element using several WhatsApp-Web selectors (they evolve over time)
        const textEl =
            c.querySelector('.copyable-text') ||
            c.querySelector('[data-pre-plain-text]') ||
            c.querySelector('[data-testid="msg-text"]') ||
            c.querySelector('span.selectable-text');

        if (!textEl) return;

        const rawText = textEl.innerText?.trim();
        if (!rawText || rawText.length < 1) return;

        // Don't add to sticker / image messages (they have no readable body text)
        if (c.querySelector('[data-testid="media-url-provider"]')
            || c.querySelector('[data-testid="image-thumb"]')
            || c.querySelector('img[src*="blob:"]')) {
            // Only add if there's an explicit text caption alongside
            const caption = c.querySelector('[data-testid="caption"]');
            if (!caption) return;
        }

        const btn = makeBtn('🎙️', 'Read aloud', (b) => speakText(rawText, b));
        insertBtn(c, btn);
    }

    // ─── MutationObserver — watches for new messages ──────────────────────────
    const scan = debounce(() => {
        document
            .querySelectorAll(`[data-testid="msg-container"]:not([${ATTR}])`)
            .forEach(processContainer);
    }, 300);

    new MutationObserver(scan).observe(document.body, {
        childList: true,
        subtree: true,
    });

    // First run after page is ready
    setTimeout(scan, 2000);

    // Re-scan when navigating between chats (WhatsApp is a SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // Cancel any ongoing recognition when changing chats
            if (activeRec) { try { activeRec.stop(); } catch (_) { } }
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
            setTimeout(scan, 1200);
        }
    }).observe(document.body, { childList: true, subtree: true });

})();