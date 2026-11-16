// Sayfa bağlamında (MAIN world) çalışır.
// Facebook'un GraphQL yanıtlarını dinler; video ID -> creation_time eşleşmelerini çıkarır
// ve içerik betiğine (content.js) window.postMessage ile iletir.
(() => {
  if (window.__reelsDateHooked) return;
  window.__reelsDateHooked = true;

  const TAG = "__REELS_DATE__";

  // Her creation_time'ı ait olduğu videoya eşler.
  // 1) Gönderi kimliği base64'tür ve "S:_I<sahip>:VK:<videoId>" içerir -> en güvenilir.
  // 2) Yoksa en yakın "__typename":"Video" düğümünün id'si (önce/sonra).
  function extract(text) {
    if (!text || text.indexOf("creation_time") === -1) return null;
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
    const map = {};
    const reT = /"creation_time":(\d{9,11})/g;
    while ((m = reT.exec(text))) {
      const c = near(vk, m.index, 6000, 1500) || near(vids, m.index, 3000, 1500);
      if (c && !map[c.id]) map[c.id] = +m[1];
    }
    return Object.keys(map).length ? map : null;
  }

  function emit(text) {
    try {
      const map = extract(text);
      if (map) window.postMessage({ [TAG]: "data", map }, location.origin);
    } catch (_) {}
  }

  // XHR (Facebook GraphQL çoğunlukla bunu kullanır)
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__rdUrl = String(url || "");
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (this.__rdUrl.includes("graphql")) {
      this.addEventListener("load", function () {
        if (this.responseType === "" || this.responseType === "text") emit(this.responseText);
      });
    }
    return origSend.apply(this, arguments);
  };

  // fetch
  const origFetch = window.fetch;
  window.fetch = function (input) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.includes("graphql")) {
        p.then((r) => r.clone().text().then(emit)).catch(() => {});
      }
    } catch (_) {}
    return p;
  };

  // Yedek: reel sayfasının HTML'ini çekip tarihi oradan bul.
  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || !ev.data || ev.data[TAG] !== "fetch") return;
    const id = String(ev.data.id || "");
    if (!/^\d+$/.test(id)) return;
    try {
      const r = await origFetch.call(window, "/reel/" + id, {
        credentials: "include",
        headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      });
      const html = await r.text();
      const map = extract(html) || {};
      window.postMessage({ [TAG]: "data", map, requested: id }, location.origin);
    } catch (_) {
      window.postMessage({ [TAG]: "data", map: {}, requested: id }, location.origin);
    }
  });
})();
