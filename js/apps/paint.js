/* WINemulator — Paint */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  const TOOLS = [
    { id: 'pencil', name: 'Pencil', icon: '<path d="M4 20l3.5-.7L20 6.8 17.2 4 4.7 16.5z" fill="#e8c15a" stroke="#5b3d13"/><path d="m15.5 5.7 2.8 2.8" stroke="#5b3d13"/><path d="m4 20 3.5-.7L4.7 16.5z" fill="#222"/>' },
    { id: 'brush', name: 'Brush', icon: '<path d="m14 4 6 6-9 9-6-6z" fill="#b9b9b9" stroke="#444"/><path d="m5 13 6 6-4 5-5-5z" fill="#8a5a2b" stroke="#4c2f14"/><path d="m15 6 3 3" stroke="#eee"/>' },
    { id: 'line', name: 'Line', icon: '<path d="M4 20 20 4" stroke="#222" stroke-width="2"/><circle cx="4" cy="20" r="2" fill="#fff" stroke="#222"/><circle cx="20" cy="4" r="2" fill="#fff" stroke="#222"/>' },
    { id: 'rect', name: 'Rectangle', icon: '<rect x="4" y="6" width="16" height="12" fill="none" stroke="#222" stroke-width="2"/><path d="M4 6h16" stroke="#fff" stroke-width="1"/>' },
    { id: 'ellipse', name: 'Ellipse', icon: '<ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="#222" stroke-width="2"/>' },
    { id: 'fill', name: 'Fill With Color', icon: '<path d="m5 6 9 11 7-7-9-9z" fill="#d8d8d8" stroke="#333"/><path d="m11 5 7 7" stroke="#888"/><path d="m20 15 3 4a2 2 0 1 1-4 2z" fill="#2f6fd0" stroke="#12406b"/><path d="m4 18 4-2 4 4-4 2z" fill="#2f6fd0" opacity=".5"/>' },
    { id: 'eraser', name: 'Eraser', icon: '<path d="m4 16 9-9 7 7-9 9H8z" fill="#f4a7b9" stroke="#7a3b4a"/><path d="m13 7 7 7" stroke="#fff"/><path d="M4 21h16" stroke="#555" stroke-width="2"/>' },
    { id: 'picker', name: 'Pick Color', icon: '<path d="m15 4 5 5-2 2-1-1-8 8v2H6v-3l8-8-1-1z" fill="#d8d8d8" stroke="#333"/><path d="m16 5 3 3" stroke="#333"/><path d="M6 21h4" stroke="#333" stroke-width="2"/>' },
    { id: 'text', name: 'Text', icon: '<path d="M4 6h16M12 6v14M8 20h8" stroke="#222" stroke-width="2"/>' }
  ];

  const PALETTE = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'
  ];

  Win.apps.paint = {
    name: 'Untitled - Paint', title: 'Untitled - Paint', icon: 'paint',
    width: 760, height: 580, minWidth: 480, minHeight: 360,
    mount: function (body, ctx) {
      body.classList.add('app-paint');
      const args = ctx.args || {};
      let path = args.path ? Win.fs.norm(args.path) : null;
      let dirty = false;
      let tool = 'pencil';
      let fg = '#000000', bg = '#ffffff';
      let width = 2;
      let drawing = false, start = null, last = null, baseImage = null;
      let undoStack = [], redoStack = [];
      let showPalette = true;

      body.innerHTML =
        '<div class="menubar paint-menu"><div class="mb-item" data-menu="file">File</div><div class="mb-item" data-menu="edit">Edit</div>' +
        '<div class="mb-item" data-menu="view">View</div><div class="mb-item" data-menu="image">Image</div>' +
        '<div class="mb-item" data-menu="colors">Colors</div><div class="mb-item" data-menu="help">Help</div></div>' +
        '<div class="paint-main">' +
        '<div class="paint-toolbox">' +
        '<div class="paint-swatches"><button class="paint-fg" title="Foreground color"></button><button class="paint-bg" title="Background color"></button></div>' +
        '<div class="paint-tools"></div>' +
        '<div class="paint-widths"></div>' +
        '</div>' +
        '<div class="paint-workspace"><canvas class="paint-canvas" width="640" height="400"></canvas></div>' +
        '</div>' +
        '<div class="paint-palette"></div>' +
        '<div class="statusbar paint-status"><span class="status-cell grow0 paint-coords">0, 0</span><span class="status-cell grow0 paint-size">640 × 400</span><span class="status-cell paint-hint">For Help, click Help Topics on the Help menu.</span></div>' +
        '<input type="color" class="paint-color-input" aria-hidden="true" tabindex="-1">';

      const canvas = body.querySelector('.paint-canvas');
      const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
      const toolsEl = body.querySelector('.paint-tools');
      const widthsEl = body.querySelector('.paint-widths');
      const paletteEl = body.querySelector('.paint-palette');
      const fgBtn = body.querySelector('.paint-fg');
      const bgBtn = body.querySelector('.paint-bg');
      const coordsEl = body.querySelector('.paint-coords');
      const sizeEl = body.querySelector('.paint-size');
      const hintEl = body.querySelector('.paint-hint');
      const colorInput = body.querySelector('.paint-color-input');

      TOOLS.forEach(function (t) {
        const b = el('button', { class: 'paint-tool' + (t.id === tool ? ' active' : ''), type: 'button', title: t.name, 'aria-label': t.name });
        b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' + t.icon + '</svg>';
        b.dataset.tool = t.id;
        b.addEventListener('click', function () { setTool(t.id); });
        toolsEl.appendChild(b);
      });
      [1, 2, 3, 5, 8].forEach(function (w) {
        const b = el('button', { class: 'paint-width' + (w === width ? ' active' : ''), type: 'button', title: w + ' px', 'aria-label': w + ' pixels' });
        b.innerHTML = '<span style="height:' + Math.max(1, Math.min(6, w)) + 'px"></span>';
        b.dataset.width = w;
        b.addEventListener('click', function () {
          width = w;
          widthsEl.querySelectorAll('.paint-width').forEach(function (x) { x.classList.toggle('active', Number(x.dataset.width) === width); });
        });
        widthsEl.appendChild(b);
      });
      PALETTE.forEach(function (c) {
        const s = el('button', { class: 'paint-swatch', type: 'button', title: c, 'aria-label': 'color ' + c, style: { background: c } });
        s.dataset.color = c;
        s.addEventListener('pointerdown', function (ev) {
          ev.preventDefault();
          if (ev.button === 2) setBg(c); else setFg(c);
        });
        s.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
        paletteEl.appendChild(s);
      });

      function setTool(t) {
        tool = t;
        toolsEl.querySelectorAll('.paint-tool').forEach(function (x) { x.classList.toggle('active', x.dataset.tool === t); });
        canvas.style.cursor = t === 'picker' ? 'copy' : t === 'text' ? 'text' : t === 'fill' ? 'cell' : 'crosshair';
        const names = { pencil: 'Pencil', brush: 'Brush', line: 'Line', rect: 'Rectangle', ellipse: 'Ellipse', fill: 'Fill With Color', eraser: 'Eraser', picker: 'Pick Color', text: 'Text' };
        hintEl.textContent = names[t] + ': drag on the canvas. Right-drag uses the background color.';
      }
      function setFg(c) { fg = c; fgBtn.style.background = c; colorInput.value = c; }
      function setBg(c) { bg = c; bgBtn.style.background = c; }

      function setTitle() {
        ctx.setTitle((path ? Win.fs.baseName(path) : 'Untitled') + (dirty ? ' *' : '') + ' - Paint');
        sizeEl.textContent = canvas.width + ' × ' + canvas.height;
      }
      function markDirty() { dirty = true; setTitle(); }
      function snapshot() { return ctx2d.getImageData(0, 0, canvas.width, canvas.height); }
      function pushUndo() {
        undoStack.push(snapshot());
        if (undoStack.length > 12) undoStack.shift();
        redoStack = [];
        markDirty();
      }
      function undo() {
        if (!undoStack.length) return;
        redoStack.push(snapshot());
        ctx2d.putImageData(undoStack.pop(), 0, 0);
        markDirty();
      }
      function redo() {
        if (!redoStack.length) return;
        undoStack.push(snapshot());
        ctx2d.putImageData(redoStack.pop(), 0, 0);
        markDirty();
      }
      function clearCanvas() {
        pushUndo();
        ctx2d.fillStyle = '#ffffff';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      }
      function newImage() {
        maybeSave().then(function (ok) {
          if (!ok) return;
          path = null; dirty = false;
          canvas.width = 640; canvas.height = 400;
          canvas.style.width = '640px'; canvas.style.height = '400px';
          ctx2d.fillStyle = '#ffffff'; ctx2d.fillRect(0, 0, 640, 400);
          undoStack = []; redoStack = [];
          setTitle(); canvas.scrollIntoView && canvas.scrollIntoView();
        });
      }
      function setCanvasSize(w, h) {
        canvas.width = w; canvas.height = h;
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx2d.fillStyle = '#ffffff'; ctx2d.fillRect(0, 0, w, h);
      }
      function loadPath(p) {
        try {
          const content = Win.fs.read(p);
          if (!content) throw new Error('The file is empty or could not be read.');
          const img = new Image();
          img.onload = function () {
            const scale = Math.min(1, 1600 / img.naturalWidth, 1000 / img.naturalHeight);
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            canvas.width = w; canvas.height = h;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx2d.imageSmoothingEnabled = false;
            ctx2d.fillStyle = '#fff'; ctx2d.fillRect(0, 0, w, h);
            ctx2d.drawImage(img, 0, 0, w, h);
            path = Win.fs.norm(p);
            dirty = false;
            undoStack = []; redoStack = [];
            setTitle();
          };
          img.onerror = function () { Win.ui.error('This image could not be loaded.', 'Paint'); };
          img.src = content;
        } catch (e) { Win.ui.error(e.message, 'Paint'); }
      }
      function saveAs() {
        return Win.ui.fileDialog({
          mode: 'save', title: 'Save As', startPath: path ? Win.fs.parentPath(path) : 'C:\\My Documents\\Art',
          defaultName: path ? Win.fs.baseName(path) : 'untitled.png', filters: ['png']
        }).then(function (p) {
          if (!p) return false;
          try {
            Win.fs.write(p, canvas.toDataURL('image/png'), { kind: 'image', app: 'paint' });
            path = p; dirty = false; setTitle();
            Win.recent.add(p);
            Win.sound.play('save');
            Win.ui.toast('Saved ' + Win.fs.baseName(p), 'save', 1700);
            return true;
          } catch (e) { Win.ui.error(e.message, 'Save'); return false; }
        });
      }
      function save() {
        if (!path) return saveAs();
        try {
          Win.fs.write(path, canvas.toDataURL('image/png'), { kind: 'image', app: 'paint' });
          dirty = false; setTitle();
          Win.recent.add(path);
          Win.sound.play('save');
          Win.ui.toast('Saved ' + Win.fs.baseName(path), 'save', 1500);
          return Promise.resolve(true);
        } catch (e) { Win.ui.error(e.message, 'Save'); return Promise.resolve(false); }
      }
      function maybeSave() {
        if (!dirty) return Promise.resolve(true);
        return Win.ui.dialog({
          title: 'Paint', icon: 'warning', width: 430,
          text: 'Save changes to ' + (path ? Win.fs.baseName(path) : 'Untitled') + '?',
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
      function openImage() {
        maybeSave().then(function (ok) {
          if (!ok) return;
          Win.ui.fileDialog({ mode: 'open', title: 'Open', startPath: path ? Win.fs.parentPath(path) : 'C:\\My Documents\\Art', filters: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] })
            .then(function (p) { if (p) loadPath(p); });
        });
      }

      function pos(ev) {
        const r = canvas.getBoundingClientRect();
        return {
          x: U.clamp(Math.floor((ev.clientX - r.left) * (canvas.width / r.width)), 0, canvas.width - 1),
          y: U.clamp(Math.floor((ev.clientY - r.top) * (canvas.height / r.height)), 0, canvas.height - 1)
        };
      }
      function colorFor(ev) { return ev.button === 2 ? bg : fg; }

      function drawFree(p, q, color) {
        ctx2d.strokeStyle = color;
        ctx2d.lineCap = 'round';
        ctx2d.lineJoin = 'round';
        ctx2d.lineWidth = tool === 'eraser' ? width * 6 : tool === 'brush' ? width * 3 : width;
        ctx2d.beginPath();
        ctx2d.moveTo(p.x, p.y);
        ctx2d.lineTo(q.x, q.y);
        ctx2d.stroke();
      }
      function drawShape(a, b, color) {
        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = width;
        ctx2d.lineCap = 'round';
        if (tool === 'line') {
          ctx2d.beginPath(); ctx2d.moveTo(a.x, a.y); ctx2d.lineTo(b.x, b.y); ctx2d.stroke();
        } else if (tool === 'rect') {
          ctx2d.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        } else if (tool === 'ellipse') {
          const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          ctx2d.beginPath();
          ctx2d.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
          ctx2d.stroke();
        }
      }
      function hexToRgb(hex) {
        const h = hex.replace('#', '');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      }
      function pickColor(p) {
        const d = ctx2d.getImageData(p.x, p.y, 1, 1).data;
        setFg('#' + [d[0], d[1], d[2]].map(function (v) { return v.toString(16).padStart(2, '0'); }).join(''));
      }
      function floodFill(p, hex) {
        const rgb = hexToRgb(hex);
        const img = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
        const data = img.data;
        const w = canvas.width, h = canvas.height;
        const idx = (p.y * w + p.x) * 4;
        const tr = data[idx], tg = data[idx + 1], tb = data[idx + 2], ta = data[idx + 3];
        if (tr === rgb[0] && tg === rgb[1] && tb === rgb[2] && ta === 255) return;
        const stack = [[p.x, p.y]];
        const seen = new Uint8Array(w * h);
        const tol = 32;
        while (stack.length) {
          const cur = stack.pop();
          const x = cur[0], y = cur[1];
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const i = y * w + x;
          if (seen[i]) continue;
          seen[i] = 1;
          const di = i * 4;
          if (Math.abs(data[di] - tr) > tol || Math.abs(data[di + 1] - tg) > tol || Math.abs(data[di + 2] - tb) > tol || Math.abs(data[di + 3] - ta) > tol) continue;
          data[di] = rgb[0]; data[di + 1] = rgb[1]; data[di + 2] = rgb[2]; data[di + 3] = 255;
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        ctx2d.putImageData(img, 0, 0);
      }

      canvas.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0 && ev.button !== 2) return;
        ev.preventDefault();
        ctx.focus();
        const p = pos(ev);
        if (tool === 'picker') { pickColor(p); return; }
        if (tool === 'fill') { pushUndo(); floodFill(p, colorFor(ev)); return; }
        if (tool === 'text') {
          Win.ui.prompt({ title: 'Text', label: 'Enter the text to draw:', value: '' }).then(function (text) {
            if (!text) return;
            pushUndo();
            ctx2d.fillStyle = colorFor(ev);
            ctx2d.font = '700 ' + Math.max(12, width * 6) + 'px Tahoma, sans-serif';
            ctx2d.textBaseline = 'top';
            ctx2d.fillText(text, p.x, p.y);
          });
          return;
        }
        pushUndo();
        baseImage = undoStack[undoStack.length - 1];
        drawing = true;
        start = p; last = p;
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
        if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
          drawFree(p, { x: p.x + 0.01, y: p.y }, tool === 'eraser' ? '#ffffff' : colorFor(ev));
        }
      });
      canvas.addEventListener('pointermove', function (ev) {
        const p = pos(ev);
        coordsEl.textContent = p.x + ', ' + p.y;
        if (!drawing) return;
        const color = tool === 'eraser' ? '#ffffff' : (ev.buttons === 2 ? bg : fg);
        if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
          drawFree(last, p, color);
          last = p;
        } else {
          ctx2d.putImageData(baseImage, 0, 0);
          drawShape(start, p, color);
        }
      });
      const endDraw = function (ev) {
        if (!drawing) return;
        drawing = false;
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) {}
        baseImage = null;
      };
      canvas.addEventListener('pointerup', endDraw);
      canvas.addEventListener('pointercancel', endDraw);
      canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      canvas.addEventListener('pointerleave', function () { /* keep last coords */ });

      fgBtn.addEventListener('click', function () {
        colorInput.value = fg;
        colorInput.dataset.target = 'fg';
        colorInput.click();
      });
      bgBtn.addEventListener('click', function () {
        colorInput.value = bg;
        colorInput.dataset.target = 'bg';
        colorInput.click();
      });
      colorInput.addEventListener('input', function () {
        if (colorInput.dataset.target === 'bg') setBg(colorInput.value); else setFg(colorInput.value);
      });

      const menus = {
        file: function () { return [
          { label: 'New', icon: 'textfile', shortcut: 'Ctrl+N', action: newImage },
          { label: 'Open...', icon: 'open', shortcut: 'Ctrl+O', action: openImage },
          { label: 'Save', icon: 'save', shortcut: 'Ctrl+S', action: function () { save(); } },
          { label: 'Save As...', icon: 'save', action: function () { saveAs(); } },
          { separator: true },
          { label: 'Exit', icon: 'close', action: function () { ctx.close(); } }
        ]; },
        edit: function () { return [
          { label: 'Undo', icon: 'undo', shortcut: 'Ctrl+Z', action: undo, disabled: !undoStack.length },
          { label: 'Redo', icon: 'redo', shortcut: 'Ctrl+Y', action: redo, disabled: !redoStack.length },
          { separator: true },
          { label: 'Clear Image', icon: 'delete', shortcut: 'Ctrl+Shift+N', action: clearCanvas }
        ]; },
        view: function () { return [
          { label: 'Tool Box', checked: true, disabled: true },
          { label: 'Color Box', checked: showPalette, action: function () {
            showPalette = !showPalette;
            paletteEl.hidden = !showPalette;
          } },
          { label: 'Status Bar', checked: true, disabled: true }
        ]; },
        image: function () { return [
          { label: 'Flip Horizontal', icon: 'refresh', action: function () { flip(true); } },
          { label: 'Flip Vertical', icon: 'refresh', action: function () { flip(false); } },
          { label: 'Invert Colors', icon: 'paint', action: invert },
          { separator: true },
          { label: 'Clear Image', icon: 'delete', action: clearCanvas }
        ]; },
        colors: function () { return [
          { label: 'Edit Colors...', icon: 'paint', action: function () { colorInput.dataset.target = 'fg'; colorInput.value = fg; colorInput.click(); } },
          { label: 'Reset Palette', icon: 'refresh', action: function () { setFg('#000000'); setBg('#ffffff'); } }
        ]; },
        help: function () { return [
          { label: 'Help Topics', icon: 'help', action: function () { Win.wm.open('help'); } },
          { separator: true },
          { label: 'About Paint', icon: 'paint', action: function () {
            Win.ui.alert('WINemulator Paint\nVersion ' + Win.osVersion + ' (Web Edition)\n\nA small bitmap editor. Save your work as a PNG in the virtual file system.\n\nTip: right-drag draws with the background color.', 'About Paint', 'paint');
          } }
        ]; }
      };

      function flip(horizontal) {
        pushUndo();
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width; tmp.height = canvas.height;
        const t = tmp.getContext('2d');
        t.drawImage(canvas, 0, 0);
        ctx2d.save();
        ctx2d.setTransform(horizontal ? -1 : 1, 0, 0, horizontal ? 1 : -1, horizontal ? canvas.width : 0, horizontal ? 0 : canvas.height);
        ctx2d.drawImage(tmp, 0, 0);
        ctx2d.restore();
      }
      function invert() {
        pushUndo();
        const img = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < img.data.length; i += 4) {
          img.data[i] = 255 - img.data[i];
          img.data[i + 1] = 255 - img.data[i + 1];
          img.data[i + 2] = 255 - img.data[i + 2];
        }
        ctx2d.putImageData(img, 0, 0);
      }

      body.querySelectorAll('.paint-menu .mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(menus[item.dataset.menu](), r.left, r.bottom + 1);
        });
      });

      body.addEventListener('keydown', function (ev) {
        if (U.isTyping(ev.target)) return;
        if (ev.ctrlKey) {
          const k = ev.key.toLowerCase();
          if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); }
          else if (k === 'y' || (k === 'z' && ev.shiftKey)) { ev.preventDefault(); redo(); }
          else if (k === 's') { ev.preventDefault(); save(); }
          else if (k === 'o') { ev.preventDefault(); openImage(); }
          else if (k === 'n') { ev.preventDefault(); newImage(); }
          return;
        }
        const map = { p: 'pencil', b: 'brush', l: 'line', r: 'rect', o: 'ellipse', f: 'fill', e: 'eraser', i: 'picker', t: 'text' };
        if (map[ev.key.toLowerCase()]) setTool(map[ev.key.toLowerCase()]);
      });

      // initial canvas
      ctx2d.fillStyle = '#ffffff';
      ctx2d.fillRect(0, 0, canvas.width, canvas.height);
      setFg(fg); setBg(bg); setTool(tool); setTitle();
      if (path) loadPath(path);

      return {
        onClose: function () {
          if (!dirty) return true;
          maybeSave().then(function (ok) { if (ok) ctx.close(true); });
          return false;
        },
        onReopen: function (a) { if (a && a.path) loadPath(a.path); },
        get dirty() { return dirty; }
      };
    }
  };
})();
