/* WINemulator — menus, dialogs, file picker, toasts */
(function () {
  'use strict';
  const U = Win.util;
  const el = U.el;
  let zTop = 9000;
  let openMenus = [];

  /* ---------------------------------------------------------------- menus */
  function closeMenus() {
    openMenus.splice(0).forEach(function (m) {
      if (m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
      if (m.cleanup) m.cleanup();
    });
  }

  function menu(items, x, y, opts) {
    closeMenus();
    opts = opts || {};
    const box = el('div', { class: 'menu context-menu', role: 'menu' });
    items.forEach(function (item) {
      if (!item) return;
      if (item.separator) { box.appendChild(el('div', { class: 'menu-separator' })); return; }
      const row = el('div', {
        class: 'menu-item' + (item.disabled ? ' disabled' : '') + (item.checked ? ' checked' : ''),
        role: 'menuitem', tabindex: item.disabled ? '-1' : '0'
      });
      row.innerHTML = '<span class="mi-icon">' + (item.checked ? Win.icon('check', 14) : (item.icon ? Win.icon(item.icon, 16) : '')) + '</span>' +
        '<span class="mi-label"></span><span class="mi-key"></span>';
      row.querySelector('.mi-label').textContent = item.label || '';
      row.querySelector('.mi-key').textContent = item.shortcut || '';
      if (!item.disabled) {
        row.addEventListener('click', function (ev) {
          ev.stopPropagation();
          closeMenus();
          if (item.action) setTimeout(function () { item.action(); }, 0);
        });
        row.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); row.click(); }
        });
      }
      box.appendChild(row);
    });
    document.body.appendChild(box);
    const pad = 4;
    const r = box.getBoundingClientRect();
    let left = x, top = y;
    if (left + r.width > innerWidth - pad) left = Math.max(pad, innerWidth - r.width - pad);
    if (top + r.height > innerHeight - pad) top = Math.max(pad, innerHeight - r.height - pad);
    box.style.left = Math.round(left) + 'px';
    box.style.top = Math.round(top) + 'px';

    const onDoc = function (ev) {
      if (!box.contains(ev.target)) closeMenus();
    };
    const onKey = function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); closeMenus(); }
    };
    const onScroll = function () { closeMenus(); };
    setTimeout(function () { document.addEventListener('pointerdown', onDoc, true); }, 0);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    openMenus.push({
      el: box,
      cleanup: function () {
        document.removeEventListener('pointerdown', onDoc, true);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', onScroll);
      }
    });
    if (opts.sound !== false) Win.sound.play('menu');
    return box;
  }

  /* --------------------------------------------------------------- dialog */
  function dialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      let done = false;
      const z = ++zTop;
      const overlay = el('div', { class: 'modal-overlay', style: { zIndex: z } });
      const win = el('div', { class: 'dialog window' + (opts.className ? ' ' + opts.className : ''), role: 'dialog', 'aria-modal': 'true' });
      win.style.width = (opts.width || 380) + 'px';
      const title = el('div', { class: 'titlebar' });
      title.innerHTML = '<span class="titlebar-icon">' + Win.icon(opts.icon || 'info', 16) + '</span><span class="titlebar-title"></span>';
      title.querySelector('.titlebar-title').textContent = opts.title || 'WINemulator';
      const closeBtn = el('div', { class: 'titlebar-btns' });
      closeBtn.appendChild(el('button', { class: 'tb-btn tb-close', 'aria-label': 'Close', html: '<span></span>' }));
      closeBtn.querySelector('button').addEventListener('click', function () { close(null); });
      title.appendChild(closeBtn);
      win.appendChild(title);

      const body = el('div', { class: 'dialog-body' });
      const content = el('div', { class: 'dialog-content' });
      if (opts.icon) {
        content.appendChild(el('div', { class: 'dialog-icon', html: Win.icon(opts.icon, 32) }));
      }
      const textWrap = el('div', { class: 'dialog-text' });
      if (opts.html) textWrap.innerHTML = opts.html;
      else textWrap.textContent = opts.text || '';
      content.appendChild(textWrap);
      body.appendChild(content);
      win.appendChild(body);

      const footer = el('div', { class: 'dialog-buttons' });
      const buttons = opts.buttons || [{ label: 'OK', value: true, primary: true }];
      buttons.forEach(function (b) {
        const btn = el('button', { class: 'btn' + (b.primary ? ' default' : ''), type: 'button', text: b.label });
        btn.addEventListener('click', function () {
          if (b.onClick) { const r = b.onClick(win); if (r === false) return; }
          close(b.value);
        });
        footer.appendChild(btn);
        b.el = btn;
      });
      if (buttons.length) {
        const cancel = buttons.find(function (b) { return b.cancel; }) || buttons[0];
        win.addEventListener('keydown', function (ev) {
          if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(cancel.value); }
          else if (ev.key === 'Enter' && ev.target.tagName !== 'TEXTAREA' && ev.target.tagName !== 'BUTTON') {
            ev.preventDefault();
            const def = buttons.find(function (b) { return b.primary; }) || buttons[0];
            def.el.click();
          }
        });
      }
      win.appendChild(footer);
      overlay.appendChild(win);
      document.getElementById('modal-root').appendChild(overlay);

      if (opts.onShow) { try { opts.onShow(win, close); } catch (e) { console.error(e); } }
      const focusTarget = opts.focus || (opts.buttons && opts.buttons.find(function (b) { return b.primary; }));
      setTimeout(function () {
        if (focusTarget && focusTarget.el) focusTarget.el.focus();
        else {
          const field = win.querySelector('input,textarea,select,button');
          if (field) field.focus();
        }
      }, 20);

      function close(value) {
        if (done) return;
        done = true;
        overlay.remove();
        resolve(value);
      }
    });
  }

  function alert(text, title, icon) {
    if (icon) Win.sound.play(icon === 'error' ? 'error' : 'ding');
    return dialog({ title: title || 'WINemulator', text: text, icon: icon || 'info', buttons: [{ label: 'OK', value: true, primary: true }] });
  }
  function error(text, title) { return alert(text, title || 'Error', 'error'); }
  function confirm(text, title, icon) {
    return dialog({
      title: title || 'Confirm', text: text, icon: icon || 'question',
      buttons: [{ label: 'OK', value: true, primary: true }, { label: 'Cancel', value: false, cancel: true }]
    });
  }
  function prompt(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      let input;
      dialog({
        title: opts.title || 'WINemulator', text: opts.label || '', icon: opts.icon || 'question',
        width: opts.width || 400,
        html: '<div class="dialog-prompt"><div class="dp-label"></div><input class="field dp-input" type="text" spellcheck="false"></div>',
        onShow: function (win) {
          const lab = win.querySelector('.dp-label');
          lab.textContent = opts.label || '';
          input = win.querySelector('.dp-input');
          input.value = opts.value || '';
          input.style.width = '100%';
          setTimeout(function () { input.focus(); input.select(); }, 30);
          input.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              const ok = win.querySelector('.dialog-buttons .btn.default');
              if (ok) ok.click();
            }
          });
        },
        buttons: [
          { label: opts.okLabel || 'OK', value: true, primary: true, onClick: function () {
            if (!input) return false;
            const v = input.value.trim();
            if (opts.required !== false && !v) { Win.sound.play('error'); input.focus(); return false; }
            input.dataset.value = v;
            return true;
          } },
          { label: 'Cancel', value: false, cancel: true }
        ]
      }).then(function (ok) {
        resolve(ok && input ? input.dataset.value : null);
      });
    });
  }

  /* ---------------------------------------------------------- file picker */
  function fileDialog(opts) {
    opts = opts || {};
    const mode = opts.mode || 'open';
    return new Promise(function (resolve) {
      let cwd = Win.fs.norm(opts.startPath || 'C:\\My Documents');
      let resolved = Win.fs.resolve(cwd);
      if (!resolved || resolved.type !== 'dir') cwd = 'C:\\';
      let selected = null;
      let done = false;
      let showAll = false;
      const filters = (opts.filters || []).map(function (e) { return String(e).toLowerCase().replace(/^\./, ''); });
      const z = ++zTop;
      const overlay = el('div', { class: 'modal-overlay', style: { zIndex: z } });
      const win = el('div', { class: 'file-dialog window' });
      win.style.width = 'min(680px, 94vw)';
      win.innerHTML =
        '<div class="titlebar"><span class="titlebar-icon">' + Win.icon(mode === 'save' ? 'save' : 'open', 16) + '</span>' +
        '<span class="titlebar-title"></span><div class="titlebar-btns"><button class="tb-btn tb-close" aria-label="Close"><span></span></button></div></div>' +
        '<div class="fd-toolbar">' +
        '  <button class="btn fd-up" type="button" title="Up one level">' + Win.icon('up', 16) + '</button>' +
        '  <div class="fd-path field"></div>' +
        '  <button class="btn fd-new" type="button">' + Win.icon('folder', 16) + ' New Folder</button>' +
        '</div>' +
        '<div class="fd-main">' +
        '  <div class="fd-side"></div>' +
        '  <div class="fd-list-wrap"><div class="fd-head"><span>Name</span><span>Size</span><span>Type</span><span>Modified</span></div><div class="fd-list" role="listbox"></div></div>' +
        '</div>' +
        '<div class="fd-bottom">' +
        '  <div class="fd-row"><label class="fd-label">File name:</label><input class="field fd-filename" type="text" spellcheck="false"></div>' +
        '  <div class="fd-row"><label class="fd-label">File type:</label><select class="field fd-type-select"></select></div>' +
        '  <div class="fd-actions"><button class="btn fd-ok default" type="button"></button><button class="btn fd-cancel" type="button">Cancel</button></div>' +
        '</div>';
      win.querySelector('.titlebar-title').textContent = opts.title || (mode === 'save' ? 'Save As' : 'Open');
      const pathEl = win.querySelector('.fd-path');
      const listEl = win.querySelector('.fd-list');
      const nameEl = win.querySelector('.fd-filename');
      const typeEl = win.querySelector('.fd-type-select');
      const okBtn = win.querySelector('.fd-ok');
      const upBtn = win.querySelector('.fd-up');
      okBtn.textContent = mode === 'save' ? 'Save' : 'Open';
      nameEl.value = opts.defaultName || '';
      const filterLabels = [];
      if (filters.length) filterLabels.push({ label: 'Supported files (' + filters.map(function (e) { return '*.' + e; }).join('; ') + ')', exts: filters });
      filterLabels.push({ label: 'All files (*.*)', exts: null });
      filterLabels.forEach(function (f, i) { typeEl.appendChild(el('option', { value: i, text: f.label })); });

      function matches(entry) {
        if (!filters.length || showAll) return true;
        return entry.type === 'dir' || filters.indexOf(entry.ext) > -1;
      }

      function renderSide() {
        const side = win.querySelector('.fd-side');
        side.innerHTML = '';
        [
          { label: 'My Documents', path: 'C:\\My Documents', icon: 'documents' },
          { label: 'Desktop', path: 'C:\\Windows\\Desktop', icon: 'folder' },
          { label: 'My Computer', path: 'C:\\', icon: 'computer' },
          { label: 'Art', path: 'C:\\My Documents\\Art', icon: 'image' }
        ].forEach(function (q) {
          const b = el('button', { class: 'fd-quick', type: 'button' });
          b.innerHTML = Win.icon(q.icon, 16) + '<span></span>';
          b.querySelector('span').textContent = q.label;
          b.addEventListener('click', function () { if (Win.fs.resolve(q.path)) { cwd = q.path; selected = null; render(); } });
          side.appendChild(b);
        });
      }

      function render() {
        pathEl.textContent = cwd;
        pathEl.title = cwd;
        upBtn.disabled = Win.fs.norm(cwd) === 'C:\\';
        listEl.innerHTML = '';
        nameEl.value = selected && selected.type === 'file' ? selected.name : nameEl.value;
        const entries = Win.fs.list(cwd).filter(matches);
        if (!entries.length) {
          listEl.appendChild(el('div', { class: 'fd-empty', text: 'This folder is empty.' }));
        }
        entries.forEach(function (entry) {
          const row = el('div', {
            class: 'fd-item' + (selected && selected.path === entry.path ? ' selected' : ''),
            role: 'option', tabindex: '0'
          });
          row.innerHTML = '<span class="fd-name">' + Win.icon(entry.icon, 16) + '<span class="fd-nm"></span></span>' +
            '<span class="fd-size"></span><span class="fd-type"></span><span class="fd-date"></span>';
          row.querySelector('.fd-nm').textContent = entry.name;
          row.querySelector('.fd-size').textContent = entry.type === 'dir' ? '' : U.fmtBytes(entry.size);
          row.querySelector('.fd-type').textContent = entry.typeName;
          row.querySelector('.fd-date').textContent = U.fmtDate(entry.modified);
          row.addEventListener('click', function () {
            selected = entry;
            if (entry.type === 'file') nameEl.value = entry.name;
            listEl.querySelectorAll('.fd-item').forEach(function (n) { n.classList.remove('selected'); });
            row.classList.add('selected');
          });
          row.addEventListener('dblclick', function () {
            if (entry.type === 'dir') { cwd = entry.path; selected = null; render(); }
            else { selected = entry; nameEl.value = entry.name; tryFinish(); }
          });
          row.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') row.dispatchEvent(new Event('dblclick')); });
          listEl.appendChild(row);
        });
        setTimeout(function () {
          const first = listEl.querySelector('.fd-item');
          if (first && mode === 'open') first.focus();
        }, 10);
      }

      function tryFinish() {
        let name = nameEl.value.trim();
        if (mode === 'open') {
          if (selected && selected.type === 'dir') { cwd = selected.path; selected = null; render(); return; }
          let path;
          if (selected && selected.type === 'file') path = selected.path;
          else if (name) path = Win.fs.join(cwd, name);
          if (!path) { Win.sound.play('error'); nameEl.focus(); return; }
          if (!Win.fs.exists(path)) { error('The file "' + name + '" could not be found.\n\nCheck the file name and try again.', 'Open'); return; }
          finish(path);
        } else {
          if (!name) { Win.sound.play('error'); nameEl.focus(); return; }
          if (filters.length && !showAll) {
            const ext = Win.fs.extName(name);
            if (!ext) name += '.' + filters[0];
            else if (filters.indexOf(ext) < 0) { /* allow typed names */ }
          }
          if (name.indexOf('\\') > -1 || name.indexOf('/') > -1) { error('The file name is not valid.', 'Save As'); return; }
          const path = Win.fs.join(cwd, name);
          if (Win.fs.exists(path)) {
            confirm('"' + name + '" already exists.\n\nDo you want to replace it?', 'Confirm Save As', 'warning').then(function (yes) {
              if (yes) finish(path);
            });
          } else finish(path);
        }
      }

      function finish(path) {
        if (done) return;
        done = true;
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(path);
      }
      function cancel() {
        if (done) return;
        done = true;
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        resolve(null);
      }
      function onKey(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cancel(); }
        else if (ev.key === 'Enter' && ev.target === nameEl) { ev.preventDefault(); tryFinish(); }
      }

      win.querySelector('.fd-cancel').addEventListener('click', cancel);
      win.querySelector('.fd-close, .tb-close').addEventListener('click', cancel);
      okBtn.addEventListener('click', tryFinish);
      upBtn.addEventListener('click', function () {
        const p = Win.fs.parentPath(cwd);
        if (p) { cwd = p; selected = null; render(); }
      });
      typeEl.addEventListener('change', function () {
        showAll = typeEl.value === String(filterLabels.length - 1);
        render();
      });
      nameEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); tryFinish(); }
      });
      win.querySelector('.fd-new').addEventListener('click', function () {
        prompt({ title: 'New Folder', label: 'Type a name for the new folder:', value: 'New Folder' }).then(function (name) {
          if (!name) return;
          try { Win.fs.mkdir(Win.fs.join(cwd, name)); render(); }
          catch (e) { error(e.message, 'New Folder'); }
        });
      });
      overlay.appendChild(win);
      document.getElementById('modal-root').appendChild(overlay);
      renderSide();
      render();
      setTimeout(function () {
        if (mode === 'save') { nameEl.focus(); nameEl.select(); }
      }, 30);
      document.addEventListener('keydown', onKey);
    });
  }

  /* ------------------------------------------------------------- toasts */
  function toast(text, icon, ms) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const t = el('div', { class: 'toast' });
    t.innerHTML = '<span class="toast-icon">' + Win.icon(icon || 'info', 20) + '</span><span class="toast-text"></span>';
    t.querySelector('.toast-text').textContent = text;
    root.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 260); }, ms || 3200);
  }

  function properties(path) {
    const p = Win.fs.norm(path);
    const isRoot = p === 'C:\\';
    const entry = isRoot ? { name: 'Local Disk (C:)', type: 'dir', typeName: 'Local Disk', path: p, size: 0, modified: Date.now(), created: Date.now() } :
      (function () {
        const parent = Win.fs.list(Win.fs.parentPath(p)) || [];
        return parent.find(function (e) { return e.path.toLowerCase() === p.toLowerCase(); });
      })();
    if (!entry) { error('The item could not be found.', 'Properties'); return; }
    const st = Win.fs.stats();
    const rows = isRoot ? [
      ['Type', 'Local Disk'],
      ['File system', 'FAT32 (virtual)'],
      ['Used space', U.fmtBytes(st.bytes)],
      ['Free space', U.fmtBytes(Math.max(0, 2147483648 - st.bytes))],
      ['Capacity', '2.00 GB']
    ] : [
      ['Type', entry.typeName],
      ['Location', Win.fs.parentPath(p)],
      ['Size', entry.type === 'dir' ? U.fmtBytes(0) : U.fmtBytes(entry.size)],
      ['Created', U.fmtDate(entry.created)],
      ['Modified', U.fmtDate(entry.modified)],
      ['Attributes', 'Read-only (simulated)']
    ];
    const html = '<div class="props">' +
      '<div class="props-head">' + Win.icon(entry.icon || (isRoot ? 'drive' : 'file'), 32) +
      '<div class="props-name"></div></div>' +
      '<div class="props-grid">' + rows.map(function (r) {
        return '<div class="pk"></div><div class="pv"></div>';
      }).join('') + '</div></div>';
    dialog({
      title: entry.name + ' Properties', icon: 'properties', width: 420, html: html,
      onShow: function (win) {
        win.querySelector('.props-name').textContent = entry.name;
        const keys = win.querySelectorAll('.pk'), vals = win.querySelectorAll('.pv');
        rows.forEach(function (r, i) { keys[i].textContent = r[0] + ':'; vals[i].textContent = r[1]; });
      },
      buttons: [{ label: 'OK', value: true, primary: true }]
    });
  }

  function runDialog() {
    prompt({ title: 'Run', label: 'Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.', value: '', icon: 'run', okLabel: 'OK', width: 430 })
      .then(function (value) {
        if (!value) return;
        if (Win.shell && Win.shell.run) Win.shell.run(value).catch(function (e) { error(e.message || String(e), 'Run'); });
      });
  }

  Win.ui = {
    menu: menu, closeMenus: closeMenus,
    dialog: dialog, alert: alert, error: error, confirm: confirm, prompt: prompt,
    fileDialog: fileDialog, toast: toast, properties: properties, runDialog: runDialog
  };
})();
