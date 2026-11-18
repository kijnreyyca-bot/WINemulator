/* WINemulator — Windows Explorer */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  let clipboard = { mode: null, items: [] };
  function announceClipboard() { document.dispatchEvent(new Event('explorer:clipboard')); }

  function compare(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  

  function openWithDialog(path) {
    const apps = [
      { id: 'notepad', label: 'Notepad', icon: 'notepad' },
      { id: 'paint', label: 'Paint', icon: 'paint' },
      { id: 'browser', label: 'Internet Explorer', icon: 'ie' },
      { id: 'firefox', label: 'Mozilla Firefox', icon: 'firefox' },
      { id: 'terminal', label: 'Command Prompt', icon: 'terminal' }
    ];
    Win.ui.dialog({
      title: 'Open With', icon: 'open', width: 360,
      html: '<div class="openwith-list">' + apps.map(function (a) {
        return '<button class="btn openwith-btn" type="button" data-app="' + a.id + '">' + Win.icon(a.icon, 18) + ' ' + a.label + '</button>';
      }).join('') + '</div>',
      onShow: function (win, close) {
        win.querySelectorAll('.openwith-btn').forEach(function (b) {
          b.addEventListener('click', function () {
            const app = b.dataset.app;
            try { close(true); } catch (e) {}
            if (app === 'paint' || app === 'notepad') Win.wm.open(app, { path: Win.fs.norm(path) });
            else if (app === 'browser') Win.wm.open('browser', { url: 'file://' + path });
            else if (app === 'terminal') {
              const parent = Win.fs.parentPath(path) || 'C:\\';
              Win.wm.open('terminal', { mode: path.toLowerCase().endsWith('.ps1') ? 'ps' : 'cmd', cwd: parent, run: Win.fs.baseName(path) });
            } else Win.wm.open(app);
          });
        });
      },
      buttons: [{ label: 'Cancel', value: false, cancel: true }]
    });
  }

Win.apps.explorer = {
    name: 'Windows Explorer', title: 'Windows Explorer', icon: 'folder',
    width: 780, height: 540, minWidth: 430, minHeight: 300,
    mount: function (body, ctx) {
      body.classList.add('app-explorer');
      const args = ctx.args || {};
      let current = startPath(args.path || 'C:\\');
      let history = [current], hidx = 0;
      let selected = new Set();
      let lastKey = null;
      let entries = [];
      let sort = { key: 'name', dir: 1 };
      let view = localStorage.getItem('winemulator.explorer.view') || 'icons';
      let mode = 'files';
      let destroyed = false;

      function startPath(p) {
        if (p === '::computer' || p === '::recycle') return p;
        try {
          const n = Win.fs.resolve(p);
          if (n && n.type === 'file') p = Win.fs.parentPath(p);
          if (n) return Win.fs.norm(p);
        } catch (e) {}
        return 'C:\\';
      }

      body.innerHTML =
        '<div class="menubar ex-menu">' +
        '<div class="mb-item" data-menu="file">File</div><div class="mb-item" data-menu="edit">Edit</div>' +
        '<div class="mb-item" data-menu="view">View</div><div class="mb-item" data-menu="go">Go</div>' +
        '<div class="mb-item" data-menu="fav">Favorites</div><div class="mb-item" data-menu="help">Help</div>' +
        '</div>' +
        '<div class="toolbar ex-toolbar">' +
        '<button class="tool-btn" data-act="back" title="Back">' + Win.icon('back', 20) + '<span class="tool-label">Back</span></button>' +
        '<button class="tool-btn" data-act="forward" title="Forward">' + Win.icon('forward', 20) + '<span class="tool-label">Forward</span></button>' +
        '<button class="tool-btn" data-act="up" title="Up one level">' + Win.icon('up', 20) + '<span class="tool-label">Up</span></button>' +
        '<div class="tool-sep"></div>' +
        '<button class="tool-btn" data-act="cut" title="Cut">' + Win.icon('cut', 20) + '<span class="tool-label">Cut</span></button>' +
        '<button class="tool-btn" data-act="copy" title="Copy">' + Win.icon('copy', 20) + '<span class="tool-label">Copy</span></button>' +
        '<button class="tool-btn" data-act="paste" title="Paste">' + Win.icon('paste', 20) + '<span class="tool-label">Paste</span></button>' +
        '<div class="tool-sep"></div>' +
        '<button class="tool-btn" data-act="delete" title="Delete">' + Win.icon('delete', 20) + '</button>' +
        '<button class="tool-btn" data-act="props" title="Properties">' + Win.icon('properties', 20) + '</button>' +
        '<button class="tool-btn ex-restore" data-act="restore" title="Restore" hidden>' + Win.icon('restore', 20) + '<span class="tool-label">Restore</span></button>' +
        '<button class="tool-btn ex-empty" data-act="empty" title="Empty Recycle Bin" hidden>' + Win.icon('recycle-full', 20) + '<span class="tool-label">Empty</span></button>' +
        '<div class="tool-sep"></div>' +
        '<button class="tool-btn ex-view" data-act="view" title="Change view">' + Win.icon('view-icons', 20) + '<span class="tool-label">Views</span></button>' +
        '<button class="tool-btn" data-act="refresh" title="Refresh">' + Win.icon('refresh', 20) + '</button>' +
        '</div>' +
        '<div class="ex-addressbar"><span class="ex-addr-label">Address</span><span class="ex-addr-box field">' + Win.icon('folder', 15) + '<input class="ex-address" spellcheck="false" aria-label="Address"></span><button class="btn ex-go" type="button">Go</button></div>' +
        '<div class="ex-content field" tabindex="0"></div>' +
        '<div class="statusbar ex-status"><span class="status-cell ex-count">0 objects</span><span class="status-cell fixed ex-sel"></span><span class="status-cell fixed ex-free">2.00 GB free</span></div>';

      const content = body.querySelector('.ex-content');
      const addr = body.querySelector('.ex-address');
      const titleName = body.querySelector('.ex-addressbar');
      const countEl = body.querySelector('.ex-count');
      const selEl = body.querySelector('.ex-sel');
      const freeEl = body.querySelector('.ex-free');
      const restoreBtn = body.querySelector('.ex-restore');
      const emptyBtn = body.querySelector('.ex-empty');
      const viewBtn = body.querySelector('.ex-view');
      const backBtn = body.querySelector('[data-act=back]');
      const fwdBtn = body.querySelector('[data-act=forward]');
      const upBtn = body.querySelector('[data-act=up]');
      const pasteBtn = body.querySelector('[data-act=paste]');
      const cutBtn = body.querySelector('[data-act=cut]');
      const copyBtn = body.querySelector('[data-act=copy]');

      function displayPath() {
        if (current === '::computer') return 'My Computer';
        if (current === '::recycle') return 'Recycle Bin';
        if (current === 'C:\\') return 'Local Disk (C:)';
        return current;
      }
      function folderName() {
        if (current === '::computer') return 'My Computer';
        if (current === '::recycle') return 'Recycle Bin';
        if (current === 'C:\\') return 'Local Disk (C:)';
        return Win.fs.baseName(current);
      }

      function computerEntries() {
        const rc = Win.fs.recycleCount();
        return [
          { key: 'sys:a', name: '3½ Floppy (A:)', icon: 'floppy', typeName: '3½ Inch Floppy Disk', type: 'special', size: 0, modified: null, action: function () { Win.ui.error('A:\\ is not accessible.\n\nThe device is not ready.', 'My Computer', 'error'); } },
          { key: 'C:\\', name: 'Local Disk (C:)', icon: 'drive', typeName: 'Local Disk', type: 'drive', path: 'C:\\', size: 0, modified: Win.fs.resolve('C:\\').modified, action: function () { navigate('C:\\'); } },
          { key: 'C:\\My Documents', name: 'My Documents', icon: 'documents', typeName: 'File Folder', type: 'dir', path: 'C:\\My Documents', size: 0, modified: Win.fs.resolve('C:\\My Documents').modified, action: function () { navigate('C:\\My Documents'); } },
          { key: 'C:\\Windows\\Desktop', name: 'Desktop', icon: 'folder', typeName: 'File Folder', type: 'dir', path: 'C:\\Windows\\Desktop', size: 0, modified: Win.fs.resolve('C:\\Windows\\Desktop').modified, action: function () { navigate('C:\\Windows\\Desktop'); } },
          { key: 'C:\\My Documents\\Art', name: 'My Pictures', icon: 'image', typeName: 'File Folder', type: 'dir', path: 'C:\\My Documents\\Art', size: 0, modified: Win.fs.resolve('C:\\My Documents\\Art').modified, action: function () { navigate('C:\\My Documents\\Art'); } },
          { key: 'sys:control', name: 'Control Panel', icon: 'settings', typeName: 'System Folder', type: 'special', size: 0, modified: null, action: function () { Win.wm.open('settings'); } },
          { key: '::recycle', name: 'Recycle Bin', icon: rc ? 'recycle-full' : 'recycle', typeName: 'System Folder', type: 'special', size: 0, modified: null, action: function () { navigate('::recycle'); } }
        ];
      }

      function recycleEntries() {
        return Win.fs.recycleList().map(function (r) {
          return {
            key: 'r:' + r.id, id: r.id, name: r.name, original: r.original,
            icon: r.type === 'dir' ? 'folder' : (r.kind === 'image' ? 'image' : 'textfile'),
            typeName: r.type === 'dir' ? 'File Folder' : (r.kind === 'image' ? 'Image' : 'File'),
            type: r.type, size: r.size || 0, modified: r.deletedAt, isRecycle: true
          };
        });
      }

      function buildEntries() {
        mode = current === '::computer' ? 'computer' : current === '::recycle' ? 'recycle' : 'files';
        if (mode === 'computer') return computerEntries();
        if (mode === 'recycle') return recycleEntries();
        return Win.fs.list(current).map(function (e) {
          e.key = e.path;
          return e;
        });
      }

      function sortEntries() {
        if (mode !== 'files') return;
        entries.sort(function (a, b) {
          const ad = a.type === 'dir', bd = b.type === 'dir';
          if (ad !== bd) return ad ? -1 : 1;
          let r = 0;
          if (sort.key === 'size') r = (a.size || 0) - (b.size || 0);
          else if (sort.key === 'date') r = (a.modified || 0) - (b.modified || 0);
          else if (sort.key === 'type') r = compare(a.typeName, b.typeName);
          if (r === 0) r = compare(a.name, b.name);
          return r * sort.dir;
        });
      }

      function entryHtml(entry, kind) {
        if (kind === 'icons') {
          return '<div class="ex-item ex-ic" data-key="' + U.escapeHtml(entry.key) + '" tabindex="-1" title="' + U.escapeHtml(entry.name) + '">' +
            '<span class="ex-ic-icon">' + Win.icon(entry.icon, 32) + '</span><span class="ex-ic-label">' + U.escapeHtml(entry.name) + '</span></div>';
        }
        if (kind === 'list') {
          return '<div class="ex-item ex-li" data-key="' + U.escapeHtml(entry.key) + '" tabindex="-1" title="' + U.escapeHtml(entry.name) + '">' +
            Win.icon(entry.icon, 16) + '<span class="ex-li-name">' + U.escapeHtml(entry.name) + '</span></div>';
        }
        return '<div class="ex-item ex-row" data-key="' + U.escapeHtml(entry.key) + '" tabindex="-1">' +
          '<span class="c-name">' + Win.icon(entry.icon, 16) + '<span class="c-nm">' + U.escapeHtml(entry.name) + '</span></span>' +
          '<span class="c-size">' + (entry.type === 'dir' || entry.type === 'drive' ? '' : U.fmtBytes(entry.size)) + '</span>' +
          '<span class="c-type">' + U.escapeHtml(entry.typeName || '') + '</span>' +
          '<span class="c-date">' + (entry.modified ? U.fmtDate(entry.modified) : '') + '</span></div>';
      }

      function arrow(key) { return sort.key === key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''; }

      function render() {
        if (destroyed) return;
        entries = buildEntries();
        sortEntries();
        const keys = entries.map(function (e) { return e.key; });
        selected = new Set(Array.from(selected).filter(function (k) { return keys.indexOf(k) > -1; }));
        content.innerHTML = '';
        content.className = 'ex-content field view-' + view;

        if (!entries.length) {
          content.appendChild(el('div', { class: 'ex-empty', html: '<div class="ex-empty-icon">' + Win.icon(mode === 'recycle' ? 'recycle' : 'folder', 40) + '</div>' }));
          content.querySelector('.ex-empty').appendChild(el('div', { text: mode === 'recycle' ? 'The Recycle Bin is empty.' : 'This folder is empty.' }));
        } else if (view === 'icons') {
          const grid = el('div', { class: 'ex-icons' });
          entries.forEach(function (e) { grid.insertAdjacentHTML('beforeend', entryHtml(e, 'icons')); });
          content.appendChild(grid);
        } else if (view === 'list') {
          const cols = el('div', { class: 'ex-list' });
          entries.forEach(function (e) { cols.insertAdjacentHTML('beforeend', entryHtml(e, 'list')); });
          content.appendChild(cols);
        } else {
          const wrap = el('div', { class: 'ex-details' });
          wrap.innerHTML = '<div class="ex-dhead">' +
            '<button data-sort="name">Name' + arrow('name') + '</button>' +
            '<button data-sort="size">Size' + arrow('size') + '</button>' +
            '<button data-sort="type">Type' + arrow('type') + '</button>' +
            '<button data-sort="date">Modified' + arrow('date') + '</button></div><div class="ex-dbody"></div>';
          const db = wrap.querySelector('.ex-dbody');
          entries.forEach(function (e) { db.insertAdjacentHTML('beforeend', entryHtml(e, 'details')); });
          content.appendChild(wrap);
        }
        paint();
        updateChrome();
        updateStatus();
        addr.value = displayPath();
        ctx.setTitle(folderName() + ' - Windows Explorer');
        viewBtn.title = 'View: ' + view.charAt(0).toUpperCase() + view.slice(1);
        viewBtn.innerHTML = Win.icon(view === 'icons' ? 'view-icons' : view === 'list' ? 'view-list' : 'view-details', 20) + '<span class="tool-label">Views</span>';
      }

      function paint() {
        content.querySelectorAll('.ex-item').forEach(function (n) {
          const k = n.dataset.key;
          n.classList.toggle('selected', selected.has(k));
          n.classList.toggle('cut', clipboard.mode === 'cut' && clipboard.items.indexOf(k) > -1);
        });
      }

      function updateChrome() {
        backBtn.disabled = hidx <= 0;
        fwdBtn.disabled = hidx >= history.length - 1;
        upBtn.disabled = mode !== 'files' || current === 'C:\\';
        pasteBtn.disabled = mode !== 'files' || !clipboard.items.length;
        cutBtn.disabled = copyBtn.disabled = !selected.size || mode !== 'files';
        restoreBtn.hidden = mode !== 'recycle';
        emptyBtn.hidden = mode !== 'recycle';
        restoreBtn.disabled = !selected.size;
        emptyBtn.disabled = !entries.length;
      }

      function updateStatus() {
        const n = entries.length;
        countEl.textContent = n + ' object' + (n === 1 ? '' : 's');
        if (selected.size === 1) {
          const e = entries.find(function (x) { return x.key === Array.from(selected)[0]; });
          if (e) {
            selEl.textContent = e.type === 'dir' || e.type === 'drive' ? e.typeName :
              (U.fmtBytes(e.size) + (e.typeName ? '  ' + e.typeName : ''));
          } else selEl.textContent = '';
        } else if (selected.size > 1) {
          selEl.textContent = selected.size + ' items selected';
        } else selEl.textContent = '';
        if (mode === 'recycle') freeEl.textContent = entries.length + ' item' + (entries.length === 1 ? '' : 's');
        else if (mode === 'computer') freeEl.textContent = 'C: 2.00 GB';
        else freeEl.textContent = '2.00 GB free';
      }

      function selectedEntries() {
        return entries.filter(function (e) { return selected.has(e.key); });
      }

      function openEntry(entry) {
        if (!entry) return;
        if (entry.isRecycle) return restoreItem(entry);
        if (entry.type === 'special' || entry.type === 'drive' || entry.action) { try { entry.action(); } catch (e) { Win.ui.error(e.message, 'Windows Explorer'); } return; }
        if (entry.type === 'dir') { navigate(entry.path); return; }
        try { Win.shell.openFile(entry.path); } catch (e) { Win.ui.error(e.message, 'Windows Explorer'); }
      }

      function navigate(target, addHistory) {
        if (target === undefined) return;
        let dest = target;
        if (typeof dest === 'string') {
          const low = dest.trim().toLowerCase();
          if (low === 'my computer' || low === 'computer') dest = '::computer';
          else if (low === 'my documents') dest = 'C:\\My Documents';
          else if (low === 'recycle bin') dest = '::recycle';
          else if (/^[a-z]:$/i.test(low)) dest = low.toUpperCase() + '\\';
        }
        if (dest !== '::computer' && dest !== '::recycle') {
          const n = Win.fs.resolve(dest);
          if (!n || n.type !== 'dir') {
            Win.ui.error('Windows cannot find "' + target + '".\n\nCheck the spelling and try again.', 'Windows Explorer', 'error');
            addr.value = displayPath();
            return;
          }
          dest = Win.fs.norm(dest);
        }
        if (dest === current) { render(); return; }
        current = dest;
        selected.clear(); lastKey = null;
        if (addHistory !== false) {
          history = history.slice(0, hidx + 1);
          history.push(current);
          hidx = history.length - 1;
        }
        render();
        content.scrollTop = 0;
      }

      function goBack() { if (hidx > 0) { hidx--; current = history[hidx]; selected.clear(); render(); } }
      function goForward() { if (hidx < history.length - 1) { hidx++; current = history[hidx]; selected.clear(); render(); } }
      function goUp() {
        if (mode !== 'files') return;
        if (current === 'C:\\') { navigate('::computer'); return; }
        const p = Win.fs.parentPath(current);
        if (p) navigate(p);
      }

      function refreshKeep() {
        const old = new Set(selected);
        entries = buildEntries();
        sortEntries();
        selected = new Set(Array.from(old).filter(function (k) { return entries.some(function (e) { return e.key === k; }); }));
        render();
      }

      function openSelected() {
        const list = selectedEntries();
        if (!list.length) return;
        if (list.length > 1) { list.forEach(openEntry); return; }
        openEntry(list[0]);
      }

      function doCopy(cut) {
        if (mode !== 'files' || !selected.size) return;
        clipboard = { mode: cut ? 'cut' : 'copy', items: Array.from(selected) };
        announceClipboard();
        paint(); updateChrome();
        Win.ui.toast((cut ? 'Cut ' : 'Copied ') + selected.size + ' item' + (selected.size === 1 ? '' : 's') + '.', cut ? 'cut' : 'copy', 1500);
      }

      function doPaste() {
        if (mode !== 'files' || !clipboard.items.length) return;
        const op = clipboard.mode;
        const items = clipboard.items.slice();
        let errors = 0;
        items.forEach(function (p) {
          try {
            if (!Win.fs.exists(p)) throw new Error('The item is no longer available.');
            if (op === 'cut') Win.fs.move(p, current); else Win.fs.copy(p, current);
          } catch (e) { errors++; }
        });
        clipboard = { mode: null, items: [] };
        announceClipboard();
        render();
        if (errors) Win.ui.error(errors + ' item(s) could not be pasted.', 'Paste');
        else Win.ui.toast((op === 'cut' ? 'Moved ' : 'Copied ') + items.length + ' item(s).', 'paste', 1600);
      }

      function doDelete(perm) {
        const list = selectedEntries();
        if (!list.length) return;
        if (mode === 'recycle') {
          Win.ui.confirm('Are you sure you want to permanently delete ' + (list.length === 1 ? '"' + list[0].name + '"' : list.length + ' items') + '?', 'Confirm Delete', 'warning').then(function (yes) {
            if (!yes) return;
            list.forEach(function (e) { Win.fs.purge(e.id); });
            selected.clear();
            render();
          });
          return;
        }
        Win.ui.confirm('Are you sure you want to send ' + (list.length === 1 ? '"' + list[0].name + '"' : list.length + ' items') + ' to the Recycle Bin?', 'Confirm Delete', 'warning').then(function (yes) {
          if (!yes) return;
          list.forEach(function (e) { try { Win.fs.remove(e.path); } catch (err) { Win.ui.error(err.message, 'Delete'); } });
          selected.clear();
          render();
          Win.sound.play('click');
        });
      }

      function doRename() {
        const list = selectedEntries();
        if (list.length !== 1 || mode !== 'files') return;
        const entry = list[0];
        Win.ui.prompt({ title: 'Rename', label: 'New name:', value: entry.name }).then(function (name) {
          if (!name || name === entry.name) return;
          try {
            const np = Win.fs.rename(entry.path, name);
            selected = new Set([np]);
            render();
          } catch (e) { Win.ui.error(e.message, 'Rename'); }
        });
      }

      function doProperties(entry) {
        if (entry && entry.isRecycle) {
          Win.ui.dialog({
            title: entry.name + ' Properties', icon: entry.icon, width: 400,
            html: '<div class="props"><div class="props-head">' + Win.icon(entry.icon, 32) + '<div class="props-name"></div></div>' +
              '<div class="props-grid"><div class="pk">Original location:</div><div class="pv p-orig"></div>' +
              '<div class="pk">Size:</div><div class="pv p-size"></div>' +
              '<div class="pk">Deleted:</div><div class="pv p-del"></div></div></div>',
            onShow: function (win) {
              win.querySelector('.props-name').textContent = entry.name;
              win.querySelector('.p-orig').textContent = Win.fs.parentPath(entry.original) || 'C:\\';
              win.querySelector('.p-size').textContent = U.fmtBytes(entry.size);
              win.querySelector('.p-del').textContent = U.fmtDate(entry.modified);
            },
            buttons: [{ label: 'OK', value: true, primary: true }]
          });
          return;
        }
        if (entry && entry.path) { Win.ui.properties(entry.path); return; }
        if (mode === 'recycle') return;
        if (mode === 'computer') { Win.ui.properties('C:\\'); return; }
        Win.ui.properties(current);
      }

      function restoreItem(entry) {
        try {
          const p = Win.fs.restore(entry.id);
          if (p) { Win.ui.toast('Restored to ' + p, 'restore', 2200); render(); }
        } catch (e) { Win.ui.error(e.message, 'Recycle Bin'); }
      }

      function emptyBin() {
        if (!entries.length) return;
        Win.ui.confirm('Are you sure you want to permanently delete all ' + entries.length + ' item(s) in the Recycle Bin?', 'Confirm Delete', 'warning').then(function (yes) {
          if (!yes) return;
          Win.fs.emptyRecycle();
          render();
          Win.ui.toast('Recycle Bin emptied.', 'recycle', 1800);
        });
      }

      function newFolder() {
        if (mode !== 'files') return;
        let name = 'New Folder', i = 1;
        while (Win.fs.exists(Win.fs.join(current, name))) { i++; name = 'New Folder (' + i + ')'; }
        Win.ui.prompt({ title: 'New Folder', label: 'Type a name for the new folder:', value: name }).then(function (n) {
          if (!n) return;
          try {
            const p = Win.fs.mkdir(Win.fs.join(current, n));
            selected = new Set([p]);
            render();
          } catch (e) { Win.ui.error(e.message, 'New Folder'); }
        });
      }

      function setView(v) {
        view = v;
        try { localStorage.setItem('winemulator.explorer.view', v); } catch (e) {}
        render();
      }

      function cycleView() {
        setView(view === 'icons' ? 'list' : view === 'list' ? 'details' : 'icons');
      }

      function openMenu(name) {
        const isFiles = mode === 'files';
        const menus = {
          file: [
            { label: 'Open', icon: 'open', action: openSelected, disabled: !selected.size },
            { label: 'New Folder', icon: 'folder', action: newFolder, disabled: !isFiles },
            { separator: true },
            { label: 'Close', icon: 'close', action: function () { ctx.close(); } }
          ],
          edit: [
            { label: 'Cut', icon: 'cut', shortcut: 'Ctrl+X', action: function () { doCopy(true); }, disabled: !isFiles || !selected.size },
            { label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C', action: function () { doCopy(false); }, disabled: !isFiles || !selected.size },
            { label: 'Paste', icon: 'paste', shortcut: 'Ctrl+V', action: doPaste, disabled: !isFiles || !clipboard.items.length },
            { separator: true },
            { label: 'Select All', shortcut: 'Ctrl+A', action: function () { selected = new Set(entries.map(function (e) { return e.key; })); paint(); updateChrome(); updateStatus(); } }
          ],
          view: [
            { label: 'Large Icons', icon: 'view-icons', checked: view === 'icons', action: function () { setView('icons'); } },
            { label: 'List', icon: 'view-list', checked: view === 'list', action: function () { setView('list'); } },
            { label: 'Details', icon: 'view-details', checked: view === 'details', action: function () { setView('details'); } },
            { separator: true },
            { label: 'Refresh', icon: 'refresh', shortcut: 'F5', action: render }
          ],
          go: [
            { label: 'Back', icon: 'back', action: goBack, disabled: hidx <= 0 },
            { label: 'Forward', icon: 'forward', action: goForward, disabled: hidx >= history.length - 1 },
            { label: 'Up One Level', icon: 'up', action: goUp, disabled: !isFiles || current === 'C:\\' },
            { separator: true },
            { label: 'My Computer', icon: 'computer', action: function () { navigate('::computer'); } },
            { label: 'My Documents', icon: 'documents', action: function () { navigate('C:\\My Documents'); } },
            { label: 'Recycle Bin', icon: 'recycle', action: function () { navigate('::recycle'); } }
          ],
          fav: [
            { label: 'My Documents', icon: 'documents', action: function () { navigate('C:\\My Documents'); } },
            { label: 'Desktop', icon: 'folder', action: function () { navigate('C:\\Windows\\Desktop'); } },
            { label: 'Control Panel', icon: 'settings', action: function () { Win.wm.open('settings'); } },
            { separator: true },
            { label: 'Add to Favorites', icon: 'star', disabled: true }
          ],
          help: [
            { label: 'Help Topics', icon: 'help', action: function () { Win.wm.open('help'); } },
            { separator: true },
            { label: 'About Windows Explorer', icon: 'folder', action: function () {
              Win.ui.alert('WINemulator Windows Explorer\nVersion ' + Win.osVersion + '\n\nBrowse the virtual C: drive, move files, and empty the Recycle Bin.', 'About Windows Explorer', 'folder');
            } }
          ]
        };
        return menus[name] || [];
      }

      body.querySelectorAll('.ex-menu .mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(openMenu(item.dataset.menu), r.left, r.bottom + 1);
        });
      });

      body.querySelector('.ex-toolbar').addEventListener('click', function (ev) {
        const btn = ev.target.closest('[data-act]');
        if (!btn || btn.disabled) return;
        const a = btn.dataset.act;
        if (a === 'back') goBack();
        else if (a === 'forward') goForward();
        else if (a === 'up') goUp();
        else if (a === 'cut') doCopy(true);
        else if (a === 'copy') doCopy(false);
        else if (a === 'paste') doPaste();
        else if (a === 'delete') doDelete();
        else if (a === 'props') doProperties(selectedEntries()[0]);
        else if (a === 'view') cycleView();
        else if (a === 'refresh') render();
        else if (a === 'restore') { const e = selectedEntries()[0]; if (e) restoreItem(e); }
        else if (a === 'empty') emptyBin();
      });
      body.querySelector('.ex-go').addEventListener('click', function () { navigate(addr.value); });
      addr.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); navigate(addr.value); addr.blur(); }
        else if (ev.key === 'Escape') { addr.value = displayPath(); addr.blur(); }
      });

      content.addEventListener('click', function (ev) {
        const item = ev.target.closest('.ex-item');
        if (!item) {
          if (ev.target === content || ev.target.classList.contains('ex-icons') || ev.target.classList.contains('ex-dbody') || ev.target.classList.contains('ex-list')) {
            selected.clear(); lastKey = null; paint(); updateChrome(); updateStatus();
          }
          return;
        }
        const key = item.dataset.key;
        if (ev.ctrlKey || ev.metaKey) {
          if (selected.has(key)) selected.delete(key); else selected.add(key);
        } else if (ev.shiftKey && lastKey) {
          const keys = entries.map(function (e) { return e.key; });
          const a = keys.indexOf(lastKey), b = keys.indexOf(key);
          if (a > -1 && b > -1) {
            selected = new Set(keys.slice(Math.min(a, b), Math.max(a, b) + 1));
          }
        } else {
          selected = new Set([key]);
          lastKey = key;
        }
        paint(); updateChrome(); updateStatus();
      });
      content.addEventListener('dblclick', function (ev) {
        const item = ev.target.closest('.ex-item');
        if (!item) return;
        const entry = entries.find(function (e) { return e.key === item.dataset.key; });
        if (entry) openEntry(entry);
      });
      content.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); openSelected(); }
      });
      content.addEventListener('contextmenu', function (ev) {
        ev.preventDefault();
        const item = ev.target.closest('.ex-item');
        if (item) {
          const key = item.dataset.key;
          if (!selected.has(key)) { selected = new Set([key]); lastKey = key; paint(); updateChrome(); updateStatus(); }
          const entry = entries.find(function (e) { return e.key === key; });
          const items = [{ label: 'Open', icon: 'open', action: function () { openEntry(entry); } }];
          if (mode === 'recycle') {
            items.push({ separator: true });
            items.push({ label: 'Restore', icon: 'restore', action: function () { restoreItem(entry); } });
            items.push({ label: 'Delete Permanently', icon: 'delete', action: function () { doDelete(true); } });
            items.push({ separator: true });
            items.push({ label: 'Properties', icon: 'properties', action: function () { doProperties(entry); } });
          } else if (mode === 'files') {
            items.push({ separator: true });
            items.push({ label: 'Cut', icon: 'cut', action: function () { doCopy(true); } });
            items.push({ label: 'Copy', icon: 'copy', action: function () { doCopy(false); } });
            items.push({ separator: true });
            items.push({ label: 'Open with...', icon: 'open', action: function () { openWithDialog(entry.path); } });
            items.push({ label: 'Rename', icon: 'textfile', action: doRename });
            items.push({ label: 'Delete', icon: 'delete', action: function () { doDelete(); } });
            items.push({ separator: true });
            items.push({ label: 'Properties', icon: 'properties', action: function () { doProperties(entry); } });
          } else {
            items.push({ separator: true });
            items.push({ label: 'Properties', icon: 'properties', action: function () { doProperties(entry); } });
          }
          Win.ui.menu(items, ev.clientX, ev.clientY);
          return;
        }
        if (mode === 'files') {
          Win.ui.menu([
            { label: 'New Folder', icon: 'folder', action: newFolder },
            { label: 'Paste', icon: 'paste', action: doPaste, disabled: !clipboard.items.length },
            { separator: true },
            { label: 'Refresh', icon: 'refresh', action: render },
            { separator: true },
            { label: 'Properties', icon: 'properties', action: function () { doProperties(); } }
          ], ev.clientX, ev.clientY);
        } else {
          Win.ui.menu([
            { label: 'Refresh', icon: 'refresh', action: render },
            { label: 'Empty Recycle Bin', icon: 'recycle-full', action: emptyBin, disabled: mode !== 'recycle' || !entries.length },
            { separator: true },
            { label: 'Properties', icon: 'properties', action: function () { doProperties(); } }
          ], ev.clientX, ev.clientY);
        }
      });

      body.addEventListener('keydown', function (ev) {
        if (U.isTyping(ev.target)) return;
        if (ev.ctrlKey) {
          const k = ev.key.toLowerCase();
          if (k === 'c') { ev.preventDefault(); doCopy(false); }
          else if (k === 'x') { ev.preventDefault(); doCopy(true); }
          else if (k === 'v') { ev.preventDefault(); doPaste(); }
          else if (k === 'a') { ev.preventDefault(); selected = new Set(entries.map(function (e) { return e.key; })); paint(); updateChrome(); updateStatus(); }
          return;
        }
        if (ev.altKey && ev.key === 'ArrowLeft') { ev.preventDefault(); goBack(); return; }
        if (ev.altKey && ev.key === 'ArrowRight') { ev.preventDefault(); goForward(); return; }
        if (ev.key === 'Delete') { ev.preventDefault(); doDelete(); }
        else if (ev.key === 'F2') { ev.preventDefault(); doRename(); }
        else if (ev.key === 'F5') { ev.preventDefault(); render(); }
        else if (ev.key === 'Backspace') { ev.preventDefault(); goUp(); }
        else if (ev.key === 'Enter') { ev.preventDefault(); openSelected(); }
      });

      const onFs = U.debounce(function () { refreshKeep(); }, 90);
      const onClip = function () { paint(); updateChrome(); };
      document.addEventListener('fs:change', onFs);
      document.addEventListener('explorer:clipboard', onClip);

      // initial build (history entry already present)
      render();

      return {
        destroy: function () {
          destroyed = true;
          onFs.cancel();
          document.removeEventListener('fs:change', onFs);
          document.removeEventListener('explorer:clipboard', onClip);
        },
        onReopen: function (a) { if (a && a.path) navigate(a.path); }
      };
    }
  };
})();
