/* WINemulator — Task Manager */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  const EXE = {
    browser: 'IEXPLORE.EXE', explorer: 'EXPLORER.EXE', notepad: 'NOTEPAD.EXE',
    paint: 'MSPAINT.EXE', calc: 'CALC.EXE', terminal: 'COMMAND.COM',
    minesweeper: 'WINMINE.EXE', settings: 'CONTROL.EXE', taskmgr: 'TASKMGR.EXE',
    help: 'WINHLP32.EXE'
  };
  const MEM = {
    browser: 18420, explorer: 9820, notepad: 4210, paint: 12480,
    calc: 3480, terminal: 3960, minesweeper: 3080, settings: 5240,
    taskmgr: 4380, help: 4720
  };
  const TABS = [
    { id: 'apps', label: 'Applications' },
    { id: 'processes', label: 'Processes' },
    { id: 'performance', label: 'Performance' }
  ];
  const N = 60;

  function pct(n, max) { return Math.max(0, Math.min(max, n)); }

  Win.apps.taskmgr = {
    name: 'Windows Task Manager', title: 'Windows Task Manager', icon: 'taskmgr',
    width: 660, height: 500, minWidth: 420, minHeight: 330,
    singleton: true,
    mount: function (body, ctx) {
      body.classList.add('app-taskmgr');
      let tab = 'apps';
      let selected = null;
      let speed = 1000;
      let timer = 0;
      let cpuHistory = new Array(N).fill(0);
      let memHistory = new Array(N).fill(0);
      let seeded = false;
      let pids = {};
      let nextPid = 400;

      body.innerHTML =
        '<div class="menubar tm-menu"><div class="mb-item" data-menu="file">File</div>' +
        '<div class="mb-item" data-menu="options">Options</div>' +
        '<div class="mb-item" data-menu="view">View</div><div class="mb-item" data-menu="help">Help</div></div>' +
        '<div class="tm-tabs" role="tablist"></div>' +
        '<div class="tm-body">' +
        '  <div class="tm-pane" data-pane="apps">' +
        '    <div class="tm-count tm-app-count">0 running tasks</div>' +
        '    <div class="tm-list tm-app-list" role="listbox" tabindex="0"></div>' +
        '    <div class="tm-actions"><button class="btn tm-end" type="button">End Task</button>' +
        '    <button class="btn tm-switch" type="button">Switch To</button>' +
        '    <button class="btn tm-new" type="button">New Task...</button></div>' +
        '  </div>' +
        '  <div class="tm-pane" data-pane="processes">' +
        '    <div class="tm-count tm-proc-count">0 processes</div>' +
        '    <div class="tm-list tm-proc-list" role="listbox" tabindex="0"></div>' +
        '    <div class="tm-actions"><button class="btn tm-endproc" type="button">End Process</button></div>' +
        '  </div>' +
        '  <div class="tm-pane" data-pane="performance">' +
        '    <div class="tm-perf">' +
        '      <div class="tm-graphs">' +
        '        <div class="tm-graph"><h4><span>CPU Usage History</span><b class="tm-cpu-label">0%</b></h4><canvas class="tm-cpu-canvas"></canvas></div>' +
        '        <div class="tm-graph"><h4><span>Memory Usage History</span><b class="tm-mem-label">0%</b></h4><canvas class="tm-mem-canvas"></canvas></div>' +
        '      </div>' +
        '      <div class="tm-stats">' +
        '        <div class="tm-statbox"><h4>CPU Usage</h4><div class="tm-big tm-cpu-big">0%</div><div class="tm-stat"><span>Kernel</span><b class="tm-kernel">0%</b></div><div class="tm-stat"><span>User</span><b class="tm-user">0%</b></div></div>' +
        '        <div class="tm-statbox"><h4>Memory Usage</h4><div class="tm-big tm-mem-big">0%</div>' +
        '          <div class="tm-stat"><span>Total</span><b class="tm-mem-total">--</b></div>' +
        '          <div class="tm-stat"><span>Available</span><b class="tm-mem-avail">--</b></div>' +
        '          <div class="tm-stat"><span>Cache</span><b class="tm-mem-cache">--</b></div></div>' +
        '        <div class="tm-statbox"><h4>Totals</h4>' +
        '          <div class="tm-stat"><span>Handles</span><b class="tm-handles">--</b></div>' +
        '          <div class="tm-stat"><span>Threads</span><b class="tm-threads">--</b></div>' +
        '          <div class="tm-stat"><span>Processes</span><b class="tm-procs">--</b></div></div>' +
        '        <div class="tm-statbox"><h4>Uptime</h4><div class="tm-uptime">--</div></div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>' +
        '<div class="statusbar tm-status">' +
        '<span class="status-cell tm-processes">Processes: 0</span>' +
        '<span class="status-cell fixed tm-cpu">CPU Usage: 0%</span>' +
        '<span class="status-cell fixed tm-mem">Mem Usage: 0%</span>' +
        '<span class="status-cell fixed tm-uptime">Uptime: 0s</span></div>';

      const tabsEl = body.querySelector('.tm-tabs');
      const appList = body.querySelector('.tm-app-list');
      const procList = body.querySelector('.tm-proc-list');
      const appCount = body.querySelector('.tm-app-count');
      const procCount = body.querySelector('.tm-proc-count');
      const cpuCanvas = body.querySelector('.tm-cpu-canvas');
      const memCanvas = body.querySelector('.tm-mem-canvas');
      const statusProc = body.querySelector('.tm-processes');
      const statusCpu = body.querySelector('.tm-cpu');
      const statusMem = body.querySelector('.tm-mem');
      const statusUp = body.querySelector('.tm-uptime');

      function renderTabs() {
        tabsEl.innerHTML = '';
        TABS.forEach(function (t) {
          const b = el('button', {
            class: 'tm-tab' + (t.id === tab ? ' active' : ''), type: 'button',
            role: 'tab', 'aria-selected': t.id === tab ? 'true' : 'false', text: t.label
          });
          b.addEventListener('click', function () { switchTab(t.id); });
          tabsEl.appendChild(b);
        });
      }

      function switchTab(id) {
        tab = id;
        selected = null;
        body.querySelectorAll('.tm-tab').forEach(function (b) {
          const on = TABS.find(function (t) { return t.id === id; }) && b.textContent === TABS.find(function (t) { return t.id === id; }).label;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        body.querySelectorAll('.tm-pane').forEach(function (p) {
          p.classList.toggle('active', p.dataset.pane === id);
        });
        if (id === 'performance') {
          if (!seeded) { seedHistory(); seeded = true; }
          updatePerformance(true);
        } else if (id === 'apps') renderApps();
        else renderProcesses();
      }

      function windowsList() {
        return Win.wm.list().filter(function (w) { return !w.closing; });
      }

      function pidFor(w) {
        if (!pids[w.id]) { pids[w.id] = nextPid; nextPid += 4; }
        return pids[w.id];
      }

      function simulatedCpu() {
        const n = windowsList().length;
        const t = Date.now() / 1000;
        return pct(Math.round(7 + n * 2.6 + Math.sin(t * 0.55) * 4 + Math.sin(t * 1.9) * 2 + Math.random() * 3), 97);
      }

      function simulatedMem() {
        const n = windowsList().length;
        const t = Date.now() / 1000;
        return pct(Math.round(31 + n * 3.1 + Math.sin(t * 0.2) * 2 + Math.random()), 94);
      }

      function updateStatus(cpu, mem) {
        const n = windowsList().length;
        const procs = 18 + n;
        statusProc.textContent = 'Processes: ' + procs;
        statusCpu.textContent = 'CPU Usage: ' + cpu + '%';
        statusMem.textContent = 'Mem Usage: ' + mem + '%';
        statusUp.textContent = 'Uptime: ' + U.fmtDuration(Date.now() - (Win.startedAt || Date.now()));
      }

      /* --------------------------------------------------------- applications */
      function renderApps() {
        const list = windowsList();
        appCount.textContent = list.length + ' running task' + (list.length === 1 ? '' : 's');
        appList.innerHTML = '<div class="tm-head slim"><span>Task</span><span>Status</span></div>';
        if (!list.length) {
          appList.appendChild(el('div', { class: 'tm-empty', text: 'No applications are running.' }));
          return;
        }
        list.forEach(function (w) {
          const row = el('div', {
            class: 'tm-row slim' + (selected === w.id ? ' selected' : ''),
            role: 'option', dataset: { key: w.id }, tabindex: '-1'
          });
          row.innerHTML = '<span class="tm-name">' + Win.icon(w.icon, 16) +
            '<span class="tm-title"></span></span><span>Running</span>';
          row.querySelector('.tm-title').textContent = w.title;
          row.addEventListener('click', function () { selectRow(row, w.id); });
          row.addEventListener('dblclick', function () { switchTo(w.id); });
          appList.appendChild(row);
        });
      }

      function selectRow(row, key) {
        selected = key;
        row.parentNode.querySelectorAll('.tm-row').forEach(function (n) { n.classList.toggle('selected', n === row); });
      }

      function selectedWindow() {
        return windowsList().find(function (w) { return w.id === selected; }) || null;
      }

      function switchTo(id) {
        const w = windowsList().find(function (x) { return x.id === id; });
        if (!w) return;
        if (w.minimized) Win.wm.restore(w);
        Win.wm.focus(w);
      }

      function endTask() {
        const w = selectedWindow();
        if (!w) { Win.ui.toast('Select an application first.', 'info', 1700); return; }
        Win.wm.close(w, true);
        selected = null;
        setTimeout(renderApps, 120);
        Win.ui.toast('Task ended: ' + w.title, 'close', 1800);
      }

      /* ------------------------------------------------------------ processes */
      function systemProcesses() {
        const list = windowsList();
        const busy = simulatedCpu();
        const rows = [
          { key: 'sys:idle', name: 'System Idle Process', icon: 'taskmgr', pid: 0, cpu: Math.max(0, 100 - busy - 2), mem: 20 },
          { key: 'sys:system', name: 'System', icon: 'settings', pid: 2, cpu: 0, mem: 1210 },
          { key: 'sys:explorer', name: 'EXPLORER.EXE', icon: 'folder', pid: 118, cpu: Math.max(0, Math.round(busy / 8)), mem: 8640 },
          { key: 'sys:winmgmt', name: 'WINMGMT.EXE', icon: 'taskmgr', pid: 142, cpu: 0, mem: 2860 },
          { key: 'sys:taskmgr', name: 'TASKMGR.EXE', icon: 'taskmgr', pid: 156, cpu: 1, mem: 4380 }
        ];
        list.forEach(function (w) {
          rows.push({
            key: w.id, winId: w.id, name: EXE[w.appId] || 'PROGRAM.EXE',
            icon: w.icon, pid: pidFor(w),
            cpu: pct(Math.round(Math.random() * 3 + (w.appId === 'browser' ? 1 : 0)), 99),
            mem: MEM[w.appId] || 4000
          });
        });
        return rows;
      }

      function renderProcesses() {
        const rows = systemProcesses();
        procCount.textContent = rows.length + ' processes';
        procList.innerHTML = '<div class="tm-head"><span>Image Name</span><span>PID</span><span>CPU</span><span>Mem Usage</span></div>';
        rows.forEach(function (r) {
          const row = el('div', {
            class: 'tm-row' + (selected === r.key ? ' selected' : ''), role: 'option',
            dataset: { key: r.key }, tabindex: '-1'
          });
          row.innerHTML = '<span class="tm-name">' + Win.icon(r.icon, 16) + '<span class="tm-pname"></span></span>' +
            '<span class="tm-pid"></span><span class="tm-cpu"></span><span class="tm-mem"></span>';
          row.querySelector('.tm-pname').textContent = r.name;
          row.querySelector('.tm-pid').textContent = String(r.pid);
          row.querySelector('.tm-cpu').textContent = r.cpu + '%';
          row.querySelector('.tm-mem').textContent = r.mem.toLocaleString() + ' K';
          row.addEventListener('click', function () { selectRow(row, r.key); });
          if (r.winId) row.addEventListener('dblclick', function () { switchTo(r.winId); });
          procList.appendChild(row);
        });
      }

      function endProcess() {
        const rows = systemProcesses();
        const r = rows.find(function (x) { return x.key === selected; });
        if (!r) { Win.ui.toast('Select a process first.', 'info', 1700); return; }
        if (!r.winId) {
          Win.ui.error('This is a critical system process and cannot be ended.\n\nAccess is denied.', 'Task Manager');
          return;
        }
        Win.wm.close(r.winId, true);
        selected = null;
        setTimeout(renderProcesses, 120);
        Win.ui.toast('Process ended: ' + r.name, 'close', 1800);
      }

      /* ---------------------------------------------------------- performance */
      function fitCanvas(cv) {
        const w = Math.max(80, cv.clientWidth || 300);
        const h = Math.max(40, cv.clientHeight || 86);
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const tw = Math.round(w * dpr), th = Math.round(h * dpr);
        if (cv.width !== tw || cv.height !== th) {
          cv.width = tw; cv.height = th;
          const g = cv.getContext('2d');
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          return { g: g, w: w, h: h };
        }
        const ctx2 = cv.getContext('2d');
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { g: ctx2, w: w, h: h };
      }

      function drawGraph(cv, data, color) {
        if (!cv) return;
        const c = fitCanvas(cv);
        const g = c.g, w = c.w, h = c.h;
        g.fillStyle = '#000';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(60, 200, 90, .18)';
        g.lineWidth = 1;
        for (let x = 0; x < w; x += Math.max(12, w / 14)) {
          g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke();
        }
        for (let y = 0; y < h; y += Math.max(10, h / 10)) {
          g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke();
        }
        g.strokeStyle = color;
        g.lineWidth = 1.5;
        g.beginPath();
        data.forEach(function (v, i) {
          const x = (i / (N - 1)) * (w - 1);
          const y = h - 1 - (pct(v, 100) / 100) * (h - 3);
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.stroke();
        g.fillStyle = 'rgba(40, 220, 80, .09)';
        g.lineTo(w - 1, h - 1); g.lineTo(0, h - 1); g.closePath(); g.fill();
      }

      function seedHistory() {
        const cpu = simulatedCpu(), mem = simulatedMem();
        for (let i = 0; i < N; i++) {
          cpuHistory[i] = pct(cpu + Math.sin(i / 3) * 5 + (Math.random() * 4 - 2), 100);
          memHistory[i] = pct(mem + Math.sin(i / 5) * 2 + (Math.random() * 2 - 1), 100);
        }
      }

      function updatePerformance(force) {
        const cpu = simulatedCpu();
        const mem = simulatedMem();
        cpuHistory.push(cpu); cpuHistory.shift();
        memHistory.push(mem); memHistory.shift();
        drawGraph(cpuCanvas, cpuHistory, '#4be04b');
        drawGraph(memCanvas, memHistory, '#47b8ff');
        const si = Win.sysinfo ? Win.sysinfo() : {};
        const totalMb = Math.round((si.memory || 8) * 1024);
        const availMb = Math.round(totalMb * (1 - mem / 100));
        body.querySelector('.tm-cpu-label').textContent = cpu + '%';
        body.querySelector('.tm-mem-label').textContent = mem + '%';
        body.querySelector('.tm-cpu-big').textContent = cpu + '%';
        body.querySelector('.tm-mem-big').textContent = mem + '%';
        body.querySelector('.tm-kernel').textContent = Math.round(cpu * 0.35) + '%';
        body.querySelector('.tm-user').textContent = Math.round(cpu * 0.65) + '%';
        body.querySelector('.tm-mem-total').textContent = totalMb.toLocaleString() + ' K';
        body.querySelector('.tm-mem-avail').textContent = availMb.toLocaleString() + ' K';
        body.querySelector('.tm-mem-cache').textContent = Math.round(totalMb * 0.14).toLocaleString() + ' K';
        body.querySelector('.tm-handles').textContent = (2100 + windowsList().length * 74).toLocaleString();
        body.querySelector('.tm-threads').textContent = String(34 + windowsList().length * 4);
        body.querySelector('.tm-procs').textContent = String(18 + windowsList().length);
        body.querySelector('.tm-uptime').textContent = U.fmtDuration(Date.now() - (Win.startedAt || Date.now()));
        updateStatus(cpu, mem);
        if (force) return { cpu: cpu, mem: mem };
      }

      /* ----------------------------------------------------------------- tick */
      function tick() {
        const cpu = simulatedCpu();
        const mem = simulatedMem();
        updateStatus(cpu, mem);
        if (tab === 'performance') updatePerformance();
        else if (tab === 'processes') renderProcesses();
        else if (tab === 'apps') renderApps();
      }

      function setSpeed(ms) {
        speed = ms;
        clearInterval(timer);
        if (ms > 0) timer = setInterval(tick, ms);
        else tick();
      }

      /* ----------------------------------------------------------------- menus */
      function menuFor(name) {
        if (name === 'file') {
          return [
            { label: 'New Task...', icon: 'run', action: function () { Win.ui.runDialog(); } },
            { separator: true },
            { label: 'Exit Task Manager', icon: 'close', action: function () { ctx.close(); } }
          ];
        }
        if (name === 'options') {
          return [
            { label: 'Update Speed: High', checked: speed === 500, action: function () { setSpeed(500); } },
            { label: 'Update Speed: Normal', checked: speed === 1000, action: function () { setSpeed(1000); } },
            { label: 'Update Speed: Low', checked: speed === 2000, action: function () { setSpeed(2000); } },
            { label: 'Paused', checked: speed === 0, action: function () { setSpeed(0); } },
            { separator: true },
            { label: 'Refresh Now', icon: 'refresh', shortcut: 'F5', action: tick }
          ];
        }
        if (name === 'view') {
          return TABS.map(function (t) {
            return {
              label: t.label, checked: tab === t.id, action: function () { switchTab(t.id); }
            };
          }).concat([
            { separator: true },
            { label: 'Refresh Now', icon: 'refresh', action: tick }
          ]);
        }
        return [
          { label: 'Task Manager Help', icon: 'help', action: function () { Win.wm.open('help'); } },
          { separator: true },
          { label: 'About Task Manager', icon: 'taskmgr', action: function () {
            Win.ui.alert('WINemulator Task Manager\nVersion 4.10.2222 (Web Edition)\n\nMonitor running tasks, end programs and watch a simulated performance graph.\n\nAll measurements are generated locally.', 'About Task Manager', 'taskmgr');
          } }
        ];
      }

      body.querySelectorAll('.tm-menu .mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(menuFor(item.dataset.menu), r.left, r.bottom + 1);
        });
      });

      body.querySelector('.tm-end').addEventListener('click', endTask);
      body.querySelector('.tm-switch').addEventListener('click', function () {
        const w = selectedWindow();
        if (w) switchTo(w.id); else Win.ui.toast('Select an application first.', 'info', 1700);
      });
      body.querySelector('.tm-new').addEventListener('click', function () { Win.ui.runDialog(); });
      body.querySelector('.tm-endproc').addEventListener('click', endProcess);

      body.addEventListener('keydown', function (ev) {
        if (ev.key === 'F5') { ev.preventDefault(); tick(); }
        if (ev.key === 'Delete' && selected) {
          if (tab === 'apps') endTask();
          else if (tab === 'processes') endProcess();
        }
      });

      appList.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && selected) switchTo(selected);
      });
      procList.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && selected) {
          const r = systemProcesses().find(function (x) { return x.key === selected; });
          if (r && r.winId) switchTo(r.winId);
        }
      });

      renderTabs();
      switchTab('apps');
      updateStatus(simulatedCpu(), simulatedMem());
      timer = setInterval(tick, speed);
      ctx.setTitle('Windows Task Manager');

      return {
        onReopen: function () { switchTab('apps'); },
        onResize: function () { if (tab === 'performance') updatePerformance(true); },
        destroy: function () { clearInterval(timer); }
      };
    }
  };
})();
