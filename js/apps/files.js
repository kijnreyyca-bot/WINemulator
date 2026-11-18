/* WINemulator — VI OS Files (Finder-style file browser) */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  const HOME = 'C:\\Users\\User';
  const TRASH = '::trash';

  const PLACES = [
    { label: 'Desktop', path: HOME + '\\Desktop', icon: 'computer' },
    { label: 'Documents', path: HOME + '\\Documents', icon: 'documents' },
    { label: 'Downloads', path: HOME + '\\Downloads', icon: 'folder' },
    { label: 'Pictures', path: HOME + '\\Pictures', icon: 'image' },
    { label: 'Music', path: HOME + '\\Music', icon: 'sound' },
    { label: 'Videos', path: HOME + '\\Videos', icon: 'image' }
  ];

  function isTrash(p) { return p === TRASH; }
  function displayName(p) {
    if (isTrash(p)) return 'Trash';
    if (p === 'C:\\') return 'Macintosh HD';
    if (p === HOME) return 'User';
    if (p === HOME + '\\Desktop') return 'Desktop';
    return Win.fs.baseName(p) || p;
  }
  function formatSize(n) {
    if (!n) return '--';
    if (n < 1024) return n + ' bytes';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function iconFor(e) {
    if (e.trashId) {
      if (e.type === 'dir') return 'trash';
      return e.kind === 'image' ? 'image' : (e.kind === 'text' ? 'textfile' : 'file');
    }
    return e.icon || Win.fs.iconFor(e);
  }

  Win.apps.files = {
    name: 'Files', title: 'Files', icon: 'files', className: 'app-files',
    width: 840, height: 540, minWidth: 520, minHeight: 340,
    placement: 'center',
    mount: function (body, ctx) {
      let path = (ctx.args && ctx.args.path) || HOME;
      if (path === '::computer') path = 'C:\\';
      if (path === '::recycle') path = TRASH;
      let history = [], hIndex = -1;
      let view = Win.store.get('viFilesView') === 'list' ? 'list' : 'icons';
      let term = '';
      let selected = null;

      body.innerHTML =
        '<div class="toolbar vi-files-toolbar">' +
          '<button class="tool-btn icon-only" data-act="back" title="Back">' + Win.icon('chevron', 16) + '</button>' +
          '<button class="tool-btn icon-only" data-act="fwd" title="Forward">' + Win.icon('chevron', 16) + '</button>' +
          '<button class="tool-btn icon-only" data-act="up" title="Up">' + Win.icon('chevron', 16) + '</button>' +
          '<span class="tool-sep"></span>' +
          '<button class="tool-btn" data-act="new">New Folder</button>' +
          '<button class="tool-btn" data-act="trash">Trash</button>' +
          '<span class="vi-files-tool-title"></span>' +
          '<input class="field vi-files-search" type="search" placeholder="Search" aria-label="Search files">' +
          '<span class="vi-segmented">' +
            '<button type="button" data-view="icons" title="Icon view">' + Win.icon('grid-view', 15) + '</button>' +
            '<button type="button" data-view="list" title="List view">' + Win.icon('list-view', 15) + '</button>' +
          '</span>' +
        '</div>' +
        '<div class="vi-files-main">' +
          '<nav class="vi-files-side" aria-label="Favorites"><h4>Favorites</h4><div class="vi-side-list"></div>' +
            '<h4>Locations</h4><div class="vi-side-loc"></div></nav>' +
          '<div class="vi-files-body">' +
            '<div class="vi-files-crumbs"></div>' +
            '<div class="vi-files-content"></div>' +
            '<div class="statusbar vi-files-status"><span class="status-cell vi-status-count"></span><span class="status-cell vi-status-sel"></span></div>' +
          '</div>' +
        '</div>';

      const titleEl = body.querySelector('.vi-files-tool-title');
      const crumbsEl = body.querySelector('.vi-files-crumbs');
      const contentEl = body.querySelector('.vi-files-content');
      const sideFavEl = body.querySelector('.vi-side-list');
      const sideLocEl = body.querySelector('.vi-side-loc');
      const searchEl = body.querySelector('.vi-files-search');
      const countEl = body.querySelector('.vi-status-count');
      const selEl = body.querySelector('.vi-status-sel');

      function push(p) {
        if (hIndex >= 0 && history[hIndex] === p) return;
        history = history.slice(0, hIndex + 1);
        history.push(p);
        hIndex = history.length - 1;
      }
      function navigate(p, record) {
        try {
          if (!isTrash(p) && p !== 'C:\\' && !Win.fs.exists(p)) throw new Error('The folder could not be found.');
          path = p;
          if (record !== false) push(p);
          term = '';
          searchEl.value = '';
          selected = null;
          render();
        } catch (e) { Win.ui.error(e.message, 'Files'); }
      }
      ctx.setTitle('Files');

      function renderSide() {
        const fav = PLACES.map(function (pl) {
          return '<button type="button" data-path="' + pl.path + '"' + (path === pl.path ? ' class="active"' : '') + '>' +
            Win.icon(pl.icon, 17) + '<span></span></button>';
        }).join('');
        sideFavEl.innerHTML = fav;
        sideFavEl.querySelectorAll('button').forEach(function (b, i) {
          b.querySelector('span').textContent = PLACES[i].label;
          b.addEventListener('click', function () { navigate(b.dataset.path); });
        });
        const loc = [
          { label: 'Macintosh HD', path: 'C:\\', icon: 'drive-mac' },
          { label: 'Home', path: HOME, icon: 'user-avatar' },
          { label: 'Recent', path: '::recent', icon: 'search' },
          { label: 'Trash', path: TRASH, icon: 'trash' }
        ].map(function (pl) {
          return '<button type="button" data-path="' + pl.path + '"' + (path === pl.path ? ' class="active"' : '') + '>' +
            Win.icon(pl.icon, 17) + '<span></span></button>';
        }).join('');
        sideLocEl.innerHTML = loc;
        sideLocEl.querySelectorAll('button').forEach(function (b, i) {
          const labels = ['Macintosh HD', 'Home', 'Recent', 'Trash'];
          b.querySelector('span').textContent = labels[i];
          b.addEventListener('click', function () { navigate(b.dataset.path); });
        });
      }

      function entries() {
        if (isTrash(path)) {
          return Win.fs.recycleList().map(function (r) {
            return {
              name: r.name, path: r.original, type: r.type, kind: r.kind,
              size: r.size, modified: r.deletedAt, trashId: r.id,
              ext: r.name.lastIndexOf('.') > 0 ? r.name.slice(r.name.lastIndexOf('.') + 1).toLowerCase() : ''
            };
          });
        }
        if (path === '::recent') return Win.recent.list().map(function (p) {
          const node = Win.fs.resolve(p);
          return { name: Win.fs.baseName(p), path: p, type: node && node.type, kind: node && node.kind, size: node ? Win.fs.sizeOf(node) : 0, ext: Win.fs.extName(p), icon: node ? Win.fs.iconFor({ type: node.type, kind: node.kind, ext: Win.fs.extName(p) }) : 'file' };
        });
        if (term) return Win.fs.search(term);
        return Win.fs.list(path);
      }

      function renderCrumbs() {
        crumbsEl.innerHTML = '';
        const parts = isTrash(path) || path === '::recent' ? [displayName(path)] : path.split('\\').filter(Boolean);
        let acc = '';
        parts.forEach(function (part, i) {
          if (i) crumbsEl.appendChild(el('span', { text: ' › ' }));
          const label = (i === 0 && part === 'C:') ? 'Macintosh HD' : part;
          if (path === 'C:\\' || isTrash(path) || path === '::recent') {
            crumbsEl.appendChild(el('span', { text: label }));
          } else {
            acc += (acc ? '\\' : '') + part;
            const b = el('button', { type: 'button', text: label });
            b.addEventListener('click', function () { navigate(i === 0 ? 'C:\\' : acc); });
            crumbsEl.appendChild(b);
          }
        });
      }

      function openEntry(e) {
        if (e.trashId) return;
        if (e.type === 'dir') return navigate(e.path);
        try { Win.recent.add(e.path); Win.desktop.openFile(e.path); }
        catch (err) { Win.ui.error(err.message, 'Files'); }
      }

      function contextMenu(e, x, y) {
        const items = [];
        if (e.trashId) {
          items.push({ label: 'Put Back', icon: 'restore', action: function () {
            try { Win.fs.restore(e.trashId); render(); Win.ui.toast('Restored ' + e.name + '.', 'check', 1600); }
            catch (err) { Win.ui.error(err.message, 'Trash'); }
          } });
          items.push({ label: 'Delete Permanently', icon: 'delete', action: function () {
            Win.ui.confirm('Permanently delete "' + e.name + '"? This cannot be undone.', 'Trash', 'warning').then(function (yes) {
              if (yes) { Win.fs.purge(e.trashId); render(); }
            });
          } });
        } else {
          items.push({ label: 'Open', icon: 'open', action: function () { openEntry(e); } });
          items.push({ label: 'Rename', icon: 'textfile', action: function () {
            Win.ui.prompt({ title: 'Rename', label: 'New name:', value: e.name }).then(function (n) {
              if (!n) return;
              try { Win.fs.rename(e.path, n); render(); }
              catch (err) { Win.ui.error(err.message, 'Rename'); }
            });
          } });
          items.push({ label: 'Duplicate', icon: 'copy', action: function () {
            try { Win.fs.copy(e.path, Win.fs.parentPath(e.path)); render(); }
            catch (err) { Win.ui.error(err.message, 'Duplicate'); }
          } });
          items.push({ separator: true });
          items.push({ label: 'Move to Trash', icon: 'trash', action: function () {
            Win.ui.confirm('Move "' + e.name + '" to the Trash?', 'Files', 'warning').then(function (yes) {
              if (yes) { try { Win.fs.remove(e.path); render(); } catch (err) { Win.ui.error(err.message, 'Move to Trash'); } }
            });
          } });
        }
        items.push({ separator: true });
        items.push({ label: 'Get Info', icon: 'properties', action: function () {
          if (e.trashId) Win.ui.alert(e.name + '\n\nType: ' + (e.type === 'dir' ? 'Folder' : 'File') + '\nSize: ' + formatSize(e.size), 'Get Info', 'info');
          else Win.ui.properties(e.path);
        } });
        Win.ui.menu(items, x, y);
      }

      function bindItem(node, e) {
        node.addEventListener('click', function (ev) {
          ev.stopPropagation();
          selected = e;
          contentEl.querySelectorAll('.selected').forEach(function (n) { n.classList.remove('selected'); });
          node.classList.add('selected');
          selEl.textContent = e.name;
        });
        node.addEventListener('dblclick', function () { if (selected === e) openEntry(e); });
        node.addEventListener('contextmenu', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          selected = e; contextMenu(e, ev.clientX, ev.clientY);
        });
      }

      function renderContent(list) {
        contentEl.innerHTML = '';
        if (!list.length) {
          contentEl.appendChild(el('div', { class: 'vi-files-empty', text: term ? 'No results for "' + term + '".' : (isTrash(path) ? 'The Trash is empty.' : 'This folder is empty.') }));
          return;
        }
        if (view === 'list') {
          const table = el('table', { class: 'vi-file-list' });
          table.innerHTML = '<thead><tr><th>Name</th><th>Date Modified</th><th>Size</th><th>Kind</th></tr></thead>';
          const tbody = el('tbody');
          list.forEach(function (e) {
            const row = el('tr');
            row.innerHTML = '<td class="name">' + Win.icon(iconFor(e), 18) + '<span></span></td>' +
              '<td>' + (e.modified ? new Date(e.modified).toLocaleDateString() : '') + '</td>' +
              '<td>' + formatSize(e.size) + '</td><td>' + (e.type === 'dir' ? 'Folder' : (e.kind === 'image' ? 'Image' : (e.kind === 'text' ? 'Text' : 'File'))) + '</td>';
            row.querySelector('td.name span').textContent = e.name;
            bindItem(row, e);
            tbody.appendChild(row);
          });
          table.appendChild(tbody);
          contentEl.appendChild(table);
        } else {
          const grid = el('div', { class: 'vi-files-grid' });
          list.forEach(function (e) {
            const item = el('div', { class: 'vi-file-item', tabindex: '0', title: e.name });
            item.innerHTML = '<span class="vi-fi-ico">' + Win.icon(iconFor(e), 50) + '</span><span class="vi-fi-name"></span>';
            item.querySelector('.vi-fi-name').textContent = e.name;
            bindItem(item, e);
            item.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') openEntry(e); });
            grid.appendChild(item);
          });
          contentEl.appendChild(grid);
        }
      }

      function render() {
        titleEl.textContent = displayName(path);
        renderSide();
        renderCrumbs();
        const list = entries();
        renderContent(list);
        countEl.textContent = list.length + (list.length === 1 ? ' item' : ' items');
        selEl.textContent = selected ? selected.name : '';
        body.querySelectorAll('[data-view]').forEach(function (b) {
          b.classList.toggle('on', b.dataset.view === view);
        });
        body.querySelector('[data-act="back"]').style.opacity = hIndex > 0 ? '1' : '.4';
        body.querySelector('[data-act="fwd"]').style.opacity = hIndex < history.length - 1 ? '1' : '.4';
      }

      body.querySelectorAll('[data-view]').forEach(function (b) {
        b.addEventListener('click', function () {
          view = b.dataset.view;
          Win.store.set({ viFilesView: view });
          render();
        });
      });
      body.querySelector('[data-act="back"]').addEventListener('click', function () {
        if (hIndex > 0) { hIndex--; navigate(history[hIndex], false); }
      });
      body.querySelector('[data-act="fwd"]').addEventListener('click', function () {
        if (hIndex < history.length - 1) { hIndex++; navigate(history[hIndex], false); }
      });
      body.querySelector('[data-act="up"]').addEventListener('click', function () {
        if (isTrash(path) || path === '::recent') return navigate(HOME);
        const p = Win.fs.parentPath(path);
        if (p) navigate(p === 'C:' ? 'C:\\' : p);
      });
      body.querySelector('[data-act="new"]').addEventListener('click', function () {
        Win.ui.prompt({ title: 'New Folder', label: 'Name:', value: 'New Folder' }).then(function (n) {
          if (!n) return;
          try { const p = Win.fs.join(path, n); Win.fs.mkdir(p); navigate(path); }
          catch (err) { Win.ui.error(err.message, 'New Folder'); }
        });
      });
      body.querySelector('[data-act="trash"]').addEventListener('click', function () { navigate(isTrash(path) ? HOME : TRASH); });
      searchEl.addEventListener('input', U.debounce(function () {
        term = searchEl.value.trim();
        render();
      }, 160));
      contentEl.addEventListener('click', function (ev) {
        if (ev.target === contentEl) { selected = null; selEl.textContent = ''; contentEl.querySelectorAll('.selected').forEach(function (n) { n.classList.remove('selected'); }); }
      });
      contentEl.addEventListener('contextmenu', function (ev) {
        if (ev.target.closest('.vi-file-item, .vi-file-list tr')) return;
        ev.preventDefault();
        Win.ui.menu([
          { label: 'New Folder', icon: 'folder', action: function () { body.querySelector('[data-act="new"]').click(); } },
          { label: 'Refresh', icon: 'refresh', action: render }
        ], ev.clientX, ev.clientY);
      });
      body.addEventListener('keydown', function (ev) {
        if (U.isTyping(ev.target)) return;
        if (ev.key === 'Delete' && selected) {
          ev.preventDefault();
          if (selected.trashId) { Win.fs.purge(selected.trashId); selected = null; render(); }
          else Win.ui.confirm('Move "' + selected.name + '" to the Trash?', 'Files', 'warning').then(function (yes) { if (yes) { Win.fs.remove(selected.path); selected = null; render(); } });
        }
      });

      push(path);
      render();
      return {
        onReopen: function (args) {
          if (args && args.path) navigate(args.path === '::recycle' ? TRASH : args.path);
        },
        setView: function (v) { view = v === 'list' ? 'list' : 'icons'; render(); },
        refresh: render
      };
    }
  };
})();
