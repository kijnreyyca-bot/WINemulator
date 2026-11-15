/* WINemulator — Notepad */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  const PREFS_KEY = 'winemulator.notepad';

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (e) {}
    return {};
  }
  function storePrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  Win.apps.notepad = {
    name: 'Untitled - Notepad', title: 'Untitled - Notepad', icon: 'notepad',
    width: 640, height: 470, minWidth: 340, minHeight: 220,
    mount: function (body, ctx) {
      body.classList.add('app-notepad');
      const args = ctx.args || {};
      const modern = !!Win.isNine;          // rich features for the flat desktop
      const prefs = loadPrefs();
      let path = args.path ? Win.fs.norm(args.path) : null;
      let dirty = false;
      let wrap = typeof prefs.wrap === 'boolean' ? prefs.wrap : false;
      let showStatus = typeof prefs.status === 'boolean' ? prefs.status : true;
      let findText = '';
      let replaceText = '';
      let matchCase = false;
      let fontFamily = prefs.font || 'Consolas';
      let fontSize = prefs.size || 12;
      let fontWeight = prefs.weight || '400';
      let zoom = prefs.zoom || 100;
      let dark = modern && !!prefs.dark;
      let encoding = 'UTF-8';
      let eol = prefs.eol === 'LF' ? 'LF' : 'CRLF';

      body.innerHTML =
        '<div class="menubar np-menu">' +
        '<div class="mb-item" data-menu="file">File</div>' +
        '<div class="mb-item" data-menu="edit">Edit</div>' +
        '<div class="mb-item" data-menu="format">Format</div>' +
        '<div class="mb-item" data-menu="view">View</div>' +
        '<div class="mb-item" data-menu="help">Help</div>' +
        '</div>' +
        '<div class="np-editor-wrap"><textarea class="np-text" spellcheck="false" wrap="off" aria-label="Notepad text"></textarea></div>' +
        '<div class="statusbar np-status">' +
        '<span class="status-cell fixed np-pos">Ln 1, Col 1</span>' +
        '<span class="status-cell fixed np-len">0 chars</span>' +
        (modern ? '<span class="status-cell fixed np-eol" role="button" tabindex="0" title="Click to switch line endings"></span>' +
          '<span class="status-cell fixed np-enc" title="Encoding">UTF-8</span>' +
          '<span class="status-cell fixed np-zoom" role="button" tabindex="0" title="Click to reset zoom"></span>' : '') +
        '<span class="status-cell np-file">No file</span>' +
        '</div>';

      const area = body.querySelector('.np-text');
      const posEl = body.querySelector('.np-pos');
      const lenEl = body.querySelector('.np-len');
      const fileEl = body.querySelector('.np-file');
      const statusEl = body.querySelector('.np-status');
      const eolEl = body.querySelector('.np-eol');
      const encEl = body.querySelector('.np-enc');
      const zoomEl = body.querySelector('.np-zoom');

      if (dark) body.classList.add('np-dark');

      function savePrefs() {
        storePrefs({
          wrap: wrap, status: showStatus, font: fontFamily, size: fontSize,
          weight: fontWeight, zoom: zoom, dark: dark, eol: eol
        });
      }

      function baseName() { return path ? Win.fs.baseName(path) : 'Untitled'; }
      function refreshTitle() {
        ctx.setTitle(baseName() + (dirty ? ' *' : '') + ' - Notepad');
        fileEl.textContent = path || 'No file';
      }
      function setDirty(v) { dirty = v; refreshTitle(); }
      function updateStatus() {
        if (eolEl) eolEl.textContent = eol === 'LF' ? 'Unix (LF)' : 'Windows (CRLF)';
        if (encEl) encEl.textContent = encoding;
        if (zoomEl) zoomEl.textContent = zoom + '%';
      }
      function updatePos() {
        const before = area.value.slice(0, area.selectionStart);
        const lines = before.split('\n');
        const ln = lines.length;
        const col = lines[lines.length - 1].length + 1;
        posEl.textContent = 'Ln ' + ln + ', Col ' + col;
        lenEl.textContent = area.value.length.toLocaleString() + ' chars';
        updateStatus();
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
          eol = /\r\n/.test(content) ? 'CRLF' : 'LF';
          area.value = content.replace(/\r\n/g, '\n');
          setDirty(false);
          ctx.setTitle(baseName() + ' - Notepad');
          updatePos();
          area.focus();
        } catch (e) { Win.ui.error(e.message, 'Notepad'); }
      }
      function diskText() {
        return eol === 'CRLF' ? area.value.replace(/\r?\n/g, '\r\n') : area.value.replace(/\r\n/g, '\n');
      }
      function saveAs() {
        return Win.ui.fileDialog({
          mode: 'save', title: 'Save As', startPath: path ? Win.fs.parentPath(path) : 'C:\\My Documents',
          defaultName: path ? Win.fs.baseName(path) : 'Untitled.txt', filters: ['txt']
        }).then(function (p) {
          if (!p) return false;
          try {
            Win.fs.write(p, diskText(), { kind: 'text', app: 'notepad' });
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
          Win.fs.write(path, diskText(), { kind: 'text', app: 'notepad' });
          setDirty(false);
          Win.recent.add(path);
          Win.sound.play('save');
          Win.ui.toast('Saved ' + baseName(), 'save', 1600);
          return Promise.resolve(true);
        } catch (e) { Win.ui.error(e.message, 'Save'); return Promise.resolve(false); }
      }
      function maybeSave() {
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
      function toggleWrap() { wrap = !wrap; applyWrap(); savePrefs(); }
      function applyWrap() {
        area.wrap = wrap ? 'soft' : 'off';
        area.style.whiteSpace = wrap ? 'pre-wrap' : 'pre';
        area.style.overflowX = wrap ? 'hidden' : 'auto';
      }
      function applyFont() {
        area.style.fontFamily = fontFamily + ', Consolas, monospace';
        area.style.fontSize = (fontSize * zoom / 100) + 'px';
        area.style.fontWeight = fontWeight;
        updateStatus();
      }
      function setZoom(next) {
        zoom = Math.min(400, Math.max(40, Math.round(next / 10) * 10));
        applyFont(); savePrefs(); updateStatus();
      }
      function zoomBy(delta) { setZoom(zoom + delta); }
      function resetZoom() { setZoom(100); }
      function toggleDark() {
        dark = !dark;
        body.classList.toggle('np-dark', dark);
        savePrefs();
      }
      function toggleStatus() {
        showStatus = !showStatus;
        statusEl.hidden = !showStatus;
        savePrefs();
      }
      function setEol(next) {
        eol = next === 'LF' ? 'LF' : 'CRLF';
        setDirty(true); updateStatus(); savePrefs();
      }
      function cycleEol() { setEol(eol === 'LF' ? 'CRLF' : 'LF'); }

      function findNext(fromStart) {
        const text = area.value;
        const start = fromStart ? 0 : area.selectionEnd;
        const idx = matchCase ? text.indexOf(findText, start) : text.toLowerCase().indexOf(findText.toLowerCase(), start);
        if (idx < 0) { Win.ui.toast('Cannot find "' + findText + '".', 'info', 2000); return; }
        area.focus(); area.setSelectionRange(idx, idx + findText.length);
        updatePos(); scrollToCaret();
      }
      function replaceAll() {
        if (!findText) return;
        const re = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
        const count = (area.value.match(re) || []).length;
        area.value = area.value.replace(re, replaceText);
        setDirty(true); updatePos();
        Win.ui.toast('Replaced ' + count + ' occurrence(s).', 'check', 2000);
      }
      function findDialog() {
        let q = null, c = null;
        Win.ui.dialog({
          title: 'Find', icon: 'search', width: 380,
          html: '<div class="find-box"><div class="find-row"><label>Find what:</label><input class="field find-q" type="text" value="' + U.escapeHtml(findText) + '"></div>' +
            '<div class="find-row"><label></label><label class="set-check"><input type="checkbox" class="find-case"' + (matchCase ? ' checked' : '') + '> Match case</label></div>' +
            (modern ? '<div class="find-row"><label></label><span class="np-hint">Tip: press F3 to find the next match.</span></div>' : '') +
            '</div>',
          onShow: function (win) {
            q = win.querySelector('.find-q');
            c = win.querySelector('.find-case');
            q.focus(); q.select();
            q.addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); win.querySelector('.btn.default').click(); }
            });
          },
          buttons: [
            { label: 'Find Next', value: 'next', primary: true },
            { label: 'Cancel', value: false, cancel: true }
          ]
        }).then(function (r) {
          if (q) findText = q.value;
          if (c) matchCase = c.checked;
          if (r === 'next') findNext(false);
        });
      }
      function replaceDialog() {
        let f = null, r = null, c = null;
        Win.ui.dialog({
          title: 'Replace', icon: 'search', width: 420,
          html: '<div class="find-box"><div class="find-row"><label>Find what:</label><input class="field rep-find" type="text" value="' + U.escapeHtml(findText) + '"></div>' +
            '<div class="find-row"><label>Replace with:</label><input class="field rep-repl" type="text" value="' + U.escapeHtml(replaceText) + '"></div>' +
            '<div class="find-row"><label></label><label class="set-check"><input type="checkbox" class="rep-case"' + (matchCase ? ' checked' : '') + '> Match case</label></div>' +
            '<div class="find-actions"><button class="btn rep-findnext" type="button">Find Next</button><button class="btn rep-replace" type="button">Replace</button><button class="btn rep-replaceall" type="button">Replace All</button></div></div>',
          onShow: function (win) {
            f = win.querySelector('.rep-find'); r = win.querySelector('.rep-repl'); c = win.querySelector('.rep-case');
            f.focus(); f.select();
            win.querySelector('.rep-findnext').addEventListener('click', function () { findText = f.value; matchCase = c.checked; findNext(false); });
            win.querySelector('.rep-replace').addEventListener('click', function () {
              findText = f.value; replaceText = r.value; matchCase = c.checked;
              const sel = area.value.slice(area.selectionStart, area.selectionEnd);
              if (matchCase ? sel === findText : sel.toLowerCase() === findText.toLowerCase()) {
                insertText(replaceText);
              }
              findNext(false);
            });
            win.querySelector('.rep-replaceall').addEventListener('click', function () { findText = f.value; replaceText = r.value; matchCase = c.checked; replaceAll(); });
          },
          buttons: [{ label: 'Cancel', value: false, cancel: true }]
        });
      }
      function gotoDialog() {
        Win.ui.prompt({ title: 'Go To Line', label: 'Line number:', value: '1' }).then(function (v) {
          if (!v) return;
          const n = Math.max(1, parseInt(v, 10) || 1);
          const lines = area.value.split('\n');
          let idx = 0;
          for (let i = 0; i < n - 1 && i < lines.length; i++) idx += lines[i].length + 1;
          area.focus(); area.setSelectionRange(idx, idx); updatePos(); scrollToCaret();
        });
      }
      function fontDialog() {
        let famEl = null, sizeEl = null, weightEl = null;
        Win.ui.dialog({
          title: 'Font', icon: 'textfile', width: 380,
          html: '<div class="find-box">' +
            '<div class="find-row"><label>Font:</label><select class="field font-family"><option>Consolas</option><option>Courier New</option><option>Cascadia Mono</option><option>Segoe UI</option><option>Tahoma</option><option>Arial</option></select></div>' +
            '<div class="find-row"><label>Size:</label><select class="field font-size"><option>9</option><option>10</option><option>11</option><option>12</option><option>14</option><option>16</option><option>18</option><option>20</option><option>24</option><option>28</option></select></div>' +
            '<div class="find-row"><label>Weight:</label><select class="field font-weight"><option value="400">Regular</option><option value="700">Bold</option></select></div>' +
            (modern ? '<div class="find-row np-font-preview-row"><label>Preview:</label><span class="np-font-preview">AaBbCc 0123</span></div>' : '') +
            '</div>',
          onShow: function (win) {
            famEl = win.querySelector('.font-family');
            sizeEl = win.querySelector('.font-size');
            weightEl = win.querySelector('.font-weight');
            famEl.value = fontFamily;
            sizeEl.value = String(fontSize);
            weightEl.value = fontWeight;
            const preview = win.querySelector('.np-font-preview');
            const paint = function () {
              if (!preview) return;
              preview.style.fontFamily = famEl.value + ', Consolas, monospace';
              preview.style.fontSize = sizeEl.value + 'px';
              preview.style.fontWeight = weightEl.value;
            };
            famEl.addEventListener('change', paint);
            sizeEl.addEventListener('change', paint);
            weightEl.addEventListener('change', paint);
            paint();
          },
          buttons: [
            { label: 'OK', value: true, primary: true },
            { label: 'Cancel', value: false, cancel: true }
          ]
        }).then(function (ok) {
          if (!ok) return;
          fontFamily = famEl.value;
          fontSize = parseInt(sizeEl.value, 10) || 12;
          fontWeight = weightEl.value;
          applyFont();
          savePrefs();
        });
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
            { label: 'Time/Date', shortcut: 'F5', action: function () { insertText(new Date().toLocaleString()); } },
            { separator: true },
            { label: 'Find...', icon: 'search', shortcut: 'Ctrl+F', action: findDialog },
            { label: 'Replace...', shortcut: 'Ctrl+H', action: replaceDialog },
            { label: 'Go To...', shortcut: 'Ctrl+G', action: gotoDialog }
          ];
        },
        format: function () {
          return [
            { label: 'Word Wrap', checked: wrap, action: toggleWrap },
            { label: 'Font: ' + fontFamily + ' ' + fontSize + (fontWeight === '700' ? ' Bold' : ''), icon: 'textfile', action: fontDialog },
            { separator: true },
            { label: 'Windows (CRLF)', checked: eol === 'CRLF', action: function () { setEol('CRLF'); } },
            { label: 'Unix (LF)', checked: eol === 'LF', action: function () { setEol('LF'); } }
          ];
        },
        view: function () {
          const items = [
            { label: 'Status Bar', checked: showStatus, action: toggleStatus }
          ];
          if (modern) {
            items.push({ separator: true });
            items.push({ label: 'Zoom In', shortcut: 'Ctrl++', action: function () { zoomBy(10); } });
            items.push({ label: 'Zoom Out', shortcut: 'Ctrl+-', action: function () { zoomBy(-10); } });
            items.push({ label: 'Restore Default Zoom', shortcut: 'Ctrl+0', action: resetZoom });
            items.push({ separator: true });
            items.push({ label: 'Dark Mode', checked: dark, action: toggleDark });
          }
          return items;
        },
        help: function () {
          return [
            { label: 'Help Topics', icon: 'help', action: function () { Win.wm.open('help'); } },
            { separator: true },
            { label: 'About Notepad', icon: 'notepad', action: function () {
              Win.ui.alert('WINemulator Notepad\nVersion ' + (modern ? '10.0 (Web Edition)' : '4.10.2222 (Web Edition)') + '\n\nA small text editor with a virtual file system.\nYour words are saved in this browser.' +
                (modern ? '\n\nNew: zoom, dark mode, line-ending and encoding indicators,\nand preferences that persist between sessions.' : ''), 'About Notepad', 'notepad');
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
        if (ev.ctrlKey && !ev.altKey) {
          const k = ev.key.toLowerCase();
          if (!ev.shiftKey && k === 's') { ev.preventDefault(); save(); }
          else if (!ev.shiftKey && k === 'o') { ev.preventDefault(); openDoc(); }
          else if (!ev.shiftKey && k === 'n') { ev.preventDefault(); newDoc(); }
          else if (!ev.shiftKey && k === 'f') { ev.preventDefault(); findDialog(); }
          else if (!ev.shiftKey && k === 'h') { ev.preventDefault(); replaceDialog(); }
          else if (!ev.shiftKey && k === 'g') { ev.preventDefault(); gotoDialog(); }
          else if (k === '+' || k === '=') { if (modern) { ev.preventDefault(); zoomBy(10); } }
          else if (k === '-' || k === '_') { if (modern) { ev.preventDefault(); zoomBy(-10); } }
          else if (k === '0') { if (modern) { ev.preventDefault(); resetZoom(); } }
        }
        if (ev.key === 'F5') { ev.preventDefault(); insertText(new Date().toLocaleString()); }
        if (ev.key === 'F3') { ev.preventDefault(); findNext(false); }
        if (ev.key === 'Tab') {
          ev.preventDefault();
          const s = area.selectionStart;
          area.setRangeText('    ', s, area.selectionEnd, 'end');
          setDirty(true);
        }
        if (ev.key === 'Escape') { ctx.focus(); }
      });

      if (eolEl) {
        eolEl.addEventListener('click', cycleEol);
        eolEl.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); cycleEol(); } });
      }
      if (zoomEl) {
        zoomEl.addEventListener('click', resetZoom);
        zoomEl.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); resetZoom(); } });
      }

      if (path) load(path); else { updatePos(); area.focus(); }
      applyWrap();
      applyFont();
      statusEl.hidden = !showStatus;
      refreshTitle();
      updateStatus();

      return {
        onClose: function () {
          if (!dirty) return true;
          maybeSave().then(function (ok) { if (ok) ctx.close(true); });
          return false;
        },
        onReopen: function (a) { if (a && a.path) load(a.path); },
        save: save,
        zoomIn: function () { zoomBy(10); },
        zoomOut: function () { zoomBy(-10); },
        get path() { return path; },
        get dirty() { return dirty; }
      };
    }
  };
})();
