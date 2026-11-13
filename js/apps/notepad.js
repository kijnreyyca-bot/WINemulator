/* WINemulator — Notepad */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  Win.apps.notepad = {
    name: 'Untitled - Notepad', title: 'Untitled - Notepad', icon: 'notepad',
    width: 640, height: 470, minWidth: 340, minHeight: 220,
    mount: function (body, ctx) {
      body.classList.add('app-notepad');
      const args = ctx.args || {};
      let path = args.path ? Win.fs.norm(args.path) : null;
      let dirty = false;
      let wrap = false;
      let showStatus = true;

      body.innerHTML =
        '<div class="menubar np-menu">' +
        '<div class="mb-item" data-menu="file">File</div>' +
        '<div class="mb-item" data-menu="edit">Edit</div>' +
        '<div class="mb-item" data-menu="format">Format</div>' +
        '<div class="mb-item" data-menu="view">View</div>' +
        '<div class="mb-item" data-menu="help">Help</div>' +
        '</div>' +
        '<div class="np-editor-wrap"><textarea class="np-text" spellcheck="false" wrap="off" aria-label="Notepad text"></textarea></div>' +
        '<div class="statusbar np-status"><span class="status-cell fixed np-pos">Ln 1, Col 1</span><span class="status-cell fixed np-len">0 chars</span><span class="status-cell np-file">No file</span></div>';
      const area = body.querySelector('.np-text');
      const posEl = body.querySelector('.np-pos');
      const lenEl = body.querySelector('.np-len');
      const fileEl = body.querySelector('.np-file');
      const statusEl = body.querySelector('.np-status');

      function baseName() { return path ? Win.fs.baseName(path) : 'Untitled'; }
      function refreshTitle() {
        ctx.setTitle(baseName() + (dirty ? ' *' : '') + ' - Notepad');
        fileEl.textContent = path || 'No file';
      }
      function setDirty(v) { dirty = v; refreshTitle(); }
      function updatePos() {
        const before = area.value.slice(0, area.selectionStart);
        const lines = before.split('\n');
        const ln = lines.length;
        const col = lines[lines.length - 1].length + 1;
        posEl.textContent = 'Ln ' + ln + ', Col ' + col;
        lenEl.textContent = area.value.length.toLocaleString() + ' chars';
      }
      function scrollToCaret() {
        const before = area.value.slice(0, area.selectionStart);
        const line = before.split('\n').length - 1;
        const lineHeight = parseFloat(getComputedStyle(area).lineHeight) || 18;
        const target = line * lineHeight;
        if (target < area.scrollTop || target > area.scrollTop + area.clientHeight - lineHeight * 2) {
          area.scrollTop = Math.max(0, target - area.clientHeight / 2);
        }
      }
      function insertText(text) {
        const s = area.selectionStart, e = area.selectionEnd;
        area.setRangeText(text, s, e, 'end');
        setDirty(true);
        updatePos(); scrollToCaret();
      }
      function load(p) {
        try {
          const content = Win.fs.read(p);
          if (content === null) throw new Error('File not found.');
          path = Win.fs.norm(p);
          area.value = content;
          setDirty(false);
          ctx.setTitle(baseName() + ' - Notepad');
          updatePos();
          area.focus();
        } catch (e) { Win.ui.error(e.message, 'Notepad'); }
      }
      function saveAs() {
        return Win.ui.fileDialog({
          mode: 'save', title: 'Save As', startPath: path ? Win.fs.parentPath(path) : 'C:\\My Documents',
          defaultName: path ? Win.fs.baseName(path) : 'Untitled.txt', filters: ['txt']
        }).then(function (p) {
          if (!p) return false;
          try {
            Win.fs.write(p, area.value, { kind: 'text', app: 'notepad' });
            path = p;
            setDirty(false);
            Win.recent.add(p);
            Win.sound.play('save');
            Win.ui.toast('Saved ' + Win.fs.baseName(p), 'save', 1800);
            return true;
          } catch (e) { Win.ui.error(e.message, 'Save'); return false; }
        });
      }
      function save() {
        if (!path) return saveAs();
        try {
          Win.fs.write(path, area.value, { kind: 'text', app: 'notepad' });
          setDirty(false);
          Win.recent.add(path);
          Win.sound.play('save');
          Win.ui.toast('Saved ' + baseName(), 'save', 1600);
          return Promise.resolve(true);
        } catch (e) { Win.ui.error(e.message, 'Save'); return Promise.resolve(false); }
      }
      function maybeSave(action) {
        if (!dirty) return Promise.resolve(true);
        return Win.ui.dialog({
          title: 'Notepad', icon: 'warning', width: 420,
          text: 'The text in ' + baseName() + ' has changed.\n\nDo you want to save the changes?',
          buttons: [
            { label: 'Yes', value: 'save', primary: true },
            { label: 'No', value: 'discard' },
            { label: 'Cancel', value: 'cancel', cancel: true }
          ]
        }).then(function (r) {
          if (r === 'cancel') return false;
          if (r === 'save') return save();
          return true;
        });
      }
      function newDoc() {
        maybeSave().then(function (ok) {
          if (!ok) return;
          path = null; area.value = ''; setDirty(false); updatePos(); area.focus();
          ctx.setTitle('Untitled - Notepad');
        });
      }
      function openDoc() {
        maybeSave().then(function (ok) {
          if (!ok) return;
          Win.ui.fileDialog({ mode: 'open', title: 'Open', startPath: path ? Win.fs.parentPath(path) : 'C:\\My Documents', filters: ['txt'] })
            .then(function (p) { if (p) load(p); });
        });
      }
      function toggleWrap() { wrap = !wrap; applyWrap(); }
      function applyWrap() {
        area.wrap = wrap ? 'soft' : 'off';
        area.style.whiteSpace = wrap ? 'pre-wrap' : 'pre';
        area.style.overflowX = wrap ? 'hidden' : 'auto';
      }

      const menus = {
        file: function () {
          return [
            { label: 'New', icon: 'textfile', shortcut: 'Ctrl+N', action: newDoc },
            { label: 'Open...', icon: 'open', shortcut: 'Ctrl+O', action: openDoc },
            { label: 'Save', icon: 'save', shortcut: 'Ctrl+S', action: function () { save(); } },
            { label: 'Save As...', icon: 'save', action: function () { saveAs(); } },
            { separator: true },
            { label: 'Exit', icon: 'close', action: function () { ctx.close(); } }
          ];
        },
        edit: function () {
          return [
            { label: 'Undo', icon: 'undo', shortcut: 'Ctrl+Z', action: function () { area.focus(); document.execCommand('undo'); } },
            { separator: true },
            { label: 'Cut', icon: 'cut', shortcut: 'Ctrl+X', action: function () { area.focus(); document.execCommand('cut'); } },
            { label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C', action: function () { area.focus(); document.execCommand('copy'); } },
            { label: 'Paste', icon: 'paste', shortcut: 'Ctrl+V', action: function () { area.focus(); document.execCommand('paste'); } },
            { label: 'Delete', icon: 'delete', shortcut: 'Del', action: function () { insertText(''); } },
            { separator: true },
            { label: 'Select All', shortcut: 'Ctrl+A', action: function () { area.focus(); area.select(); } },
            { label: 'Time/Date', shortcut: 'F5', action: function () { insertText(new Date().toLocaleString()); } }
          ];
        },
        format: function () {
          return [
            { label: 'Word Wrap', checked: wrap, action: toggleWrap },
            { label: 'Font: Consolas 12', icon: 'textfile', disabled: true }
          ];
        },
        view: function () {
          return [{ label: 'Status Bar', checked: showStatus, action: function () { showStatus = !showStatus; statusEl.hidden = !showStatus; } }];
        },
        help: function () {
          return [
            { label: 'Help Topics', icon: 'help', action: function () { Win.wm.open('help'); } },
            { separator: true },
            { label: 'About Notepad', icon: 'notepad', action: function () {
              Win.ui.alert('WINemulator Notepad\nVersion 4.10.2222 (Web Edition)\n\nA small text editor with a virtual file system.\nYour words are saved in this browser.', 'About Notepad', 'notepad');
            } }
          ];
        }
      };

      body.querySelectorAll('.mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          body.querySelectorAll('.mb-item').forEach(function (m) { m.classList.remove('open'); });
          item.classList.add('open');
          const r = item.getBoundingClientRect();
          const items = menus[item.dataset.menu]();
          Win.ui.menu(items, r.left, r.bottom + 1);
          setTimeout(function () {
            const close = function () { item.classList.remove('open'); document.removeEventListener('pointerdown', close); };
            document.addEventListener('pointerdown', close);
          }, 0);
        });
      });

      area.addEventListener('input', function () { setDirty(true); updatePos(); });
      area.addEventListener('click', updatePos);
      area.addEventListener('keyup', updatePos);
      area.addEventListener('select', updatePos);
      area.addEventListener('keydown', function (ev) {
        if (ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
          const k = ev.key.toLowerCase();
          if (k === 's') { ev.preventDefault(); save(); }
          else if (k === 'o') { ev.preventDefault(); openDoc(); }
          else if (k === 'n') { ev.preventDefault(); newDoc(); }
        }
        if (ev.key === 'F5') { ev.preventDefault(); insertText(new Date().toLocaleString()); }
        if (ev.key === 'Tab') {
          ev.preventDefault();
          const s = area.selectionStart;
          area.setRangeText('    ', s, area.selectionEnd, 'end');
          setDirty(true);
        }
        if (ev.key === 'Escape') { ctx.focus(); }
      });

      if (path) load(path); else { updatePos(); area.focus(); }
      applyWrap();
      refreshTitle();

      return {
        onClose: function () {
          if (!dirty) return true;
          maybeSave().then(function (ok) { if (ok) ctx.close(true); });
          return false;
        },
        onReopen: function (a) { if (a && a.path) load(a.path); },
        save: save,
        get path() { return path; },
        get dirty() { return dirty; }
      };
    }
  };
})();
