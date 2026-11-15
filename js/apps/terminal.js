/* WINemulator — Command Prompt / Windows PowerShell */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  function esc(s) { return U.escapeHtml(s); }

  function parseArgs(str) {
    const out = [];
    const re = /"([^"]*)"|(\S+)/g;
    let m;
    while ((m = re.exec(str))) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
  }

  function splitPipeline(line) {
    const parts = [];
    let cur = '', inQ = false, i = 0;
    while (i < line.length) {
      const c = line.charAt(i);
      if (c === '"') { inQ = !inQ; cur += c; i++; continue; }
      if (!inQ && c === '|') { parts.push(cur.trim()); cur = ''; i++; continue; }
      cur += c; i++;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function parseRedirect(seg) {
    // returns { cmd, target, append, suppress }
    let cmd = seg, target = null, append = false, suppress = false;
    const m = seg.match(/^(.*?)(>>?|2>)\s*(.+)$/);
    if (m) {
      cmd = m[1].trim();
      const op = m[2];
      target = m[3].trim().replace(/^"|"$/g, '');
      append = op === '>>';
      if (target.toLowerCase() === 'nul') suppress = true;
    }
    return { cmd: cmd, target: target, append: append, suppress: suppress };
  }

  function normPath(p, base) {
    if (!p) return base || 'C:\\';
    p = p.replace(/^"|"$/g, '');
    if (p === '.') return base || 'C:\\';
    if (p === '\\') return 'C:\\';
    if (/^[a-z]:$/i.test(p)) return p.toUpperCase() + '\\';
    if (/^[a-z]:\\/i.test(p)) return Win.fs.norm(p);
    if (p === '..') return Win.fs.parentPath(base) || 'C:\\';
    let b = base || 'C:\\';
    if (p.charAt(0) === '\\') return Win.fs.norm(b.slice(0, 2) + p);
    while (p.slice(0, 3).toLowerCase() === '..\\') { b = Win.fs.parentPath(b) || 'C:\\'; p = p.slice(3); }
    return Win.fs.norm(Win.fs.join(b, p));
  }

  function expandVars(s, env) {
    return String(s).replace(/%([^%]+)%/g, function (_, name) {
      const key = name.toUpperCase();
      if (env[key] !== undefined) return env[key];
      const specials = {
        CD: env.CD, DATE: new Date().toDateString(), TIME: new Date().toLocaleTimeString(),
        RANDOM: String(Math.floor(Math.random() * 32768)), ERRORLEVEL: '0'
      };
      if (specials[key] !== undefined) return specials[key];
      return '%' + name + '%';
    });
  }

  function wildcardMatch(name, pattern) {
    // supports * and ?
    const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
    return re.test(name);
  }

  function fmtSize(n) {
    if (n < 1024) return n + '';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + 'K';
    return (n / 1024 / 1024).toFixed(1) + 'M';
  }

  const CMD_COMMANDS = [
    'help','cls','ver','winver','vol','label','dir','cd','chdir','pushd','popd','md','mkdir','rd','rmdir',
    'del','erase','ren','rename','copy','xcopy','move','robocopy','type','more','tree','echo','set','path','prompt',
    'title','color','date','time','whoami','hostname','mem','systeminfo','ipconfig','ping','tracert','nslookup',
    'netstat','arp','route','net','tasklist','taskkill','sc','start','explorer','notepad','calc','mspaint','control',
    'taskmgr','iexplore','firefox','msinfo32','winver','shutdown','msdos','dos','logoff','exit','pause','rem','attrib','assoc',
    'ftype','where','which','find','findstr','sort','fc','comp','chkdsk','sfc','dism','driverquery','wmic','reg',
    'gpupdate','gpresult','mode','chcp','cipher','compact','convert','diskpart','format','cleanmgr','msconfig',
    'regedit','eventvwr','services','devmgmt','diskmgmt','cmd','powershell','curl','bitsadmin','clip','title'
  ];

  const PS_COMMANDS = [
    'Get-Help','Get-Command','Get-ChildItem','Get-Content','Set-Content','Add-Content','New-Item','Remove-Item',
    'Copy-Item','Move-Item','Rename-Item','Get-Location','Set-Location','Get-Process','Stop-Process','Get-Service',
    'Start-Service','Stop-Service','Get-Date','Get-Host','Get-ComputerInfo','Get-PSDrive','Get-Volume','Test-Connection',
    'Test-NetConnection','Resolve-DnsName','Get-NetIPConfiguration','Get-NetAdapter','Invoke-WebRequest','Write-Host',
    'Write-Output','Clear-Host','Get-History','Clear-History','Start-Process','Stop-Computer','Restart-Computer',
    'Get-EventLog','Get-WinEvent','Get-Item','Get-ItemProperty','Select-Object','Where-Object','Sort-Object',
    'Measure-Object','Format-Table','Format-List','Out-String','Out-File','Export-Csv','Import-Csv','ConvertTo-Json',
    'ConvertFrom-Json','Get-Alias','Set-Alias','Get-Variable','Get-Module','Get-ExecutionPolicy','Set-ExecutionPolicy',
    'Get-Culture','Get-TimeZone','Get-Random','Get-Member','Get-WmiObject','Get-CimInstance','Write-Verbose'
  ];

  const PS_ALIASES = {
    ls:'Get-ChildItem', dir:'Get-ChildItem', gci:'Get-ChildItem', cat:'Get-Content', type:'Get-Content', gc:'Get-Content',
    sc:'Set-Content', ac:'Add-Content', ni:'New-Item', mkdir:'New-Item', rm:'Remove-Item', del:'Remove-Item', erase:'Remove-Item',
    rmdir:'Remove-Item', rd:'Remove-Item', cp:'Copy-Item', copy:'Copy-Item', cpi:'Copy-Item', mv:'Move-Item', move:'Move-Item',
    mi:'Move-Item', ren:'Rename-Item', rni:'Rename-Item', pwd:'Get-Location', gl:'Get-Location', cd:'Set-Location', sl:'Set-Location',
    chdir:'Set-Location', cls:'Clear-Host', clear:'Clear-Host', echo:'Write-Output', write:'Write-Output', ps:'Get-Process', gps:'Get-Process',
    kill:'Stop-Process', spps:'Stop-Process', gsv:'Get-Service', sasv:'Start-Service', spsv:'Stop-Service', ipconfig:'Get-NetIPConfiguration',
    ping:'Test-Connection', tasklist:'Get-Process', hostname:'Get-ComputerInfo', whoami:'whoami', select:'Select-Object',
    where:'Where-Object', sort:'Sort-Object', measure:'Measure-Object', ft:'Format-Table', fl:'Format-List', os:'Out-String',
    tee:'Out-String', export:'Export-Csv', import:'Import-Csv', json:'ConvertTo-Json', gm:'Get-Member', gal:'Get-Alias', gv:'Get-Variable'
  };

  Win.apps.terminal = {
    name: (Win.isSeven || Win.isNine) ? 'Command Prompt' : 'MS-DOS Prompt',
    title: (Win.isSeven || Win.isNine) ? 'Command Prompt' : 'MS-DOS Prompt',
    icon: 'terminal',
    width: 780, height: 480, minWidth: 420, minHeight: 240,
    mount: function (body, ctx) {
    body.classList.add('app-terminal');
    const args = ctx.args || {};
    const headless = !!args.headless;
    const batchPauseCb = args.onBatchPause;
    let mode = (args.mode === 'ps' || args.mode === 'powershell') ? 'ps' : 'cmd';
    let cwd = args.cwd ? normPath(args.cwd, 'C:\\') : (Win.isModern ? 'C:\\Users\\User' : 'C:\\WINDOWS');
    let history = [], histIndex = 0;
    let env = {
      USERNAME: Win.store.get('lastUser') || 'User',
      COMPUTERNAME: 'WINEMULATOR',
      USERDOMAIN: 'WINEMULATOR',
      OS: 'Windows_NT',
      PROCESSOR_ARCHITECTURE: 'x86',
      PROCESSOR_IDENTIFIER: 'x86 Family 6 Model 42 Stepping 1, WebCore',
      TEMP: Win.isModern ? 'C:\\Users\\User\\AppData\\Local\\Temp' : 'C:\\WINDOWS\\Temp',
      TMP: Win.isModern ? 'C:\\Users\\User\\AppData\\Local\\Temp' : 'C:\\WINDOWS\\Temp',
      SYSTEMROOT: 'C:\\Windows',
      WINDIR: 'C:\\Windows',
      USERPROFILE: Win.isModern ? 'C:\\Users\\User' : 'C:\\',
      HOMEDRIVE: 'C:',
      HOMEPATH: Win.isModern ? '\\Users\\User' : '\\',
      PATH: 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem',
      PATHEXT: '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.PS1',
      PROMPT: '$P$G',
      CD: cwd
    };
    env.PSModulePath = 'C:\\Windows\\system32\\WindowsPowerShell\\v1.0\\Modules\\';

    body.innerHTML =
      '<div class="term-screen' + (mode === 'ps' ? ' term-ps' : '') + '">' +
      '<div class="term-out" role="log" aria-live="polite"></div>' +
      '<div class="term-line"><span class="term-prompt"></span><input class="term-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="prompt"></div>' +
      '</div>';
    const screen = body.querySelector('.term-screen');
    const out = body.querySelector('.term-out');
    const input = body.querySelector('.term-input');
    const promptEl = body.querySelector('.term-prompt');

    function setMode(m) {
      mode = m;
      screen.classList.toggle('term-ps', mode === 'ps');
      ctx.setTitle(mode === 'ps' ? 'Windows PowerShell' : ((Win.isSeven || Win.isNine) ? 'Command Prompt' : 'MS-DOS Prompt'));
      ctx.setIcon(mode === 'ps' ? 'powershell' : 'terminal');
      setPrompt();
    }

    function setPrompt() {
      env.CD = cwd;
      let p;
      if (mode === 'ps') p = 'PS ' + cwd + '> ';
      else {
        // honor PROMPT $P$G
        p = cwd + '>';
        if (env.PROMPT && env.PROMPT.indexOf('$P') > -1) {
          p = cwd + (env.PROMPT.indexOf('$G') > -1 ? '>' : '');
        }
      }
      promptEl.textContent = p;
      input.setAttribute('aria-label', 'prompt at ' + cwd);
    }

    function scroll() { out.scrollTop = out.scrollHeight; screen.scrollTop = screen.scrollHeight; }

    function lineObj(text, cls) { return { text: String(text == null ? '' : text), cls: cls || '' }; }

    function printLine(text, cls) {
      const d = el('div', { class: 'term-row' + (cls ? ' ' + cls : '') });
      d.textContent = text;
      out.appendChild(d);
      while (out.children.length > 1200) out.removeChild(out.firstChild);
      if (args.onOut) { try { args.onOut(text, cls || ''); } catch (e) {} }
      scroll();
    }
    function printHtml(html, cls) {
      const d = el('div', { class: 'term-row' + (cls ? ' ' + cls : '') });
      d.innerHTML = html;
      out.appendChild(d);
      while (out.children.length > 1200) out.removeChild(out.firstChild);
      scroll();
    }
    function clearOut() {
      out.innerHTML = '';
      if (args.onClear) { try { args.onClear(); } catch (e) {} }
    }
    function blank() { printLine(''); }

    function printLines(lines) {
      (lines || []).forEach(function (l) {
        if (l && typeof l === 'object') printLine(l.text, l.cls);
        else printLine(l);
      });
    }

    // banner
    const isBatchLaunch = !!(ctx.args && (ctx.args.run || ctx.args.file));
    if (mode === 'ps') {
      printLine('Windows PowerShell', 'term-accent');
      printLine('Copyright (C) Microsoft Corporation. All rights reserved.', 'term-dim');
      printLine('', '');
      printLine('PS ' + cwd + '>', 'term-dim');
    } else if (!isBatchLaunch && !headless) {
      if (Win.isModern) {
        printLine('Microsoft Windows [Version ' + Win.osVersion + ']', 'term-dim');
        printLine('(c) Microsoft Corporation. All rights reserved.', 'term-dim');
      } else {
        printLine('Microsoft(R) Windows 98', 'term-dim');
        printLine('   (C)Copyright Microsoft Corp 1981-1998.', 'term-dim');
      }
      printLine('', '');
    }

    // core fs helpers
    function listDir(path) { try { return Win.fs.list(path); } catch (e) { return []; } }

    function cmdDir(args, stdin) {
      let target = cwd, showAll = false, bare = false, recursive = false, wide = false;
      const patterns = [];
      args.forEach(function (a) {
        if (a.startsWith('/')) {
          const f = a.toLowerCase();
          if (f === '/a' || f.startsWith('/a:')) showAll = true;
          else if (f === '/b') bare = true;
          else if (f === '/s') recursive = true;
          else if (f === '/w') wide = true;
        } else patterns.push(a);
      });
      if (patterns.length) {
        // if a path exists use it
        const p = normPath(patterns[0], cwd);
        if (Win.fs.exists(p) && Win.fs.resolve(p).type === 'dir') target = p;
        else patterns.forEach(function (x) { /* keep as filter */ });
      }
      const filter = patterns.length ? patterns[patterns.length - 1] : '*';
      const node = Win.fs.resolve(target);
      if (!node || node.type !== 'dir') return { lines: ['File Not Found'], code: 1 };
      const entries = Win.fs.list(target).filter(function (e) {
        if (filter && filter !== '*') {
          // if filter contains wildcard treat as name filter
          if (filter.indexOf('*') > -1 || filter.indexOf('?') > -1) return wildcardMatch(e.name, filter);
          // otherwise if a dir path was given, no name filter
          return true;
        }
        return true;
      });
      const lines = [];
      if (!bare) {
        lines.push(' Volume in drive C is WINEMULATOR');
        lines.push(' Volume Serial Number is 1234-ABCD');
        lines.push(' Directory of ' + target);
        lines.push('');
      }
      let files = 0, dirs = 0, bytes = 0;
      entries.forEach(function (e) {
        if (bare) { lines.push(Win.fs.join(target, e.name)); return; }
        const dt = new Date(e.modified);
        const stamp = String(dt.getMonth() + 1).padStart(2, '0') + '/' + String(dt.getDate()).padStart(2, '0') + '/' + dt.getFullYear() +
          '  ' + String(dt.getHours() % 12 || 12).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0') + (dt.getHours() < 12 ? ' AM' : ' PM');
        if (e.type === 'dir') { dirs++; lines.push(stamp + '    <DIR>          ' + e.name); }
        else { files++; bytes += e.size; lines.push(stamp + '    ' + String(e.size).padStart(14) + '  ' + e.name); }
      });
      if (!bare) {
        lines.push('               ' + files + ' File(s)  ' + bytes.toLocaleString() + ' bytes');
        lines.push('               ' + dirs + ' Dir(s)  2,147,483,648 bytes free');
      }
      return { lines: lines };
    }

    function cmdCd(args) {
      if (!args.length) { printLine(cwd); return { lines: [] }; }
      let target = args[0];
      if (/^\/d$/i.test(target) && args[1]) target = args[1];
      const t = normPath(target, cwd);
      const node = Win.fs.resolve(t);
      if (node && node.type === 'dir') { cwd = t; setPrompt(); return { lines: [] }; }
      return { lines: ['The system cannot find the path specified.'] , code: 1 };
    }

    function cmdMkdir(args) {
      if (!args.length) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      try {
        args.forEach(function (a) { Win.fs.mkdir(normPath(a, cwd), { parents: true }); });
        return { lines: [] };
      } catch (e) { return { lines: [e.message], code: 1 }; }
    }

    function cmdRmdir(args) {
      if (!args.length) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      const force = args.indexOf('/s') > -1 || args.indexOf('/q') > -1;
      try {
        args.filter(function (a) { return !a.startsWith('/'); }).forEach(function (a) {
          const t = normPath(a, cwd);
          const node = Win.fs.resolve(t);
          if (!node || node.type !== 'dir') throw new Error('The system cannot find the file specified.');
          if (!force && Win.fs.list(t).length) throw new Error('The directory is not empty.');
          Win.fs.remove(t);
        });
        return { lines: [] };
      } catch (e) { return { lines: [e.message], code: 1 }; }
    }

    function cmdDel(args) {
      if (!args.length) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      const targets = args.filter(function (a) { return !a.startsWith('/'); });
      let deleted = 0;
      try {
        targets.forEach(function (a) {
          const t = normPath(a, cwd);
          const node = Win.fs.resolve(t);
          if (node && node.type === 'file') { Win.fs.remove(t); deleted++; }
          else if (node && node.type === 'dir') {
            // wildcard inside dir? handle glob by listing
            if (a.indexOf('*') > -1 || a.indexOf('?') > -1) {
              const dir = Win.fs.parentPath(t) || cwd;
              const pat = Win.fs.baseName(t);
              Win.fs.list(dir).forEach(function (e) {
                if (e.type === 'file' && wildcardMatch(e.name, pat)) { Win.fs.remove(e.path); deleted++; }
              });
            }
          } else if (a.indexOf('*') > -1 || a.indexOf('?') > -1) {
            const dir = cwd;
            const pat = a;
            Win.fs.list(dir).forEach(function (e) {
              if (e.type === 'file' && wildcardMatch(e.name, pat)) { Win.fs.remove(e.path); deleted++; }
            });
          } else {
            throw new Error('Could Not Find ' + a);
          }
        });
        return { lines: deleted ? [] : ['Could Not Find ' + targets.join(', ')] };
      } catch (e) { return { lines: [e.message], code: 1 }; }
    }

    function cmdCopy(args) {
      if (args.length < 2) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      try {
        const src = normPath(args[0], cwd);
        let dst = normPath(args[1], cwd);
        const dn = Win.fs.resolve(dst);
        if (dn && dn.type === 'dir') dst = dn && dst;
        else dst = Win.fs.parentPath(dst) || cwd;
        Win.fs.copy(src, dst);
        return { lines: ['        1 file(s) copied.'] };
      } catch (e) { return { lines: [e.message], code: 1 }; }
    }

    function cmdMove(args) {
      if (args.length < 2) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      try {
        const src = normPath(args[0], cwd);
        let dst = normPath(args[1], cwd);
        const dn = Win.fs.resolve(dst);
        if (!dn || dn.type !== 'dir') dst = Win.fs.parentPath(dst) || cwd;
        Win.fs.move(src, dst);
        return { lines: ['        1 file(s) moved.'] };
      } catch (e) { return { lines: [e.message], code: 1 }; }
    }

    function cmdRen(args) {
      if (args.length < 2) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      try {
        Win.fs.rename(normPath(args[0], cwd), args[1]);
        return { lines: [] };
      } catch (e) { return { lines: [e.message], code: 1 }; }
    }

    function cmdType(args, stdin) {
      if (stdin && !args.length) return { lines: stdin.split('\n') };
      if (!args.length) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      const t = normPath(args[0], cwd);
      const node = Win.fs.resolve(t);
      if (!node || node.type !== 'file') return { lines: ['The system cannot find the file specified.'] , code: 1 };
      if (node.kind === 'image') return { lines: ['This is a binary image file.'], code: 0 };
      return { lines: String(node.content || '').replace(/\r\n/g, '\n').split('\n') };
    }

    function cmdEcho(args) {
      const text = args.join(' ');
      if (text === '' ) return { lines: ['ECHO is on.'] };
      if (/^\/?off$/i.test(text)) return { lines: [], echoOff: true };
      if (/^\/?on$/i.test(text)) return { lines: [], echoOn: true };
      return { lines: [expandVars(text, env)] };
    }

    function cmdVer() {
      if (Win.isModern) return { lines: ['Microsoft Windows [Version ' + Win.osVersion + ']'] };
      if (Win.isXP) return { lines: ['Microsoft Windows XP [Version 5.1.2600]'] };
      return { lines: ['Windows 98 [Version 4.10.2222]'] };
    }

    function cmdSysteminfo() {
      const si = Win.sysinfo ? Win.sysinfo() : {};
      const st = Win.fs.stats();
      const lines = [
        'Host Name:                 WINEMULATOR',
        'OS Name:                   ' + Win.osNameFull,
        'OS Version:                ' + Win.osVersion + ' ' + Win.osBuild,
        'System Manufacturer:       WINemulator Project',
        'System Model:              Virtual PC 2007',
        'System Type:               X86-based PC',
        'Processor(s):              1 Processor(s) Installed. WebCore x86 JIT (' + (si.cores || '?') + ' cores)',
        'BIOS Version:              WINemulator BIOS v4.02',
        'Total Physical Memory:     ' + (si.memory || 8) + ' GB',
        'Available Physical Memory: ' + Math.round((si.memory || 8) * 0.6) + ' GB',
        'Virtual Memory: Max Size:  ' + ((si.memory || 8) * 1024 + 2048) + ' MB',
        'Virtual Memory: Available: ' + Math.round((si.memory || 8) * 0.5 * 1024) + ' MB',
        'Page File Location(s):     C:\\pagefile.sys',
        'Domain:                    WORKGROUP',
        'Logon Server:              \\\\WINEMULATOR',
        'Network Card(s):           1 NIC(s) Installed. Intel PRO/1000 MT',
        'System Up Time:            ' + U.fmtDuration(Date.now() - (Win.startedAt || Date.now())),
        'Files:                     ' + st.files + ' files, ' + st.dirs + ' folders, ' + U.fmtBytes(st.bytes),
        'Storage Used:              ' + U.fmtBytes(st.storageBytes)
      ];
      return { lines: lines };
    }

    function cmdIpconfig() {
      return { lines: [
        '', 'Windows IP Configuration', '',
        'Ethernet adapter Local Area Connection:', '',
        '   Connection-specific DNS Suffix  . :',
        '   IPv4 Address. . . . . . . . . . . : 192.168.0.42',
        '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
        '   Default Gateway . . . . . . . . . : 192.168.0.1',
        '   DNS Servers . . . . . . . . . . . : 192.168.0.1',
        '   DHCP Enabled. . . . . . . . . . . : Yes',
        '   Physical Address. . . . . . . . . : 00-15-5D-00-00-01'
      ] };
    }

    function cmdPing(args) {
      const host = args[0] || 'localhost';
      const lines = ['', 'Pinging ' + host + ' [127.0.0.1] with 32 bytes of data:'];
      for (let i = 0; i < 4; i++) {
        const ms = 1 + Math.floor(Math.random() * 4);
        lines.push('Reply from 127.0.0.1: bytes=32 time=' + ms + 'ms TTL=128');
      }
      lines.push('');
      lines.push('Ping statistics for 127.0.0.1:');
      lines.push('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),');
      lines.push('Approximate round trip times in milli-seconds:');
      lines.push('    Minimum = 1ms, Maximum = 4ms, Average = 2ms');
      return { lines: lines };
    }

    function cmdTasklist() {
      const lines = ['Image Name                     PID Session Name        Session#    Mem Usage',
        '========================= ======== ================ =========== ============'];
      const procs = ['System', 'smss.exe', 'csrss.exe', 'winlogon.exe', 'services.exe', 'lsass.exe', 'svchost.exe', 'explorer.exe', 'cmd.exe', 'notepad.exe', 'iexplore.exe'];
      procs.forEach(function (p, i) {
        lines.push(p.padEnd(28) + String(4 + i * 37).padStart(5) + ' Console             1    ' + (Math.floor(Math.random() * 20) + 4) + ' K');
      });
      return { lines: lines };
    }

    function cmdHelp() {
      const lines = [
        'For more information on a specific command, type HELP command-name',
        '',
        'ATTRIB     Display or change file attributes.',
        'CD         Displays the name of or changes the current directory.',
        'CHKDSK     Checks a disk and displays a status report.',
        'CLS        Clears the screen.',
        'CMD        Starts a new instance of the Windows command interpreter.',
        'COPY       Copies one or more files to another location.',
        'DATE       Displays or sets the date.',
        'DEL        Deletes one or more files.',
        'DIR        Displays a list of files and subdirectories in a directory.',
        'ECHO       Displays messages, or turns command echoing on or off.',
        'EXIT       Quits the CMD.EXE program (command interpreter).',
        'FIND       Searches for a text string in a file or files.',
        'FINDSTR    Searches for strings in files.',
        'IPCONFIG   Display all current TCP/IP network configuration values.',
        'MD         Creates a directory.',
        'MEM        Displays the amount of used and free memory in your system.',
        'MOVE       Moves one or more files from one directory to another directory.',
        'MSDOS      Switches the computer into MS-DOS mode. MSDOS - DOS opens the main',
        '           MS-DOS shell; MSDOS - <file> runs a .bat file or opens a file there.',
        'PATH       Displays or sets a search path for executable files.',
        'PING       Tests the connection to another TCP/IP computer.',
        'PROMPT     Changes the command prompt.',
        'RD         Removes a directory.',
        'REN        Renames a file or files.',
        'SET        Displays, sets, or removes cmd.exe environment variables.',
        'SORT       Sorts input.',
        'START      Starts a separate window to run a specified program or command.',
        'SYSTEMINFO Displays system configuration information.',
        'TASKLIST   Displays all currently running tasks including services.',
        'TIME       Displays or sets the system time.',
        'TITLE      Sets the window title for a CMD.EXE session.',
        'TREE       Graphically displays the directory structure of a drive or path.',
        'TYPE       Displays the contents of a text file.',
        'VER        Displays the Windows version.',
        'VOL        Displays a disk volume label and serial number.',
        'WHOAMI     Displays user, group and privileges information.',
        'XCOPY      Copies files and directory trees.',
        '',
        'For PowerShell commands, type powershell and use Get-Help.'
      ];
      return { lines: lines };
    }

    function cmdTree(args) {
      const target = args.length ? normPath(args[0], cwd) : cwd;
      const lines = ['Folder PATH listing', 'Volume serial number is 1234-ABCD', target];
      function walk(p, prefix, depth) {
        if (depth > 5) return;
        const entries = Win.fs.list(p);
        entries.forEach(function (e, i) {
          const last = i === entries.length - 1;
          lines.push(prefix + (last ? '\\---' : '+---') + e.name);
          if (e.type === 'dir') walk(e.path, prefix + (last ? '    ' : '|   '), depth + 1);
        });
      }
      walk(target, '', 0);
      return { lines: lines };
    }

    function cmdStart(args) {
      const rest = args.join(' ');
      if (!rest) { Win.wm.open('explorer', { path: 'C:\\' }); return { lines: [] }; }
      // try app map
      const map = { notepad:'notepad', mspaint:'paint', paint:'paint', calc:'calc', calculator:'calc', explorer:'explorer', cmd:'terminal', powershell:'terminal', iexplore:'browser', ie:'browser', firefox:'firefox', control:'settings', taskmgr:'taskmgr', winmine:'minesweeper', minesweeper:'minesweeper', vpc:'vpc' };
      const head = args[0].toLowerCase();
      if (map[head]) {
        const app = map[head];
        if (app === 'terminal') {
          const ps = head === 'powershell' || args.indexOf('/?') === -1 && rest.toLowerCase().indexOf('powershell') > -1;
          Win.wm.open('terminal', { mode: ps ? 'ps' : 'cmd', cwd: cwd });
        } else Win.wm.open(app);
        return { lines: [] };
      }
      // open file/path
      const t = normPath(rest, cwd);
      if (Win.fs.exists(t)) { try { Win.shell.openFile(t); } catch (e) {} return { lines: [] }; }
      return { lines: ['The system cannot find the file ' + rest + '.'] , code: 1 };
    }

    function cmdOpenFile(args) {
      if (!args.length) return { lines: ['The syntax of the command is incorrect.'] , code: 1 };
      const t = normPath(args[0], cwd);
      try { Win.shell.openFile(t); } catch (e) { return { lines: [e.message.split('\n')[0]], code: 1 }; }
      return { lines: [] };
    }

    // PowerShell object helpers
    function psFileInfo(e) {
      const d = new Date(e.modified);
      return {
        Mode: (e.type === 'dir' ? 'd----' : '-a---'),
        LastWriteTime: d.toLocaleString(),
        Length: e.type === 'dir' ? '' : e.size,
        Name: e.name,
        FullName: e.path,
        PSIsContainer: e.type === 'dir',
        __type: 'file'
      };
    }

    function psProcessList() {
      const names = ['System','smss','csrss','winlogon','services','lsass','svchost','explorer','cmd','powershell','notepad','iexplore'];
      return names.map(function (n, i) {
        return { Handles: 100 + i * 40, NPM: (i % 3) + 1, PM: (i + 1) * 1200, WS: (i + 2) * 3400, Id: 4 + i * 37, ProcessName: n, __type: 'proc' };
      });
    }

    function psServiceList() {
      const svcs = [
        ['Running','wuauserv','Windows Update'],
        ['Running','Dhcp','DHCP Client'],
        ['Running','Dnscache','DNS Client'],
        ['Running','LanmanServer','Server'],
        ['Stopped','Spooler','Print Spooler'],
        ['Running','TermService','Terminal Services'],
        ['Running','Winmgmt','Windows Management Instrumentation'],
        ['Stopped','BITS','Background Intelligent Transfer Service']
      ];
      return svcs.map(function (s) { return { Status: s[0], Name: s[1], DisplayName: s[2], __type: 'svc' }; });
    }

    function formatPSValues(values) {
      if (!values || !values.length) return [];
      const t = values[0].__type;
      if (t === 'file') {
        const lines = [];
        const header = 'Mode                LastWriteTime           Length Name';
        lines.push(header);
        lines.push('-' .repeat(header.length));
        values.forEach(function (v) {
          lines.push(String(v.Mode).padEnd(20) + String(v.LastWriteTime).padEnd(24) + String(v.Length).padStart(8) + ' ' + v.Name);
        });
        return lines;
      }
      if (t === 'proc') {
        const lines = [];
        const header = 'Handles  NPM(K)    PM(K)      WS(K)     Id ProcessName';
        lines.push(header);
        lines.push('-'.repeat(header.length));
        values.forEach(function (v) {
          lines.push(String(v.Handles).padStart(7) + ' ' + String(v.NPM).padStart(7) + ' ' + String(v.PM).padStart(8) + ' ' + String(v.WS).padStart(9) + ' ' + String(v.Id).padStart(6) + ' ' + v.ProcessName);
        });
        return lines;
      }
      if (t === 'svc') {
        const lines = ['Status   Name               DisplayName', '------   ----               -----------'];
        values.forEach(function (v) {
          lines.push(String(v.Status).padEnd(9) + String(v.Name).padEnd(19) + v.DisplayName);
        });
        return lines;
      }
      // generic: key: value
      const lines = [];
      values.forEach(function (v) {
        if (typeof v === 'string') lines.push(v);
        else if (v && typeof v === 'object') {
          Object.keys(v).forEach(function (k) {
            if (k !== '__type') lines.push(k + ' : ' + v[k]);
          });
          lines.push('');
        }
      });
      return lines;
    }

    function psMatchOp(obj, prop, op, val) {
      const actual = (prop === '_' ? obj : (obj && obj[prop]));
      const a = (actual == null ? '' : actual);
      const v = val.replace(/^['"]|['"]$/g, '');
      switch (op.toLowerCase()) {
        case '-eq': return String(a).toLowerCase() === v.toLowerCase();
        case '-ne': return String(a).toLowerCase() !== v.toLowerCase();
        case '-like': return wildcardMatch(String(a), v);
        case '-notlike': return !wildcardMatch(String(a), v);
        case '-gt': return Number(a) > Number(v);
        case '-ge': return Number(a) >= Number(v);
        case '-lt': return Number(a) < Number(v);
        case '-le': return Number(a) <= Number(v);
        case '-match': return new RegExp(v, 'i').test(String(a));
        case '-notmatch': return !new RegExp(v, 'i').test(String(a));
        case '-contains': return Array.isArray(a) && a.indexOf(v) > -1;
        default: return false;
      }
    }

    function runPSSegment(seg, inputValues) {
      const redir = parseRedirect(seg);
      seg = redir.cmd;
      const tokens = parseArgs(seg);
      const cmdRaw = tokens[0] || '';
      const cmd = PS_ALIASES[cmdRaw.toLowerCase()] || cmdRaw;
      const cl = cmd.toLowerCase();
      const args = tokens.slice(1);
      // flags
      function getFlag(name) {
        const i = args.findIndex(function (a) { return a.toLowerCase() === name.toLowerCase() || a.toLowerCase().startsWith(name.toLowerCase() + ':'); });
        if (i < 0) return null;
        const a = args[i];
        if (a.indexOf(':') > -1) return a.split(':').slice(1).join(':').replace(/^['"]|['"]$/g, '');
        // next token
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) return args[i + 1];
        return true;
      }
      function hasFlag(name) { return args.some(function (a) { return a.toLowerCase() === name.toLowerCase() || a.toLowerCase().startsWith(name.toLowerCase() + ':'); }); }

      // If inputValues provided and cmd is a transform/filter
      let values = inputValues;

      // Commands that GENERATE values
      if (values == null) {
        if (cl === 'get-childitem' || cl === 'gci' || cl === 'ls' || cl === 'dir') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const target = pathArg ? normPath(pathArg, cwd) : cwd;
          const filter = getFlag('-filter') || getFlag('-include');
          const recurse = hasFlag('-recurse');
          let entries = [];
          function collect(p, depth) {
            const list = Win.fs.list(p);
            list.forEach(function (e) {
              if (filter && !wildcardMatch(e.name, filter)) { /* still recurse */ }
              else entries.push(psFileInfo(e));
              if (recurse && e.type === 'dir' && depth < 4) collect(e.path, depth + 1);
            });
          }
          const node = Win.fs.resolve(target);
          if (!node || node.type !== 'dir') return { error: 'Cannot find path \' ' + target + '\' because it does not exist.' };
          collect(target, 0);
          if (filter) entries = entries.filter(function (e) { return wildcardMatch(e.name, filter); });
          if (hasFlag('-file')) entries = entries.filter(function (e) { return !e.PSIsContainer; });
          if (hasFlag('-directory')) entries = entries.filter(function (e) { return e.PSIsContainer; });
          if (hasFlag('-name')) { values = entries.map(function (e) { return e.Name; }); }
          else values = entries;
        } else if (cl === 'get-content' || cl === 'gc' || cl === 'cat' || cl === 'type') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const t = normPath(pathArg, cwd);
          const node = Win.fs.resolve(t);
          if (!node || node.type !== 'file') return { error: 'Cannot find path \'' + t + '\'.' };
          const raw = String(node.content || '');
          const lines = raw.replace(/\r\n/g, '\n').split('\n');
          const head = getFlag('-head') || getFlag('-first');
          const tail = getFlag('-tail') || getFlag('-last');
          let out = lines;
          if (head) out = lines.slice(0, Number(head));
          if (tail) out = lines.slice(-Number(tail));
          values = out;
        } else if (cl === 'get-process' || cl === 'ps' || cl === 'gps') {
          values = psProcessList();
          const nameFilter = getFlag('-name');
          if (nameFilter) values = values.filter(function (p) { return wildcardMatch(p.ProcessName, nameFilter); });
        } else if (cl === 'get-service' || cl === 'gsv') {
          values = psServiceList();
        } else if (cl === 'get-date') {
          const fmt = getFlag('-format');
          const now = new Date();
          if (fmt) values = [now.toLocaleString()]; // simplified
          else values = [{ __type: 'date', DateTime: now.toLocaleString(), Day: now.getDate(), Month: now.getMonth() + 1, Year: now.getFullYear(), Hour: now.getHours(), Minute: now.getMinutes(), Second: now.getSeconds() }];
        } else if (cl === 'get-computerinfo' || cl === 'systeminfo') {
          const si = Win.sysinfo ? Win.sysinfo() : {};
          values = [{ __type: 'info', WindowsProductName: Win.osNameFull, WindowsVersion: Win.osVersion, CsProcessors: (si.cores || '?') + ' logical', TotalPhysicalMemory: (si.memory || 8) + ' GB', OsArchitecture: '32-bit' }];
        } else if (cl === 'get-location' || cl === 'gl' || cl === 'pwd') {
          values = [cwd];
        } else if (cl === 'get-host') {
          values = [{ __type: 'host', Name: 'ConsoleHost', Version: '2.0', CurrentCulture: 'en-US', CurrentUICulture: 'en-US' }];
        } else if (cl === 'get-psdrive') {
          values = [
            { Name: 'C', Used: Win.fs.stats().bytes, Free: 2147483648, Provider: 'FileSystem', Root: 'C:\\' },
            { Name: 'Env', Used: '', Free: '', Provider: 'Environment', Root: '' },
            { Name: 'Alias', Used: '', Free: '', Provider: 'Alias', Root: '' }
          ];
        } else if (cl === 'get-history') {
          values = history.map(function (h, i) { return { Id: i + 1, CommandLine: h }; });
        } else if (cl === 'get-alias' || cl === 'gal') {
          values = Object.keys(PS_ALIASES).map(function (k) { return { Name: k, Definition: PS_ALIASES[k] }; });
        } else if (cl === 'get-variable' || cl === 'gv') {
          values = Object.keys(env).map(function (k) { return { Name: k, Value: env[k] }; });
        } else if (cl === 'get-module') {
          values = [{ Name: 'Microsoft.PowerShell.Management', Version: '2.0', ModuleType: 'Binary' }, { Name: 'Microsoft.PowerShell.Utility', Version: '2.0', ModuleType: 'Binary' }];
        } else if (cl === 'get-command') {
          const filter = args.find(function (a) { return !a.startsWith('-'); });
          let list = PS_COMMANDS.concat(Object.keys(PS_ALIASES));
          if (filter) list = list.filter(function (c) { return wildcardMatch(c, filter); });
          values = list.map(function (c) { return { Name: c, CommandType: 'Cmdlet' }; });
        } else if (cl === 'get-executionpolicy') {
          values = ['Restricted'];
        } else if (cl === 'get-culture') {
          values = ['en-US'];
        } else if (cl === 'get-timezone') {
          values = [Intl.DateTimeFormat().resolvedOptions().timeZone];
        } else if (cl === 'get-random') {
          const max = getFlag('-maximum') || getFlag('-max') || 2147483647;
          const min = getFlag('-minimum') || getFlag('-min') || 0;
          values = [Math.floor(Math.random() * (Number(max) - Number(min))) + Number(min)];
        } else if (cl === 'get-wmiobject' || cl === 'gwmi') {
          const cls = getFlag('-class') || getFlag('-classname') || args.find(function (a) { return !a.startsWith('-'); });
          if (cls && String(cls).toLowerCase().indexOf('win32_operatingsystem') > -1) {
            values = [{ Caption: Win.osNameFull, Version: Win.osVersion, BuildNumber: Win.osVersion.split('.')[2], OSArchitecture: '32-bit' }];
          } else if (cls && String(cls).toLowerCase().indexOf('win32_processor') > -1) {
            values = [{ Name: 'WebCore x86', NumberOfCores: (Win.sysinfo ? Win.sysinfo().cores : 4), MaxClockSpeed: 3200 }];
          } else if (cls && String(cls).toLowerCase().indexOf('win32_logicaldisk') > -1) {
            values = [{ DeviceID: 'C:', VolumeName: 'WINEMULATOR', Size: 2147483648, FreeSpace: 2147483648 - Win.fs.stats().bytes }];
          } else {
            values = [{ __type: 'info', Class: cls || 'Unknown', Note: 'Simulated WMI object' }];
          }
        } else if (cl === 'get-ciminstance') {
          values = [{ __type: 'info', ClassName: args.find(function (a) { return !a.startsWith('-'); }) || 'Unknown', Note: 'Simulated CIM instance' }];
        } else if (cl === 'get-eventlog' || cl === 'get-winevent') {
          values = [
            { TimeGenerated: new Date().toLocaleString(), EntryType: 'Information', Source: 'WINemulator', Message: 'System started successfully.' },
            { TimeGenerated: new Date(Date.now() - 60000).toLocaleString(), EntryType: 'Warning', Source: 'Disk', Message: 'Simulated disk warning.' }
          ];
        } else if (cl === 'get-item' || cl === 'gi') {
          const t = normPath(args.find(function (a) { return !a.startsWith('-'); }), cwd);
          const node = Win.fs.resolve(t);
          if (!node) return { error: 'Cannot find path \'' + t + '\'.' };
          values = [psFileInfo({ name: Win.fs.baseName(t), path: t, type: node.type, size: (node.type === 'file' ? (node.content || '').length : 0), modified: node.modified || Date.now() })];
        } else if (cl === 'get-itemproperty') {
          values = [{ __type: 'prop', PSPath: args.join(' '), Note: 'Simulated property' }];
        } else if (cl === 'test-connection') {
          const host = getFlag('-computername') || args.find(function (a) { return !a.startsWith('-'); }) || 'localhost';
          values = [{ Destination: host, IPV4Address: '127.0.0.1', ResponseTime: Math.floor(Math.random() * 4) + 1, Status: 'Success' }];
        } else if (cl === 'test-netconnection') {
          const host = getFlag('-computername') || args.find(function (a) { return !a.startsWith('-'); }) || 'localhost';
          values = [{ ComputerName: host, RemoteAddress: '127.0.0.1', TcpTestSucceeded: true, PingSucceeded: true }];
        } else if (cl === 'resolve-dnsname') {
          const host = args.find(function (a) { return !a.startsWith('-'); }) || 'localhost';
          values = [{ Name: host, Type: 'A', IPAddress: '127.0.0.1' }];
        } else if (cl === 'get-netipconfiguration' || cl === 'ipconfig') {
          values = [{ InterfaceAlias: 'Ethernet', IPv4Address: '192.168.0.42', IPv4DefaultGateway: '192.168.0.1', DNSServer: '192.168.0.1' }];
        } else if (cl === 'get-netadapter') {
          values = [{ Name: 'Ethernet', InterfaceDescription: 'Intel PRO/1000 MT', Status: 'Up', MacAddress: '00-15-5D-00-00-01', LinkSpeed: '1 Gbps' }];
        } else if (cl === 'invoke-webrequest' || cl === 'iwr' || cl === 'wget' || cl === 'curl') {
          const uri = getFlag('-uri') || args.find(function (a) { return !a.startsWith('-'); });
          values = [{ StatusCode: 200, StatusDescription: 'OK', Content: 'Simulated response from ' + uri, RawContentLength: 42 }];
        } else if (cl === 'whoami') {
          values = ['winemulator\\' + env.USERNAME.toLowerCase()];
        } else if (cl === 'cls' || cl === 'clear-host' || cl === 'clear') {
          clearOut();
          return { lines: [], clear: true };
        } else if (cl === 'cd' || cl === 'set-location' || cl === 'sl' || cl === 'chdir') {
          if (args.length) {
            const r = cmdCd(args);
            if (r.code) return r;
          }
          return { lines: [] };
        } else if (cl === 'echo' || cl === 'write-output' || cl === 'write-host') {
          const text = args.join(' ');
          return { lines: [expandVars(text, env)], values: null };
        } else if (cl === 'set-content' || cl === 'sc' || cl === 'out-file') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const t = normPath(pathArg, cwd);
          const valIndex = args.indexOf('-value') > -1 ? args.indexOf('-value') + 1 : args.indexOf('-Value') > -1 ? args.indexOf('-Value') + 1 : -1;
          let value = '';
          if (valIndex > -1) value = args.slice(valIndex).join(' ');
          else {
            // rest after path
            const pi = args.indexOf(pathArg);
            value = args.slice(pi + 1).join(' ');
          }
          value = expandVars(value, env);
          try { Win.fs.write(t, value, { kind: 'text', app: 'notepad', silent: true }); } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'add-content' || cl === 'ac') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const t = normPath(pathArg, cwd);
          const node = Win.fs.resolve(t);
          const existing = node && node.type === 'file' ? node.content : '';
          const val = args.slice(args.indexOf(pathArg) + 1).join(' ');
          try { Win.fs.write(t, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + expandVars(val, env), { kind: 'text', app: 'notepad', silent: true }); } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'new-item' || cl === 'ni' || cl === 'mkdir') {
          const pathArg = getFlag('-path') || args.find(function (a) { return !a.startsWith('-'); });
          const type = (getFlag('-itemtype') || getFlag('-type') || 'file').toLowerCase();
          const name = getFlag('-name');
          const target = name ? normPath(Win.fs.join(pathArg ? normPath(pathArg, cwd) : cwd, name), cwd) : normPath(pathArg, cwd);
          try {
            if (type.indexOf('dir') > -1 || type === 'directory') Win.fs.mkdir(target, { parents: true });
            else {
              const val = getFlag('-value') || '';
              Win.fs.write(target, expandVars(val, env), { kind: 'text', app: 'notepad', silent: true });
            }
          } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'remove-item' || cl === 'rm' || cl === 'del' || cl === 'ri' || cl === 'rmdir' || cl === 'rd') {
          const targets = args.filter(function (a) { return !a.startsWith('-'); });
          const recurse = hasFlag('-recurse') || hasFlag('-r');
          const force = hasFlag('-force');
          try {
            targets.forEach(function (a) {
              const t = normPath(a, cwd);
              const node = Win.fs.resolve(t);
              if (node && node.type === 'dir') {
                if (!recurse && Win.fs.list(t).length) throw new Error('Directory not empty: ' + t);
                Win.fs.remove(t);
              } else if (node) Win.fs.remove(t);
              else throw new Error('Cannot find path \'' + t + '\'.');
            });
          } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'copy-item' || cl === 'cp' || cl === 'cpi' || cl === 'copy') {
          const src = args.find(function (a) { return !a.startsWith('-'); });
          const dst = args.filter(function (a) { return !a.startsWith('-'); })[1];
          if (!src || !dst) return { error: 'Copy-Item: missing path.' };
          try {
            const s = normPath(src, cwd);
            let d = normPath(dst, cwd);
            const dn = Win.fs.resolve(d);
            if (!dn || dn.type !== 'dir') d = Win.fs.parentPath(d) || cwd;
            Win.fs.copy(s, d);
          } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'move-item' || cl === 'mv' || cl === 'mi' || cl === 'move') {
          const src = args.find(function (a) { return !a.startsWith('-'); });
          const dst = args.filter(function (a) { return !a.startsWith('-'); })[1];
          if (!src || !dst) return { error: 'Move-Item: missing path.' };
          try {
            const s = normPath(src, cwd);
            let d = normPath(dst, cwd);
            const dn = Win.fs.resolve(d);
            if (!dn || dn.type !== 'dir') d = Win.fs.parentPath(d) || cwd;
            Win.fs.move(s, d);
          } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'rename-item' || cl === 'ren' || cl === 'rni') {
          const src = args.find(function (a) { return !a.startsWith('-'); });
          const newName = args.filter(function (a) { return !a.startsWith('-'); })[1];
          if (!src || !newName) return { error: 'Rename-Item: missing arguments.' };
          try { Win.fs.rename(normPath(src, cwd), newName); } catch (e) { return { error: e.message }; }
          return { lines: [] };
        } else if (cl === 'start-process' || cl === 'saps' || cl === 'start') {
          const target = args.find(function (a) { return !a.startsWith('-'); });
          if (!target) { Win.wm.open('explorer', { path: 'C:\\' }); return { lines: [] }; }
          const map = { notepad:'notepad', mspaint:'paint', calc:'calc', explorer:'explorer', iexplore:'browser', firefox:'firefox', control:'settings', taskmgr:'taskmgr', cmd:'terminal', powershell:'terminal' };
          const low = target.toLowerCase();
          if (map[low]) {
            if (low === 'powershell' || low === 'cmd') Win.wm.open('terminal', { mode: low === 'powershell' ? 'ps' : 'cmd', cwd: cwd });
            else Win.wm.open(map[low]);
            return { lines: [] };
          }
          const t = normPath(target, cwd);
          if (Win.fs.exists(t)) { try { Win.shell.openFile(t); } catch (e) {} return { lines: [] }; }
          return { error: 'Cannot find path \'' + target + '\'.' };
        } else if (cl === 'stop-computer' || cl === 'restart-computer') {
          if (Win.boot) Win.boot.power(cl === 'restart-computer' ? 'restart' : 'shutdown');
          return { lines: [] };
        } else if (cl === 'set-executionpolicy') {
          return { lines: ['Execution Policy Changed (simulated).'] };
        } else if (cl === 'set-alias' || cl === 'sal') {
          const name = args[0], def = args[1];
          if (name && def) PS_ALIASES[name.toLowerCase()] = def;
          return { lines: [] };
        } else if (cl === 'clear-history') {
          history = []; histIndex = 0;
          return { lines: [] };
        } else if (cl === 'format-table' || cl === 'ft') {
          // just pass through; formatting already done at end
          return { values: values, lines: [] };
        } else if (cl === 'format-list' || cl === 'fl') {
          if (values && values.length) {
            const lines = [];
            values.forEach(function (v) {
              if (typeof v === 'string') { lines.push(v); return; }
              Object.keys(v).forEach(function (k) { if (k !== '__type') lines.push(k + ' : ' + v[k]); });
              lines.push('');
            });
            return { lines: lines, values: null };
          }
          return { lines: [], values: null };
        } else if (cl === 'select-object' || cl === 'select') {
          if (!values) return { lines: [], values: null };
          const first = getFlag('-first') || getFlag('-f');
          const last = getFlag('-last') || getFlag('-l');
          const skip = getFlag('-skip');
          const prop = getFlag('-property') || getFlag('-expandproperty');
          const unique = hasFlag('-unique');
          let out = values.slice();
          if (skip) out = out.slice(Number(skip));
          if (first) out = out.slice(0, Number(first));
          if (last) out = out.slice(-Number(last));
          if (prop) {
            const props = String(prop).split(',').map(function (x) { return x.trim(); });
            out = out.map(function (v) {
              if (typeof v === 'string') return v;
              const o = {};
              props.forEach(function (p) { o[p] = v[p]; });
              o.__type = v.__type;
              return o;
            });
          }
          if (unique) {
            const seen = {};
            out = out.filter(function (v) {
              const key = JSON.stringify(v);
              if (seen[key]) return false;
              seen[key] = true;
              return true;
            });
          }
          return { values: out, lines: [] };
        } else if (cl === 'where-object' || cl === 'where' || cl === 'where-object') {
          if (!values) return { lines: [], values: null };
          // parse condition
          let prop = null, op = '-like', val = '*';
          // short form: Where-Object Name -like '*.txt'
          const condTokens = args.filter(function (a) { return !a.startsWith('-') || a.startsWith('-') && ['-eq','-ne','-like','-notlike','-gt','-ge','-lt','-le','-match','-notmatch'].indexOf(a.toLowerCase()) > -1; });
          // try pattern: prop op val
          if (args.length >= 3 && ['-eq','-ne','-like','-notlike','-gt','-ge','-lt','-le','-match','-notmatch'].indexOf(args[1].toLowerCase()) > -1) {
            prop = args[0]; op = args[1]; val = args[2];
          } else if (args.length >= 1) {
            // script block { $_.Name -like '*.txt' } or { $_.Length -gt 1000 }
            const sb = args.join(' ');
            const m = sb.match(/\$_\.(\w+)\s+(-\w+)\s+(.+)/);
            if (m) { prop = m[1]; op = m[2]; val = m[3].trim(); }
          }
          if (prop == null) prop = 'Name';
          const out = values.filter(function (v) {
            try { return psMatchOp(v, prop, op, val); } catch (e) { return false; }
          });
          return { values: out, lines: [] };
        } else if (cl === 'sort-object' || cl === 'sort') {
          if (!values) return { lines: [], values: null };
          const prop = getFlag('-property') || args.find(function (a) { return !a.startsWith('-'); }) || 'Name';
          const desc = hasFlag('-descending');
          const out = values.slice().sort(function (a, b) {
            const va = (typeof a === 'string') ? a : (a[prop] == null ? '' : a[prop]);
            const vb = (typeof b === 'string') ? b : (b[prop] == null ? '' : b[prop]);
            if (typeof va === 'number' && typeof vb === 'number') return desc ? vb - va : va - vb;
            return desc ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
          });
          return { values: out, lines: [] };
        } else if (cl === 'measure-object' || cl === 'measure') {
          if (!values) return { lines: [{ text: 'Count    : 0' }] };
          const prop = getFlag('-property');
          const lines = ['Count    : ' + values.length];
          if (prop) {
            const nums = values.map(function (v) { return Number(v[prop]); }).filter(function (n) { return !isNaN(n); });
            if (nums.length) {
              lines.push('Sum      : ' + nums.reduce(function (a, b) { return a + b; }, 0));
              lines.push('Average  : ' + (nums.reduce(function (a, b) { return a + b; }, 0) / nums.length).toFixed(2));
              lines.push('Maximum  : ' + Math.max.apply(null, nums));
              lines.push('Minimum  : ' + Math.min.apply(null, nums));
            }
          }
          return { lines: lines, values: null };
        } else if (cl === 'convertto-json' || cl === 'convertfrom-json') {
          if (cl === 'convertto-json') {
            return { lines: [JSON.stringify(values, null, 2)], values: null };
          }
          // convertfrom-json: expect input strings
          try {
            const parsed = JSON.parse((inputValues || []).join('\n'));
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            return { values: arr, lines: [] };
          } catch (e) { return { error: 'ConvertFrom-Json: ' + e.message }; }
        } else if (cl === 'export-csv') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const t = normPath(pathArg, cwd);
          if (values && values.length) {
            const keys = Object.keys(values[0]).filter(function (k) { return k !== '__type'; });
            const csv = [keys.join(',')].concat(values.map(function (v) { return keys.map(function (k) { return JSON.stringify(v[k]); }).join(','); })).join('\n');
            try { Win.fs.write(t, csv, { kind: 'text', app: 'notepad', silent: true }); } catch (e) { return { error: e.message }; }
          }
          return { lines: [], values: null };
        } else if (cl === 'import-csv') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const t = normPath(pathArg, cwd);
          const node = Win.fs.resolve(t);
          if (!node || node.type !== 'file') return { error: 'Cannot find path \'' + t + '\'.' };
          const lines = String(node.content || '').split('\n').filter(function (l) { return l.trim(); });
          if (!lines.length) return { values: [], lines: [] };
          const headers = lines[0].split(',').map(function (h) { return h.replace(/^"|"$/g, '').trim(); });
          const vals = lines.slice(1).map(function (l) {
            const cols = l.split(',');
            const o = { __type: 'csv' };
            headers.forEach(function (h, i) { o[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
            return o;
          });
          return { values: vals, lines: [] };
        } else if (cl === 'out-string') {
          if (values) return { lines: formatPSValues(values), values: null };
          return { lines: [], values: null };
        } else if (cl === 'out-file') {
          const pathArg = args.find(function (a) { return !a.startsWith('-'); });
          const t = normPath(pathArg, cwd);
          const content = values ? formatPSValues(values).join('\n') : (inputValues || []).join('\n');
          try { Win.fs.write(t, content, { kind: 'text', app: 'notepad', silent: true }); } catch (e) { return { error: e.message }; }
          return { lines: [], values: null };
        } else if (cl === 'help' || cl === 'get-help') {
          const topic = args.find(function (a) { return !a.startsWith('-'); });
          if (!topic) {
            return { lines: [
              'Cmdlet              Description',
              '-------             -----------',
              'Get-ChildItem       Gets the items in one or more specified locations.',
              'Get-Content         Gets the content of the item at the specified location.',
              'Set-Content         Writes or replaces the content in an item.',
              'New-Item            Creates a new item.',
              'Remove-Item         Deletes the specified items.',
              'Copy-Item           Copies an item from one location to another.',
              'Move-Item           Moves an item from one location to another.',
              'Rename-Item         Renames an item in a Windows PowerShell provider namespace.',
              'Get-Process         Gets the processes that are running on the local computer.',
              'Get-Service         Gets the services on the computer.',
              'Get-Date            Gets the current date and time.',
              'Test-Connection     Sends ICMP echo request packets to one or more computers.',
              'Select-Object       Selects specified properties of an object.',
              'Where-Object        Selects objects that have particular property values.',
              'Sort-Object         Sorts objects by property values.',
              'Measure-Object      Calculates numeric properties of objects.',
              'Format-Table         Formats the output as a table.',
              'Format-List          Formats the output as a list of properties.',
              'ConvertTo-Json       Converts objects to JSON strings.',
              'Export-Csv          Exports objects to a CSV file.',
              'Get-Help            Displays information about PowerShell commands.',
              '',
              'Type Get-Command to list all available commands.'
            ] };
          }
          return { lines: ['Detailed help for ' + topic + ' is not available in this simulation.', 'Try Get-Command or about_' + topic + '.'] };
        } else if (cl === 'get-member' || cl === 'gm') {
          if (!values || !values.length) return { lines: ['No input objects.'] };
          const keys = Object.keys(values[0]).filter(function (k) { return k !== '__type'; });
          const lines = ['   TypeName: ' + (values[0].__type || 'System.Object'), '', 'Name            MemberType   Definition', '----            ----------   ----------'];
          keys.forEach(function (k) { lines.push(k.padEnd(16) + 'Property     ' + typeof values[0][k]); });
          return { lines: lines, values: null };
        } else if (cl === 'set-location' || cl === 'cd' || cl === 'sl' || cl === 'chdir') {
          if (args.length) {
            const r = cmdCd(args);
            if (r.code) return { error: r.lines.join(' ') };
          }
          return { lines: [], values: null };
        } else if (cl === 'clear-host' || cl === 'cls' || cl === 'clear') {
          clearOut();
          return { lines: [], clear: true, values: null };
        } else {
          // unknown command: maybe an alias to cmd? try cmd exec
          return null; // signal fallback
        }

        // default: format values if any
        if (values === null) values = inputValues;
        return { values: values, lines: [] };
      }

      // Transform commands applied to existing input
      // (handled above when values != null and cmd is transform; but our function already handles both)
      // If values still null and cmd unknown, try CMD fallback
      if (values === undefined) values = inputValues;
      return { values: values, lines: [] };
    }

    function runCMD(raw, stdinLines) {
      // caret escaping: ^> ^< ^| ^& ^^
      raw = String(raw).replace(/\^([><|&^])/g, function (_, ch) {
        return { '>':'__CARET_GT__', '<':'__CARET_LT__', '|':'__CARET_PIPE__', '&':'__CARET_AMP__', '^':'__CARET_CARET__' }[ch];
      });
      const redir = parseRedirect(raw);
      raw = redir.cmd;
      const args = parseArgs(raw);
      const cmd = (args[0] || '').toLowerCase();
      const rest = raw.slice((args[0] || '').length).trim();
      let result = null;
      // batch file execution
      const t0 = normPath(args[0] || '', cwd);
      if (Win.fs.exists(t0) && (t0.toLowerCase().endsWith('.bat') || t0.toLowerCase().endsWith('.cmd'))) {
        const node = Win.fs.resolve(t0);
        const content = String(node.content || '');
        (async function () {
          const lines = content.split(/\r?\n/);
          let echoOn = true;
          let paused = false;
          for (let li = 0; li < lines.length; li++) {
            const line = lines[li].trim();
            if (!line || line.toUpperCase().startsWith('REM') || line.startsWith('::')) continue;
            if (/^@?echo\s+off$/i.test(line)) { echoOn = false; continue; }
            if (/^@?echo\s+on$/i.test(line)) { echoOn = true; continue; }
            const waitM = line.match(/^wait\s+(\d+)/i);
            if (waitM) { await new Promise(function (res) { setTimeout(res, (parseInt(waitM[1], 10) || 0) * 1000); }); continue; }
            const toM = line.match(/^timeout\s+/i);
            if (toM) {
              let sec = 5;
              const ti = line.toLowerCase().indexOf('/t');
              if (ti > -1) { const m = line.slice(ti).match(/\/t\s+(\d+)/i); if (m) sec = parseInt(m[1], 10) || 5; }
              await new Promise(function (res) { setTimeout(res, sec * 1000); }); continue;
            }
            if (/^pause$/i.test(line)) {
              printLine('Press any key to continue . . .');
              paused = true;
              if (batchPauseCb) { try { batchPauseCb(true); } catch (e) {} }
              await new Promise(function (res) {
                const handler = function () { document.removeEventListener('keydown', handler); res(); };
                setTimeout(function () { document.addEventListener('keydown', handler); }, 0);
              });
              if (batchPauseCb) { try { batchPauseCb(false); } catch (e) {} }
              continue;
            }
            const expanded = expandVars(line, env);
            if (echoOn) printLine(cwd + '>' + line, 'term-dim');
            const r = runCMD(expanded, null);
            if (r && r.lines) printLines(r.lines);
            if (r && r.clear) clearOut();
          }
          if (isBatchLaunch && !paused) {
            setTimeout(function () { try { ctx.close(true); } catch (e) {} }, 400);
          }
        })();
        return { lines: [] };
      }

      switch (cmd) {
        case 'help': case '?': result = cmdHelp(); break;
        case 'cls': result = { lines: [], clear: true }; break;
        case 'ver': result = cmdVer(); break;
        case 'winver': Win.shell.run('help'); result = { lines: [] }; break;
        case 'vol': result = { lines: [' Volume in drive C is WINEMULATOR', ' Volume Serial Number is 1234-ABCD'] }; break;
        case 'label': result = { lines: ['Volume label is WINEMULATOR'] }; break;
        case 'dir': result = cmdDir(args.slice(1), null); if (args[1] && !args[1].startsWith('/')) { /* target already handled */ } result = cmdDir(args.slice(1)); break;
        case 'cd': case 'chdir': result = cmdCd(args.slice(1)); break;
        case 'pushd': result = cmdCd(args.slice(1)); break;
        case 'popd': cwd = 'C:\\'; setPrompt(); result = { lines: [] }; break;
        case 'md': case 'mkdir': result = cmdMkdir(args.slice(1)); break;
        case 'rd': case 'rmdir': result = cmdRmdir(args.slice(1)); break;
        case 'del': case 'erase': result = cmdDel(args.slice(1)); break;
        case 'ren': case 'rename': result = cmdRen(args.slice(1)); break;
        case 'copy': result = cmdCopy(args.slice(1)); break;
        case 'xcopy': result = cmdCopy(args.slice(1)); break;
        case 'move': result = cmdMove(args.slice(1)); break;
        case 'type': result = cmdType(args.slice(1)); break;
        case 'more': result = cmdType(args.slice(1)); break;
        case 'tree': result = cmdTree(args.slice(1)); break;
        case 'echo': result = cmdEcho(args.slice(1)); break;
        case 'set': {
          if (args.length === 1) {
            const lines = Object.keys(env).map(function (k) { return k + '=' + env[k]; });
            result = { lines: lines };
          } else {
            const expr = args.slice(1).join(' ');
            const eq = expr.indexOf('=');
            if (eq > 0) {
              const key = expr.slice(0, eq).trim().toUpperCase();
              const val = expandVars(expr.slice(eq + 1).trim(), env);
              env[key] = val;
              result = { lines: [] };
            } else {
              result = { lines: [env[expr.toUpperCase()] || 'Environment variable not defined'] };
            }
          }
          break;
        }
        case 'path': result = { lines: ['PATH=' + env.PATH] }; break;
        case 'prompt': {
          if (args[1]) env.PROMPT = args.slice(1).join(' ');
          result = { lines: [] };
          break;
        }
        case 'title': {
          const t = args.slice(1).join(' ');
          if (t) ctx.setTitle(t);
          result = { lines: [] };
          break;
        }
        case 'color': result = { lines: [] }; break;
        case 'date': result = { lines: ['Current date is ' + new Date().toDateString()] }; break;
        case 'time': result = { lines: ['Current time is ' + new Date().toLocaleTimeString()] }; break;
        case 'wait': {
          let sec = parseInt(args[1], 10) || 0;
          sec = Math.max(0, Math.min(300, sec));
          result = { lines: [] };
          break;
        }
        case 'timeout': {
          let sec = 5;
          const tIdx = args.indexOf('/t') > -1 ? args.indexOf('/t') : args.indexOf('/T') > -1 ? args.indexOf('/T') : -1;
          if (tIdx > -1 && args[tIdx + 1]) sec = parseInt(args[tIdx + 1], 10) || 5;
          else if (args[1] && !String(args[1]).startsWith('/')) sec = parseInt(args[1], 10) || 5;
          sec = Math.max(0, Math.min(300, sec));
          if (args.indexOf('/nobreak') > -1 || args.indexOf('/NOBREAK') > -1) {
            // no key skip
          }
          result = { lines: [''] };
          break;
        }
        case 'whoami': result = { lines: ['winemulator\\' + env.USERNAME.toLowerCase()] }; break;
        case 'hostname': result = { lines: ['WINEMULATOR'] }; break;
        case 'mem': result = { lines: [
          '', 'Memory Type        Total       Used       Free',
          '----------------  --------   --------   --------',
          'Conventional         640K       112K       528K',
          'Upper                155K       155K         0K',
          'Extended (XMS)    64,512K    12,288K    52,224K',
          '----------------  --------   --------   --------',
          'Total memory      65,307K    12,555K    52,752K'
        ] }; break;
        case 'systeminfo': result = cmdSysteminfo(); break;
        case 'ipconfig': result = cmdIpconfig(); break;
        case 'ping': result = cmdPing(args.slice(1)); break;
        case 'tracert': result = { lines: ['Tracing route to ' + (args[1] || 'localhost'), '1    <1 ms    127.0.0.1', 'Trace complete.'] }; break;
        case 'nslookup': result = { lines: ['Server:  WINEMULATOR', 'Address:  192.168.0.1', '', 'Name:    ' + (args[1] || 'localhost'), 'Address:  127.0.0.1'] }; break;
        case 'netstat': result = { lines: ['Active Connections', '', 'Proto  Local Address          Foreign Address        State', 'TCP    0.0.0.0:135            0.0.0.0:0              LISTENING', 'TCP    192.168.0.42:445        0.0.0.0:0              LISTENING'] }; break;
        case 'tasklist': result = cmdTasklist(); break;
        case 'taskkill': result = { lines: ['SUCCESS: The process has been terminated.'] }; break;
        case 'start': result = cmdStart(args.slice(1)); break;
        case 'explorer': Win.wm.open('explorer', { path: args[1] ? normPath(args[1], cwd) : 'C:\\' }); result = { lines: [] }; break;
        case 'notepad': Win.wm.open('notepad', args[1] ? { path: normPath(args[1], cwd) } : {}); result = { lines: [] }; break;
        case 'calc': case 'calculator': Win.wm.open('calc'); result = { lines: [] }; break;
        case 'mspaint': case 'paint': Win.wm.open('paint'); result = { lines: [] }; break;
        case 'control': case 'settings': Win.wm.open('settings'); result = { lines: [] }; break;
        case 'taskmgr': Win.wm.open('taskmgr'); result = { lines: [] }; break;
        case 'iexplore': case 'ie': Win.wm.open('browser'); result = { lines: [] }; break;
        case 'firefox': Win.wm.open('firefox'); result = { lines: [] }; break;
        case 'msinfo32': Win.wm.open('help'); result = { lines: [] }; break;
        case 'shutdown': {
          const mode = args.indexOf('/r') > -1 ? 'restart' : args.indexOf('/l') > -1 ? 'logoff' : 'shutdown';
          if (Win.boot) Win.boot.power(mode);
          result = { lines: [] };
          break;
        }
        case 'logoff': if (Win.boot) Win.boot.logoff(); result = { lines: [] }; break;
        case 'msdos': case 'dos': {
          let arg = args.slice(1).join(' ').trim();
          if (arg.charAt(0) === '-') arg = arg.slice(1).trim();
          arg = arg.replace(/^"+|"+$/g, '');
          let opt = null;
          if (!arg) opt = {};
          else if (/^(dos|main)$/i.test(arg)) opt = { classic: true };
          else if (/^(cmd|command|cmd\.exe|command\.com)$/i.test(arg)) opt = { classic: false };
          else {
            const f = normPath(arg, cwd);
            if (!Win.fs.exists(f)) {
              result = { lines: ['The system cannot find the file ' + arg + '.'], code: 1 };
              break;
            }
            opt = { file: f };
          }
          if (opt) opt.cwd = cwd;
          if (Win.boot) setTimeout(function () { Win.boot.dos(opt); }, 60);
          result = { lines: [opt && opt.file ? ('Opening ' + Win.fs.baseName(opt.file) + ' in MS-DOS mode...') : (opt && opt.classic ? 'Switching to the main MS-DOS shell...' : 'Switching to MS-DOS mode...')] };
          break;
        }
        case 'exit': ctx.close(true); result = { lines: [] }; break;
        case 'pause': result = { lines: ['Press any key to continue . . .'] }; break;
        case 'rem': result = { lines: [] }; break;
        case 'attrib': result = { lines: [args[1] ? ('A    ' + args[1]) : ''] }; break;
        case 'assoc': result = { lines: ['.txt=txtfile', '.bat=batfile', '.cmd=cmdfile', '.ps1=Microsoft.PowerShellScript.1'] }; break;
        case 'ftype': result = { lines: ['txtfile=notepad.exe %1', 'batfile="%1" %*'] }; break;
        case 'where': {
          const name = args[1] || args[0];
          const t = normPath(name, cwd);
          if (Win.fs.exists(t)) result = { lines: [t] };
          else result = { lines: ['INFO: Could not find files for the given pattern(s).'], code: 1 };
          break;
        }
        case 'find': case 'findstr': {
          const term = args.find(function (a) { return !a.startsWith('/'); }) || '';
          const file = args.filter(function (a) { return !a.startsWith('/'); })[1];
          if (file) {
            const node = Win.fs.resolve(normPath(file, cwd));
            if (node && node.type === 'file') {
              const lines = String(node.content || '').split(/\r?\n/).filter(function (l) { return l.toLowerCase().indexOf(term.toLowerCase()) > -1; });
              result = { lines: lines.length ? lines : [] };
            } else result = { lines: ['FINDSTR: Cannot open file ' + file], code: 1 };
          } else {
            // filter stdin
            result = { lines: (stdinLines || []).filter(function (l) { return l.toLowerCase().indexOf(term.toLowerCase()) > -1; }) };
          }
          break;
        }
        case 'sort': {
          const reverse = args.indexOf('/r') > -1 || args.indexOf('/R') > -1;
          const arr = (stdinLines || []).slice().sort();
          if (reverse) arr.reverse();
          result = { lines: arr };
          break;
        }
        case 'fc': result = { lines: ['Comparing files...', 'FC: no differences encountered'] }; break;
        case 'chkdsk': result = { lines: ['The type of the file system is NTFS.', 'Volume label is WINEMULATOR.', 'Windows has checked the file system and found no problems.', '    2147483648 bytes total disk space.', '    2147483648 bytes available on disk.'] }; break;
        case 'sfc': result = { lines: ['Beginning system scan...', 'Verification 100% complete.', 'Windows Resource Protection did not find any integrity violations.'] }; break;
        case 'dism': result = { lines: ['Deployment Image Servicing and Management tool', 'Version: 6.1.7600.16385', 'The operation completed successfully.'] }; break;
        case 'driverquery': result = { lines: ['Module Name  Display Name           Driver Type   Link Date', '===========  ======================  =============  ======================', 'ACPI         Microsoft ACPI Driver  Kernel        2009-07-14', 'NDIS         NDIS 6.0 driver        Kernel        2009-07-14'] }; break;
        case 'wmic': result = { lines: ['wmic is not implemented in this simulation.'] }; break;
        case 'reg': result = { lines: ['reg operation completed successfully (simulated).'] }; break;
        case 'gpupdate': result = { lines: ['Updating policy...', 'User Policy update has completed successfully.', 'Computer Policy update has completed successfully.'] }; break;
        case 'gpresult': result = { lines: ['OS Configuration:    Standalone Workstation', 'OS Version:          ' + Win.osVersion, 'Domain Name:         WORKGROUP'] }; break;
        case 'mode': result = { lines: ['Status for device CON:', '----------------------', '    Lines:          25', '    Columns:        80'] }; break;
        case 'chcp': result = { lines: ['Active code page: 437'] }; break;
        case 'cipher': result = { lines: ['Listing ' + cwd, 'New files added to this directory will not be encrypted.'] }; break;
        case 'compact': result = { lines: ['Listing ' + cwd, '0 files within 0 directories were compressed.'] }; break;
        case 'convert': result = { lines: ['Convert is not available in this simulation.'] }; break;
        case 'diskpart': result = { lines: ['Microsoft DiskPart version 6.1.7601', 'DISKPART> (simulated)'] }; break;
        case 'format': result = { lines: ['Format is disabled in this simulation.'] }; break;
        case 'cleanmgr': result = { lines: ['Disk Cleanup is not available in this simulation.'] }; break;
        case 'msconfig': Win.wm.open('settings'); result = { lines: [] }; break;
        case 'regedit': Win.ui.toast('Registry Editor is not available in this simulation.', 'info', 2200); result = { lines: [] }; break;
        case 'eventvwr': case 'services': case 'devmgmt': case 'diskmgmt': Win.ui.toast(cmd + ' is not available in this simulation.', 'info', 2200); result = { lines: [] }; break;
        case 'cmd': setMode('cmd'); result = { lines: [] }; break;
        case 'powershell': setMode('ps'); result = { lines: [] }; break;
        case 'curl': result = { lines: ['curl: (6) Could not resolve host (simulated).'] }; break;
        case 'bitsadmin': result = { lines: ['BITSADMIN version 3.0', 'BITS administration utility.', '(simulated)'] }; break;
        case 'clip': result = { lines: [] }; break;
        case 'title': result = { lines: [] }; break;
        default:
          if (Win.fs.exists(t0)) {
            try { Win.shell.openFile(t0); result = { lines: [] }; } catch (e) { result = { lines: [e.message.split('\n')[0]], code: 1 }; }
          } else {
            result = { lines: ['\'' + (args[0] || '') + '\' is not recognized as an internal or external command,'], code: 9009 };
            result.lines.push('operable program or batch file.');
          }
      }

      if (!result) result = { lines: ['Command not found.'], code: 1 };

      // handle echo off from result
      if (result.echoOff) { /* no-op state not persisted */ }
      if (result.clear) clearOut();

      // redirection
      function unescapeCarets(lines) {
        return (lines || []).map(function (l) {
          if (typeof l === 'string') {
            return l.replace(/__CARET_GT__/g, '>').replace(/__CARET_LT__/g, '<').replace(/__CARET_PIPE__/g, '|').replace(/__CARET_AMP__/g, '&').replace(/__CARET_CARET__/g, '^');
          }
          if (l && typeof l.text === 'string') {
            l.text = l.text.replace(/__CARET_GT__/g, '>').replace(/__CARET_LT__/g, '<').replace(/__CARET_PIPE__/g, '|').replace(/__CARET_AMP__/g, '&').replace(/__CARET_CARET__/g, '^');
          }
          return l;
        });
      }
      if (redir.suppress) return { lines: unescapeCarets([]) };
      if (redir.target) {
        const content = (result.lines || []).join('\n');
        try {
          const t = normPath(redir.target, cwd);
          if (redir.append) {
            const node = Win.fs.resolve(t);
            const existing = node && node.type === 'file' ? node.content : '';
            Win.fs.write(t, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + content, { kind: 'text', app: 'notepad', silent: true });
          } else {
            Win.fs.write(t, content, { kind: 'text', app: 'notepad', silent: true });
          }
        } catch (e) { printLine(e.message, 'term-err'); }
        return { lines: [] };
      }
      if (result && result.lines) result.lines = unescapeCarets(result.lines);
      return result;
    }

    function runPS(raw, stdinValues) {
      const redir = parseRedirect(raw);
      raw = redir.cmd;
      const segments = splitPipeline(raw);
      let values = null;
      let linesOut = [];
      let clearFlag = false;
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const r = runPSSegment(seg, values);
        if (r === null) {
          // fallback to cmd
          const cr = runCMD(seg, values && Array.isArray(values) ? values.map(function (v) { return typeof v === 'string' ? v : JSON.stringify(v); }) : null);
          if (cr.clear) clearFlag = true;
          if (cr.lines && cr.lines.length) linesOut = linesOut.concat(cr.lines);
          values = null;
          continue;
        }
        if (r.clear) clearFlag = true;
        if (r.error) { linesOut.push({ text: seg.split(' ')[0] + ' : ' + r.error, cls: 'term-err' }); values = null; break; }
        if (r.lines && r.lines.length) linesOut = linesOut.concat(r.lines.map(function (l) { return (typeof l === 'string') ? { text: l } : l; }));
        if (r.values !== undefined) values = r.values;
        // if command produced values and no transform, keep values for next; if it returned lines only, clear values
        if (r.values === undefined && r.lines && r.lines.length && i < segments.length - 1) {
          // convert lines to values for piping text
          values = r.lines.map(function (l) { return (typeof l === 'string') ? l : l.text; });
        }
      }
      if (clearFlag) clearOut();
      function unescapeCarets(lines) {
        return (lines || []).map(function (l) {
          if (typeof l === 'string') {
            return l.replace(/__CARET_GT__/g, '>').replace(/__CARET_LT__/g, '<').replace(/__CARET_PIPE__/g, '|').replace(/__CARET_AMP__/g, '&').replace(/__CARET_CARET__/g, '^');
          }
          if (l && typeof l.text === 'string') {
            l.text = l.text.replace(/__CARET_GT__/g, '>').replace(/__CARET_LT__/g, '<').replace(/__CARET_PIPE__/g, '|').replace(/__CARET_AMP__/g, '&').replace(/__CARET_CARET__/g, '^');
          }
          return l;
        });
      }
      if (redir.suppress) return { lines: unescapeCarets([]) };
      if (redir.target) {
        const content = linesOut.map(function (l) { return (typeof l === 'string' ? l : l.text); }).join('\n');
        // if values remain, format
        const finalContent = (values && values.length && !linesOut.length) ? formatPSValues(values).join('\n') : content;
        try {
          const t = normPath(redir.target, cwd);
          if (redir.append) {
            const node = Win.fs.resolve(t);
            const existing = node && node.type === 'file' ? node.content : '';
            Win.fs.write(t, existing + (existing && !existing.endsWith('\n') ? '\n' : '') + finalContent, { kind: 'text', app: 'notepad', silent: true });
          } else {
            Win.fs.write(t, finalContent, { kind: 'text', app: 'notepad', silent: true });
          }
        } catch (e) { linesOut.push({ text: e.message, cls: 'term-err' }); }
        return { lines: [] };
      }
      // final output
      if (values && values.length && linesOut.length === 0) {
        linesOut = formatPSValues(values).map(function (t) { return { text: t }; });
      }
      if (values === null && linesOut.length === 0) linesOut = [];
      return { lines: linesOut };
    }

    function run(raw, silent) {
      const t = raw.trim();
      if (!t) return;
      history.push(t);
      if (history.length > 200) history.shift();
      histIndex = history.length;

      if (!silent) printLine((mode === 'ps' ? 'PS ' + cwd + '> ' : (Win.isModern ? cwd + '>' : cwd + '>')) + t, 'term-dim');

      // asynchronous pause commands: wait / timeout / pause
      const waitMatch = t.match(/^wait\s+(\d+)\s*$/i);
      const timeoutMatch = t.match(/^timeout(?:\s+\/t)?\s+(\d+)(?:\s+\/nobreak)?\s*$/i);
      const pauseMatch = /^pause\s*$/i.test(t);
      if (waitMatch || timeoutMatch || pauseMatch) {
        let ms = 0;
        if (waitMatch || timeoutMatch) {
          const sec = parseInt((waitMatch || timeoutMatch)[1], 10) || 0;
          ms = Math.max(0, Math.min(300, sec)) * 1000;
        } else {
          printLine('Press any key to continue . . .');
        }
        input.readOnly = true;
        let finished = false;
        let timer = null;
        const finish = function () {
          if (finished) return;
          finished = true;
          if (timer) clearTimeout(timer);
          document.removeEventListener('keydown', onPauseKey, true);
          input.readOnly = false;
          setPrompt();
          scroll();
          try { input.focus(); } catch (e) {}
        };
        const onPauseKey = function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') ev.preventDefault();
          finish();
        };
        if (pauseMatch) setTimeout(function () { document.addEventListener('keydown', onPauseKey, true); }, 0);
        else timer = setTimeout(finish, ms);
        return;
      }

      let result;
      if (mode === 'ps') result = runPS(t, null);
      else result = runCMD(t, null);

      if (result.clear) clearOut();
      if (result.lines && result.lines.length) printLines(result.lines);
      if (result.code && result.code !== 0 && result.lines && !result.lines.length) {
        // nothing
      }
      setPrompt();
      scroll();
    }

    // tab completion
    function complete(current) {
      const toks = current.split(/\s+/);
      const last = toks[toks.length - 1] || '';
      let candidates = [];
      if (toks.length <= 1) {
        const cmds = mode === 'ps' ? PS_COMMANDS.concat(Object.keys(PS_ALIASES)) : CMD_COMMANDS;
        candidates = cmds.filter(function (c) { return c.toLowerCase().startsWith(last.toLowerCase()); });
      } else {
        const dir = cwd;
        const entries = Win.fs.list(dir);
        candidates = entries.map(function (e) { return e.name; }).filter(function (n) { return n.toLowerCase().startsWith(last.toLowerCase()); });
      }
      if (!candidates.length) return current;
      if (candidates.length === 1) {
        toks[toks.length - 1] = candidates[0] + (toks.length > 1 ? '' : ' ');
        return toks.join(' ');
      }
      // common prefix
      let prefix = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        while (candidates[i].toLowerCase().indexOf(prefix.toLowerCase()) !== 0) prefix = prefix.slice(0, -1);
      }
      if (prefix.length > last.length) {
        toks[toks.length - 1] = prefix;
        return toks.join(' ');
      }
      printLine(candidates.join('  '), 'term-dim');
      return current;
    }

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const v = input.value;
        input.value = '';
        try { run(v); } catch (e) { printLine('Error: ' + (e.message || e), 'term-err'); }
        scroll();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (histIndex > 0) { histIndex--; input.value = history[histIndex] || ''; setTimeout(function () { input.setSelectionRange(input.value.length, input.value.length); }, 0); }
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (histIndex < history.length - 1) { histIndex++; input.value = history[histIndex] || ''; }
        else { histIndex = history.length; input.value = ''; }
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        input.value = complete(input.value);
        setTimeout(function () { input.setSelectionRange(input.value.length, input.value.length); }, 0);
      } else if (ev.key === 'c' && ev.ctrlKey) {
        ev.preventDefault();
        printLine((mode === 'ps' ? 'PS ' + cwd + '> ' : cwd + '>') + input.value + '^C', 'term-dim');
        input.value = '';
      } else if (ev.key === 'l' && ev.ctrlKey) {
        ev.preventDefault();
        clearOut();
      } else if (ev.key === 'u' && ev.ctrlKey) {
        ev.preventDefault();
        input.value = '';
      }
    });

    screen.addEventListener('pointerdown', function (ev) {
      if (ev.target !== input) setTimeout(function () { input.focus(); }, 0);
    });
    body.addEventListener('pointerdown', function () { setTimeout(function () { input.focus(); }, 0); });

    setMode(mode);
    setPrompt();
    if (args.run || args.file) {
      const rf = args.run || args.file;
      setTimeout(function () { run(rf, true); }, 120);
    }
    if (!headless) setTimeout(function () { input.focus(); }, 60);

    return {
      headless: headless,
      run: function (line, silent) { run(line, silent); },
      getCwd: function () { return cwd; },
      setCwd: function (p) { const t = normPath(p, cwd); if (t) { cwd = t; setPrompt(); } },
      onReopen: function (a) {
        if (a && a.mode && a.mode !== mode) setMode(a.mode === 'ps' || a.mode === 'powershell' ? 'ps' : 'cmd');
        if (a && a.cwd) { cwd = normPath(a.cwd, cwd); setPrompt(); }
      }
    };
  }
};
})();
