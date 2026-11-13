/* WINemulator — window manager */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  const wins = [];
  let active = null;
  let zTop = 100;
  let seq = 0;
  let snapEl = null;
  let altOpen = false, altIndex = 0, altList = [];

  Win.apps = Win.apps || {};

  function desk() { return document.getElementById('desktop'); }
  function dims() {
    const d = desk();
    return { w: d.clientWidth || innerWidth, h: d.clientHeight || (innerHeight - 30) };
  }
  function sync() { if (Win.taskbar) Win.taskbar.sync(); }
  function topVisible() {
    let best = null;
    wins.forEach(function (w) {
      if (w.minimized || w.closing) return;
      if (!best || w.z > best.z) best = w;
    });
    return best;
  }

  function open(appId, args) {
    const app = Win.apps[appId];
    if (!app) {
      if (Win.ui) Win.ui.error('Cannot find the program "' + appId + '".', 'WINemulator');
      return null;
    }
    if (app.singleton) {
      const found = wins.find(function (w) { return w.appId === appId && !w.closing; });
      if (found) {
        if (found.minimized) restore(found);
        focus(found);
        if (found.api && found.api.onReopen) { try { found.api.onReopen(args || {}); } catch (e) {} }
        return found;
      }
    }

    const d = dims();
    const id = 'win_' + (++seq);
    const minW = app.minWidth || 280;
    const minH = app.minHeight || 180;
    let width = Math.min(app.width || 640, Math.max(280, d.w - 24));
    let height = Math.min(app.height || 440, Math.max(180, d.h - 24));
    width = Math.max(minW, width);
    height = Math.max(minH, height);
    const mobile = innerWidth < 760;
    const startMinimized = !!(app.startMinimized);

    let left, top;
    if (app.placement === 'center' || app.center) {
      left = Math.round((d.w - width) / 2);
      top = Math.round((d.h - height) / 2);
    } else {
      const n = wins.filter(function (w) { return !w.closing; }).length;
      left = 44 + (n % 9) * 26;
      top = 24 + (n % 9) * 22;
      left = Math.min(left, Math.max(0, d.w - width - 10));
      top = Math.min(top, Math.max(0, d.h - height - 10));
    }
    left = U.clamp(left, 0, Math.max(0, d.w - 120));
    top = U.clamp(top, 0, Math.max(0, d.h - 56));

    const winEl = el('div', { class: 'window opening' + (app.className ? ' ' + app.className : ''), id: id, role: 'dialog' });
    winEl.style.left = Math.round(left) + 'px';
    winEl.style.top = Math.round(top) + 'px';
    winEl.style.width = Math.round(width) + 'px';
    winEl.style.height = Math.round(height) + 'px';
    winEl.style.zIndex = ++zTop;

    const resizable = app.resizable !== false;
    winEl.innerHTML =
      '<div class="titlebar">' +
      '<span class="titlebar-icon">' + Win.icon(app.icon || 'exe', 16) + '</span>' +
      '<span class="titlebar-title"></span>' +
      '<span class="titlebar-btns">' +
      '<button class="tb-btn tb-min" type="button" title="Minimize" aria-label="Minimize"><span></span></button>' +
      (resizable ? '<button class="tb-btn tb-max" type="button" title="Maximize" aria-label="Maximize"><span></span></button>' : '') +
      '<button class="tb-btn tb-close" type="button" title="Close" aria-label="Close"><span></span></button>' +
      '</span></div>' +
      '<div class="window-body"></div>' +
      (resizable ? ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(function (dir) {
        return '<div class="resizer res-' + dir + '" data-dir="' + dir + '"></div>';
      }).join('') : '');

    const w = {
      id: id, appId: appId, app: app, el: winEl,
      titleEl: winEl.querySelector('.titlebar-title'),
      iconEl: winEl.querySelector('.titlebar-icon'),
      body: winEl.querySelector('.window-body'),
      title: app.title || app.name || appId,
      icon: app.icon || 'exe',
      rect: { left: left, top: top, width: width, height: height },
      prevRect: null, maximized: false, minimized: false,
      z: zTop, api: null, closing: false, createdAt: Date.now()
    };
    w.titleEl.textContent = w.title;
    wins.push(w);
    desk().querySelector('#windows').appendChild(winEl);

    const ctx = {
      win: w, app: app, args: args || {}, body: w.body,
      setTitle: function (t) { w.title = String(t); w.titleEl.textContent = w.title; sync(); },
      setIcon: function (name) {
        w.icon = name;
        w.iconEl.innerHTML = Win.icon(name, 16);
        sync();
      },
      close: function (force) { close(w, force); },
      minimize: function () { minimize(w); },
      maximize: function () { maximize(w); },
      restore: function () { restore(w); },
      focus: function () { focus(w); },
      setDirty: function (dirty) { w.dirty = !!dirty; }
    };

    winEl.addEventListener('pointerdown', function () { focus(w); }, true);
    const titlebar = winEl.querySelector('.titlebar');
    titlebar.addEventListener('pointerdown', function (ev) { beginDrag(ev, w); });
    titlebar.addEventListener('dblclick', function (ev) {
      if (ev.target.closest('.tb-btn')) return;
      if (!resizable) return;
      if (w.maximized) restoreSize(w); else maximize(w);
    });
    winEl.querySelector('.tb-min').addEventListener('click', function (ev) { ev.stopPropagation(); minimize(w); });
    const maxBtn = winEl.querySelector('.tb-max');
    if (maxBtn) maxBtn.addEventListener('click', function (ev) { ev.stopPropagation(); if (w.maximized) restoreSize(w); else maximize(w); });
    winEl.querySelector('.tb-close').addEventListener('click', function (ev) { ev.stopPropagation(); close(w); });

    if (resizable) {
      winEl.querySelectorAll('.resizer').forEach(function (handle) {
        handle.addEventListener('pointerdown', function (ev) { beginResize(ev, w, handle.dataset.dir); });
      });
    }

    try {
      const api = app.mount ? app.mount(w.body, ctx) : null;
      w.api = api || {};
    } catch (err) {
      console.error(err);
      w.body.innerHTML = '<div class="app-crash"><h3>This program has performed an illegal operation.</h3><p></p><pre></pre></div>';
      w.body.querySelector('p').textContent = err && err.message ? err.message : String(err);
      w.body.querySelector('pre').textContent = err && err.stack ? err.stack : '';
    }

    if (startMinimized) minimize(w);
    else focus(w);
    if (mobile && resizable) maximize(w);
    sync();

    winEl.addEventListener('animationend', function (ev) {
      if (ev.target === winEl) winEl.classList.remove('opening');
    }, { once: true });
    if (app.sound !== false) Win.sound.play('open');
    return w;
  }

  function focus(w) {
    if (!w || w.closing) return;
    if (w.minimized) { restore(w); return; }
    if (active === w) { sync(); return; }
    active = w;
    wins.forEach(function (x) { x.el.classList.toggle('active', x === w); });
    w.z = ++zTop;
    w.el.style.zIndex = w.z;
    sync();
  }

  function close(w, force) {
    if (!w || w.closing) return;
    if (!force && w.api && typeof w.api.onClose === 'function') {
      let result;
      try { result = w.api.onClose(); } catch (e) { console.error(e); }
      if (result === false) return;
    }
    w.closing = true;
    try { if (w.api && w.api.destroy) w.api.destroy(); } catch (e) { console.error(e); }
    w.el.classList.add('closing');
    const doRemove = function () {
      if (w.el.parentNode) w.el.parentNode.removeChild(w.el);
      const i = wins.indexOf(w);
      if (i > -1) wins.splice(i, 1);
      if (active === w) {
        active = null;
        const next = topVisible();
        if (next) focus(next);
      }
      sync();
    };
    if (Win.store.get('animations') === false) doRemove();
    else setTimeout(doRemove, 90);
    Win.sound.play('close');
  }

  function minimize(w) {
    if (!w || w.minimized || w.closing) return;
    w.minimized = true;
    w.el.classList.add('minimized');
    w.el.classList.remove('active');
    if (active === w) {
      active = null;
      const next = topVisible();
      if (next) focus(next);
    }
    Win.sound.play('minimize');
    sync();
  }

  function restore(w) {
    if (!w || w.closing) return;
    const wasMin = w.minimized;
    w.minimized = false;
    w.el.classList.remove('minimized');
    focus(w);
    if (wasMin) Win.sound.play('restore');
    sync();
  }

  function maximize(w) {
    if (!w || w.maximized || w.app.resizable === false) return;
    w.prevRect = { left: w.rect.left, top: w.rect.top, width: w.rect.width, height: w.rect.height };
    w.maximized = true;
    w.el.classList.add('maximized');
    w.minimized = false;
    w.el.classList.remove('minimized');
    focus(w);
    const btn = w.el.querySelector('.tb-max');
    if (btn) { btn.title = 'Restore'; btn.setAttribute('aria-label', 'Restore'); }
    sync();
  }

  function restoreSize(w) {
    if (!w || !w.maximized) return;
    w.maximized = false;
    w.el.classList.remove('maximized');
    if (w.prevRect) {
      w.rect = Object.assign({}, w.prevRect);
      w.el.style.left = w.rect.left + 'px';
      w.el.style.top = w.rect.top + 'px';
      w.el.style.width = w.rect.width + 'px';
      w.el.style.height = w.rect.height + 'px';
    }
    const btn = w.el.querySelector('.tb-max');
    if (btn) { btn.title = 'Maximize'; btn.setAttribute('aria-label', 'Maximize'); }
    focus(w);
    sync();
  }

  /* --------------------------------------------------------------- drag */
  function beginDrag(ev, w) {
    if (ev.button !== 0 || ev.target.closest('.tb-btn') || w.maximized || w.closing) return;
    ev.preventDefault();
    focus(w);
    const start = { x: ev.clientX, y: ev.clientY, l: w.rect.left, t: w.rect.top };
    const d = dims();
    let nx = start.l, ny = start.t, raf = 0;
    let zone = null;
    w.el.classList.add('dragging');
    document.body.classList.add('dragging');
    const bar = ev.currentTarget;
    try { bar.setPointerCapture(ev.pointerId); } catch (e) {}

    const apply = function () {
      raf = 0;
      w.el.style.left = Math.round(nx) + 'px';
      w.el.style.top = Math.round(ny) + 'px';
    };
    const move = function (e) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      nx = U.clamp(start.l + dx, -w.rect.width + 110, d.w - 110);
      ny = U.clamp(start.t + dy, 0, d.h - 32);
      if (!raf) raf = requestAnimationFrame(apply);
      const dr = desk().getBoundingClientRect();
      const nextZone = (e.clientY <= dr.top + 8) ? 'max' :
        (e.clientX <= dr.left + 8) ? 'left' :
        (e.clientX >= dr.right - 8) ? 'right' : null;
      if (nextZone !== zone) { zone = nextZone; showSnap(zone, w); }
    };
    const up = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      w.el.classList.remove('dragging');
      document.body.classList.remove('dragging');
      try { bar.releasePointerCapture(ev.pointerId); } catch (e) {}
      hideSnap();
      w.rect.left = nx;
      w.rect.top = ny;
      if (zone === 'max') { maximize(w); }
      else if (zone === 'left' || zone === 'right') {
        w.prevRect = { left: w.rect.left, top: w.rect.top, width: w.rect.width, height: w.rect.height };
        w.maximized = false;
        w.el.classList.remove('maximized');
        const half = Math.round(d.w / 2);
        w.rect = { left: zone === 'left' ? 0 : half, top: 0, width: half, height: d.h };
        w.el.style.left = w.rect.left + 'px';
        w.el.style.top = '0px';
        w.el.style.width = w.rect.width + 'px';
        w.el.style.height = w.rect.height + 'px';
      } else {
        apply();
      }
      sync();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function showSnap(zone, w) {
    if (!snapEl) snapEl = document.getElementById('snap-preview');
    if (!snapEl || !zone) return hideSnap();
    const d = dims();
    snapEl.hidden = false;
    snapEl.style.top = '0px';
    snapEl.style.height = d.h + 'px';
    if (zone === 'max') { snapEl.style.left = '0px'; snapEl.style.width = d.w + 'px'; }
    else if (zone === 'left') { snapEl.style.left = '0px'; snapEl.style.width = Math.round(d.w / 2) + 'px'; }
    else { snapEl.style.left = Math.round(d.w / 2) + 'px'; snapEl.style.width = Math.round(d.w / 2) + 'px'; }
  }
  function hideSnap() { if (snapEl) snapEl.hidden = true; }

  /* ------------------------------------------------------------- resize */
  function beginResize(ev, w, dir) {
    if (ev.button !== 0 || w.maximized || w.closing) return;
    ev.preventDefault(); ev.stopPropagation();
    focus(w);
    const start = { x: ev.clientX, y: ev.clientY, l: w.rect.left, t: w.rect.top, w: w.rect.width, h: w.rect.height };
    const minW = w.app.minWidth || 280;
    const minH = w.app.minHeight || 160;
    const d = dims();
    const handle = ev.currentTarget;
    let raf = 0;
    let r = Object.assign({}, w.rect);
    document.body.classList.add('resizing');
    document.body.classList.add('resize-' + dir);
    try { handle.setPointerCapture(ev.pointerId); } catch (e) {}

    const apply = function () {
      raf = 0;
      w.el.style.left = Math.round(r.left) + 'px';
      w.el.style.top = Math.round(r.top) + 'px';
      w.el.style.width = Math.round(r.width) + 'px';
      w.el.style.height = Math.round(r.height) + 'px';
    };
    const move = function (e) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      let left = start.l, top = start.t, width = start.w, height = start.h;
      if (dir.indexOf('e') > -1) width = U.clamp(start.w + dx, minW, d.w - start.l);
      if (dir.indexOf('s') > -1) height = U.clamp(start.h + dy, minH, d.h - start.t);
      if (dir.indexOf('w') > -1) {
        width = U.clamp(start.w - dx, minW, start.l + start.w);
        left = start.l + (start.w - width);
      }
      if (dir.indexOf('n') > -1) {
        height = U.clamp(start.h - dy, minH, start.t + start.h);
        top = start.t + (start.h - height);
      }
      r = { left: left, top: top, width: width, height: height };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const up = function () {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      document.body.classList.remove('resizing');
      document.body.classList.remove('resize-' + dir);
      try { handle.releasePointerCapture(ev.pointerId); } catch (e) {}
      w.rect = r;
      apply();
      if (w.api && w.api.onResize) { try { w.api.onResize(r); } catch (e) {} }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  /* ------------------------------------------------------------ alt+tab */
  function buildAlt() {
    altList = wins.filter(function (w) { return !w.closing; }).sort(function (a, b) { return b.z - a.z; });
    if (!altList.length) return false;
    if (altIndex >= altList.length) altIndex = 0;
    const box = document.getElementById('alttab');
    box.innerHTML = '<div class="alttab-title">Switch to</div><div class="alttab-items"></div><div class="alttab-hint">Hold Alt, press Tab, then release Alt</div>';
    const items = box.querySelector('.alttab-items');
    altList.forEach(function (w, i) {
      const item = el('div', { class: 'alttab-item' + (i === altIndex ? ' active' : '') });
      item.innerHTML = Win.icon(w.icon, 32) + '<span></span>';
      item.querySelector('span').textContent = w.title;
      item.addEventListener('pointerdown', function (e) { e.preventDefault(); altIndex = i; commitAlt(); });
      items.appendChild(item);
    });
    box.hidden = false;
    return true;
  }
  function commitAlt() {
    if (!altOpen) return;
    altOpen = false;
    const box = document.getElementById('alttab');
    if (box) box.hidden = true;
    const w = altList[altIndex];
    if (w) { if (w.minimized) restore(w); else focus(w); }
  }
  function cycleAlt(dir) {
    if (!altList.length) return;
    altIndex = (altIndex + dir + altList.length) % altList.length;
    const box = document.getElementById('alttab');
    if (!box) return;
    box.querySelectorAll('.alttab-item').forEach(function (n, i) { n.classList.toggle('active', i === altIndex); });
  }
  window.addEventListener('keydown', function (ev) {
    if (ev.key === 'Tab' && ev.altKey && !document.querySelector('.modal-overlay')) {
      ev.preventDefault();
      if (!altOpen) { altOpen = true; altIndex = 0; if (!buildAlt()) { altOpen = false; return; } }
      else cycleAlt(ev.shiftKey ? -1 : 1);
      Win.sound.play('flag');
    } else if (altOpen && ev.key === 'Escape') {
      altOpen = false;
      const box = document.getElementById('alttab');
      if (box) box.hidden = true;
    }
  }, true);
  window.addEventListener('keyup', function (ev) {
    if (altOpen && (ev.key === 'Alt' || !ev.altKey)) commitAlt();
  }, true);
  window.addEventListener('blur', function () { if (altOpen) commitAlt(); });

  /* -------------------------------------------------------- viewport fit */
  function fit() {
    const d = dims();
    wins.forEach(function (w) {
      if (w.maximized || w.closing) return;
      let changed = false;
      if (w.rect.left > d.w - 100) { w.rect.left = Math.max(0, d.w - w.rect.width); changed = true; }
      if (w.rect.top > d.h - 40) { w.rect.top = Math.max(0, d.h - 40); changed = true; }
      if (w.rect.width > d.w) { w.rect.width = d.w; changed = true; }
      if (w.rect.height > d.h) { w.rect.height = d.h; changed = true; }
      if (changed) {
        w.el.style.left = w.rect.left + 'px';
        w.el.style.top = w.rect.top + 'px';
        w.el.style.width = w.rect.width + 'px';
        w.el.style.height = w.rect.height + 'px';
      }
    });
  }
  window.addEventListener('resize', U.debounce(fit, 180));

  /* ------------------------------------------------------------- exports */
  Win.wm = {
    open: open, close: close, focus: focus, minimize: minimize, restore: restore,
    maximize: maximize, restoreSize: restoreSize, list: function () { return wins.slice(); },
    active: function () { return active; },
    closeAll: function (force) { wins.slice().forEach(function (w) { close(w, force); }); },
    fit: fit,
    get zTop() { return zTop; }
  };
})();
