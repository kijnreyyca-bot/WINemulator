/* WINemulator — Minesweeper */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  const LEVELS = {
    beginner: { cols: 9, rows: 9, mines: 10, label: 'Beginner' },
    intermediate: { cols: 16, rows: 16, mines: 40, label: 'Intermediate' },
    expert: { cols: 30, rows: 16, mines: 99, label: 'Expert' }
  };
  const BEST_KEY = 'winemulator.minesweeper.best.v1';

  function loadBest() {
    try {
      const raw = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) { return {}; }
  }
  function saveBest(best) {
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) {}
  }
  function pad3(n) {
    const v = Math.max(-99, Math.min(999, n));
    if (v < 0) return '-' + String(-v).padStart(2, '0');
    return String(v).padStart(3, '0');
  }

  Win.apps.minesweeper = {
    name: 'Minesweeper', title: 'Minesweeper', icon: 'mine',
    width: 360, height: 430, minWidth: 250, minHeight: 300, resizable: true,
    mount: function (body, ctx) {
      body.classList.add('app-minesweeper');
      const args = ctx.args || {};
      let level = LEVELS[args.level] ? args.level : (localStorage.getItem('winemulator.minesweeper.level') || 'beginner');
      if (!LEVELS[level]) level = 'beginner';
      let cells = [];
      let cellEls = [];
      let cols = 9, rows = 9, mineCount = 10;
      let started = false, over = false, won = false;
      let revealed = 0, flags = 0;
      let marks = false;
      let startTime = 0, elapsed = 0;
      let best = loadBest();
      let ticker = 0;

      body.innerHTML =
        '<div class="menubar ms-menu"><div class="mb-item" data-menu="game">Game</div><div class="mb-item" data-menu="help">Help</div></div>' +
        '<div class="ms-frame">' +
        '  <div class="ms-head"><div class="ms-counter" title="Mines remaining">010</div>' +
        '  <button class="ms-face" type="button" title="New game (F2)" aria-label="New game">🙂</button>' +
        '  <div class="ms-timer" title="Time elapsed">000</div></div>' +
        '  <div class="ms-board-wrap"><div class="ms-board" role="grid" aria-label="Minefield"></div></div>' +
        '</div>' +
        '<div class="statusbar ms-status"><span class="status-cell ms-msg">Click a square to begin.</span>' +
        '<span class="status-cell fixed ms-best">Best: --</span></div>';

      const boardEl = body.querySelector('.ms-board');
      const faceEl = body.querySelector('.ms-face');
      const counterEl = body.querySelector('.ms-counter');
      const timerEl = body.querySelector('.ms-timer');
      const msgEl = body.querySelector('.ms-msg');
      const bestEl = body.querySelector('.ms-best');

      function neighbors(i) {
        const x = i % cols, y = Math.floor(i / cols), out = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
          }
        }
        return out;
      }

      function reset(nextLevel) {
        if (nextLevel && LEVELS[nextLevel]) level = nextLevel;
        try { localStorage.setItem('winemulator.minesweeper.level', level); } catch (e) {}
        const cfg = LEVELS[level];
        cols = cfg.cols; rows = cfg.rows; mineCount = cfg.mines;
        cells = new Array(cols * rows);
        for (let i = 0; i < cells.length; i++) cells[i] = { mine: false, open: false, flag: false, q: false, n: 0 };
        started = false; over = false; won = false;
        revealed = 0; flags = 0; elapsed = 0; startTime = 0;
        faceEl.textContent = '🙂';
        timerEl.textContent = '000';
        counterEl.textContent = pad3(mineCount);
        msgEl.textContent = 'Click a square to begin.';
        boardEl.style.setProperty('--ms-cols', cols);
        boardEl.setAttribute('aria-label', cfg.label + ' minefield, ' + mineCount + ' mines');
        boardEl.innerHTML = '';
        cellEls = [];
        for (let i = 0; i < cells.length; i++) {
          const b = el('button', { class: 'ms-cell', type: 'button', dataset: { i: String(i) }, tabindex: '-1' });
          b.setAttribute('aria-label', 'covered square');
          boardEl.appendChild(b);
          cellEls.push(b);
        }
        updateBest();
        ctx.setTitle('Minesweeper (' + cfg.label + ')');
      }

      function updateBest() {
        const b = best[level];
        bestEl.textContent = b ? 'Best: ' + b + 's' : 'Best: --';
      }

      function placeMines(safeIndex) {
        const safe = {};
        safe[safeIndex] = true;
        neighbors(safeIndex).forEach(function (i) { safe[i] = true; });
        const pool = [];
        for (let i = 0; i < cells.length; i++) if (!safe[i]) pool.push(i);
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        for (let i = 0; i < mineCount && i < pool.length; i++) cells[pool[i]].mine = true;
        for (let i = 0; i < cells.length; i++) {
          if (cells[i].mine) continue;
          let n = 0;
          neighbors(i).forEach(function (j) { if (cells[j].mine) n++; });
          cells[i].n = n;
        }
      }

      function paintCell(i) {
        const c = cells[i], e = cellEls[i];
        if (!e) return;
        e.className = 'ms-cell';
        e.textContent = '';
        e.setAttribute('aria-label', 'square');
        if (c.open) {
          e.classList.add('open');
          if (c.mine) {
            e.classList.add('mine-open');
            e.textContent = '✹';
            e.setAttribute('aria-label', 'mine');
          } else if (c.n) {
            e.classList.add('n' + c.n);
            e.textContent = String(c.n);
            e.setAttribute('aria-label', c.n + ' adjacent mines');
          } else {
            e.setAttribute('aria-label', 'empty square');
          }
        } else if (c.flag) {
          e.classList.add('flag');
          e.innerHTML = '<span class="ms-mark">⚑</span>';
          e.setAttribute('aria-label', 'flagged square');
        } else if (c.q) {
          e.classList.add('q');
          e.setAttribute('aria-label', 'question mark');
        } else {
          e.setAttribute('aria-label', 'covered square');
        }
      }

      function startClock() {
        if (started) return;
        started = true;
        startTime = Date.now();
      }

      function updateCounter() {
        counterEl.textContent = pad3(mineCount - flags);
      }

      function floodReveal(from) {
        const stack = [from];
        while (stack.length) {
          const i = stack.pop();
          const c = cells[i];
          if (!c || c.open || c.flag) continue;
          c.open = true;
          revealed++;
          paintCell(i);
          if (c.n === 0 && !c.mine) {
            neighbors(i).forEach(function (j) {
              if (!cells[j].open && !cells[j].flag) stack.push(j);
            });
          }
        }
      }

      function reveal(i) {
        if (over) return;
        const c = cells[i];
        if (!c || c.open || c.flag) return;
        if (!started) placeMines(i);
        startClock();
        if (c.mine) { lose(i); return; }
        floodReveal(i);
        checkWin();
      }

      function toggleFlag(i) {
        if (over) return;
        const c = cells[i];
        if (!c || c.open) return;
        startClock();
        if (c.flag) {
          c.flag = false;
          flags--;
          if (marks) c.q = true;
        } else if (c.q) {
          c.q = false;
          if (marks) { c.flag = true; flags++; }
        } else {
          c.flag = true;
          flags++;
        }
        paintCell(i);
        updateCounter();
      }

      function chord(i) {
        if (over) return;
        const c = cells[i];
        if (!c || !c.open || !c.n) return;
        const ns = neighbors(i);
        let f = 0;
        ns.forEach(function (j) { if (cells[j].flag) f++; });
        if (f !== c.n) return;
        ns.forEach(function (j) { if (!cells[j].open && !cells[j].flag) reveal(j); });
      }

      function lose(hit) {
        over = true; won = false;
        faceEl.textContent = '😵';
        msgEl.textContent = 'Boom! You hit a mine. Press the face or F2 to play again.';
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          if (c.mine && !c.flag) { c.open = true; paintCell(i); }
          if (!c.mine && c.flag) {
            c.flag = false; c.open = true;
            paintCell(i);
            cellEls[i].classList.add('wrong');
            cellEls[i].textContent = '✕';
          }
        }
        if (cellEls[hit]) cellEls[hit].classList.add('mine-open');
        Win.sound.play('explode');
      }

      function checkWin() {
        if (over) return;
        if (revealed >= cols * rows - mineCount) {
          over = true; won = true;
          faceEl.textContent = '😎';
          flags = mineCount;
          updateCounter();
          for (let i = 0; i < cells.length; i++) {
            if (cells[i].mine && !cells[i].flag) { cells[i].flag = true; paintCell(i); }
          }
          elapsed = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
          timerEl.textContent = pad3(elapsed);
          msgEl.textContent = 'You cleared the minefield in ' + elapsed + ' second' + (elapsed === 1 ? '' : 's') + '!';
          Win.sound.play('win');
          const previous = best[level];
          const isBest = !previous || elapsed < previous;
          if (isBest) {
            best[level] = elapsed;
            saveBest(best);
            updateBest();
          }
          setTimeout(function () {
            if (ctx.win.closing) return;
            Win.ui.dialog({
              title: 'Minesweeper', icon: 'mine', width: 400,
              text: 'You cleared the ' + LEVELS[level].label + ' minefield!\n\n' +
                'Time: ' + elapsed + ' second' + (elapsed === 1 ? '' : 's') + '\n' +
                (isBest ? 'That is a new best time. Well done!' : 'Your best time is ' + best[level] + ' second' + (best[level] === 1 ? '' : 's') + '.'),
              buttons: [
                { label: 'Play Again', value: 'again', primary: true },
                { label: 'Close', value: 'close', cancel: true }
              ]
            }).then(function (r) { if (r === 'again') reset(); });
          }, 350);
        }
      }

      function bestTimes() {
        const rowsHtml = Object.keys(LEVELS).map(function (k) {
          return '<div class="pk">' + LEVELS[k].label + ':</div><div class="pv">' +
            (best[k] ? best[k] + ' seconds' : 'No record yet') + '</div>';
        }).join('');
        Win.ui.dialog({
          title: 'Best Times', icon: 'mine', width: 380,
          html: '<div class="props"><div class="props-head">' + Win.icon('mine', 32) +
            '<div class="props-name">Fastest Mine Sweepers</div></div>' +
            '<div class="props-grid">' + rowsHtml + '</div>' +
            '<div class="ie-small">Times are stored in this browser only.</div></div>',
          buttons: [
            { label: 'Reset Times', value: 'reset' },
            { label: 'OK', value: true, primary: true, cancel: true }
          ]
        }).then(function (r) {
          if (r === 'reset') { best = {}; saveBest(best); updateBest(); reset(); }
        });
      }

      function gameMenu() {
        return [
          { label: 'New', icon: 'mine', shortcut: 'F2', action: function () { reset(); } },
          { separator: true },
          { label: 'Beginner', checked: level === 'beginner', action: function () { reset('beginner'); } },
          { label: 'Intermediate', checked: level === 'intermediate', action: function () { reset('intermediate'); } },
          { label: 'Expert', checked: level === 'expert', action: function () { reset('expert'); } },
          { separator: true },
          { label: 'Marks (?)', checked: marks, action: function () { marks = !marks; } },
          { label: 'Best Times...', icon: 'star', action: bestTimes },
          { separator: true },
          { label: 'Exit', icon: 'close', action: function () { ctx.close(); } }
        ];
      }
      function helpMenu() {
        return [
          { label: 'How to Play', icon: 'help', action: function () {
            Win.ui.alert('Minesweeper\n\n' +
              'The aim is to clear the board without hitting a mine.\n\n' +
              '* Left-click a square to open it.\n' +
              '* Right-click (or long-press) to plant a flag.\n' +
              '* Double-click a number with the right number of flags around it to open its neighbours.\n' +
              '* The first click is always safe.\n\n' +
              'The counter shows how many mines are left. Clear every safe square to win.', 'How to Play', 'mine');
          } },
          { label: 'About Minesweeper', icon: 'mine', action: function () {
            Win.ui.alert('WINemulator Minesweeper\nVersion ' + Win.osVersion + ' (Web Edition)\n\nBeginner, Intermediate and Expert levels.\nBest times are saved in this browser.', 'About Minesweeper', 'mine');
          } }
        ];
      }

      body.querySelectorAll('.mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(item.dataset.menu === 'game' ? gameMenu() : helpMenu(), r.left, r.bottom + 1);
        });
      });

      let longTimer = 0, longIndex = -1, suppressClick = false, lastTouchFlag = 0;

      boardEl.addEventListener('pointerdown', function (ev) {
        const cell = ev.target.closest('.ms-cell');
        if (!cell) return;
        if (ev.pointerType === 'mouse') return;
        longIndex = Number(cell.dataset.i);
        suppressClick = false;
        clearTimeout(longTimer);
        longTimer = setTimeout(function () {
          if (longIndex > -1) {
            suppressClick = true;
            lastTouchFlag = Date.now();
            toggleFlag(longIndex);
            if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
          }
        }, 400);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
        boardEl.addEventListener(t, function () { clearTimeout(longTimer); longTimer = 0; });
      });

      boardEl.addEventListener('click', function (ev) {
        const cell = ev.target.closest('.ms-cell');
        if (!cell) return;
        if (suppressClick) { suppressClick = false; return; }
        if (ev.detail > 1) return;
        reveal(Number(cell.dataset.i));
      });

      boardEl.addEventListener('dblclick', function (ev) {
        const cell = ev.target.closest('.ms-cell');
        if (!cell) return;
        chord(Number(cell.dataset.i));
      });

      boardEl.addEventListener('contextmenu', function (ev) {
        ev.preventDefault();
        const cell = ev.target.closest('.ms-cell');
        if (!cell) return;
        if (Date.now() - lastTouchFlag < 700) return;
        toggleFlag(Number(cell.dataset.i));
      });

      boardEl.addEventListener('auxclick', function (ev) {
        if (ev.button !== 1) return;
        const cell = ev.target.closest('.ms-cell');
        if (!cell) return;
        ev.preventDefault();
        chord(Number(cell.dataset.i));
      });

      faceEl.addEventListener('click', function () { reset(); });

      body.addEventListener('keydown', function (ev) {
        if (U.isTyping(ev.target)) return;
        if (ev.key === 'F2') { ev.preventDefault(); reset(); }
      });

      ticker = setInterval(function () {
        if (!started || over) return;
        elapsed = Math.min(999, Math.floor((Date.now() - startTime) / 1000));
        timerEl.textContent = pad3(elapsed);
      }, 250);

      reset();

      return {
        onReopen: function (a) { if (a && a.level && LEVELS[a.level]) reset(a.level); },
        destroy: function () { clearInterval(ticker); clearTimeout(longTimer); },
        get level() { return level; }
      };
    }
  };
})();
