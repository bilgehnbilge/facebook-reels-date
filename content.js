// İzole içerik betiği: tarih verisini toplar ve aktif reel'in üzerine rozet çizer.
(() => {
  const TAG = "__REELS_DATE__";
  const times = new Map(); // videoId -> unix saniye
  const pending = new Set(); // yedek isteği gönderilmiş id'ler
  const failed = new Set();

  // --- Veri toplama ------------------------------------------------------
  // inject.js'teki ile aynı eşleştirme mantığı (açıklama orada).
  function extract(text) {
    if (!text || text.indexOf("creation_time") === -1) return;
    const dec = (s) => { try { return atob(s.replace(/-/g, "+").replace(/_/g, "/")); } catch (_) { return ""; } };
    const vk = [], vids = [];
    let m;
    const reS = /"id":"(Uzpf[A-Za-z0-9+/=_-]{8,})"/g;
    while ((m = reS.exec(text))) {
      const d = dec(m[1]).match(/:VK:(\d{6,25})/);
      if (d) vk.push({ pos: m.index, id: d[1] });
    }
    const reV = /"__typename":"Video"[^{}]{0,400}?"id":"(\d{6,25})"/g;
    while ((m = reV.exec(text))) vids.push({ pos: m.index, id: m[1] });
    const near = (arr, pos, back, fwd) => {
      let best = null, bd = Infinity;
      for (const c of arr) {
        const d = c.pos - pos;
        if (d < -back || d > fwd) continue;
        if (Math.abs(d) < bd) { bd = Math.abs(d); best = c; }
      }
      return best;
    };
    const reT = /"creation_time":(\d{9,11})/g;
    while ((m = reT.exec(text))) {
      const c = near(vk, m.index, 6000, 1500) || near(vids, m.index, 3000, 1500);
      if (c && !times.has(c.id)) times.set(c.id, +m[1]);
    }
  }

  function scanInlineScripts() {
    for (const s of document.querySelectorAll('script[type="application/json"], script:not([src])')) {
      if (s.__rdScanned) continue;
      s.__rdScanned = true;
      extract(s.textContent);
    }
  }

  window.addEventListener("message", (ev) => {
    if (ev.source !== window || !ev.data || ev.data[TAG] !== "data") return;
    for (const [id, t] of Object.entries(ev.data.map || {})) if (!times.has(id)) times.set(id, t);
    if (ev.data.requested) {
      pending.delete(ev.data.requested);
      if (!times.has(ev.data.requested)) failed.add(ev.data.requested);
    }
    update();
  });

  // --- Aktif reel'i bulma ------------------------------------------------
  function currentReelId() {
    const m = location.pathname.match(/\/reels?\/(\d{6,25})/);
    return m ? m[1] : null;
  }

  function activeVideo() {
    const vids = [...document.querySelectorAll("video")];
    const cy = innerHeight / 2;
    let best = null, bestScore = -Infinity;
    for (const v of vids) {
      const r = v.getBoundingClientRect();
      if (r.width < 120 || r.height < 120) continue;
      const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      const score = visible - Math.abs((r.top + r.bottom) / 2 - cy) * 0.5;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    return best;
  }

  // --- Biçimlendirme -----------------------------------------------------
  const lang = document.documentElement.lang || navigator.language || "tr";
  const fmtDate = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" });
  const fmtFull = new Intl.DateTimeFormat(lang, { dateStyle: "full", timeStyle: "medium" });
  const fmtTime = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  function relative(sec) {
    const diff = sec - Date.now() / 1000;
    const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
    return rtf.format(0, "minute");
  }

  const ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9ZM5 6a1 1 0 0 0-1 1v1h16V7a1 1 0 0 0-1-1H5Z"/></svg>';

  // --- Rozet -------------------------------------------------------------
  let badge = null;

  function ensureBadge(host) {
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "rd-badge";
      badge.setAttribute("role", "note");
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const t = badge.dataset.ts;
        if (t) navigator.clipboard?.writeText(new Date(+t * 1000).toISOString()).catch(() => {});
        badge.classList.add("rd-copied");
        setTimeout(() => badge && badge.classList.remove("rd-copied"), 900);
      }, true);
    }
    if (badge.parentElement !== host) host.appendChild(badge);
    return badge;
  }

  function hostFor(video) {
    // Videoyu saran ve konumlandırılmış ilk ata (rozeti mutlak konumlamak için)
    let el = video.parentElement;
    for (let i = 0; el && i < 6; i++, el = el.parentElement) {
      if (getComputedStyle(el).position !== "static") return el;
    }
    return video.parentElement;
  }

  function render(id, video) {
    const b = ensureBadge(hostFor(video));
    const t = times.get(id);
    b.dataset.id = id;
    if (t) {
      const d = new Date(t * 1000);
      b.dataset.ts = String(t);
      b.innerHTML = `${ICON}<span class="rd-main">${fmtDate.format(d)} · ${fmtTime.format(d)}</span><span class="rd-rel">${relative(t)}</span>`;
      b.title = fmtFull.format(d) + "\n(Tıkla: ISO tarihini kopyala)";
      b.classList.remove("rd-loading", "rd-missing");
    } else if (failed.has(id)) {
      delete b.dataset.ts;
      b.innerHTML = `${ICON}<span class="rd-main">Tarih bulunamadı</span>`;
      b.title = "";
      b.classList.add("rd-missing");
      b.classList.remove("rd-loading");
    } else {
      delete b.dataset.ts;
      b.innerHTML = `${ICON}<span class="rd-main">Tarih yükleniyor…</span>`;
      b.title = "";
      b.classList.add("rd-loading");
    }
  }

  function update() {
    const id = currentReelId();
    if (!id) { badge?.remove(); return; }
    const video = activeVideo();
    if (!video) return;
    if (!times.has(id)) {
      scanInlineScripts();
      if (!times.has(id) && !pending.has(id) && !failed.has(id)) {
        pending.add(id);
        window.postMessage({ [TAG]: "fetch", id }, location.origin);
      }
    }
    render(id, video);
  }

  // SPA gezinmesi + kaydırma için hafif periyodik kontrol
  let lastKey = "";
  setInterval(() => {
    const v = activeVideo();
    const key = location.pathname + "|" + (times.has(currentReelId()) ? 1 : 0) + "|" + (badge && v && badge.parentElement === hostFor(v) ? 1 : 0);
    if (key !== lastKey || (badge && !badge.isConnected)) { lastKey = key; update(); }
  }, 400);
  document.addEventListener("DOMContentLoaded", () => { scanInlineScripts(); update(); });
})();
