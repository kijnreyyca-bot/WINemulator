/* WINemulator — boot, logon, shutdown, MS-DOS mode */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  let bootLayer, loginLayer, powerLayer;
  let timers = [];
  let booting = false;
  let bootStarted = 0;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function biosMarkup() {
    return '<div class="bios-screen">' +
      '<pre class="bios-text"></pre>' +
      '<div class="bios-bottom"><span class="bios-mem">Memory Test: <b class="memval">0</b>K OK</span><span class="bios-skip">Press any key to skip</span></div>' +
      '</div>';
  }

  function splashMarkup(sub, note) {
    return '<div class="boot-splash">' +
      '<div class="bs-flag">' + Win.icon('flag', 104) + '</div>' +
      '<div class="bs-word"><span class="bs-ms">Microsoft</span><span class="bs-win">Windows<span class="bs-98">98</span></span><span class="bs-ed">Second Edition</span></div>' +
      '<div class="bs-copy">Copyright &copy; 1981&ndash;2026 WINemulator Project</div>' +
      '<div class="bs-load"><div class="bs-fill"></div></div>' +
      '<div class="bs-hint"></div>' +
      '</div>';
  }

  function xpSplashMarkup() {
    return '<div class="xp-boot-splash">' +
      '<div class="xp-logo"><span class="xp-ms">Microsoft</span><span class="xp-win">Windows</span><span class="xp-xp">xp</span></div>' +
      '<div class="xp-boot-sub">Professional &middot; Web Edition</div>' +
      '<div class="xp-progress"></div>' +
      '<div class="xp-boot-copy">Copyright &copy; 1981&ndash;2026 WINemulator Project</div>' +
      '<div class="bs-hint xp-boot-hint"></div>' +
      '</div>';
  }

  function sevenSplashMarkup() {
    return '<div class="w7-boot-splash">' +
      '<div class="w7-boot-orb">' + Win.icon('orb', 74) + '</div>' +
      '<div class="w7-boot-word">Starting Windows</div>' +
      '<div class="w7-boot-sub">Windows 7 Ultimate &middot; Web Edition</div>' +
      '<div class="w7-boot-bar"><div class="w7-boot-fill"></div></div>' +
      '<div class="w7-boot-copy">Copyright &copy; 2009&ndash;2026 WINemulator Project</div>' +
      '<div class="bs-hint w7-boot-hint"></div>' +
      '</div>';
  }

  function nineSplashMarkup() {
    return '<div class="w9-boot-splash">' +
      '<div class="w9-boot-logo">' + Win.icon('win10', 86) + '</div>' +
      '<div class="w9-boot-word">Windows <b>9</b></div>' +
      '<div class="w9-boot-dots"><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="w9-boot-sub">Pro &middot; Web Edition</div>' +
      '<div class="w9-boot-copy">Copyright &copy; 2026 WINemulator Project</div>' +
      '<div class="bs-hint w9-boot-hint"></div>' +
      '</div>';
  }

  function twentySplashMarkup() {
    return '<div class="xp-boot-splash">' +
      '<div class="xp-logo"><span class="xp-ms">Microsoft</span><span class="xp-win">Windows</span><span class="xp-xp">2000</span></div>' +
      '<div class="xp-boot-sub">Professional &middot; Web Edition</div>' +
      '<div class="xp-progress"></div>' +
      '<div class="xp-boot-copy">Copyright &copy; 1985\u20132026 WINemulator Project</div>' +
      '<div class="bs-hint xp-boot-hint"></div>' +
      '</div>';
  }

  function bootSplash() {
    if (Win.isNine) return nineSplashMarkup();
    if (Win.is2000) return twentySplashMarkup();
    if (Win.isSeven) return sevenSplashMarkup();
    return Win.isXP ? xpSplashMarkup() : splashMarkup();
  }

  function fast() {
    return Win.store.get('fastBoot') === true || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function start() {
    bootLayer = document.getElementById('boot-layer');
    loginLayer = document.getElementById('login-layer');
    powerLayer = document.getElementById('power-layer');
    clearTimers();
    booting = true;
    bootStarted = performance.now();
    document.body.classList.remove('booted', 'logged-off', 'powered-off');
    document.body.classList.add('booting');
    loginLayer.hidden = true;
    powerLayer.hidden = true;
    bootLayer.hidden = false;
    bootLayer.className = 'boot-layer';
    bootLayer.innerHTML = biosMarkup();
    const txt = bootLayer.querySelector('.bios-text');
    const mem = bootLayer.querySelector('.memval');

    const lines = [
      'WINemulator BIOS v4.02  (C) 1998-2026 WINemulator Project',
      'CPU : WebCore x86 @ 3.20 GHz   [WebAssembly JIT ready]',
      'Cache : 512K L2    Video : Canvas/VGA 1024x768',
      '',
      'Detecting IDE drives ...',
      '  Primary Master  : WINEMULATOR VIRTUAL HD 2.0GB',
      '  Primary Slave   : None',
      '  Secondary Master: CD-ROM 32X',
      '  Secondary Slave : None',
      '',
      Win.isNine ? 'Starting Windows 9...' : Win.is2000 ? 'Starting Windows 2000...' : Win.isSeven ? 'Starting Windows 7...' : Win.isXP ? 'Starting Windows XP...' : 'Starting Windows 98...'
    ];
    const step = fast() ? 25 : 72;
    lines.forEach(function (line, i) {
      later(function () {
        if (!booting) return;
        txt.textContent += line + '\n';
        if (i === 2) {
          let v = 0;
          const t0 = performance.now();
          const count = function (t) {
            v = Math.min(65536, Math.round((t - t0) / (fast() ? 90 : 260) * 65536));
            if (mem) mem.textContent = v.toLocaleString();
            if (v < 65536 && booting) requestAnimationFrame(count);
          };
          requestAnimationFrame(count);
        }
      }, 160 + i * step);
    });

    const splashAt = fast() ? 550 : 1500;
    later(function () {
      if (!booting) return;
      bootLayer.innerHTML = bootSplash();
      bootLayer.classList.add('splash');
      bootLayer.style.background = '#000';
      const hint = bootLayer.querySelector('.bs-hint');
      if (hint) hint.textContent = 'Starting Windows...';
    }, splashAt);

    later(finish, splashAt + (fast() ? 550 : 1500));
  }

  function finish() {
    if (!booting) return;
    booting = false;
    clearTimers();
    Win.bootMs = Math.round(performance.now() - bootStarted);
    document.body.classList.remove('booting');
    document.body.classList.add('booted');
    document.getElementById('boot-layer').classList.add('fade');
    setTimeout(function () { document.getElementById('boot-layer').hidden = true; }, 380);
    if (Win.store.get('sound')) {
      if (Win.sound.context && Win.sound.context.state === 'running') Win.sound.play('startup');
      else Win.sound.armStartup();
    }
    if (Win.store.get('firstRun')) {
      Win.store.set({ firstRun: false });
      setTimeout(function () {
        if (Win.wm) Win.wm.open('help', { welcome: true });
      }, 450);
    } else {
      setTimeout(function () {
        if (Win.ui) Win.ui.toast('WINemulator booted in ' + (Win.bootMs / 1000).toFixed(1) + 's. Press Ctrl+Esc for Start.', 'flag', 4200);
      }, 700);
    }
  }

  function skip(ev) {
    if (!booting) return;
    if (ev && ev.type === 'keydown' && (ev.key === 'F12' || ev.key === 'F5' || ev.key === 'F1')) return;
    finish();
  }

  /* --------------------------------------------------------------- logon */
  function loginUI() {
    if (Win.isNine) {
      loginLayer.innerHTML =
        '<div class="login-box w9-login-box">' +
        '<div class="login-brand w9-login-brand">' + Win.icon('win10', 30) + '<span class="w9-login-word"><b>Microsoft</b> Windows <em>9</em></span></div>' +
        '<div class="login-welcome">Welcome</div>' +
        '<div class="login-sub">Sign in to your account</div>' +
        '<button class="login-user" type="button"><span class="lu-pic w9-lu-pic">' + Win.icon('user', 52) + '</span>' +
        '<span class="lu-text"><b>User</b><em>Local account</em></span><span class="lu-go">▸</span></button>' +
        '<div class="login-hint">No password is required. Everything stays in your browser.</div>' +
        '<div class="login-foot"><span>WINemulator 9</span><span>Pro</span></div>' +
        '</div>';
    } else if (Win.isSeven) {
      loginLayer.innerHTML =
        '<div class="login-box w7-login-box">' +
        '<div class="login-brand">' + Win.icon('flag', 34) + '<span class="w7-login-word"><b>Microsoft</b> Windows <em>7</em></span></div>' +
        '<div class="login-welcome">Welcome</div>' +
        '<div class="login-sub">To begin, click your user name</div>' +
        '<button class="login-user" type="button"><span class="lu-pic">' + Win.icon('user', 52) + '</span>' +
        '<span class="lu-text"><b>User</b><em>Web Edition</em></span><span class="lu-go">➜</span></button>' +
        '<div class="login-hint">No password is required. Everything stays in your browser.</div>' +
        '<div class="login-foot"><span>WINemulator 7</span><span>Ultimate</span></div>' +
        '</div>';
    } else if (Win.is2000) {
      loginLayer.innerHTML =
        '<div class="login-box xp-login-box">' +
        '<div class="login-brand">' + Win.icon('flag', 34) + '<span class="xp-login-word"><b>Microsoft</b> Windows <em>2000</em></span></div>' +
        '<div class="login-welcome">Welcome</div>' +
        '<div class="login-sub">To begin, click your user name</div>' +
        '<button class="login-user" type="button"><span class="lu-pic">' + Win.icon('user', 52) + '</span>' +
        '<span class="lu-text"><b>User</b><em>Web Edition</em></span><span class="lu-go">&#8250;</span></button>' +
        '<div class="login-hint">No password is required. Everything stays in your browser.</div>' +
        '<div class="login-foot"><span>WINemulator 2000</span><span>Professional</span></div>' +
        '</div>';
    } else if (Win.isXP) {
      loginLayer.innerHTML =
        '<div class="login-box xp-login-box">' +
        '<div class="login-brand">' + Win.icon('flag', 34) + '<span class="xp-login-word"><b>Microsoft</b> Windows <em>xp</em></span></div>' +
        '<div class="login-welcome">Welcome</div>' +
        '<div class="login-sub">To begin, click your user name</div>' +
        '<button class="login-user" type="button"><span class="lu-pic">' + Win.icon('user', 52) + '</span>' +
        '<span class="lu-text"><b>User</b><em>Web Edition</em></span><span class="lu-go">➜</span></button>' +
        '<div class="login-hint">No password is required. Everything stays in your browser.</div>' +
        '<div class="login-foot"><span>WINemulator XP</span><span>Professional</span></div>' +
        '</div>';
    } else {
      loginLayer.innerHTML =
        '<div class="login-box">' +
        '<div class="login-brand">' + Win.icon('flag', 34) + '<span><b>Microsoft</b> Windows<span class="login-98">98</span></span></div>' +
        '<div class="login-welcome">Welcome to WINemulator</div>' +
        '<div class="login-sub">Click your user name to log on.</div>' +
        '<button class="login-user" type="button"><span class="lu-pic">' + Win.icon('user', 48) + '</span><span class="lu-text"><b>User</b><em>Web Edition</em></span><span class="lu-go">▸</span></button>' +
        '<div class="login-hint">No password is required. Everything stays in your browser.</div>' +
        '<div class="login-foot"><span>WINemulator 98</span><span>Second Edition</span></div>' +
        '</div>';
    }
    loginLayer.hidden = false;
    document.body.classList.add('logged-off');
    loginLayer.querySelector('.login-user').addEventListener('click', doLogin);
    setTimeout(function () { const b = loginLayer.querySelector('.login-user'); if (b) b.focus(); }, 60);
  }

  function logoff() {
    Win.taskbar.closeStart();
    Win.taskbar.hidePopovers();
    document.getElementById('modal-root').innerHTML = '';
    Win.wm.closeAll(true);
    setTimeout(function () {
      loginUI();
      Win.sound.play('logoff');
    }, 180);
  }

  function doLogin() {
    loginLayer.hidden = true;
    document.body.classList.remove('logged-off');
    Win.sound.play('startup');
    if (Win.ui) Win.ui.toast('Logged on as User. Welcome back.', 'user', 2600);
  }

  /* ------------------------------------------------------------- shutdown */
  function power(mode) {
    mode = mode || 'shutdown';
    if (mode === 'logoff') return logoff();
    if (mode === 'dos') return dosMode();
    Win.taskbar.closeStart();
    Win.taskbar.hidePopovers();
    document.getElementById('modal-root').innerHTML = '';
    Win.wm.closeAll(true);
    setTimeout(function () {
      document.body.classList.add('powered-off');
      powerLayer.hidden = false;
      powerLayer.className = 'power-layer';
      if (mode === 'restart') {
        powerLayer.innerHTML = bootSplash() + '<div class="shutdown-note">' + (Win.isNine ? 'Restarting...' : 'Restarting Windows...') + '</div>';
        powerLayer.querySelector('.bs-hint').textContent = 'Please wait while Windows restarts...';
        Win.sound.play('shutdown');
        setTimeout(function () { powerLayer.hidden = true; start(); }, 1700);
      } else {
        powerLayer.innerHTML = bootSplash() + '<div class="shutdown-note">' + (Win.isNine ? 'Shutting down...' : 'Shutting down Windows...') + '</div>';
        powerLayer.querySelector('.bs-hint').textContent = 'Please wait while Windows shuts down...';
        Win.sound.play('shutdown');
        setTimeout(safeOff, 1500);
      }
    }, 200);
  }

  function safeOff() {
    if (!powerLayer) return;
    powerLayer.className = 'power-layer safe-off';
    powerLayer.innerHTML =
      '<div class="safe-inner">' +
      '<div class="safe-text">' + ((Win.isNine || Win.isSeven) ? 'Windows has shut down' : Win.isXP ? 'Windows has shut down' : 'It&rsquo;s now safe to turn off<br>your computer.') + '</div>' +
      '<div class="safe-sub">WINemulator has shut down. You can close this tab.</div>' +
      '<div class="safe-actions"><button class="btn safe-restart" type="button">' + Win.icon('restart', 16) + ' Restart</button></div>' +
      '<div class="safe-hint">Or press any key to start again.</div>' +
      '</div>';
    powerLayer.querySelector('.safe-restart').addEventListener('click', function () {
      powerLayer.hidden = true;
      start();
    });
    const key = function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        document.removeEventListener('keydown', key);
        powerLayer.hidden = true;
        start();
      }
    };
    document.addEventListener('keydown', key);
  }

  /* ------------------------------------------------------------ ms-dos mode */
  function dosMode(options) {
    options = options || {};
    document.getElementById('modal-root').innerHTML = '';
    Win.wm.closeAll(true);
    document.body.classList.add('powered-off', 'dos-mode-on');
    powerLayer.hidden = false;
    powerLayer.className = 'power-layer dos-mode';
    let cwd = options.cwd ? options.cwd : (Win.isModern ? 'C:\\Users\\User' : 'C:\\WINDOWS');
    let classic = !!options.classic;
    let output = (Win.isNine
      ? 'Microsoft Windows 9\n   MS-DOS mode\n\nType HELP for a list of commands. Type WINDOWS.SYS to start Windows.\n\n'
      : 'Microsoft(R) Windows 98\n   (C)Copyright Microsoft Corp 1981-1998.\n\nType HELP for a list of commands. Type WINDOWS.SYS to start Windows.\n\n');
    powerLayer.innerHTML =
      '<div class="dos-screen"><pre class="dos-out"></pre>' +
      '<div class="dos-line"><span class="dos-prompt"></span><input class="dos-input" spellcheck="false" autocomplete="off" aria-label="MS-DOS prompt"></div></div>';
    const out = powerLayer.querySelector('.dos-out');
    const prompt = powerLayer.querySelector('.dos-prompt');
    const input = powerLayer.querySelector('.dos-input');
    const draw = function () {
      out.textContent = output;
      out.scrollTop = out.scrollHeight;
      prompt.textContent = cwd + '>';
      setTimeout(function () { out.scrollTop = out.scrollHeight; }, 10);
    };
    const print = function (s) { output += s + '\n'; draw(); };
    const focusInput = function () { setTimeout(function () { try { input.focus(); } catch (e) {} }, 0); };

    /* Headless Command Prompt engine shared with the CMD app. It gives the
       DOS shell the full Windows command set. */
    let shell = null;
    const shellOut = function (text) { output += String(text == null ? '' : text) + '\n'; draw(); };
    const shellClear = function () { output = ''; };
    function getShell() {
      if (shell) return shell;
      if (!(Win.apps && Win.apps.terminal && Win.apps.terminal.mount)) return null;
      const fake = document.createElement('div');
      const api = Win.apps.terminal.mount(fake, {
        args: {
          headless: true,
          cwd: cwd,
          onOut: shellOut,
          onClear: shellClear,
          onBatchPause: function (v) {
            input.readOnly = !!v;
            if (!v) focusInput();
          }
        },
        body: fake, win: {},
        setTitle: function () {}, setIcon: function () {}, setDirty: function () {},
        close: function () {}, minimize: function () {}, maximize: function () {},
        restore: function () {}, focus: function () {}
      });
      if (api) shell = api;
      return shell;
    }
    function syncShell() {
      const sh = getShell();
      if (!sh) return null;
      try { if (sh.getCwd() !== cwd) sh.setCwd(cwd); } catch (e) {}
      return sh;
    }
    function runInShell(line) {
      const sh = syncShell();
      if (!sh) { print('Bad command or file name'); return; }
      try { sh.run(line, true); }
      catch (e) { print('Error: ' + (e.message || e)); }
      try { cwd = sh.getCwd() || cwd; } catch (e) {}
      draw();
    }
    function normDos(p) {
      if (!p) return '';
      p = String(p).trim().replace(/^"+|"+$/g, '');
      return Win.fs.norm(p.indexOf(':') > -1 ? p : Win.fs.join(cwd, p));
    }
    function openInDos(name) {
      const p = normDos(name);
      if (!p || !Win.fs.exists(p)) { print('File not found'); return; }
      const node = Win.fs.resolve(p);
      if (!node || node.type === 'dir') { print('Access denied'); return; }
      const lower = p.toLowerCase();
      if (lower.endsWith('.bat') || lower.endsWith('.cmd')) {
        runInShell(p);
        return;
      }
      const content = Win.fs.read(p);
      if (content === null || content === undefined || node.kind === 'image') {
        print('Cannot open this file in MS-DOS mode.');
        return;
      }
      output += String(content).replace(/\r\n/g, '\n');
      if (!/\n$/.test(content)) output += '\n';
      draw();
    }
    function dosHelp() {
      print('MS-DOS mode commands:');
      print('  DIR / CD / TYPE / CLS / VER / MEM / DATE / TIME / ECHO');
      print('  MSDOS - DOS      Switch to the main MS-DOS shell');
      print('  MSDOS - CMD      Enable all Command Prompt commands');
      print('  MSDOS - <file>   Run a .bat file or open a file');
      print('  WINDOWS.SYS      Start Windows (WIN.SYS also works)');
      print('  EXIT             Leave MS-DOS mode');
      if (!classic) print('This shell also accepts the full Command Prompt command set.');
      else print('Type MSDOS - CMD to enable the full Command Prompt command set.');
    }
    function handleMsdos(rest) {
      let arg = String(rest || '').trim();
      if (arg.charAt(0) === '-') arg = arg.slice(1).trim();
      if (!arg) {
        print(classic
          ? 'The main MS-DOS shell is active. Type MSDOS - CMD to enable Command Prompt commands.'
          : 'Command Prompt commands are enabled. Type MSDOS - DOS for the main MS-DOS shell.');
        return;
      }
      if (/^(dos|main)$/i.test(arg)) {
        classic = true;
        print('Switched to the main MS-DOS shell.');
        return;
      }
      if (/^(cmd|command|cmd\.exe|command\.com)$/i.test(arg)) {
        classic = false;
        print('Command Prompt commands enabled.');
        return;
      }
      openInDos(arg);
    }
    const run = function (raw) {
      const line = String(raw == null ? '' : raw).trim();
      output += cwd + '>' + String(raw == null ? '' : raw) + '\n';
      if (!line) { draw(); return; }
      const parts = line.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const rest = line.slice(parts[0].length).trim();

      if (cmd === 'cls') { output = ''; draw(); return; }
      if (cmd === 'windows.sys' || cmd === 'win.sys') {
        powerLayer.hidden = true;
        document.body.classList.remove('powered-off', 'dos-mode-on');
        if (shell) { shell = null; }
        start();
        return;
      }
      if (cmd === 'exit') { print('Use WINDOWS.SYS (or WIN.SYS) to return to Windows, or close this tab.'); return; }
      if (cmd === 'powershell' || cmd === 'pwsh') { print('Windows PowerShell is not available in MS-DOS mode.'); return; }
      if (cmd === 'msdos' || cmd === 'dos') { handleMsdos(rest); return; }
      if (cmd === 'help' || cmd === '?') { dosHelp(); return; }

      // asynchronous delays
      const waitM = line.match(/^wait\s+(\d+)\s*$/i);
      const timeoutM = line.match(/^timeout(?:\s+(?:\/t\s*)?(\d+)(?:\s+\/nobreak)?)\s*$/i);
      if (waitM || timeoutM) {
        const sec = Math.max(0, Math.min(300, parseInt((waitM || timeoutM)[1], 10) || 0));
        input.readOnly = true;
        draw();
        setTimeout(function () { input.readOnly = false; focusInput(); }, sec * 1000);
        return;
      }
      if (/^pause\s*$/i.test(line)) {
        print('Press any key to continue . . .');
        input.readOnly = true;
        const onKey = function () {
          document.removeEventListener('keydown', onKey, true);
          input.readOnly = false;
          focusInput();
        };
        setTimeout(function () { document.addEventListener('keydown', onKey, true); }, 0);
        return;
      }

      if (classic) {
        const maybeBat = normDos(cmd);
        if ((cmd.endsWith('.bat') || cmd.endsWith('.cmd')) && Win.fs.exists(maybeBat)) {
          runInShell(maybeBat);
          return;
        }
        if (cmd === 'dir') {
          const list = Win.fs.list(cwd);
          print(' Volume in drive C is WINEMULATOR');
          print(' Directory of ' + cwd + '\n');
          let files = 0, dirs = 0, bytes = 0;
          list.forEach(function (e) {
            if (e.type === 'dir') { dirs++; print(e.name.padEnd(20) + '<DIR>         ' + U.fmtDate(e.modified)); }
            else { files++; bytes += e.size; print(e.name.padEnd(20) + String(e.size).padStart(10) + '  ' + U.fmtDate(e.modified)); }
          });
          print('       ' + files + ' file(s)  ' + bytes.toLocaleString() + ' bytes');
          print('       ' + dirs + ' dir(s)   2,147,483,648 bytes free');
        }
        else if (cmd === 'cd' || cmd === 'chdir') {
          if (!rest) print(cwd);
          else {
            const target = normDos(rest);
            const node = Win.fs.resolve(target);
            if (node && node.type === 'dir') cwd = target;
            else print('Invalid directory');
          }
        }
        else if (cmd === 'type') {
          const p = normDos(rest);
          const content = p ? Win.fs.read(p) : null;
          if (content === null || content === undefined) print('File not found');
          else print(content);
        }
        else if (cmd === 'ver') print(Win.isNine ? '\nWindows 9 [Version 6.4.9841]  MS-DOS mode  WINemulator Web Edition\n' : '\nWindows 98 [Version 4.10.2222]  WINemulator Web Edition\n');
        else if (cmd === 'mem') print('\nMemory Type        Total       Used       Free\n----------------  --------   --------   --------\nConventional         640K       112K       528K\nUpper                155K       155K         0K\nExtended (XMS)    64,512K    12,288K    52,224K\n----------------  --------   --------   --------\nTotal memory      65,307K    12,555K    52,752K\n');
        else if (cmd === 'date') print('Current date is ' + new Date().toDateString());
        else if (cmd === 'time') print('Current time is ' + new Date().toLocaleTimeString());
        else if (cmd === 'echo') print(rest);
        else print('Bad command or file name');
        draw();
        return;
      }

      // enhanced mode: everything else is handled by the Command Prompt engine
      runInShell(line);
    };
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        if (input.readOnly) return;
        const v = input.value; input.value = ''; run(v);
      }
    });
    draw();
    setTimeout(function () { input.focus(); }, 100);
    powerLayer.addEventListener('pointerdown', function () { setTimeout(function () { input.focus(); }, 0); });

    if (options.file) {
      setTimeout(function () {
        output += cwd + '>msdos - ' + Win.fs.baseName(options.file) + '\n';
        draw();
        openInDos(options.file);
      }, 300);
    }
  }

  window.addEventListener('pointerdown', function () { Win.sound.unlock(); }, { passive: true });
  window.addEventListener('keydown', function () {
    Win.sound.unlock();
    if (booting) skip();
  });
  window.addEventListener('pointerdown', function () { if (booting) skip(); });
  window.addEventListener('keydown', function (ev) {
    if (!booting) return;
    if (ev.key === 'Escape' || ev.key === 'Enter' || ev.key === ' ') skip(ev);
  });

  Win.boot = {
    start: start, finish: finish, power: power, logoff: logoff, login: doLogin,
    dos: dosMode,
    get isBooting() { return booting; }
  };
})();
