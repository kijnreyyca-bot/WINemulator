/* WINemulator — VI OS Golden Gate shell
   Original mac-inspired layer: menu bar, dock, Spotlight, Launchpad,
   Control Center, calendar and app switcher. No Apple assets or branding. */
(function () {
  'use strict';
  if (!Win.isMac) return;
  const U = Win.util, el = U.el;

  /* ------------------------------------------------------------ app names */
  const RENAME = {
    notepad: { name: 'Notes', icon: 'notes' },
    terminal: { name: 'Terminal', icon: 'terminal-mac' },
    settings: { name: 'System Settings', icon: 'settings-mac' },
    taskmgr: { name: 'Activity Monitor', icon: 'activity' },
    paint: { name: 'Canvas', icon: 'canvas' },
    calc: { name: 'Calculator', icon: 'calc-mac' },
    minesweeper: { name: 'Mines', icon: 'mines-mac' },
    vpc: { name: 'Virtual PC', icon: 'vpc-mac' },
    help: { name: 'Help', icon: 'help-mac' },
    browser: { name: 'Legacy Web', icon: 'ie' },
    firefox: { name: 'Firefox', icon: 'firefox' },
    runner: { name: 'Program Runner', icon: 'exe' },
    driving: { name: 'Driving Game', icon: 'game' },
    eaglercraft: { name: 'Eaglercraft', icon: 'eaglercraft' },
    python: { name: 'Python', icon: 'python-mac' },
    js: { name: 'JS', icon: 'js-mac' }
  };
  const SEARCH_TERMS = {
    python: 'py python3 repl code interpreter',
    js: 'javascript node nodejs repl code interpreter'
  };
  const HIDDEN_APPS = { explorer: true };

  function patchApps() {
    Object.keys(RENAME).forEach(function (id) {
      const app = Win.apps[id];
      if (!app) return;
      app.name = RENAME[id].name;
      app.title = RENAME[id].name;
      app.icon = RENAME[id].icon;
    });
    if (Win.apps.files) { Win.apps.files.name = 'Files'; Win.apps.files.title = 'Files'; Win.apps.files.icon = 'files'; }
    if (Win.apps.surf) { Win.apps.surf.name = 'Surf'; Win.apps.surf.surf = true; }

    /* Explorer opens the native Files window on VI OS; the classic browser stays available. */
    if (Win.apps.explorer) {
      Win.apps['explorer-classic'] = Win.apps.explorer;
      Win.apps['explorer-classic'].name = 'Legacy File Explorer';
      Win.apps['explorer-classic'].title = 'Legacy File Explorer';
      if (Win.apps.files) Win.apps.explorer = Win.apps.files;
    }
    /* Friendly aliases so Run, Spotlight and older callers keep working. */
    const aliases = {
      notes: 'notepad', terminal: 'terminal', 'system settings': 'settings', settings: 'settings',
      activity: 'taskmgr', 'activity monitor': 'taskmgr', canvas: 'paint', calculator: 'calc',
      mines: 'minesweeper', 'virtual pc': 'vpc', 'system preferences': 'settings',
      browser: 'surf', web: 'surf', internet: 'surf', 'file explorer': 'files', finder: 'files'
    };
    Object.keys(aliases).forEach(function (a) {
      const target = aliases[a];
      if (Win.apps[target] && !Win.apps[a]) Win.apps[a] = Win.apps[target];
    });
    HIDDEN_APPS['explorer-classic'] = true;
  }

  /* --------------------------------------------------------------- helpers */
  function activeWin() { return Win.wm.active(); }
  function byId(id) { return Win.apps[id]; }
  function labelFor(id) {
    if (Win.apps[id] && Win.apps[id].name) return Win.apps[id].name;
    return String(id || '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  function iconFor(id) { return (Win.apps[id] && Win.apps[id].icon) || 'exe'; }
  function matchesSearch(id, q) {
    if (!q) return true;
    const haystack = (labelFor(id) + ' ' + (SEARCH_TERMS[id] || '')).toLowerCase();
    return haystack.indexOf(q.toLowerCase()) > -1;
  }
  function closeOverlays() {
    const ids = ['vi-spotlight', 'vi-launchpad', 'vi-cc', 'vi-cal'];
    ids.forEach(function (id) { const n = document.getElementById(id); if (n) n.remove(); });
    const mb = document.getElementById('vi-menubar');
    if (mb) mb.querySelectorAll('.open').forEach(function (n) { n.classList.remove('open'); });
    if (Win.ui) Win.ui.closeMenus();
  }
  function showMenu(items, anchor) {
    if (!items || !items.length) return;
    const r = anchor.getBoundingClientRect();
    Win.ui.menu(items, r.left, r.bottom + 3, { sound: false });
    anchor.classList.add('open');
    setTimeout(function () { anchor.classList.remove('open'); }, 180);
  }
  function openApp(id) {
    try { Win.wm.open(id); } catch (e) { if (Win.ui) Win.ui.error(e.message, 'VI OS'); }
  }
  function exec(cmd) {
    const t = document.activeElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      try { document.execCommand(cmd); return; } catch (e) {}
    }
    if (cmd === 'paste' && navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        if (t && t.tagName === 'INPUT') { t.value += text; t.dispatchEvent(new Event('input', { bubbles: true })); }
      }).catch(function () {});
      return;
    }
    if (Win.ui) Win.ui.toast('Nothing to ' + cmd.toLowerCase() + ' here.', 'info', 1500);
  }

  /* ------------------------------------------------------------- menu bar */
  function menuDefs() {
    const w = activeWin();
    const id = w ? w.appId : '';
    const isFiles = id === 'files' || id === 'explorer' || id === 'explorer-classic';
    const isSurf = id === 'surf';
    const recent = Win.recent.list().slice(0, 5);
    return {
      vi: [
        { label: 'About This Mac', icon: 'vi', action: function () { openApp('surf'); setTimeout(function () { const a = Win.wm.active(); if (a && a.api && a.api.go) a.api.go('vi://about'); }, 60); } },
        { separator: true },
        { label: 'System Settings…', icon: 'settings-mac', shortcut: '⌘,', action: function () { openApp('settings'); } },
        { label: 'App Library', icon: 'launchpad', action: function () { openLaunchpad(); } },
        { label: 'Recent Items', icon: 'search', disabled: !recent.length, action: function () {
          Win.ui.menu(recent.map(function (p) { return { label: Win.fs.baseName(p), icon: 'file', action: function () { try { Win.desktop.openPath(p); } catch (e) { Win.ui.error(e.message, 'Open'); } } }; }), 120, 60);
        } },
        { separator: true },
        { label: 'Sleep', icon: 'moon', action: function () { closeOverlays(); const b = document.createElement('div'); b.className = 'vi-power'; b.innerHTML = '<div class="vi-power-logo">' + Win.icon('moon', 60) + '</div><p>VI OS is sleeping.</p><small>Press any key or click to wake.</small>'; const layer = document.getElementById('power-layer'); layer.hidden = false; layer.className = 'power-layer'; layer.innerHTML = ''; layer.appendChild(b); const wake = function () { layer.hidden = true; layer.innerHTML = ''; document.removeEventListener('keydown', wake); layer.removeEventListener('pointerdown', wake); }; setTimeout(function () { document.addEventListener('keydown', wake); layer.addEventListener('pointerdown', wake); }, 100); } },
        { label: 'Restart…', icon: 'restart', action: function () { Win.ui.confirm('Restart VI OS?', 'Restart', 'question').then(function (y) { if (y) Win.boot.power('restart'); }); } },
        { label: 'Shut Down…', icon: 'power', action: function () { Win.ui.confirm('Shut down VI OS?', 'Shut Down', 'question').then(function (y) { if (y) Win.boot.power('shutdown'); }); } },
        { separator: true },
        { label: 'Log Out User', icon: 'user-avatar', action: function () { Win.boot.logoff(); } },
        { label: 'Switch Operating System…', icon: 'windows', action: function () { Win.showOSChooser(); } }
      ],
      file: [
        { label: 'New Window', icon: 'plus', shortcut: '⌘N', action: function () { if (id) openApp(id); else openApp('files'); } },
        { label: 'New Folder', icon: 'folder', shortcut: '⇧⌘N', action: function () { Win.wm.open('files', { path: 'C:\\Users\\User' }); } },
        { separator: true },
        { label: 'Open…', icon: 'open', shortcut: '⌘O', action: function () { openApp('files'); } },
        { label: 'Close Window', icon: 'close', shortcut: '⌘W', disabled: !w, action: function () { if (w) Win.wm.close(w); } }
      ],
      edit: [
        { label: 'Undo', icon: 'undo', shortcut: '⌘Z', action: function () { exec('undo'); } },
        { label: 'Redo', icon: 'redo', shortcut: '⇧⌘Z', action: function () { exec('redo'); } },
        { separator: true },
        { label: 'Cut', icon: 'cut', shortcut: '⌘X', action: function () { exec('cut'); } },
        { label: 'Copy', icon: 'copy', shortcut: '⌘C', action: function () { exec('copy'); } },
        { label: 'Paste', icon: 'paste', shortcut: '⌘V', action: function () { exec('paste'); } },
        { label: 'Select All', icon: 'select', shortcut: '⌘A', action: function () { exec('selectAll'); } }
      ],
      view: [
        { label: 'as Icons', icon: 'grid-view', checked: Win.store.get('viFilesView') !== 'list', disabled: !isFiles, action: function () { Win.store.set({ viFilesView: 'icons' }); if (w && w.api && w.api.setView) w.api.setView('icons'); } },
        { label: 'as List', icon: 'list-view', checked: Win.store.get('viFilesView') === 'list', disabled: !isFiles, action: function () { Win.store.set({ viFilesView: 'list' }); if (w && w.api && w.api.setView) w.api.setView('list'); } },
        { separator: true },
        { label: 'Enter Full Screen', icon: 'maximize', shortcut: '⌃⌘F', action: function () { const e = document.documentElement; if (e.requestFullscreen) e.requestFullscreen().catch(function () {}); } },
        { label: isSurf ? 'Reload Page' : 'Refresh', icon: 'refresh', shortcut: '⌘R', action: function () { if (isSurf && w && w.api && w.api.reload) w.api.reload(); else Win.desktop.render(); } }
      ],
      window: (function () {
        const list = Win.wm.list().filter(function (x) { return !x.closing; });
        const items = [
          { label: 'Minimize', icon: 'minimize', shortcut: '⌘M', disabled: !w, action: function () { if (w) Win.wm.minimize(w); } },
          { label: w && w.maximized ? 'Restore' : 'Zoom', icon: 'maximize', disabled: !w, action: function () { if (!w) return; if (w.maximized) Win.wm.restoreSize(w); else Win.wm.maximize(w); } },
          { separator: true },
          { label: 'Bring All to Front', icon: 'windows', action: function () { list.forEach(function (x) { Win.wm.restore(x); }); if (list.length) Win.wm.focus(list[list.length - 1]); } }
        ];
        if (list.length) {
          items.push({ separator: true });
          list.slice(0, 9).forEach(function (x) {
            items.push({ label: x.title, icon: x.icon, checked: x === w, action: function () { Win.wm.restore(x); Win.wm.focus(x); } });
          });
        }
        return items;
      })(),
      help: [
        { label: 'VI OS Help', icon: 'help-mac', action: function () { openApp('help'); } },
        { label: 'Surf Help', icon: 'surf', action: function () { Win.wm.open('surf', { url: 'vi://help' }); } },
        { separator: true },
        { label: 'About VI OS', icon: 'vi', action: function () { Win.wm.open('surf', { url: 'vi://about' }); } }
      ]
    };
  }

  function buildMenubar() {
    const bar = el('div', { id: 'vi-menubar', role: 'menubar', 'aria-label': 'Menu bar' });
    bar.innerHTML =
      '<button class="vi-mb-item vi-mb-brand" type="button" data-mb="vi" aria-label="VI OS menu">' + Win.icon('vi', 17) + '</button>' +
      '<button class="vi-mb-item vi-mb-app" type="button" data-mb="app">VI OS</button>' +
      '<button class="vi-mb-item" type="button" data-mb="file">File</button>' +
      '<button class="vi-mb-item" type="button" data-mb="edit">Edit</button>' +
      '<button class="vi-mb-item" type="button" data-mb="view">View</button>' +
      '<button class="vi-mb-item" type="button" data-mb="window">Window</button>' +
      '<button class="vi-mb-item" type="button" data-mb="help">Help</button>' +
      '<span class="vi-mb-spacer"></span>' +
      '<button class="vi-mb-status" type="button" data-status="wifi" aria-label="Wi-Fi">' + Win.icon('wifi', 16) + '</button>' +
      '<button class="vi-mb-status" type="button" data-status="bt" aria-label="Bluetooth">' + Win.icon('bluetooth', 15) + '</button>' +
      '<button class="vi-mb-status" type="button" data-status="cc" aria-label="Control Center">' + Win.icon('control-center', 16) + '</button>' +
      '<button class="vi-mb-status" type="button" data-status="search" aria-label="Spotlight">' + Win.icon('search', 15) + '</button>' +
      '<button class="vi-mb-status" type="button" data-status="battery" aria-label="Battery">' + Win.icon('battery', 18) + '</button>' +
      '<button class="vi-mb-clock" type="button" data-status="clock"></button>';
    document.body.appendChild(bar);

    bar.querySelectorAll('[data-mb]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const defs = menuDefs();
        const key = b.dataset.mb === 'app' ? (function () { defs.app = appMenu(activeWin()); return 'app'; })() : b.dataset.mb;
        showMenu(defs[key] || [], b);
      });
    });
    bar.querySelectorAll('[data-status]').forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const k = b.dataset.status;
        if (k === 'cc') return openControlCenter(b);
        if (k === 'search') return openSpotlight();
        if (k === 'clock') return openCalendar(b);
        if (k === 'wifi' || k === 'bt') {
          const key = k === 'wifi' ? 'viWifi' : 'viBT';
          const on = !(k === 'wifi' ? (Win.store.get(key) !== false) : !!Win.store.get(key));
          const patch = {}; patch[key] = on;
          Win.store.set(patch);
          Win.sound.play('click');
          updateStatus();
          Win.ui.toast((k === 'wifi' ? 'Wi-Fi' : 'Bluetooth') + (on ? ' turned on.' : ' turned off.'), k === 'wifi' ? 'wifi' : 'bluetooth', 1400);
        }
        if (k === 'battery') Win.ui.alert('Battery: 100%\n\nVI OS is running on simulated power. No battery is used.', 'Battery', 'battery');
      });
    });
    updateStatus();
    setInterval(updateStatus, 20000);
  }

  function appMenu(w) {
    const name = w ? labelFor(w.appId) : 'VI OS';
    return [
      { label: 'About ' + name, icon: iconFor(w ? w.appId : 'vi'), action: function () { Win.ui.alert(name + '\n\n' + Win.osNameFull + '\nBuild ' + Win.osBuild + '\n\nAn original WINemulator application.', 'About ' + name, iconFor(w ? w.appId : 'vi')); } },
      { separator: true },
      { label: 'Preferences…', icon: 'settings-mac', disabled: !w, action: function () { openApp('settings'); } },
      { label: 'Hide ' + name, icon: 'moon', shortcut: '⌘H', disabled: !w, action: function () { if (w) Win.wm.minimize(w); } },
      { separator: true },
      { label: 'Quit ' + name, icon: 'power', shortcut: '⌘Q', disabled: !w, action: function () { if (w) Win.wm.close(w); } }
    ];
  }

  function updateStatus() {
    const bar = document.getElementById('vi-menubar');
    if (!bar) return;
    const wifi = Win.store.get('viWifi') !== false;
    const bt = !!Win.store.get('viBT');
    bar.querySelector('[data-status="wifi"]').classList.toggle('off', !wifi);
    bar.querySelector('[data-status="bt"]').classList.toggle('off', !bt);
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const day = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    bar.querySelector('.vi-mb-clock').textContent = day + '  ' + time;
    const appBtn = bar.querySelector('.vi-mb-app');
    const w = activeWin();
    appBtn.textContent = w ? labelFor(w.appId) : 'VI OS';
  }

  /* ----------------------------------------------------------------- dock */
  const DOCK = [
    { app: 'files', label: 'Files', icon: 'files' },
    { app: 'surf', label: 'Surf', icon: 'surf' },
    { app: 'notepad', label: 'Notes', icon: 'notes' },
    { app: 'terminal', label: 'Terminal', icon: 'terminal-mac' },
    { app: 'paint', label: 'Canvas', icon: 'canvas' },
    { app: 'calc', label: 'Calculator', icon: 'calc-mac' },
    { app: 'python', label: 'Python', icon: 'python-mac' },
    { app: 'js', label: 'JS', icon: 'js-mac' },
    { app: 'settings', label: 'System Settings', icon: 'settings-mac' },
    { app: 'taskmgr', label: 'Activity Monitor', icon: 'activity' },
    { app: 'minesweeper', label: 'Mines', icon: 'mines-mac' },
    { app: 'vpc', label: 'Virtual PC', icon: 'vpc-mac' },
    { app: 'help', label: 'Help', icon: 'help-mac' }
  ];

  function buildDock() {
    const dock = el('div', { id: 'vi-dock', role: 'toolbar', 'aria-label': 'Dock' });
    const launch = el('button', { class: 'vi-dock-item', type: 'button', title: 'Launchpad' });
    launch.innerHTML = '<span class="vi-dock-ico">' + Win.icon('launchpad', 46) + '</span><span class="vi-dock-tip">Launchpad</span>';
    launch.addEventListener('click', function () { openLaunchpad(); });
    dock.appendChild(launch);
    dock.appendChild(el('span', { class: 'vi-dock-sep' }));

    DOCK.forEach(function (d) {
      const b = el('button', { class: 'vi-dock-item', type: 'button', title: d.label, dataset: { dockApp: d.app } });
      b.innerHTML = '<span class="vi-dock-ico">' + Win.icon(d.icon, 46) + '</span><span class="vi-dock-tip"></span>';
      b.querySelector('.vi-dock-tip').textContent = d.label;
      b.addEventListener('click', function () { toggleDockApp(d.app); });
      dock.appendChild(b);
    });

    dock.appendChild(el('span', { class: 'vi-dock-sep' }));
    const trash = el('button', { class: 'vi-dock-item', type: 'button', title: 'Trash' });
    trash.innerHTML = '<span class="vi-dock-ico">' + Win.icon('trash', 46) + '</span><span class="vi-dock-tip">Trash</span>';
    trash.addEventListener('click', function () { Win.wm.open('files', { path: '::trash' }); });
    dock.appendChild(trash);
    document.body.appendChild(dock);

    dock.addEventListener('pointermove', function (ev) {
      dock.querySelectorAll('.vi-dock-item').forEach(function (item) {
        const r = item.getBoundingClientRect();
        const dist = Math.abs((r.left + r.width / 2) - ev.clientX);
        const s = 1 + 0.42 * Math.max(0, 1 - dist / 115);
        item.style.setProperty('--s', s.toFixed(3));
      });
    });
    dock.addEventListener('pointerleave', function () {
      dock.querySelectorAll('.vi-dock-item').forEach(function (item) { item.style.setProperty('--s', '1'); });
    });
  }

  function dockRunning() {
    const list = Win.wm.list().filter(function (w) { return !w.closing && !w.minimized; });
    document.querySelectorAll('#vi-dock [data-dock-app]').forEach(function (b) {
      b.classList.toggle('running', list.some(function (w) { return w.appId === b.dataset.dockApp; }));
    });
  }
  function toggleDockApp(id) {
    const found = Win.wm.list().find(function (w) { return w.appId === id && !w.closing; });
    if (found) {
      if (found.minimized) Win.wm.restore(found);
      if (Win.wm.active() === found) Win.wm.minimize(found); else Win.wm.focus(found);
    } else openApp(id);
  }

  /* ------------------------------------------------------------ Spotlight */
  function spotlightItems(q) {
    const out = [];
    const apps = Object.keys(Win.apps).filter(function (id) { return !HIDDEN_APPS[id]; });
    apps.forEach(function (id) {
      out.push({ icon: iconFor(id), name: labelFor(id), sub: 'Application', kind: 'app', id: id });
    });
    [['System Settings', 'settings'], ['Launchpad', 'launchpad'], ['Shut Down VI OS', 'power'], ['Switch Operating System', 'windows'], ['Open Trash', 'trash']].forEach(function (a) {
      out.push({ icon: a[1], name: a[0], sub: 'Action', kind: 'action', id: a[1] });
    });
    if (q) {
      try {
        Win.fs.search(q).slice(0, 20).forEach(function (e) {
          out.push({ icon: e.icon || 'file', name: e.name, sub: e.path, kind: 'file', path: e.path });
        });
      } catch (e) {}
    }
    if (!q) return out.slice(0, 14);
    return out.filter(function (i) {
      return (i.name + ' ' + i.sub).toLowerCase().indexOf(q.toLowerCase()) > -1 ||
        (i.kind === 'app' && matchesSearch(i.id, q));
    }).slice(0, 24);
  }

  function runSpotlight(row) {
    closeOverlays();
    if (!row) return;
    if (row.kind === 'app') return openApp(row.id);
    if (row.kind === 'file') { try { Win.desktop.openPath(row.path); } catch (e) { Win.ui.error(e.message, 'Open'); } return; }
    if (row.id === 'launchpad') return openLaunchpad();
    if (row.id === 'power') return Win.boot.power('shutdown');
    if (row.id === 'windows') return Win.showOSChooser();
    if (row.id === 'trash') return Win.wm.open('files', { path: '::trash' });
    if (row.id === 'settings') return openApp('settings');
  }

  function openSpotlight() {
    closeOverlays();
    const overlay = el('div', { id: 'vi-spotlight', class: 'vi-spotlight' });
    overlay.innerHTML =
      '<div class="vi-spot-box">' +
        '<div class="vi-spot-search">' + Win.icon('search', 19) +
          '<input type="text" placeholder="Spotlight Search" aria-label="Spotlight Search">' +
          '<span class="vi-spot-esc">esc</span></div>' +
        '<div class="vi-spot-results"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    const input = overlay.querySelector('input');
    const results = overlay.querySelector('.vi-spot-results');
    let rows = [], idx = 0;
    function draw() {
      rows = spotlightItems(input.value.trim());
      if (idx >= rows.length) idx = 0;
      if (!rows.length) { results.innerHTML = '<div class="vi-spot-empty">No results.</div>'; return; }
      let html = '<div class="vi-spot-group">Top Hits</div>';
      rows.forEach(function (r, i) {
        html += '<div class="vi-spot-row' + (i === idx ? ' active' : '') + '" data-i="' + i + '">' +
          Win.icon(r.icon, 22) + '<span class="vi-spot-name"></span><span class="vi-spot-sub"></span></div>';
      });
      results.innerHTML = html;
      results.querySelectorAll('.vi-spot-row').forEach(function (node) {
        node.querySelector('.vi-spot-name').textContent = rows[+node.dataset.i].name;
        node.querySelector('.vi-spot-sub').textContent = rows[+node.dataset.i].sub;
        node.addEventListener('click', function () { runSpotlight(rows[+node.dataset.i]); });
      });
    }
    input.addEventListener('input', function () { idx = 0; draw(); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { idx = Math.min(rows.length - 1, idx + 1); draw(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { runSpotlight(rows[idx]); ev.preventDefault(); }
      else if (ev.key === 'Escape') { closeOverlays(); ev.preventDefault(); }
    });
    overlay.addEventListener('pointerdown', function (ev) { if (ev.target === overlay) closeOverlays(); });
    draw();
    setTimeout(function () { input.focus(); }, 10);
  }

  /* ------------------------------------------------------------ Launchpad */
  function openLaunchpad() {
    closeOverlays();
    const overlay = el('div', { id: 'vi-launchpad', class: 'vi-launchpad' });
    const ids = Object.keys(Win.apps).filter(function (id) { return !HIDDEN_APPS[id]; });
    overlay.innerHTML = '<input class="field vi-lp-search" type="search" placeholder="Search apps" aria-label="Search apps">' +
      '<div class="vi-lp-grid"></div><div class="vi-lp-hint">Click an app to open it · Esc to close</div>';
    document.body.appendChild(overlay);
    const grid = overlay.querySelector('.vi-lp-grid');
    const input = overlay.querySelector('.vi-lp-search');
    function draw() {
      const q = input.value.trim().toLowerCase();
      grid.innerHTML = '';
      ids.filter(function (id) { return matchesSearch(id, q); }).forEach(function (id) {
        const b = el('button', { class: 'vi-lp-app', type: 'button' });
        b.innerHTML = '<span class="vi-lp-ico">' + Win.icon(iconFor(id), 64) + '</span><span></span>';
        b.querySelector('span:last-child').textContent = labelFor(id);
        b.addEventListener('click', function () { closeOverlays(); openApp(id); });
        grid.appendChild(b);
      });
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeOverlays();
      if (ev.key === 'Enter') { const first = grid.querySelector('.vi-lp-app'); if (first) first.click(); }
    });
    overlay.addEventListener('pointerdown', function (ev) { if (ev.target === overlay) closeOverlays(); });
    draw();
    setTimeout(function () { input.focus(); }, 10);
  }

  /* ------------------------------------------------------- Control Center */
  function openControlCenter(anchor) {
    const existing = document.getElementById('vi-cc');
    if (existing) { existing.remove(); return; }
    closeOverlays();
    const cc = el('div', { id: 'vi-cc', class: 'vi-cc' });
    const wifi = Win.store.get('viWifi') !== false;
    const bt = !!Win.store.get('viBT');
    const wall = Win.store.get('wallpaper') || 'gate';
    cc.innerHTML =
      '<div class="vi-cc-grid">' +
        '<button class="vi-cc-tile' + (wifi ? ' on' : '') + '" type="button" data-cc="wifi"><span class="vi-cc-ico">' + Win.icon('wifi', 18) + '</span><span><b>Wi-Fi</b><small>' + (wifi ? 'Connected' : 'Off') + '</small></span></button>' +
        '<button class="vi-cc-tile' + (bt ? ' on' : '') + '" type="button" data-cc="bt"><span class="vi-cc-ico">' + Win.icon('bluetooth', 18) + '</span><span><b>Bluetooth</b><small>' + (bt ? 'On' : 'Off') + '</small></span></button>' +
      '</div>' +
      '<div class="vi-cc-section">' +
        '<div class="vi-cc-row">' + Win.icon('sun', 15) + '<input type="range" id="vi-bri" min="20" max="100" value="' + (Win.store.get('viBrightness') || 100) + '"></div>' +
        '<div class="vi-cc-row">' + Win.icon('speaker', 15) + '<input type="range" id="vi-vol" min="0" max="100" value="' + (Win.store.get('volume') == null ? 70 : Win.store.get('volume')) + '"></div>' +
      '</div>' +
      '<div class="vi-cc-section"><b>Wallpaper</b><div class="vi-cc-walls">' +
        ['gate', 'dune', 'aurora', 'graphite'].map(function (w) {
          return '<button class="vi-cc-wall w-' + w + (wall === w ? ' active' : '') + '" type="button" data-wall="' + w + '" title="' + w + '"></button>';
        }).join('') + '</div></div>' +
      '<div class="vi-cc-foot">' +
        '<button class="btn" type="button" data-cc="settings">Settings</button>' +
        '<button class="btn" type="button" data-cc="lock">Lock</button>' +
        '<button class="btn" type="button" data-cc="restart">Restart</button>' +
      '</div>';
    document.body.appendChild(cc);
    if (!document.getElementById('vi-brightness')) {
      const dim = el('div', { id: 'vi-brightness' });
      document.body.appendChild(dim);
    }
    function applyBrightness() {
      const v = parseInt(document.getElementById('vi-bri').value, 10);
      Win.store.set({ viBrightness: v });
      document.getElementById('vi-brightness').style.opacity = String((100 - v) / 155);
    }
    applyBrightness();

    cc.querySelectorAll('[data-cc]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.dataset.cc;
        if (k === 'wifi' || k === 'bt') {
          const key = k === 'wifi' ? 'viWifi' : 'viBT';
          const on = !(key === 'viWifi' ? (Win.store.get(key) !== false) : !!Win.store.get(key));
          const patch = {}; patch[key] = on; Win.store.set(patch);
          updateStatus(); b.classList.toggle('on', on);
          const small = b.querySelector('small'); if (small) small.textContent = k === 'wifi' ? (on ? 'Connected' : 'Off') : (on ? 'On' : 'Off');
        } else if (k === 'settings') { closeOverlays(); openApp('settings'); }
        else if (k === 'lock') { closeOverlays(); Win.boot.logoff(); }
        else if (k === 'restart') { closeOverlays(); Win.boot.power('restart'); }
      });
    });
    cc.querySelectorAll('[data-wall]').forEach(function (b) {
      b.addEventListener('click', function () {
        Win.store.set({ wallpaper: b.dataset.wall });
        cc.querySelectorAll('.vi-cc-wall').forEach(function (n) { n.classList.toggle('active', n === b); });
        Win.desktop.applySettings();
      });
    });
    document.getElementById('vi-bri').addEventListener('input', applyBrightness);
    document.getElementById('vi-vol').addEventListener('input', function () {
      Win.store.set({ volume: parseInt(this.value, 10) });
    });
    const close = function (ev) { if (!cc.contains(ev.target) && ev.target !== anchor) { cc.remove(); document.removeEventListener('pointerdown', close, true); } };
    setTimeout(function () { document.addEventListener('pointerdown', close, true); }, 0);
  }

  /* -------------------------------------------------------------- calendar */
  function openCalendar(anchor) {
    const existing = document.getElementById('vi-cal');
    if (existing) { existing.remove(); return; }
    closeOverlays();
    const cal = el('div', { id: 'vi-cal', class: 'vi-cal' });
    document.body.appendChild(cal);
    let view = new Date(); view.setDate(1);
    function draw() {
      const now = new Date();
      const year = view.getFullYear(), month = view.getMonth();
      const first = new Date(year, month, 1).getDay();
      const days = new Date(year, month + 1, 0).getDate();
      let html = '<div class="vi-cal-head"><button type="button" data-m="-1">‹</button><span>' +
        view.toLocaleDateString([], { month: 'long', year: 'numeric' }) + '</span><button type="button" data-m="1">›</button></div><div class="vi-cal-grid">';
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (d) { html += '<span class="dow">' + d + '</span>'; });
      for (let i = 0; i < first; i++) html += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const today = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        html += '<span class="day' + (today ? ' today' : '') + '">' + d + '</span>';
      }
      html += '</div><div class="vi-cal-foot">' + now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '</div>';
      cal.innerHTML = html;
      cal.querySelectorAll('[data-m]').forEach(function (b) {
        b.addEventListener('click', function () { view.setMonth(view.getMonth() + parseInt(b.dataset.m, 10)); draw(); });
      });
    }
    draw();
    const close = function (ev) { if (!cal.contains(ev.target) && ev.target !== anchor) { cal.remove(); document.removeEventListener('pointerdown', close, true); } };
    setTimeout(function () { document.addEventListener('pointerdown', close, true); }, 0);
  }

  /* --------------------------------------------------------- app switcher */
  let switcherOpen = false, switcherIdx = 0, switcherList = [];
  function drawSwitcher() {
    let box = document.getElementById('vi-alttab-mac');
    if (!box) {
      box = el('div', { id: 'vi-alttab-mac', class: 'alttab' });
      document.body.appendChild(box);
    }
    box.hidden = false;
    let html = '<div class="alttab-title">Open applications</div><div class="alttab-items">';
    switcherList.forEach(function (w, i) {
      html += '<button class="alttab-item' + (i === switcherIdx ? ' active' : '') + '" type="button" data-i="' + i + '">' +
        Win.icon(w.icon, 40) + '<span></span></button>';
    });
    html += '</div><div class="alttab-hint">Release to switch · Esc to cancel</div>';
    box.innerHTML = html;
    box.querySelectorAll('.alttab-item').forEach(function (b) {
      b.querySelector('span').textContent = switcherList[+b.dataset.i].title;
      b.addEventListener('click', function () { finishSwitcher(); });
    });
  }
  function openSwitcher() {
    switcherList = Win.wm.list().filter(function (w) { return !w.closing; });
    if (!switcherList.length) return;
    const active = Win.wm.active();
    switcherIdx = Math.max(0, switcherList.indexOf(active));
    switcherOpen = true;
    drawSwitcher();
  }
  function cycleSwitcher(back) {
    if (!switcherOpen) return;
    switcherIdx = (switcherIdx + (back ? -1 : 1) + switcherList.length) % switcherList.length;
    drawSwitcher();
  }
  function finishSwitcher() {
    if (!switcherOpen) return;
    const w = switcherList[switcherIdx];
    switcherOpen = false;
    const box = document.getElementById('vi-alttab-mac');
    if (box) box.remove();
    if (w) { Win.wm.restore(w); Win.wm.focus(w); }
  }
  function cancelSwitcher() {
    switcherOpen = false;
    const box = document.getElementById('vi-alttab-mac');
    if (box) box.remove();
  }

  /* ------------------------------------------------------------- shortcuts */
  function onKey(ev) {
    const mod = ev.metaKey || ev.ctrlKey;
    if (ev.key === 'Escape') {
      if (switcherOpen) { cancelSwitcher(); ev.preventDefault(); return; }
      const spot = document.getElementById('vi-spotlight');
      const lp = document.getElementById('vi-launchpad');
      const cc = document.getElementById('vi-cc');
      const cal = document.getElementById('vi-cal');
      if (spot || lp || cc || cal) { closeOverlays(); ev.preventDefault(); }
      return;
    }
    if (!mod) return;
    const k = ev.key.toLowerCase();
    if (k === ' ' || ev.code === 'Space') { ev.preventDefault(); if (!document.getElementById('vi-spotlight')) openSpotlight(); return; }
    if (ev.key === 'Tab' && !ev.shiftKey) { ev.preventDefault(); if (!switcherOpen) openSwitcher(); else cycleSwitcher(false); return; }
    if (ev.key === 'Tab' && ev.shiftKey) { ev.preventDefault(); if (!switcherOpen) openSwitcher(); else cycleSwitcher(true); return; }
    if (k === ',') { ev.preventDefault(); openApp('settings'); return; }
    if (k === 'w') { ev.preventDefault(); const w = activeWin(); if (w) Win.wm.close(w); return; }
    if (k === 'm') { ev.preventDefault(); const w = activeWin(); if (w) Win.wm.minimize(w); return; }
    if (k === 'n') { ev.preventDefault(); const w = activeWin(); openApp(w ? w.appId : 'files'); return; }
    if (k === 'l') { ev.preventDefault(); Win.wm.open('surf'); return; }
    if (k === 'h') { ev.preventDefault(); const w = activeWin(); if (w) Win.wm.minimize(w); return; }
    if (k === 'q') { ev.preventDefault(); const w = activeWin(); if (w) Win.wm.close(w); return; }
    if (k === 'f' && ev.shiftKey) { ev.preventDefault(); openSpotlight(); }
  }
  function onKeyUp(ev) {
    if (switcherOpen && (ev.key === 'Meta' || ev.key === 'Control')) finishSwitcher();
  }

  /* ------------------------------------------------------- boot / logon */
  function viBootMarkup() {
    return '<div class="vi-boot">' +
      '<div class="vi-boot-logo">' + Win.icon('vi', 104) + '</div>' +
      '<div class="vi-boot-word">VI <span>OS</span></div>' +
      '<div class="vi-boot-sub">' + Win.osEdition + ' &middot; ' + Win.osVersion + '</div>' +
      '<div class="vi-boot-bar"><i></i></div>' +
      '<div class="vi-boot-copy">VI Systems &middot; WINemulator Project</div>' +
      '<div class="bs-hint vi-boot-hint">Starting VI OS…</div>' +
      '</div>';
  }
  function patchBoot() {
    const origStart = Win.boot.start;
    Win.boot.start = function () {
      origStart();
      const layer = document.getElementById('boot-layer');
      if (!layer) return;
      layer.innerHTML = viBootMarkup();
      layer.className = 'boot-layer splash';
      layer.style.background = 'transparent';
      const obs = new MutationObserver(function () {
        if (layer.querySelector('.boot-splash, .xp-boot-splash, .w7-boot-splash, .w9-boot-splash, .bios-screen')) {
          layer.innerHTML = viBootMarkup();
          layer.className = 'boot-layer splash';
          layer.style.background = 'transparent';
        }
        if (document.body.classList.contains('booted')) obs.disconnect();
      });
      obs.observe(layer, { childList: true });
      setTimeout(function () { obs.disconnect(); }, 5000);
    };

    const origLogoff = Win.boot.logoff;
    Win.boot.logoff = function () {
      origLogoff();
      setTimeout(function () {
        const layer = document.getElementById('login-layer');
        if (!layer || layer.hidden) return;
        layer.innerHTML =
          '<div class="vi-login">' +
            '<div class="vi-login-avatar">' + Win.icon('user-avatar', 44) + '</div>' +
            '<h2>User</h2><p class="vi-login-sub">Welcome back. Enter your password to continue.</p>' +
            '<input class="field" type="password" placeholder="Password" aria-label="Password" autocomplete="off">' +
            '<button class="btn default" type="button">Sign In</button>' +
            '<div class="vi-login-note">Any password works — your data never leaves this browser.</div>' +
            '<div class="vi-login-foot">VI OS ' + Win.osVersion + ' &middot; ' + Win.osEdition + '</div>' +
          '</div>';
        const input = layer.querySelector('input');
        const signIn = function () { Win.boot.login(); };
        input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') signIn(); });
        layer.querySelector('button').addEventListener('click', signIn);
        setTimeout(function () { try { input.focus(); } catch (e) {} }, 40);
      }, 230);
    };

    const origPower = Win.boot.power;
    Win.boot.power = function (mode) {
      mode = mode || 'shutdown';
      origPower(mode);
      if (mode === 'dos') return;
      const layer = document.getElementById('power-layer');
      setTimeout(function () {
        if (!layer || layer.hidden) return;
        layer.className = 'power-layer';
        layer.innerHTML = '<div class="vi-power"><div class="vi-power-logo">' + Win.icon('vi', 82) + '</div>' +
          '<div class="vi-power-spin"></div><p>' + (mode === 'restart' ? 'Restarting VI OS…' : 'Shutting down VI OS…') + '</p>' +
          '<small>VI Systems</small></div>';
      }, 260);
      if (mode === 'shutdown') {
        setTimeout(function () {
          if (!layer || layer.hidden) return;
          layer.className = 'power-layer safe-off';
          layer.innerHTML = '<div class="vi-power"><div class="vi-power-logo">' + Win.icon('vi', 82) + '</div>' +
            '<p>VI OS has shut down.</p><small>You can safely close this tab.</small>' +
            '<button class="btn default" type="button">' + Win.icon('restart', 15) + ' Start Again</button></div>';
          layer.querySelector('button').addEventListener('click', function () { layer.hidden = true; Win.boot.start(); });
          const key = function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); document.removeEventListener('keydown', key); layer.hidden = true; Win.boot.start(); }
          };
          document.addEventListener('keydown', key);
        }, 1620);
      }
    };
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    patchApps();
    patchBoot();
    buildMenubar();
    buildDock();
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);
    const origSync = Win.taskbar.sync;
    Win.taskbar.sync = function () { if (origSync) origSync.apply(this, arguments); dockRunning(); updateStatus(); };
    Win.vi = {
      spotlight: openSpotlight,
      launchpad: openLaunchpad,
      controlCenter: openControlCenter,
      closeOverlays: closeOverlays,
      bootMarkup: viBootMarkup
    };
    dockRunning();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
