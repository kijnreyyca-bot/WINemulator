/* WINemulator — MS-DOS Prompt */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  function parseArgs(str) {
    const out = [];
    const re = /"([^"]*)"|(\S+)/g;
    let m;
    while ((m = re.exec(str))) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
  }

  Win.apps.terminal = {
    name: 'MS-DOS Prompt', title: 'MS-DOS Prompt', icon: 'terminal',
    width: 680, height: 440, minWidth: 380, minHeight: 240,
    mount: function (body, ctx) {
      body.classList.add('app-terminal');
      let cwd = 'C:\\WINDOWS';
      let history = [], histIndex = 0;
      let lastCommand = '';

      body.innerHTML =
        '<div class="term-screen">' +
        '<div class="term-out" role="log" aria-live="polite"></div>' +
        '<div class="term-line"><span class="term-prompt"></span><input class="term-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="MS-DOS prompt"></div>' +
        '</div>';
      const screen = body.querySelector('.term-screen');
      const out = body.querySelector('.term-out');
      const input = body.querySelector('.term-input');
      const prompt = body.querySelector('.term-prompt');

      function setPrompt() {
        prompt.textContent = cwd + '>';
        input.setAttribute('aria-label', 'Command prompt at ' + cwd);
      }
      function scroll() {
        out.scrollTop = out.scrollHeight;
        screen.scrollTop = screen.scrollHeight;
      }
      function line(text, cls) {
        const d = el('div', { class: 'term-row' + (cls ? ' ' + cls : '') });
        d.textContent = text;
        out.appendChild(d);
        while (out.children.length > 900) out.removeChild(out.firstChild);
        scroll();
      }
      function blank() { line(''); }

      const banner = [
        'Microsoft(R) Windows 98',
        '   (C)Copyright Microsoft Corp 1981-1998.',
        '',
        'WINemulator Web Edition — type HELP for a list of commands.',
        ''
      ];
      banner.forEach(function (l) { line(l); });
      line('C:\\WINDOWS> _', 'term-ghost');
      blank();

      function resolve(arg, base) {
        if (!arg || arg === '.') return base || cwd;
        arg = arg.replace(/^"|"$/g, '');
        if (arg === '\\') return 'C:\\';
        if (/^[a-z]:$/i.test(arg)) return arg.toUpperCase() + '\\';
        if (/^[a-z]:\\/i.test(arg)) return Win.fs.norm(arg);
        if (arg === '..') return Win.fs.parentPath(base || cwd) || 'C:\\';
        let b = base || cwd;
        if (arg.charAt(0) === '\\') return Win.fs.norm(b.slice(0, 2) + arg);
        while (arg.slice(0, 3) === '..\\') { b = Win.fs.parentPath(b) || 'C:\\'; arg = arg.slice(3); }
        return Win.fs.norm(Win.fs.join(b, arg));
      }

      const HELP = [
        'WINEMULATOR COMMAND REFERENCE',
        '',
        '  DIR [path]        List files and folders      CD [path]       Change folder',
        '  TYPE <file>       Display a text file          MD <dir>        Make a folder',
        '  RD <dir>          Remove an empty folder       DEL <file>      Delete a file',
        '  REN <old> <new>   Rename a file or folder      TREE [path]     Show the folder tree',
        '  COPY <src> <dst>  Copy a file                  MOVE <src> <dst> Move a file',
        '  CLS               Clear the screen             VER             Windows version',
        '  DATE / TIME       Show date and time           VOL             Volume label',
        '  MEM               Memory information           SYSTEMINFO      Browser and system info',
        '  ECHO <text>       Print text                   WHOAMI          Current user',
        '  START <program>   Run an app                   OPEN <file>     Open a file',
        '  PING <host>       Simulated network test       IPCONFIG        Network configuration',
        '  HELP              This list                    EXIT            Close this window',
        '',
        'PROGRAMS: NOTEPAD, CALC, MSPAINT, EXPLORER, WINMINE, CONTROL, TASKMGR, IEXPLORE',
        ''
      ];

      const appCmds = {
        notepad: 'notepad', calc: 'calc', mspaint: 'paint', paint: 'paint',
        explorer: 'explorer', winmine: 'minesweeper', minesweeper: 'minesweeper',
        control: 'settings', taskmgr: 'taskmgr', iexplore: 'browser', ie: 'browser',
        help: 'help', terminal: 'terminal', cmd: 'terminal'
      };

      function dirList(target) {
        const node = Win.fs.resolve(target);
        if (!node) { line('Invalid path or file name.'); return; }
        if (node.type !== 'dir') { line('Not a directory: ' + target); return; }
        const entries = Win.fs.list(target);
        line(' Volume in drive C is WINEMULATOR');
        line(' Volume Serial Number is 1234-ABCD');
        line(' Directory of ' + target);
        blank();
        let files = 0, dirs = 0, bytes = 0;
        entries.forEach(function (e) {
          const dt = new Date(e.modified);
          const stamp = String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') + '-' + dt.getFullYear() +
            '  ' + String(dt.getHours() % 12 || 12).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0') + ' ' + (dt.getHours() < 12 ? 'AM' : 'PM');
          if (e.type === 'dir') { dirs++; line(stamp + '    <DIR>          ' + e.name); }
          else { files++; bytes += e.size; line(stamp + '    ' + String(e.size).padStart(14) + '  ' + e.name); }
        });
        line('       ' + files + ' file(s)  ' + bytes.toLocaleString() + ' bytes');
        line('       ' + dirs + ' dir(s)   2,147,483,648 bytes free');
      }

      function tree(target, prefix, depth) {
        if (depth > 4) return;
        const entries = Win.fs.list(target);
        entries.forEach(function (e, i) {
          const last = i === entries.length - 1;
          line(prefix + (last ? '+-- ' : '+-- ') + e.name);
          if (e.type === 'dir') tree(e.path, prefix + (last ? '    ' : '|   '), depth + 1);
        });
      }

      function run(cmdline) {
        const t = cmdline.trim();
        if (!t) return;
        lastCommand = t;
        history.push(t);
        if (history.length > 100) history.shift();
        histIndex = history.length;
        const args = parseArgs(t);
        const cmd = args[0].toLowerCase();
        const rest = t.slice(args[0].length).trim();
        const argAt = function (i) { return args[i] ? resolve(args[i]) : null; };

        switch (cmd) {
          case 'help': case '?': HELP.forEach(function (l) { line(l); }); break;
          case 'cls': out.innerHTML = ''; break;
          case 'ver': line(''); line('Windows 98 [Version 4.10.2222] — WINemulator Web Edition'); blank(); break;
          case 'vol': line(' Volume in drive C is WINEMULATOR'); line(' Volume Serial Number is 1234-ABCD'); break;
          case 'dir': dirList(args[1] ? argAt(1) : cwd); blank(); break;
          case 'cd': case 'chdir':
            if (!args[1]) { line(cwd); break; }
            {
              const target = resolve(args[1]);
              const node = Win.fs.resolve(target);
              if (node && node.type === 'dir') { cwd = target; setPrompt(); }
              else line('Invalid directory: ' + target);
            }
            break;
          case 'type': {
            if (!args[1]) { line('The syntax of the command is incorrect.'); break; }
            const target = resolve(args[1]);
            const node = Win.fs.resolve(target);
            if (!node || node.type !== 'file') { line('File not found: ' + target); break; }
            if (node.kind === 'image') { line('This is a binary image file. Opening it in Paint...'); Win.shell.openFile(target); break; }
            String(node.content || '').split('\n').forEach(function (l) { line(l.replace(/\r$/, '')); });
            break;
          }
          case 'md': case 'mkdir':
            if (!args[1]) { line('The syntax of the command is incorrect.'); break; }
            try { Win.fs.mkdir(resolve(args[1])); line('Folder created.'); }
            catch (e) { line(e.message); }
            break;
          case 'rd': case 'rmdir': {
            if (!args[1]) { line('The syntax of the command is incorrect.'); break; }
            const target = resolve(args[1]);
            const node = Win.fs.resolve(target);
            if (!node || node.type !== 'dir') { line('Invalid directory: ' + target); break; }
            if (Win.fs.list(target).length) { line('Directory not empty: ' + target); break; }
            try { Win.fs.remove(target); line('Folder removed.'); } catch (e) { line(e.message); }
            break;
          }
          case 'del': case 'erase':
            if (!args[1]) { line('The syntax of the command is incorrect.'); break; }
            {
              const target = resolve(args[1]);
              const node = Win.fs.resolve(target);
              if (!node || node.type !== 'file') { line('File not found: ' + target); break; }
              try { Win.fs.remove(target); line('Deleted ' + Win.fs.baseName(target) + ' (moved to Recycle Bin).'); }
              catch (e) { line(e.message); }
            }
            break;
          case 'ren': case 'rename':
            if (!args[1] || !args[2]) { line('The syntax of the command is incorrect.'); break; }
            try { Win.fs.rename(resolve(args[1]), args[2]); line('Renamed.'); }
            catch (e) { line(e.message); }
            break;
          case 'copy': {
            if (!args[1] || !args[2]) { line('The syntax of the command is incorrect.'); break; }
            try {
              const src = resolve(args[1]);
              let dst = resolve(args[2]);
              const dn = Win.fs.resolve(dst);
              if (dn && dn.type === 'dir') dst = dn && dst;
              else dst = Win.fs.parentPath(dst);
              Win.fs.copy(src, dst);
              line('        1 file(s) copied.');
            } catch (e) { line(e.message); }
            break;
          }
          case 'move': {
            if (!args[1] || !args[2]) { line('The syntax of the command is incorrect.'); break; }
            try {
              const src = resolve(args[1]);
              let dst = resolve(args[2]);
              const dn = Win.fs.resolve(dst);
              if (!dn || dn.type !== 'dir') dst = Win.fs.parentPath(dst);
              Win.fs.move(src, dst);
              line('        1 file(s) moved.');
            } catch (e) { line(e.message); }
            break;
          }
          case 'tree':
            line('Folder PATH listing');
            line('C:' + (cwd === 'C:\\' ? '\\' : cwd.slice(2)));
            tree(args[1] ? resolve(args[1]) : cwd, '', 0);
            blank();
            break;
          case 'echo': line(rest); break;
          case 'date': line('Current date is ' + new Date().toDateString()); break;
          case 'time': line('Current time is ' + new Date().toLocaleTimeString()); break;
          case 'whoami': line('WINEMULATOR\\User'); break;
          case 'mem':
            line('');
            line('Memory Type        Total       Used       Free');
            line('----------------  --------   --------   --------');
            line('Conventional         640K       112K       528K');
            line('Upper                155K       155K         0K');
            line('Extended (XMS)    64,512K    12,288K    52,224K');
            line('----------------  --------   --------   --------');
            line('Total memory      65,307K    12,555K    52,752K');
            blank();
            break;
          case 'systeminfo': {
            const si = Win.sysinfo ? Win.sysinfo() : {};
            const st = Win.fs.stats();
            line('');
            line('Host Name:                 WINEMULATOR');
            line('OS Name:                   Microsoft Windows 98 Second Edition (Web)');
            line('OS Version:                4.10.2222');
            line('System Up Time:            ' + U.fmtDuration(Date.now() - (Win.startedAt || Date.now())));
            line('Boot Time:                 ' + ((Win.bootMs || 0) / 1000).toFixed(2) + ' seconds');
            line('Processor:                 WebCore x86 JIT (' + (si.cores || '?') + ' logical cores)');
            line('Total Physical Memory:     ' + (si.memory || 8) + ' GB (reported)');
            line('Display:                   ' + (si.screen || '') + ' @ ' + (si.dpr || 1) + 'x');
            line('Graphics:                  ' + String(si.gpu || '').slice(0, 72));
            line('Browser:                   ' + String(si.ua || '').slice(0, 90));
            line('Files:                     ' + st.files + ' files, ' + st.dirs + ' folders, ' + U.fmtBytes(st.bytes));
            line('Storage Used:              ' + U.fmtBytes(st.storageBytes));
            line('Network:                   ' + (navigator.onLine ? 'Connected' : 'Offline'));
            blank();
            break;
          }
          case 'ipconfig':
            line('');
            line('Windows 98 IP Configuration');
            blank();
            line('Ethernet adapter Local Area Connection:');
            line('        IP Address. . . . . . . . . : 192.168.0.42');
            line('        Subnet Mask . . . . . . . . : 255.255.255.0');
            line('        Default Gateway . . . . . . : 192.168.0.1');
            blank();
            break;
          case 'ping': {
            const host = args[1] || 'localhost';
            line('');
            line('Pinging ' + host + ' [127.0.0.1] with 32 bytes of data:');
            for (let i = 0; i < 4; i++) {
              const ms = 1 + Math.floor(Math.random() * 4);
              line('Reply from 127.0.0.1: bytes=32 time=' + ms + 'ms TTL=128');
            }
            line('');
            line('Ping statistics for 127.0.0.1:');
            line('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),');
            blank();
            break;
          }
          case 'start':
            if (!args[1]) { Win.wm.open('explorer', { path: 'C:\\' }); break; }
            Win.shell.run(rest).catch(function (e) { line(e.message.split('\n')[0]); });
            break;
          case 'open':
            if (!args[1]) { line('The syntax of the command is incorrect.'); break; }
            try { Win.shell.openFile(resolve(args[1])); } catch (e) { line(e.message.split('\n')[0]); }
            break;
          case 'exit': ctx.close(true); break;
          case 'echo.': blank(); break;
          case 'pause': line('Press any key to continue . . .'); break;
          case 'win': line('Windows is already running. Nice try.'); break;
          case 'format': line('Format terminated. This is a simulation, remember?'); break;
          case 'deltree': line('Deltree is not available. Use DEL and RD.'); break;
          case 'attrib': line('A    ' + (args[1] ? args[1] : '')); break;
          default:
            if (appCmds[cmd]) { Win.wm.open(appCmds[cmd]); break; }
            if (Win.fs.exists(resolve(args[0]))) { try { Win.shell.openFile(resolve(args[0])); } catch (e) { line(e.message.split('\n')[0]); } break; }
            line('Bad command or file name');
        }
        blank();
      }

      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const v = input.value;
          line(cwd + '>' + v);
          input.value = '';
          try { run(v); } catch (e) { line('Error: ' + (e.message || e)); }
          scroll();
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (histIndex > 0) { histIndex--; input.value = history[histIndex] || ''; setTimeout(function () { input.setSelectionRange(input.value.length, input.value.length); }, 0); }
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          if (histIndex < history.length - 1) { histIndex++; input.value = history[histIndex] || ''; }
          else { histIndex = history.length; input.value = ''; }
        } else if (ev.key === 'c' && ev.ctrlKey) {
          ev.preventDefault();
          line(cwd + '>' + input.value + '^C');
          input.value = '';
        } else if (ev.key === 'l' && ev.ctrlKey) {
          ev.preventDefault();
          out.innerHTML = '';
        }
      });
      screen.addEventListener('pointerdown', function (ev) {
        if (ev.target !== input) setTimeout(function () { input.focus(); }, 0);
      });
      body.addEventListener('pointerdown', function () { setTimeout(function () { input.focus(); }, 0); });

      setPrompt();
      setTimeout(function () { input.focus(); }, 60);
      return {};
    }
  };
})();
