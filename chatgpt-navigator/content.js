(() => {
  // ─── Config ───────────────────────────────────────────────────────────────
  const SELECTORS = [
    '[data-message-author-role]',
    'article[data-testid^="conversation-turn"]',
    '.group\\/conversation-turn',
  ];

  const REFRESH_INTERVAL = 1200;
  const NAV_ID = 'cgpt-nav-sidebar';
  const TIP_ID = 'cgpt-nav-tooltip';

  const MARKER_H = 6;   // px – marker height
  const MARKER_GAP = 10;  // px – gap between markers
  const TRACK_PAD = 14;  // px – top & bottom padding inside track

  // ─── State ────────────────────────────────────────────────────────────────
  let allMessages = [];
  let userMsgs = [];
  let activeIdx = -1;
  let debounce = null;
  let scrollDeb = null;
  let sidebar = null;
  let tooltip = null;
  let visible = true;

  // ─── DOM helpers ──────────────────────────────────────────────────────────
  function getMessages() {
    for (const sel of SELECTORS) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length) return Array.from(nodes);
    }
    return [];
  }

  function roleOf(el) {
    const r = el.getAttribute('data-message-author-role');
    if (r) return r;
    const t = el.getAttribute('data-testid') || '';
    return t.includes('user') ? 'user' : 'assistant';
  }

  function preview(el) {
    const lines = (el.innerText || '').trim().split('\n').filter(l => l.trim());
    const line = lines.find(l => l.trim().length > 3) || lines[0] || '';
    return line.trim().slice(0, 88) || '…';
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Build sidebar ────────────────────────────────────────────────────────
  function buildSidebar() {
    document.getElementById(NAV_ID)?.remove();
    document.getElementById(TIP_ID)?.remove();

    sidebar = document.createElement('div');
    sidebar.id = NAV_ID;

    // ── Header: icon + count ──
    const header = document.createElement('div');
    header.className = 'cn-header';
    header.innerHTML = `
      <svg class="cn-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="5"  x2="17" y2="5"/>
        <line x1="3" y1="10" x2="17" y2="10"/>
        <line x1="3" y1="15" x2="17" y2="15"/>
      </svg>`;
    header.title = 'Toggle navigator';
    header.addEventListener('click', toggleNav);
    sidebar.appendChild(header);

    // ── Count badge ──
    const badge = document.createElement('span');
    badge.className = 'cn-badge';
    badge.id = 'cn-badge';
    sidebar.appendChild(badge);

    // ── Separator ──
    const sep = document.createElement('div');
    sep.className = 'cn-sep';
    sidebar.appendChild(sep);

    // ── Track ──
    const track = document.createElement('div');
    track.className = 'cn-track';
    track.id = 'cn-track';
    sidebar.appendChild(track);

    // ── Tooltip ──
    tooltip = document.createElement('div');
    tooltip.id = TIP_ID;
    tooltip.className = 'cn-tooltip';
    document.body.appendChild(tooltip);

    document.body.appendChild(sidebar);
    renderMarkers();
  }

  function toggleNav() {
    visible = !visible;
    sidebar.classList.toggle('cn-collapsed', !visible);
  }

  // ─── Render markers ───────────────────────────────────────────────────────
  function renderMarkers() {
    if (!sidebar) return;
    const track = document.getElementById('cn-track');
    const badge = document.getElementById('cn-badge');
    if (!track) return;

    allMessages = getMessages();
    userMsgs = allMessages.filter(el => roleOf(el) === 'user');

    if (userMsgs.length === 0) {
      sidebar.style.display = 'none';
      return;
    }
    sidebar.style.display = 'flex';

    // Dynamic track height
    const h = TRACK_PAD * 2 + userMsgs.length * MARKER_H + Math.max(0, userMsgs.length - 1) * MARKER_GAP;
    track.style.height = h + 'px';

    if (badge) badge.textContent = userMsgs.length;

    track.innerHTML = '';
    userMsgs.forEach((msg, i) => {
      const m = document.createElement('button');
      m.className = 'cn-marker' + (i === activeIdx ? ' cn-active' : '');
      m.title = '';
      m.style.top = (TRACK_PAD + i * (MARKER_H + MARKER_GAP)) + 'px';
      m.addEventListener('mouseenter', e => showTip(e, i));
      m.addEventListener('mouseleave', hideTip);
      m.addEventListener('click', () => jumpTo(i));
      track.appendChild(m);
    });
  }

  // ─── Tooltip ──────────────────────────────────────────────────────────────
  function showTip(e, i) {
    if (!tooltip) return;
    tooltip.innerHTML = `
      <div class="cn-tip-head">
        <span class="cn-tip-you">You</span>
        <span class="cn-tip-num">${i + 1} / ${userMsgs.length}</span>
      </div>
      <div class="cn-tip-body">${esc(preview(userMsgs[i]))}</div>`;
    tooltip.style.display = 'flex';

    requestAnimationFrame(() => {
      const r = e.target.getBoundingClientRect();
      const th = tooltip.offsetHeight || 64;
      const top = Math.max(8, Math.min(r.top + r.height / 2 - th / 2, window.innerHeight - th - 8));
      tooltip.style.top = top + 'px';
      tooltip.style.opacity = '1';
    });
  }

  function hideTip() {
    if (!tooltip) return;
    tooltip.style.opacity = '0';
    setTimeout(() => { if (tooltip) tooltip.style.display = 'none'; }, 140);
  }

  // ─── Jump ─────────────────────────────────────────────────────────────────
  function jumpTo(i) {
    const msg = userMsgs[i];
    if (!msg) return;
    activeIdx = i;
    renderMarkers();
    msg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Scroll tracking ──────────────────────────────────────────────────────
  function onScroll() {
    clearTimeout(scrollDeb);
    scrollDeb = setTimeout(() => {
      const mid = window.innerHeight / 2;
      let best = -1, bestDist = Infinity;
      userMsgs.forEach((msg, i) => {
        const r = msg.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (best !== activeIdx) {
        activeIdx = best;
        document.getElementById('cn-track')?.querySelectorAll('.cn-marker').forEach((m, i) => {
          m.classList.toggle('cn-active', i === activeIdx);
        });
      }
    }, 80);
  }

  // ─── MutationObserver ─────────────────────────────────────────────────────
  const observer = new MutationObserver(muts => {
    if (muts.some(m => m.addedNodes.length || m.removedNodes.length)) {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (!document.getElementById(NAV_ID)) buildSidebar();
        else renderMarkers();
      }, REFRESH_INTERVAL);
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    buildSidebar();
    window.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(document.body, { childList: true, subtree: true });

    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        activeIdx = -1;
        setTimeout(buildSidebar, 800);
      }
    }, 500);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : setTimeout(init, 600);
})();
