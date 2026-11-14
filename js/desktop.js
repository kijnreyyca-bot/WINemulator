/* WINemulator — desktop, icons, shell integration, shortcuts */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  const ICON_KEY = 'winemulator.iconpos.v1';
  const CELL_W = 88, CELL_H = 88, PAD_X = 14, PAD_Y = 12;
  let iconPos = {};
  let selected = new Set();
  let iconOrder = [];
  let lastTap = { id: null, time: 0 };

  try { iconPos = JSON.parse(localStorage.getItem(ICON_KEY) || '{}') || {}; } catch (e) { iconPos = {}; }

  /* --------------------------------------------------------------- recent */
  const RECENT_KEY = 'winemulator.recent.v1';
  function readRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
  }
  Win.recent = {
    list: function () { return readRecent().filter(function (p) { return Win.fs.exists(p); }); },
    add: function (path) {
      if (!path) return;
      let list = readRecent().filter(function (p) { return p.toLowerCase() !== String(path).toLowerCase(); });
      list.unshift(path);
      list = list.slice(0, 10);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
    },
    clear: function () { try { localStorage.removeItem(RECENT_KEY); } catch (e) {} }
  };

  /* ---------------------------------------------------------------- shell */
  function openPath(path) {
    if (!path) return;
    if (path === '::computer') return Win.wm.open('explorer', { path: '::computer' });
    if (path === '::recycle') return Win.wm.open('explorer', { path: '::recycle' });
    const node = Win.fs.resolve(path);
    if (!node) throw new Error('The path "' + path + '" does not exist.');
    if (node.type === 'dir') return Win.wm.open('explorer', { path: Win.fs.norm(path) });
    return openFile(path);
  }

  function openFile(path) {
    const node = Win.fs.resolve(path);
    if (!node || node.type !== 'file') throw new Error('The file "' + path + '" could not be found.');
    const app = node.app || Win.fs.appFor(path);
    if (!app) {
      return Win.ui.error('Windows cannot open this file:\n\n' + Win.fs.baseName(path) +
        '\n\nThis file type is not associated with any program in WINemulator.', 'Open With');
    }
    Win.recent.add(path);
    return Win.wm.open(app, { path: path });
  }

  function run(cmd) {
    return new Promise(function (resolve, reject) {
      let raw = String(cmd || '').trim();
      if (!raw) return reject(new Error('You must type the name of a program.'));
      if ((raw.charAt(0) === '"' && raw.charAt(raw.length - 1) === '"') || (raw.charAt(0) === "'" && raw.charAt(raw.length - 1) === "'")) {
        raw = raw.slice(1, -1).trim();
      }
      const lower = raw.toLowerCase();
      if (Win.fs.exists(raw)) { try { return resolve(openPath(raw)); } catch (e) { return reject(e); } }
      if (/^(https?:\/\/|www\.)/i.test(raw) || /^winemulator:\/\//i.test(raw)) {
        return resolve(Win.wm.open('browser', { url: raw }));
      }
      if (/^[a-z]:\\/i.test(raw)) {
        return Win.fs.exists(raw) ? resolve(openPath(raw)) : reject(new Error('Windows cannot find "' + raw + '". Check the path and try again.'));
      }
      const map = {
        notepad: 'notepad', mspaint: 'paint', paint: 'paint', calc: 'calc', calculator: 'calc',
        explorer: 'explorer', cmd: 'terminal', command: 'terminal', terminal: 'terminal', dos: 'terminal',
        winmine: 'minesweeper', minesweeper: 'minesweeper', control: 'settings', settings: 'settings',
        taskmgr: 'taskmgr', 'task manager': 'taskmgr', iexplore: 'browser', ie: 'browser', internet: 'browser',
        vpc: 'vpc', 'virtual pc': 'vpc', virtualpc: 'vpc', virtual: 'vpc',
        help: 'help', welcome: 'help', about: 'help', recycle: 'explorer'
      };
      if (map[lower]) {
        if (lower === 'recycle') return resolve(Win.wm.open('explorer', { path: '::recycle' }));
        if (lower === 'explorer') return resolve(Win.wm.open('explorer', { path: 'C:\\' }));
        return resolve(Win.wm.open(map[lower]));
      }
      const parts = raw.split(/\s+/);
      const head = parts[0].toLowerCase();
      const rest = parts.slice(1).join(' ').replace(/^"|"$/g, '');
      if (map[head] && rest) {
        const appId = map[head];
        if (appId === 'notepad' || appId === 'paint') {
          if (Win.fs.exists(rest)) return resolve(Win.wm.open(appId, { path: Win.fs.norm(rest) }));
        }
        if (appId === 'browser') {
          return resolve(Win.wm.open('browser', { url: rest }));
        }
      }
      reject(new Error('Windows cannot find "' + raw + '".\n\nMake sure you typed the name correctly, and then try again. To search for a file, use the Find command on the Start menu.'));
    });
  }

  Win.shell = { openPath: openPath, openFile: openFile, run: run };

  /* ---------------------------------------------------------------- icons */
  function builtins() {
    const recycleCount = Win.fs.recycleCount();
    return [
      { id: 'computer', label: 'My Computer', icon: 'computer', open: function () { openPath('::computer'); }, special: true },
      { id: 'documents', label: 'My Documents', icon: 'documents', open: function () { openPath('C:\\My Documents'); }, special: true },
      { id: 'ie', label: 'Internet Explorer', icon: 'ie', open: function () { Win.wm.open('browser'); }, special: true },
      { id: 'notepad', label: 'Notepad', icon: 'notepad', open: function () { Win.wm.open('notepad'); }, special: true },
      { id: 'paint', label: 'Paint', icon: 'paint', open: function () { Win.wm.open('paint'); }, special: true },
      { id: 'vpc', label: 'Virtual PC', icon: 'vpc', open: function () { Win.wm.open('vpc'); }, special: true },
      { id: 'minesweeper', label: 'Minesweeper', icon: 'mine', open: function () { Win.wm.open('minesweeper'); }, special: true },
      { id: 'recycle', label: 'Recycle Bin', icon: recycleCount ? 'recycle-full' : 'recycle', open: function () { openPath('::recycle'); }, special: true },
      { id: 'help', label: 'Help', icon: 'help', open: function () { Win.wm.open('help'); }, special: true }
    ];
  }

  function deskPath() { return 'C:\\Windows\\Desktop'; }

  function collectIcons() {
    const out = builtins();
    try {
      Win.fs.list(deskPath()).forEach(function (entry) {
        out.push({
          id: 'fs:' + entry.path, label: entry.name, icon: entry.icon, path: entry.path,
          open: function () { if (entry.type === 'dir') Win.wm.open('explorer', { path: entry.path }); else openFile(entry.path); }
        });
      });
    } catch (e) {}
    return out;
  }

  function cellKey(c, r) { return c + ':' + r; }
  function gridSize() {
    const d = document.getElementById('desktop');
    return {
      cols: Math.max(1, Math.floor((d.clientWidth - PAD_X) / CELL_W)),
      rows: Math.max(1, Math.floor((d.clientHeight - PAD_Y) / CELL_H))
    };
  }
  function pixelFor(c, r) { return { x: PAD_X + c * CELL_W, y: PAD_Y + r * CELL_H }; }
  function cellOccupied(used, c, r) { return Object.keys(used).some(function (k) { return k === cellKey(c, r); }); }

  function assignPositions(icons) {
    const g = gridSize();
    const used = {};
    iconOrder = icons.map(function (i) { return i.id; });
    icons.forEach(function (ic) {
      const p = iconPos[ic.id];
      if (p && p.c >= 0 && p.r >= 0 && p.c < g.cols && p.r < g.rows && !cellOccupied(used, p.c, p.r)) {
        used[cellKey(p.c, p.r)] = ic.id;
      } else if (p) { delete iconPos[ic.id]; }
    });
    let idx = 0;
    icons.forEach(function (ic) {
      if (iconPos[ic.id]) return;
      while (idx < g.cols * g.rows && cellOccupied(used, Math.floor(idx / g.rows), idx % g.rows)) idx++;
      const c = Math.min(g.cols - 1, Math.floor(idx / g.rows));
      const r = idx % g.rows;
      iconPos[ic.id] = { c: c, r: r };
      used[cellKey(c, r)] = ic.id;
      idx++;
    });
    localStorage.setItem(ICON_KEY, JSON.stringify(iconPos));
  }

  function savePositions() { try { localStorage.setItem(ICON_KEY, JSON.stringify(iconPos)); } catch (e) {} }

  function selectOnly(id) {
    selected.clear();
    if (id) selected.add(id);
    paintSelection();
  }
  function paintSelection() {
    document.querySelectorAll('#icons .desk-icon').forEach(function (n) {
      n.classList.toggle('selected', selected.has(n.dataset.id));
    });
  }

  function renderIcons() {
    const layer = document.getElementById('icons');
    if (!layer) return;
    const icons = collectIcons();
    assignPositions(icons);
    layer.innerHTML = '';
    icons.forEach(function (ic) {
      const p = pixelFor(iconPos[ic.id].c, iconPos[ic.id].r);
      const node = el('div', {
        class: 'desk-icon' + (selected.has(ic.id) ? ' selected' : ''),
        dataset: { id: ic.id }, tabindex: '0', title: ic.label,
        style: { left: p.x + 'px', top: p.y + 'px' }, role: 'button'
      });
      node.innerHTML = '<span class="di-icon">' + Win.icon(ic.icon, Win.isXP ? 46 : 34) + '</span><span class="di-label"></span>';
      node.querySelector('.di-label').textContent = ic.label;
      layer.appendChild(node);
      bindIcon(node, ic);
    });
    paintSelection();
  }

  function bindIcon(node, ic) {
    let moved = false, dragging = false;
    node.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      const start = { x: ev.clientX, y: ev.clientY, left: parseInt(node.style.left, 10), top: parseInt(node.style.top, 10) };
      selected.clear();
      selected.add(ic.id);
      paintSelection();
      node.focus({ preventScroll: true });
      let raf = 0, nx = start.left, ny = start.top;
      const move = function (e) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!dragging && Math.abs(dx) + Math.abs(dy) < 5) return;
        if (!dragging) {
          dragging = true;
          moved = true;
          node.classList.add('dragging');
          document.body.classList.add('icon-dragging');
        }
        const d = document.getElementById('desktop');
        nx = U.clamp(start.left + dx, 2, d.clientWidth - 78);
        ny = U.clamp(start.top + dy, 2, d.clientHeight - 76);
        if (!raf) raf = requestAnimationFrame(function () { raf = 0; node.style.left = nx + 'px'; node.style.top = ny + 'px'; });
      };
      const up = function (e) {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        node.classList.remove('dragging');
        document.body.classList.remove('icon-dragging');
        if (!dragging) {
          if (e.pointerType === 'touch') {
            const t = Date.now();
            if (lastTap.id === ic.id && t - lastTap.time < 420) {
              lastTap.id = null; lastTap.time = 0;
              ic.open();
            } else { lastTap.id = ic.id; lastTap.time = t; }
          }
          return;
        }
        dragging = false;
        const g = gridSize();
        let c = U.clamp(Math.round((nx - PAD_X) / CELL_W), 0, g.cols - 1);
        let r = U.clamp(Math.round((ny - PAD_Y) / CELL_H), 0, g.rows - 1);
        const used = {};
        Object.keys(iconPos).forEach(function (id) {
          if (id === ic.id) return;
          const p = iconPos[id];
          if (p) used[cellKey(p.c, p.r)] = id;
        });
        if (cellOccupied(used, c, r)) {
          let found = null;
          for (let dist = 1; dist < 14 && !found; dist++) {
            for (let dc = -dist; dc <= dist && !found; dc++) {
              for (let dr = -dist; dr <= dist && !found; dr++) {
                if (Math.abs(dc) !== dist && Math.abs(dr) !== dist) continue;
                const nc = c + dc, nr = r + dr;
                if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows) continue;
                if (!cellOccupied(used, nc, nr)) found = { c: nc, r: nr };
              }
            }
          }
          if (found) { c = found.c; r = found.r; }
        }
        iconPos[ic.id] = { c: c, r: r };
        savePositions();
        const p2 = pixelFor(c, r);
        node.style.left = p2.x + 'px';
        node.style.top = p2.y + 'px';
        if (moved) { setTimeout(function () { moved = false; }, 50); }
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
    node.addEventListener('dblclick', function () {
      if (moved) return;
      try { ic.open(); } catch (e) { if (Win.ui) Win.ui.error(e.message, 'Error'); }
    });
    node.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      selectOnly(ic.id);
      const items = [{ label: 'Open', icon: 'open', action: function () { try { ic.open(); } catch (e) { Win.ui.error(e.message, 'Error'); } } }];
      if (ic.path) {
        items.push({ separator: true });
        items.push({ label: 'Rename', icon: 'textfile', action: function () { renameItem(ic); } });
        items.push({ label: 'Delete', icon: 'delete', action: function () { deleteItem(ic); } });
      }
      items.push({ separator: true });
      items.push({ label: 'Properties', icon: 'properties', action: function () { Win.ui.properties(ic.path || 'C:\\'); } });
      Win.ui.menu(items, ev.clientX, ev.clientY);
    });
  }

  function renameItem(ic) {
    Win.ui.prompt({ title: 'Rename', label: 'New name:', value: ic.label }).then(function (name) {
      if (!name) return;
      try { Win.fs.rename(ic.path, name); renderIcons(); }
      catch (e) { Win.ui.error(e.message, 'Rename'); }
    });
  }
  function deleteItem(ic) {
    Win.ui.confirm('Are you sure you want to send "' + ic.label + '" to the Recycle Bin?', 'Confirm Delete', 'warning').then(function (yes) {
      if (!yes) return;
      try { Win.fs.remove(ic.path); renderIcons(); Win.sound.play('click'); }
      catch (e) { Win.ui.error(e.message, 'Delete'); }
    });
  }

  /* ------------------------------------------------------------- settings */
  function applySettings() {
    const s = Win.store.all();
    ['theme-classic', 'theme-platinum', 'theme-midnight', 'theme-xp', 'theme-olive', 'theme-silver'].forEach(function (c) { document.body.classList.remove(c); });
    if (Win.isXP) {
      const xpTheme = ['xp', 'olive', 'silver'].indexOf(s.theme) > -1 ? s.theme : 'xp';
      document.body.classList.add('theme-' + xpTheme);
    } else {
      const theme = ['classic', 'platinum', 'midnight'].indexOf(s.theme) > -1 ? s.theme : 'classic';
      document.body.classList.add('theme-' + theme);
    }
    let wall = s.wallpaper || 'teal';
    if (Win.isXP && wall === 'teal') wall = 'bliss';
    ['wall-teal', 'wall-clouds', 'wall-azure', 'wall-sunset', 'wall-graphite', 'wall-grid', 'wall-solid', 'wall-bliss'].forEach(function (c) {
      document.body.classList.remove(c);
    });
    document.body.classList.add('wall-' + wall);
    document.body.style.setProperty('--solid-wall', s.solid || '#008080');
    document.body.classList.toggle('no-anim', s.animations === false);
    document.body.classList.toggle('show-fps', !!s.fps);
    const crt = document.getElementById('crt');
    if (crt) crt.hidden = !s.crt;
    if (Win.sound) Win.sound.setVolume();
    updateFpsMeter();
  }

  let fpsEl = null, fpsRaf = 0, fpsFrames = 0, fpsLast = 0;
  function updateFpsMeter() {
    if (!Win.store.get('fps')) {
      if (fpsEl) { fpsEl.remove(); fpsEl = null; }
      if (fpsRaf) cancelAnimationFrame(fpsRaf);
      fpsRaf = 0;
      return;
    }
    if (fpsEl) return;
    fpsEl = el('div', { class: 'fps-meter', text: '-- FPS' });
    document.body.appendChild(fpsEl);
    fpsLast = performance.now();
    const tick = function (t) {
      fpsFrames++;
      if (t - fpsLast >= 500) {
        fpsEl.textContent = Math.round((fpsFrames * 1000) / (t - fpsLast)) + ' FPS';
        fpsFrames = 0; fpsLast = t;
      }
      fpsRaf = requestAnimationFrame(tick);
    };
    fpsRaf = requestAnimationFrame(tick);
  }

  /* ----------------------------------------------------------- context menu */
  function desktopMenu(x, y) {
    Win.ui.menu([
      { label: 'Arrange Icons', icon: 'view-icons', action: function () { iconPos = {}; savePositions(); renderIcons(); } },
      { label: 'Refresh', icon: 'refresh', action: function () { renderIcons(); Win.ui.toast('Desktop refreshed.', 'check', 1400); } },
      { separator: true },
      {
        label: 'New Folder', icon: 'folder', action: function () {
          Win.ui.prompt({ title: 'New Folder', label: 'Type a name for the new folder:', value: 'New Folder' }).then(function (name) {
            if (!name) return;
            try { const p = Win.fs.join(deskPath(), name); Win.fs.mkdir(p); renderIcons(); }
            catch (e) { Win.ui.error(e.message, 'New Folder'); }
          });
        }
      },
      {
        label: 'New Text Document', icon: 'textfile', action: function () {
          Win.ui.prompt({ title: 'New Text Document', label: 'Type a name for the new document:', value: 'New Text Document.txt' }).then(function (name) {
            if (!name) return;
            try { const p = Win.fs.join(deskPath(), name); Win.fs.write(p, '', { kind: 'text', app: 'notepad' }); renderIcons(); Win.recent.add(p); }
            catch (e) { Win.ui.error(e.message, 'New Text Document'); }
          });
        }
      },
      { separator: true },
      { label: 'Display Properties', icon: 'monitor', action: function () { Win.wm.open('settings', { tab: 'appearance' }); } },
      { label: 'Task Manager', icon: 'taskmgr', action: function () { Win.wm.open('taskmgr'); } },
      { separator: true },
      { label: Win.isXP ? 'Switch to Windows 98' : 'Switch to Windows XP', icon: 'windows',
        action: function () { if (Win.showOSChooser) Win.showOSChooser(); } }
    ], x, y);
  }

  /* -------------------------------------------------------------- shortcuts */
  function onKey(ev) {
    const modal = document.querySelector('.modal-overlay');
    if (ev.key === 'Escape') {
      Win.ui.closeMenus();
      if (Win.taskbar) { Win.taskbar.closeStart(); Win.taskbar.hidePopovers(); }
      return;
    }
    if (modal) return;
    const typing = U.isTyping(ev.target);
    if (ev.ctrlKey && ev.key === 'Escape') { ev.preventDefault(); if (Win.taskbar) Win.taskbar.toggleStart(); return; }
    if (ev.altKey && ev.key === 'F4') { ev.preventDefault(); const w = Win.wm.active(); if (w) Win.wm.close(w); return; }
    if (ev.ctrlKey && ev.shiftKey && ev.key === 'Escape') { ev.preventDefault(); Win.wm.open('taskmgr'); return; }
    if (ev.key === 'F1') { ev.preventDefault(); Win.wm.open('help'); return; }
    if (ev.metaKey && !typing) {
      const k = ev.key.toLowerCase();
      if (k === 'e') { ev.preventDefault(); Win.wm.open('explorer', { path: 'C:\\' }); return; }
      if (k === 'r') { ev.preventDefault(); Win.ui.runDialog(); return; }
      if (k === 'd') { ev.preventDefault(); if (Win.taskbar) Win.taskbar.showDesktop(); return; }
    }
    if (typing) return;
    if (ev.key === 'F5') { ev.preventDefault(); renderIcons(); return; }
    if (ev.key === 'Delete' && selected.size) {
      const id = Array.from(selected)[0];
      const ic = collectIcons().find(function (i) { return i.id === id; });
      if (ic && ic.path) { ev.preventDefault(); deleteItem(ic); }
    }
    if (ev.key === 'F2' && selected.size === 1) {
      const id = Array.from(selected)[0];
      const ic = collectIcons().find(function (i) { return i.id === id; });
      if (ic && ic.path) { ev.preventDefault(); renameItem(ic); }
    }
    if (ev.key === 'Enter' && selected.size === 1) {
      const id = Array.from(selected)[0];
      const ic = collectIcons().find(function (i) { return i.id === id; });
      if (ic) { ev.preventDefault(); try { ic.open(); } catch (e) { Win.ui.error(e.message, 'Error'); } }
    }
  }

  function init() {
    const iconsEl = document.getElementById('icons');
    iconsEl.addEventListener('pointerdown', function (ev) {
      if (ev.target === iconsEl) { selected.clear(); paintSelection(); }
    });
    iconsEl.addEventListener('contextmenu', function (ev) {
      if (ev.target.closest('.desk-icon')) return;
      ev.preventDefault();
      selected.clear();
      paintSelection();
      desktopMenu(ev.clientX, ev.clientY);
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('fs:change', U.debounce(renderIcons, 80));
    document.addEventListener('fs:error', function (ev) {
      if (Win.ui) Win.ui.error(ev.detail && ev.detail.message ? ev.detail.message : 'The file system could not be saved.', 'File System');
    });
    window.addEventListener('resize', U.debounce(renderIcons, 220));
    Win.store.subscribe(applySettings);
    applySettings();
    renderIcons();
    Win.startedAt = Date.now();
  }

  Win.desktop = {
    init: init,
    applySettings: applySettings,
    render: renderIcons,
    openPath: openPath,
    openFile: openFile,
    run: run
  };
})();
