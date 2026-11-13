/* WINemulator — taskbar, Start menu, system tray */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  let startEl, startBtn, tasksEl, quickEl, clockEl;
  let startOpen = false, subEl = null, subOwner = null;
  let calendarEl, volumeEl;
  let calMonth = new Date();
  let unsub = null;

  const APPS = {
    notepad: 'Notepad', paint: 'Paint', calc: 'Calculator', terminal: 'MS-DOS Prompt',
    explorer: 'Windows Explorer', browser: 'Internet Explorer', minesweeper: 'Minesweeper',
    settings: 'Control Panel', taskmgr: 'Task Manager', help: 'Help', recycle: 'Recycle Bin'
  };

  function menuIsOpen() { return startOpen; }

  function hideSub() {
    if (subEl) { subEl.remove(); subEl = null; subOwner = null; }
  }
  function closeStart() {
    startOpen = false;
    hideSub();
    startEl.hidden = true;
    startBtn.classList.remove('pressed');
    startBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleStart() {
    if (startOpen) return closeStart();
    Win.ui.closeMenus();
    startOpen = true;
    startEl.hidden = false;
    startBtn.classList.add('pressed');
    startBtn.setAttribute('aria-expanded', 'true');
    buildStart();
    Win.sound.play('menu');
  }

  function startItem(opts) {
    const item = el('div', { class: 'sm-item' + (opts.disabled ? ' disabled' : ''), role: 'menuitem', tabindex: '0' });
    item.innerHTML = '<span class="sm-icon">' + (opts.icon ? Win.icon(opts.icon, 24) : '') + '</span>' +
      '<span class="sm-label"></span><span class="sm-arrow">' + (opts.sub ? '▸' : '') + '</span>';
    item.querySelector('.sm-label').textContent = opts.label;
    if (opts.sub) {
      item.classList.add('has-sub');
      const show = function () {
        if (subOwner === item) return;
        hideSub();
        subOwner = item;
        subEl = el('div', { class: 'menu sm-sub' });
        if (innerWidth < 760) subEl.classList.add('sub-inline');
        opts.sub().forEach(function (sub) {
          if (sub.separator) { subEl.appendChild(el('div', { class: 'menu-separator' })); return; }
          const row = el('div', { class: 'menu-item' });
          row.innerHTML = '<span class="mi-icon">' + (sub.icon ? Win.icon(sub.icon, 16) : '') + '</span><span class="mi-label"></span>';
          row.querySelector('.mi-label').textContent = sub.label;
          row.addEventListener('click', function (ev) {
            ev.stopPropagation();
            closeStart();
            if (sub.action) setTimeout(sub.action, 0);
          });
          subEl.appendChild(row);
        });
        startEl.appendChild(subEl);
        const mr = startEl.getBoundingClientRect();
        const ir = item.getBoundingClientRect();
        if (!subEl.classList.contains('sub-inline')) {
          const sr = subEl.getBoundingClientRect();
          let top = ir.top - mr.top;
          const maxTop = Math.max(0, mr.height - sr.height - 4);
          if (top > maxTop) top = maxTop;
          subEl.style.top = top + 'px';
          subEl.style.left = (mr.width - 2) + 'px';
          if (ir.right + sr.width > innerWidth - 4) {
            subEl.style.left = (-sr.width + 2) + 'px';
          }
        } else {
          subEl.style.left = '0px';
          subEl.style.top = (ir.bottom - mr.top - 2) + 'px';
          subEl.style.width = '100%';
        }
        Win.sound.play('menu');
      };
      item.addEventListener('mouseenter', show);
      item.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (subOwner === item) hideSub(); else show();
      });
    } else if (!opts.disabled) {
      item.addEventListener('click', function (ev) {
        ev.stopPropagation();
        closeStart();
        if (opts.action) setTimeout(opts.action, 0);
      });
      item.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') item.click(); });
    }
    return item;
  }

  function programsSub() {
    return [
      { label: 'Accessories', separator: false },
      { label: 'Notepad', icon: 'notepad', action: function () { Win.wm.open('notepad'); } },
      { label: 'Paint', icon: 'paint', action: function () { Win.wm.open('paint'); } },
      { label: 'Calculator', icon: 'calc', action: function () { Win.wm.open('calc'); } },
      { label: 'MS-DOS Prompt', icon: 'terminal', action: function () { Win.wm.open('terminal'); } },
      { separator: true },
      { label: 'Games', separator: false },
      { label: 'Minesweeper', icon: 'mine', action: function () { Win.wm.open('minesweeper'); } },
      { separator: true },
      { label: 'Internet Explorer', icon: 'ie', action: function () { Win.wm.open('browser'); } },
      { label: 'Windows Explorer', icon: 'folder', action: function () { Win.wm.open('explorer', { path: 'C:\\' }); } },
      { label: 'Control Panel', icon: 'settings', action: function () { Win.wm.open('settings'); } },
      { label: 'Task Manager', icon: 'taskmgr', action: function () { Win.wm.open('taskmgr'); } }
    ];
  }

  function docsSub() {
    const recent = Win.recent ? Win.recent.list() : [];
    const items = [{ label: 'My Documents', icon: 'documents', action: function () { Win.wm.open('explorer', { path: 'C:\\My Documents' }); } }];
    if (recent.length) {
      items.push({ separator: true });
      recent.slice(0, 8).forEach(function (p) {
        const name = Win.fs.baseName(p);
        items.push({
          label: name, icon: Win.fs.appFor(p) === 'paint' ? 'imagefile' : 'textfile',
          action: function () { if (Win.shell) Win.shell.openFile(p); }
        });
      });
      items.push({ separator: true });
      items.push({ label: 'Clear Recent Documents', icon: 'delete', action: function () { if (Win.recent) Win.recent.clear(); Win.ui.toast('Recent documents cleared.', 'info'); } });
    }
    return items;
  }

  function settingsSub() {
    return [
      { label: 'Control Panel', icon: 'settings', action: function () { Win.wm.open('settings'); } },
      { label: 'Display Properties', icon: 'monitor', action: function () { Win.wm.open('settings', { tab: 'appearance' }); } },
      { label: 'Sounds', icon: 'sound', action: function () { Win.wm.open('settings', { tab: 'sounds' }); } },
      { label: 'Taskbar & Start Menu', icon: 'taskmgr', action: function () { Win.wm.open('settings', { tab: 'performance' }); } }
    ];
  }

  function buildStart() {
    startEl.innerHTML = '';
    startEl.appendChild(el('div', { class: 'sm-banner', html: '<div class="sm-banner-inner"><span class="sm-b1">WIN</span><span class="sm-b2">emulator</span><span class="sm-b3">98</span></div>' }));
    const list = el('div', { class: 'sm-list' });
    list.appendChild(startItem({ label: 'Programs', icon: 'programs', sub: programsSub }));
    list.appendChild(startItem({ label: 'Documents', icon: 'documents', sub: docsSub }));
    list.appendChild(startItem({ label: 'Settings', icon: 'settings', sub: settingsSub }));
    list.appendChild(startItem({ label: 'Find', icon: 'search', action: findDialog }));
    list.appendChild(startItem({ label: 'Help', icon: 'help', action: function () { Win.wm.open('help'); } }));
    list.appendChild(startItem({ label: 'Run...', icon: 'run', action: function () { Win.ui.runDialog(); } }));
    list.appendChild(el('div', { class: 'menu-separator' }));
    list.appendChild(startItem({ label: 'Log Off User...', icon: 'logoff', action: logOff }));
    list.appendChild(startItem({ label: 'Shut Down...', icon: 'shutdown', action: shutdownDialog }));
    startEl.appendChild(list);
    startEl.appendChild(el('div', { class: 'sm-footer', html: '<span></span><span class="sm-version">WINemulator 98</span>' }));
    startEl.querySelector('.sm-footer span').textContent = 'Web Edition';
  }

  /* ---------------------------------------------------------------- find */
  function findDialog() {
    let results = [];
    Win.ui.dialog({
      title: 'Find: All Files', icon: 'search', width: 520,
      html: '<div class="find-box"><div class="find-row"><label>Named:</label><input class="field find-q" type="text" placeholder="*.txt or Welcome"></div>' +
        '<div class="find-row"><label>Look in:</label><span class="find-look">My Computer (C:)</span></div>' +
        '<div class="find-actions"><button class="btn find-go" type="button">Find Now</button><button class="btn find-stop" type="button">Stop</button></div>' +
        '<div class="find-results field"></div></div>',
      onShow: function (win, close) {
        const q = win.querySelector('.find-q');
        const res = win.querySelector('.find-results');
        const run = function () {
          results = Win.fs.search(q.value.replace(/\*/g, ''));
          res.innerHTML = '';
          if (!results.length) { res.appendChild(el('div', { class: 'find-empty', text: 'No files found.' })); return; }
          results.forEach(function (r) {
            const row = el('div', { class: 'find-result' });
            row.innerHTML = Win.icon(r.icon, 16) + '<span class="fr-name"></span><span class="fr-path"></span>';
            row.querySelector('.fr-name').textContent = r.name;
            row.querySelector('.fr-path').textContent = Win.fs.parentPath(r.path);
            row.addEventListener('dblclick', function () {
              close(true);
              setTimeout(function () { if (Win.shell) Win.shell.openFile(r.path); }, 20);
            });
            res.appendChild(row);
          });
        };
        win.querySelector('.find-go').addEventListener('click', run);
        q.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') run(); });
        win.querySelector('.find-stop').addEventListener('click', function () { q.value = ''; res.innerHTML = ''; });
        setTimeout(function () { q.focus(); }, 30);
      },
      buttons: [{ label: 'Close', value: true, primary: true }]
    });
  }

  /* ------------------------------------------------------------- shutdown */
  function shutdownDialog() {
    let mode = 'shutdown';
    Win.ui.dialog({
      title: 'Shut Down Windows', icon: 'shutdown', width: 440,
      html: '<div class="sd-wrap"><div class="sd-icon">' + Win.icon('computer', 48) + '</div>' +
        '<div class="sd-main"><div class="sd-question">What do you want the computer to do?</div>' +
        '<div class="sd-opts">' +
        '<label><input type="radio" name="sd" value="shutdown" checked> Shut down</label>' +
        '<label><input type="radio" name="sd" value="restart"> Restart</label>' +
        '<label><input type="radio" name="sd" value="dos"> Restart in MS-DOS mode</label>' +
        '<label><input type="radio" name="sd" value="logoff"> Log off User</label>' +
        '</div><div class="sd-note">Hold down Shift while choosing Restart to skip the boot screens.</div>' +
        '</div></div>',
      onShow: function (win) {
        const ok = win.querySelector('.dialog-buttons .btn.default');
        if (ok) {
          ok.addEventListener('click', function () {
            const picked = win.querySelector('input[name=sd]:checked');
            mode = picked ? picked.value : 'shutdown';
          }, true);
        }
        win.querySelectorAll('input[name=sd]').forEach(function (r) {
          r.addEventListener('change', function () {
            win.querySelector('.sd-note').textContent = r.value === 'dos' ? 'You will get a command prompt. Type WIN to start Windows again.' :
              r.value === 'logoff' ? 'Your programs will close and you will return to the logon screen.' :
                'Hold down Shift while choosing Restart to skip the boot screens.';
          });
        });
      },
      buttons: [
        { label: 'OK', value: true, primary: true },
        { label: 'Cancel', value: false, cancel: true }
      ]
    }).then(function (ok) {
      if (!ok) return;
      if (Win.boot) Win.boot.power(mode);
    });
  }

  function logOff() {
    Win.ui.confirm('Are you sure you want to log off?', 'Log Off Windows', 'question').then(function (yes) {
      if (yes && Win.boot) Win.boot.logoff();
    });
  }

  /* ------------------------------------------------------------- popovers */
  function buildCalendar() {
    const now = new Date();
    const today = new Date();
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const start = first.getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const monthName = calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    let html = '<div class="cal-head"><button class="cal-prev" aria-label="Previous month">◀</button><b></b><button class="cal-next" aria-label="Next month">▶</button></div>' +
      '<div class="cal-grid cal-dow">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>' +
      '<div class="cal-grid cal-days"></div>' +
      '<div class="cal-foot"><span class="cal-today"></span><button class="btn cal-settings" type="button">Date/Time...</button></div>';
    calendarEl.innerHTML = html;
    calendarEl.querySelector('.cal-head b').textContent = monthName;
    const daysEl = calendarEl.querySelector('.cal-days');
    for (let i = 0; i < start; i++) daysEl.appendChild(el('span', { class: 'cal-blank' }));
    for (let d = 1; d <= days; d++) {
      const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      daysEl.appendChild(el('span', { class: 'cal-day' + (isToday ? ' today' : ''), text: String(d), title: new Date(y, m, d).toDateString() }));
    }
    calendarEl.querySelector('.cal-today').textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    calendarEl.querySelector('.cal-prev').addEventListener('click', function (ev) { ev.stopPropagation(); calMonth = new Date(y, m - 1, 1); buildCalendar(); });
    calendarEl.querySelector('.cal-next').addEventListener('click', function (ev) { ev.stopPropagation(); calMonth = new Date(y, m + 1, 1); buildCalendar(); });
    calendarEl.querySelector('.cal-settings').addEventListener('click', function (ev) {
      ev.stopPropagation();
      hidePopovers();
      Win.ui.dialog({
        title: 'Date/Time Properties', icon: 'calendar', width: 360,
        html: '<div class="datetime-box"><div class="dt-clock"></div><div class="dt-date"></div><div class="dt-note">Time zone: Browser local time<br>Internet time: synchronised</div></div>',
        onShow: function (win) {
          const tick = function () {
            const d = new Date();
            win.querySelector('.dt-clock').textContent = d.toLocaleTimeString();
            win.querySelector('.dt-date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          };
          tick();
          const t = setInterval(tick, 1000);
          win.addEventListener('winemulator:close', function () { clearInterval(t); });
        },
        buttons: [{ label: 'OK', value: true, primary: true }]
      });
    });
  }

  function showCalendar() {
    hidePopovers();
    if (!calendarEl) calendarEl = document.getElementById('calendar-pop');
    calMonth = new Date();
    buildCalendar();
    calendarEl.hidden = false;
  }
  function showVolume() {
    hidePopovers();
    if (!volumeEl) volumeEl = document.getElementById('volume-pop');
    const v = Math.round(Win.store.get('volume') * 100);
    volumeEl.innerHTML = '<div class="vol-title">' + Win.icon(Win.store.get('sound') ? 'volume' : 'no-sound', 20) + '<b>Volume</b></div>' +
      '<input type="range" min="0" max="100" value="' + v + '" class="vol-range" aria-label="Volume">' +
      '<div class="vol-row"><label><input type="checkbox" class="vol-mute"> Mute all sounds</label><span class="vol-num">' + v + '%</span></div>' +
      '<div class="vol-actions"><button class="btn vol-test" type="button">Test</button></div>';
    volumeEl.hidden = false;
    const range = volumeEl.querySelector('.vol-range');
    const num = volumeEl.querySelector('.vol-num');
    const mute = volumeEl.querySelector('.vol-mute');
    mute.checked = !Win.store.get('sound');
    range.addEventListener('input', function () {
      Win.store.set({ volume: Number(range.value) / 100, sound: true });
      mute.checked = false;
      num.textContent = range.value + '%';
      Win.sound.play('click');
    });
    mute.addEventListener('change', function () { Win.store.set({ sound: !mute.checked }); Win.sound.play('click'); });
    volumeEl.querySelector('.vol-test').addEventListener('click', function () { Win.sound.play('ding'); });
  }
  function hidePopovers() {
    const c = document.getElementById('calendar-pop'); if (c) c.hidden = true;
    const v = document.getElementById('volume-pop'); if (v) v.hidden = true;
  }

  function networkDialog() {
    Win.ui.dialog({
      title: 'Local Area Connection Status', icon: 'network', width: 400,
      html: '<div class="net-box"><div class="net-head">' + Win.icon('network', 32) + '<div><b>Local Area Connection</b><div class="net-state">Connected</div></div></div>' +
        '<div class="net-grid"><span>Duration:</span><b class="net-uptime"></b><span>Speed:</span><b>100.0 Mbps</b><span>Sent:</span><b class="net-sent"></b><span>Received:</span><b class="net-recv"></b></div>' +
        '<div class="net-note">This is a simulated network adapter. The internet is only used when you open a website in Internet Explorer.</div></div>',
      onShow: function (win) {
        win.querySelector('.net-uptime').textContent = U.fmtDuration(Date.now() - (Win.startedAt || Date.now()));
        win.querySelector('.net-sent').textContent = U.fmtBytes(120000 + Math.floor(Math.random() * 900000));
        win.querySelector('.net-recv').textContent = U.fmtBytes(800000 + Math.floor(Math.random() * 3000000));
      },
      buttons: [{ label: 'OK', value: true, primary: true }]
    });
  }

  /* ----------------------------------------------------------------- sync */
  function sync() {
    if (!tasksEl) return;
    tasksEl.innerHTML = '';
    const list = Win.wm.list().filter(function (w) { return !w.closing; });
    list.forEach(function (w) {
      const btn = el('button', { class: 'task-btn' + (w === Win.wm.active() && !w.minimized ? ' active' : ''), type: 'button', title: w.title });
      btn.innerHTML = Win.icon(w.icon, 16) + '<span class="task-label"></span>';
      btn.querySelector('.task-label').textContent = w.title;
      btn.addEventListener('click', function () {
        if (w.minimized) Win.wm.restore(w);
        else if (Win.wm.active() === w) Win.wm.minimize(w);
        else Win.wm.focus(w);
      });
      btn.addEventListener('contextmenu', function (ev) {
        ev.preventDefault();
        Win.ui.menu([
          { label: 'Restore', icon: 'restore', action: function () { Win.wm.restore(w); } },
          { label: 'Minimize', icon: 'minimize', disabled: w.minimized, action: function () { Win.wm.minimize(w); } },
          { label: w.maximized ? 'Restore Size' : 'Maximize', icon: 'maximize', action: function () { if (w.maximized) Win.wm.restoreSize(w); else { Win.wm.restore(w); Win.wm.maximize(w); } } },
          { separator: true },
          { label: 'Close', icon: 'close', action: function () { Win.wm.close(w); } }
        ], ev.clientX, ev.clientY);
      });
      tasksEl.appendChild(btn);
    });
    if (Win.store.get('fps')) {
      // no-op: fps meter lives in the task manager
    }
  }

  function updateClock() {
    if (!clockEl) return;
    clockEl.textContent = U.fmtTime(Date.now());
    clockEl.title = U.fmtDateLong(Date.now());
  }

  function buildQuick() {
    const items = [
      { icon: 'ie', title: 'Launch Internet Explorer', action: function () { Win.wm.open('browser'); } },
      { icon: 'folder', title: 'Windows Explorer', action: function () { Win.wm.open('explorer', { path: 'C:\\' }); } },
      { icon: 'notepad', title: 'Notepad', action: function () { Win.wm.open('notepad'); } },
      { icon: 'monitor', title: 'Show Desktop', action: showDesktop }
    ];
    items.forEach(function (it) {
      const b = el('button', { class: 'ql-btn', type: 'button', title: it.title, 'aria-label': it.title, html: Win.icon(it.icon, 16) });
      b.addEventListener('click', it.action);
      quickEl.appendChild(b);
    });
    quickEl.appendChild(el('div', { class: 'ql-grip' }));
  }

  let desktopShown = false, rememberMin = [];
  function showDesktop() {
    const open = Win.wm.list().filter(function (w) { return !w.closing && !w.minimized; });
    if (open.length) {
      desktopShown = true;
      rememberMin = open.slice();
      open.forEach(function (w) { Win.wm.minimize(w); });
    } else {
      desktopShown = false;
      rememberMin.forEach(function (w) { if (!w.closing) Win.wm.restore(w); });
      rememberMin = [];
    }
  }

  function init() {
    startEl = document.getElementById('start-menu');
    startBtn = document.getElementById('start-button');
    tasksEl = document.getElementById('tasks');
    quickEl = document.getElementById('quicklaunch');
    clockEl = document.getElementById('tray-clock');
    startBtn.querySelector('#start-icon').innerHTML = Win.icon('flag', 20);
    document.getElementById('tray-volume').innerHTML = Win.icon('volume', 16);
    document.getElementById('tray-network').innerHTML = Win.icon('network', 16);
    buildQuick();
    startBtn.addEventListener('click', function (ev) { ev.stopPropagation(); toggleStart(); });
    startBtn.addEventListener('contextmenu', function (ev) { ev.preventDefault(); Win.ui.menu([{ label: 'Open Start Menu', icon: 'start', action: toggleStart }], ev.clientX, ev.clientY); });

    document.getElementById('tray-clock').addEventListener('click', function (ev) {
      ev.stopPropagation();
      const c = document.getElementById('calendar-pop');
      if (c && !c.hidden) { hidePopovers(); return; }
      closeStart(); showCalendar();
    });
    document.getElementById('tray-volume').addEventListener('click', function (ev) {
      ev.stopPropagation();
      const v = document.getElementById('volume-pop');
      if (v && !v.hidden) { hidePopovers(); return; }
      closeStart(); showVolume();
    });
    document.getElementById('tray-network').addEventListener('click', function (ev) { ev.stopPropagation(); closeStart(); hidePopovers(); networkDialog(); });

    document.addEventListener('pointerdown', function (ev) {
      if (startOpen && !startEl.contains(ev.target) && !startBtn.contains(ev.target)) closeStart();
      if (!ev.target.closest('#calendar-pop') && !ev.target.closest('#tray-clock') &&
          !ev.target.closest('#volume-pop') && !ev.target.closest('#tray-volume')) hidePopovers();
    }, true);

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (startOpen) { closeStart(); ev.stopPropagation(); }
        hidePopovers();
      }
    }, true);

    updateClock();
    setInterval(updateClock, 10000);
    sync();
    unsub = Win.store.subscribe(function (s) {
      const vol = document.getElementById('tray-volume');
      if (vol) vol.innerHTML = Win.icon(s.sound ? 'volume' : 'no-sound', 16);
      updateClock();
    });
  }

  Win.taskbar = {
    init: init, sync: sync, toggleStart: toggleStart, closeStart: closeStart,
    showDesktop: showDesktop, menuIsOpen: menuIsOpen, hidePopovers: hidePopovers
  };
})();
