// Instagram: sayfa bağlamında (MAIN world) çalışır.
// 1) Adresteki kısa koddan (ör. DeXhDbAMRkr) medya ID'si çözülür; ID'nin üst bitleri
//    yükleme anını milisaniye olarak taşır -> anında yaklaşık zaman.
// 2) Instagram'ın kendi API'sinden "taken_at" alınır -> saniyesi kesin paylaşım zamanı.
(() => {
  if (window.__reelsDateIG) return;
  window.__reelsDateIG = true;

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const IG_EPOCH_MS = 1314220021721n;
  const APP_ID = "936619743392459"; // instagram.com web uygulamasının herkese açık ID'si

  const exact = new Map(); // kısa kod -> unix saniye
  const pending = new Set();
  const failed = new Set();

  function mediaId(code) {
    let n = 0n;
    for (const ch of code) {
      const i = ALPHABET.indexOf(ch);
      if (i < 0) return null;
      n = n * 64n + BigInt(i);
    }
    return n;
  }

  function approxSeconds(code) {
    const id = mediaId(code);
    if (id === null) return null;
    const ms = (id >> 23n) + IG_EPOCH_MS;
    const sec = Number(ms / 1000n);
    // 2011 öncesi / gelecek gibi anlamsız değerleri ele
    return sec > 1314220000 && sec < Date.now() / 1000 + 86400 ? sec : null;
  }

  function currentCode() {
    const m = location.pathname.match(/\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{8,})/);
    return m ? m[1] : null;
  }

  async function fetchExact(code) {
    if (exact.has(code) || pending.has(code) || failed.has(code)) return;
    const id = mediaId(code);
    if (id === null) return;
    pending.add(code);
    try {
      const r = await fetch("/api/v1/media/" + id.toString() + "/info/", {
        credentials: "include",
        headers: { "X-IG-App-ID": APP_ID, "X-Requested-With": "XMLHttpRequest" },
      });
      const j = await r.json();
      const t = j && j.items && j.items[0] && j.items[0].taken_at;
      if (t) exact.set(code, +t);
      else failed.add(code);
    } catch (_) {
      failed.add(code);
    } finally {
      pending.delete(code);
      update(true);
    }
  }

  // --- Aktif medya ---------------------------------------------------------
  function activeMedia() {
    const cy = innerHeight / 2;
    let best = null, bestScore = -Infinity;
    const cands = document.querySelectorAll("main video, main img, article video, article img, div[role='dialog'] video, div[role='dialog'] img, video");
    for (const el of cands) {
      const r = el.getBoundingClientRect();
      if (r.width < 200 || r.height < 200) continue;
      const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      if (visible < 100) continue;
      const score = visible - Math.abs((r.top + r.bottom) / 2 - cy) * 0.5 + (el.tagName === "VIDEO" ? 50 : 0);
      if (score > bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  function hostFor(el) {
    let p = el.parentElement;
    for (let i = 0; p && i < 6; i++, p = p.parentElement) {
      if (getComputedStyle(p).position !== "static") return p;
    }
    return el.parentElement;
  }

  // --- Biçimlendirme -------------------------------------------------------
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

  // --- Rozet ---------------------------------------------------------------
  let badge = null;
  function ensureBadge(host) {
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "rd-badge rd-ig";
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

  function render(code, media) {
    const t = exact.get(code);
    const a = t ? null : approxSeconds(code);
    const sec = t || a;
    if (!sec) { badge?.remove(); return; }
    const b = ensureBadge(hostFor(media));
    const d = new Date(sec * 1000);
    const key = code + "|" + sec + "|" + (t ? 1 : 0);
    if (b.dataset.key === key) return;
    b.dataset.key = key;
    b.dataset.ts = String(sec);
    b.innerHTML = `${ICON}<span class="rd-main">${t ? "" : "≈ "}${fmtDate.format(d)} · ${fmtTime.format(d)}</span><span class="rd-rel">${relative(sec)}</span>`;
    b.title = (t ? "" : "Yaklaşık (yükleme anı, kesin zaman alınıyor…)\n") + fmtFull.format(d) + "\n(Tıkla: ISO tarihini kopyala)";
    b.classList.toggle("rd-loading", !t && !failed.has(code));
  }

  function update(force) {
    const code = currentCode();
    if (!code) { badge?.remove(); return; }
    const media = activeMedia();
    if (!media) return;
    if (force && badge) badge.dataset.key = "";
    fetchExact(code);
    render(code, media);
  }

  let lastKey = "";
  setInterval(() => {
    const m = activeMedia();
    const key = location.pathname + "|" + (exact.has(currentCode()) ? 1 : 0) + "|" + (badge && m && badge.parentElement === hostFor(m) ? 1 : 0);
    if (key !== lastKey || (badge && !badge.isConnected)) { lastKey = key; update(); }
  }, 400);
})();
