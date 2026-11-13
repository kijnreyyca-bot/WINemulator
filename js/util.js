/* WINemulator — shared helpers, settings store */
(function () {
  'use strict';

  const DEFAULTS = {
    theme: 'classic',        // classic | platinum | midnight
    wallpaper: 'teal',       // teal | clouds | azure | sunset | graphite | grid | solid
    solid: '#008080',
    sound: true,
    volume: 0.55,
    animations: true,
    crt: false,
    clock24: false,
    fps: false,
    fastBoot: false,
    firstRun: true,
    lastUser: 'User'
  };

  let data = Object.assign({}, DEFAULTS);
  try {
    const raw = localStorage.getItem('winemulator.settings');
    if (raw) data = Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch (e) { /* storage may be unavailable */ }

  const listeners = [];
  Win.store = {
    defaults: DEFAULTS,
    all: function () { return Object.assign({}, data); },
    get: function (k) { return data[k]; },
    set: function (patch) {
      Object.assign(data, patch || {});
      try { localStorage.setItem('winemulator.settings', JSON.stringify(data)); } catch (e) {}
      listeners.forEach(function (fn) { try { fn(data); } catch (e) {} });
      return data;
    },
    reset: function () {
      data = Object.assign({}, DEFAULTS);
      try { localStorage.setItem('winemulator.settings', JSON.stringify(data)); } catch (e) {}
      listeners.forEach(function (fn) { try { fn(data); } catch (e) {} });
    },
    subscribe: function (fn) { listeners.push(fn); return function () { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }; }
  };

  function el(tag, props) {
    const node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === undefined || v === null) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'attrs') Object.keys(v).forEach(function (a) { node.setAttribute(a, v[a]); });
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false) node.setAttribute(k, v);
    });
    for (let i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }

  function append(node, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { append(node, k); }); return; }
    node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }

  function $ (sel, root) { return (root || document).querySelector(sel); }
  function $$ (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  let seq = 0;
  function uid(prefix) { seq += 1; return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + seq; }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function fmtBytes(n) {
    if (n === null || n === undefined) return '';
    if (n < 1024) return n + ' bytes';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function fmtDate(ts) {
    const d = new Date(ts);
    const h = d.getHours();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' +
      h12 + ':' + pad2(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const h = d.getHours();
    if (Win.store.get('clock24')) return pad2(h) + ':' + pad2(d.getMinutes());
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + pad2(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  function fmtDateLong(ts) {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fmtDuration(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + sec + 's';
    return sec + 's';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function debounce(fn, ms) {
    let t = 0;
    const wrapped = function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { t = 0; fn.apply(self, args); }, ms || 120);
    };
    wrapped.cancel = function () { clearTimeout(t); t = 0; };
    return wrapped;
  }

  function rafThrottle(fn) {
    let queued = 0;
    return function () {
      const args = arguments, self = this;
      if (queued) return;
      queued = requestAnimationFrame(function () { queued = 0; fn.apply(self, args); });
    };
  }

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function download(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const ta = el('textarea', { style: { position: 'fixed', left: '-9999px' } });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  }

  Win.util = {
    $: $, $$: $$, el: el, append: append, uid: uid, clamp: clamp, pad2: pad2,
    fmtBytes: fmtBytes, fmtDate: fmtDate, fmtTime: fmtTime, fmtDateLong: fmtDateLong,
    fmtDuration: fmtDuration, escapeHtml: escapeHtml, debounce: debounce, rafThrottle: rafThrottle,
    isTyping: isTyping, download: download, copyText: copyText
  };
  Win.el = el;
  Win.$ = $;
  Win.$$ = $$;
  Win.escapeHtml = escapeHtml;
})();
