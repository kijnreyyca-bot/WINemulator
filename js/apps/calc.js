/* WINemulator — Calculator */
(function () {
  'use strict';
  const U = Win.util;

  Win.apps.calc = {
    name: 'Calculator', title: 'Calculator', icon: 'calc',
    width: 300, height: 380, minWidth: 250, minHeight: 320, resizable: false,
    mount: function (body, ctx) {
      body.classList.add('app-calc');
      let display = '0';
      let accumulator = null;
      let pending = null;
      let waiting = false;
      let memory = 0;
      let lastOp = null, lastOperand = null;
      let expr = '';
      let error = false;

      const keys = [
        { k: '←', a: 'back', cls: 'fn' }, { k: 'CE', a: 'ce', cls: 'fn' }, { k: 'C', a: 'clear', cls: 'fn' }, { k: '±', a: 'neg', cls: 'fn' }, { k: '√', a: 'sqrt', cls: 'fn' },
        { k: '7', a: '7' }, { k: '8', a: '8' }, { k: '9', a: '9' }, { k: '÷', a: '/', cls: 'op' }, { k: '%', a: 'percent', cls: 'fn' },
        { k: '4', a: '4' }, { k: '5', a: '5' }, { k: '6', a: '6' }, { k: '×', a: '*', cls: 'op' }, { k: '1/x', a: 'recip', cls: 'fn' },
        { k: '1', a: '1' }, { k: '2', a: '2' }, { k: '3', a: '3' }, { k: '−', a: '-', cls: 'op' }, { k: '+', a: '+', cls: 'op' },
        { k: '0', a: '0', span: 'span2' }, { k: '.', a: '.' }, { k: '=', a: 'equals', cls: 'equals span2' }
      ];

      body.innerHTML =
        '<div class="menubar calc-menu"><div class="mb-item" data-menu="edit">Edit</div><div class="mb-item" data-menu="view">View</div><div class="mb-item" data-menu="help">Help</div></div>' +
        '<div class="calc-body">' +
        '<div class="calc-display-wrap"><div class="calc-expr"></div><div class="calc-display">0</div><div class="calc-mem-ind">M</div></div>' +
        '<div class="calc-mem">' +
        '<button class="calc-btn mem" data-a="mc">MC</button><button class="calc-btn mem" data-a="mr">MR</button>' +
        '<button class="calc-btn mem" data-a="ms">MS</button><button class="calc-btn mem" data-a="m+">M+</button>' +
        '</div>' +
        '<div class="calc-grid"></div>' +
        '</div>';
      const grid = body.querySelector('.calc-grid');
      keys.forEach(function (key) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'calc-btn ' + (key.cls || '') + (key.span ? ' ' + key.span : '');
        b.textContent = key.k;
        b.dataset.a = key.a;
        b.setAttribute('aria-label', key.a === 'sqrt' ? 'square root' : key.k);
        grid.appendChild(b);
      });
      const dispEl = body.querySelector('.calc-display');
      const exprEl = body.querySelector('.calc-expr');
      const memEl = body.querySelector('.calc-mem-ind');

      function fmt(n) {
        if (!isFinite(n)) return null;
        if (Math.abs(n) < 1e-12) n = 0;
        const abs = Math.abs(n);
        if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(9).replace(/\.?0+e/, 'e');
        let s = n.toPrecision(12);
        if (s.indexOf('e') > -1) s = Number(s).toString();
        if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
        return s;
      }
      function render() {
        dispEl.textContent = display;
        exprEl.textContent = expr;
        memEl.classList.toggle('on', memory !== 0);
        dispEl.classList.toggle('error', !!error);
      }
      function current() { return parseFloat(display.replace(/,/g, '')) || 0; }
      function setDisplay(v) {
        if (v === null || v === undefined) { display = 'Cannot divide by zero'; error = true; }
        else { display = String(v); error = false; }
        render();
      }
      function inputDigit(d) {
        if (error) { display = '0'; error = false; }
        if (waiting) { display = d === '.' ? '0.' : d; waiting = false; }
        else if (display === '0' && d !== '.') display = d;
        else display += d;
        if (display.replace('-', '').replace('.', '').length > 16) display = display.slice(0, display.charAt(0) === '-' ? 17 : 16);
        render();
      }
      function inputDot() {
        if (error) { display = '0'; error = false; }
        if (waiting) { display = '0.'; waiting = false; }
        else if (display.indexOf('.') < 0) display += '.';
        render();
      }
      function clearAll() {
        display = '0'; accumulator = null; pending = null; waiting = false; expr = ''; error = false; lastOp = null; lastOperand = null;
        render();
      }
      function clearEntry() {
        if (error) { clearAll(); return; }
        display = '0'; waiting = false; render();
      }
      function backspace() {
        if (error) { clearAll(); return; }
        if (waiting) return;
        display = display.length > 1 ? display.slice(0, -1) : '0';
        if (display === '-') display = '0';
        render();
      }
      function negate() {
        if (error) return;
        if (display !== '0') display = display.charAt(0) === '-' ? display.slice(1) : '-' + display;
        render();
      }
      function calc(a, op, b) {
        if (op === '+') return a + b;
        if (op === '-') return a - b;
        if (op === '*') return a * b;
        if (op === '/') return b === 0 ? null : a / b;
        return b;
      }
      function applyOp(op, explicit) {
        const val = current();
        if (pending && !waiting) {
          const r = calc(accumulator, pending, val);
          if (r === null) { setDisplay(null); accumulator = null; pending = null; waiting = true; expr = ''; return; }
          accumulator = r;
          setDisplay(fmt(r));
        } else {
          accumulator = val;
        }
        pending = op;
        waiting = true;
        lastOp = null;
        expr = (fmt(accumulator) || '') + ' ' + op;
        render();
      }
      function equals() {
        if (error) return;
        let result;
        if (pending !== null) {
          result = calc(accumulator, pending, current());
          if (result === null) { setDisplay(null); pending = null; accumulator = null; expr = ''; return; }
          lastOp = pending;
          lastOperand = current();
          expr = (fmt(accumulator) || '') + ' ' + pending + ' ' + fmt(lastOperand) + ' =';
          pending = null;
        } else if (lastOp !== null) {
          result = calc(current(), lastOp, lastOperand);
          if (result === null) { setDisplay(null); return; }
          expr = fmt(current()) + ' ' + lastOp + ' ' + fmt(lastOperand) + ' =';
        } else {
          expr = '';
          return;
        }
        accumulator = null;
        waiting = true;
        setDisplay(fmt(result));
      }
      function percent() {
        if (error) return;
        const val = current();
        let r;
        if (pending === '+' || pending === '-') r = (accumulator || 0) * val / 100;
        else r = val / 100;
        display = fmt(r);
        waiting = false;
        render();
      }
      function sqrt() {
        if (error) return;
        const v = current();
        if (v < 0) { setDisplay('Invalid input'); return; }
        setDisplay(fmt(Math.sqrt(v)));
        waiting = true;
        expr = '√(' + fmt(v) + ')';
      }
      function recip() {
        if (error) return;
        const v = current();
        if (v === 0) { setDisplay(null); return; }
        setDisplay(fmt(1 / v));
        waiting = true;
        expr = '1/(' + fmt(v) + ')';
      }
      function memAction(a) {
        if (a === 'mc') memory = 0;
        else if (a === 'mr') { display = fmt(memory); waiting = false; error = false; }
        else if (a === 'ms') memory = current();
        else if (a === 'm+') memory += current();
        render();
      }
      function press(a) {
        if (/^[0-9]$/.test(a)) return inputDigit(a);
        if (a === '.') return inputDot();
        if (a === '+' || a === '-' || a === '*' || a === '/') return applyOp(a);
        if (a === 'equals') return equals();
        if (a === 'clear') return clearAll();
        if (a === 'ce') return clearEntry();
        if (a === 'back') return backspace();
        if (a === 'neg') return negate();
        if (a === 'percent') return percent();
        if (a === 'sqrt') return sqrt();
        if (a === 'recip') return recip();
        if (['mc', 'mr', 'ms', 'm+'].indexOf(a) > -1) return memAction(a);
      }

      body.addEventListener('click', function (ev) {
        const btn = ev.target.closest('.calc-btn');
        if (btn) press(btn.dataset.a);
      });
      body.addEventListener('keydown', function (ev) {
        if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
        const k = ev.key;
        if (/^[0-9]$/.test(k)) { ev.preventDefault(); inputDigit(k); }
        else if (k === '.' || k === ',') { ev.preventDefault(); inputDot(); }
        else if (k === '+' || k === '-' || k === '*' || k === '/') { ev.preventDefault(); applyOp(k); }
        else if (k === 'Enter' || k === '=') { ev.preventDefault(); equals(); }
        else if (k === 'Escape') { ev.preventDefault(); clearAll(); }
        else if (k === 'Backspace') { ev.preventDefault(); backspace(); }
        else if (k === 'Delete') { ev.preventDefault(); clearEntry(); }
        else if (k === '%') { ev.preventDefault(); percent(); }
      });
      body.tabIndex = 0;

      const menus = {
        edit: [{ label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C', action: function () { U.copyText(display); } },
          { label: 'Paste', icon: 'paste', shortcut: 'Ctrl+V', action: function () {
            if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) {
              const n = parseFloat(t);
              if (!isNaN(n)) { display = String(n); waiting = false; render(); }
            });
          } }],
        view: [{ label: 'Standard', checked: true, action: function () {} }, { label: 'Scientific', disabled: true }],
        help: [{ label: 'About Calculator', icon: 'calc', action: function () {
          Win.ui.alert('WINemulator Calculator\nVersion 4.10\n\nA four-function calculator with memory.\nUse the keyboard or click the keys.', 'About Calculator', 'calc');
        } }]
      };
      body.querySelectorAll('.mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(menus[item.dataset.menu](), r.left, r.bottom + 1);
        });
      });

      render();
      setTimeout(function () { body.focus(); }, 40);
      return {};
    }
  };
})();
