/* WINemulator — virtual file system with localStorage persistence */
(function () {
  'use strict';
  const FS_KEY = 'winemulator.fs.v1';
  const RECYCLE_KEY = 'winemulator.recycle.v1';
  const VERSION = 1;
  let tree = null;
  let recycle = [];
  let rev = 0;

  const INVALID = /[<>:"/\\|?*\x00-\x1f]/;
  const TEXT_EXT = ['txt', 'log', 'md', 'bat', 'cmd', 'ps1', 'py', 'ini', 'sys', 'cfg', 'csv', 'json', 'js', 'css', 'xml', 'yml', 'yaml', 'html', 'htm', 'reg', 'inf', 'vbs', 'wsf'];
  const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];

  function now() { return Date.now(); }

  function norm(path) {
    if (path === null || path === undefined || path === '') return 'C:\\';
    let p = String(path).replace(/\//g, '\\');
    let drive = 'C:';
    if (/^[A-Za-z]:/.test(p)) { drive = p.slice(0, 2).toUpperCase(); p = p.slice(2); }
    const out = [];
    p.split('\\').forEach(function (seg) {
      if (!seg || seg === '.') return;
      if (seg === '..') { out.pop(); return; }
      out.push(seg);
    });
    return drive + '\\' + out.join('\\');
  }

  function split(path) {
    const p = norm(path);
    const drive = p.slice(0, 2);
    const rest = p.slice(2).replace(/^\\/, '');
    return { drive: drive, segs: rest ? rest.split('\\') : [] };
  }

  function parentPath(path) {
    const p = split(path);
    if (!p.segs.length) return null;
    return p.drive + '\\' + p.segs.slice(0, -1).join('\\');
  }

  function baseName(path) {
    const p = split(path);
    return p.segs.length ? p.segs[p.segs.length - 1] : p.drive + '\\';
  }

  function extName(path) {
    const b = baseName(path);
    const i = b.lastIndexOf('.');
    return i > 0 ? b.slice(i + 1).toLowerCase() : '';
  }

  function join(dir, name) {
    const p = norm(dir);
    return p === 'C:\\' ? p + name : p + '\\' + name;
  }

  function findKey(children, name) {
    if (!children) return null;
    const lower = name.toLowerCase();
    const keys = Object.keys(children);
    for (let i = 0; i < keys.length; i++) if (keys[i].toLowerCase() === lower) return keys[i];
    return null;
  }

  function resolve(path) {
    if (!tree) return null;
    const p = split(path);
    const dk = findKey(tree, p.drive);
    if (!dk) return null;
    let node = tree[dk];
    for (let i = 0; i < p.segs.length; i++) {
      if (!node || node.type !== 'dir') return null;
      const k = findKey(node.children, p.segs[i]);
      if (!k) return null;
      node = node.children[k];
    }
    return node || null;
  }

  function parentOf(path) {
    const pp = parentPath(path);
    if (!pp) return null;
    const parent = resolve(pp);
    if (!parent || parent.type !== 'dir') return null;
    const name = baseName(path);
    return { parent: parent, parentPath: pp, name: name, key: findKey(parent.children, name) };
  }

  function kindFor(name) {
    const ext = name && name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
    if (IMAGE_EXT.indexOf(ext) > -1) return 'image';
    if (TEXT_EXT.indexOf(ext) > -1) return 'text';
    return 'binary';
  }

  function appFor(path) {
    const ext = extName(path);
    if (IMAGE_EXT.indexOf(ext) > -1) return 'paint';
    if (TEXT_EXT.indexOf(ext) > -1) return 'notepad';
    return null;
  }

  function iconFor(entry) {
    if (entry.type === 'dir') return 'folder';
    if (entry.kind === 'image') return 'image';
    if (entry.kind === 'text') return 'textfile';
    if (entry.ext === 'exe' || entry.ext === 'com') return 'exe';
    if (entry.ext === 'bat') return 'exe';
    return 'file';
  }

  function typeName(entry) {
    if (entry.type === 'dir') return 'File Folder';
    if (entry.kind === 'image') return (entry.ext || 'image').toUpperCase() + ' Image';
    if (entry.ext === 'txt') return 'Text Document';
    if (entry.ext === 'bat' || entry.ext === 'cmd') return 'Windows Command Script';
    if (entry.ext === 'ps1') return 'Windows PowerShell Script';
    if (entry.ext === 'py') return 'Python File';
    if (entry.ext === 'reg') return 'Registry File';
    if (entry.ext === 'vbs') return 'VBScript File';
    if (entry.ext === 'ini' || entry.ext === 'sys' || entry.ext === 'inf') return 'Configuration File';
    return 'File';
  }

  function sizeOf(node) {
    if (!node) return 0;
    if (node.type === 'dir') return 0;
    if (typeof node.size === 'number') return node.size;
    const content = node.content || '';
    if (node.kind === 'image' && content.indexOf('data:') === 0) {
      const comma = content.indexOf(',');
      return comma > 0 ? Math.round((content.length - comma - 1) * 0.75) : content.length;
    }
    return content.length;
  }

  function entryFor(dirPath, name, node, nodePath) {
    const path = nodePath || join(dirPath, name);
    const entry = {
      name: name, path: path, type: node.type, kind: node.kind || (node.type === 'dir' ? 'folder' : kindFor(name)),
      size: sizeOf(node), modified: node.modified || node.created || now(), created: node.created || now(),
      ext: node.type === 'dir' ? '' : extName(name), content: node.content
    };
    entry.icon = iconFor(entry);
    entry.typeName = typeName(entry);
    entry.app = node.type === 'file' ? (node.app || appFor(name)) : null;
    return entry;
  }

  function list(path) {
    const node = resolve(path);
    if (!node || node.type !== 'dir') return [];
    const dirPath = norm(path);
    const out = Object.keys(node.children).map(function (k) { return entryFor(dirPath, k, node.children[k]); });
    out.sort(function (a, b) {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    return out;
  }

  function persist() {
    try {
      tree.__v = VERSION;
      localStorage.setItem(FS_KEY, JSON.stringify(tree));
      localStorage.setItem(RECYCLE_KEY, JSON.stringify(recycle));
    } catch (e) {
      document.dispatchEvent(new CustomEvent('fs:error', { detail: { message: 'Could not save files: storage is full or blocked.' } }));
    }
  }

  function notify() {
    rev++;
    persist();
    document.dispatchEvent(new CustomEvent('fs:change', { detail: { rev: rev } }));
  }

  function touch(node) { node.modified = now(); }

  function write(path, content, opts) {
    opts = opts || {};
    const p = norm(path);
    const parts = split(p);
    if (!parts.segs.length) throw new Error('Cannot write to a drive root.');
    let parent = resolve(parentPath(p));
    if (!parent || parent.type !== 'dir') throw new Error('The folder does not exist.');
    const name = parts.segs[parts.segs.length - 1];
    if (INVALID.test(name)) throw new Error('The file name contains invalid characters.');
    const key = findKey(parent.children, name) || name;
    let node = parent.children[key];
    if (node && node.type === 'dir') throw new Error('A folder with that name already exists.');
    if (!node) {
      node = { type: 'file', created: now(), modified: now(), kind: opts.kind || kindFor(name) };
      parent.children[key] = node;
    }
    node.type = 'file';
    node.content = String(content == null ? '' : content);
    if (opts.kind) node.kind = opts.kind;
    if (opts.app !== undefined) node.app = opts.app;
    node.size = opts.size;
    touch(node);
    touch(parent);
    if (!opts.silent) notify();
    return p;
  }

  function mkdir(path, opts) {
    const p = norm(path);
    const parts = split(p);
    if (!parts.segs.length) throw new Error('The drive already exists.');
    const pp = parentPath(p);
    const parent = resolve(pp);
    if (!parent || parent.type !== 'dir') {
      if (opts && opts.parents) { mkdir(pp, { parents: true, silent: true }); }
      else throw new Error('The parent folder does not exist.');
    }
    const par = resolve(pp);
    const name = parts.segs[parts.segs.length - 1];
    if (INVALID.test(name)) throw new Error('The folder name contains invalid characters.');
    const existing = findKey(par.children, name);
    if (existing) {
      if (par.children[existing].type === 'dir') return join(pp, existing);
      throw new Error('A file with that name already exists.');
    }
    par.children[name] = { type: 'dir', created: now(), modified: now(), children: {} };
    touch(par);
    if (!(opts && opts.silent)) notify();
    return join(pp, name);
  }

  function uniqueName(dirPath, name) {
    const parent = resolve(dirPath);
    if (!parent) return name;
    if (!findKey(parent.children, name)) return name;
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    let i = 2;
    while (findKey(parent.children, stem + ' (' + i + ')' + ext)) i++;
    return stem + ' (' + i + ')' + ext;
  }

  function copyNode(node) {
    const clone = JSON.parse(JSON.stringify(node));
    return clone;
  }

  function cloneTo(srcPath, destDir) {
    const src = resolve(srcPath);
    if (!src) throw new Error('The item could not be found.');
    const destParent = resolve(destDir);
    if (!destParent || destParent.type !== 'dir') throw new Error('The destination folder does not exist.');
    if (src.type === 'dir' && (norm(destDir) + '\\').indexOf(norm(srcPath) + '\\') === 0) {
      throw new Error('Cannot copy a folder into itself.');
    }
    const name = uniqueName(destDir, baseName(srcPath));
    destParent.children[name] = copyNode(src);
    touch(destParent);
    notify();
    return join(destDir, name);
  }

  function remove(path, permanent) {
    const p = norm(path);
    if (p === 'C:\\') throw new Error('Cannot delete a drive.');
    const info = parentOf(p);
    if (!info || !info.key) throw new Error('The item could not be found.');
    const node = info.parent.children[info.key];
    if (!permanent) {
      recycle.unshift({
        id: 'r_' + now().toString(36) + '_' + Math.floor(Math.random() * 9999),
        name: info.key, original: p, node: copyNode(node), deletedAt: now(), size: sizeOf(node),
        type: node.type, kind: node.kind || (node.type === 'dir' ? 'folder' : kindFor(info.key))
      });
    }
    delete info.parent.children[info.key];
    touch(info.parent);
    notify();
    return true;
  }

  function rename(path, newName) {
    const p = norm(path);
    const info = parentOf(p);
    if (!info || !info.key) throw new Error('The item could not be found.');
    newName = String(newName || '').trim();
    if (!newName) throw new Error('You must type a file name.');
    if (INVALID.test(newName)) throw new Error('A file name cannot contain any of these characters: \\ / : * ? " < > |');
    if (newName === info.key) return p;
    const clash = findKey(info.parent.children, newName);
    if (clash) throw new Error('An item with that name already exists.');
    info.parent.children[newName] = info.parent.children[info.key];
    delete info.parent.children[info.key];
    touch(info.parent);
    touch(info.parent.children[newName]);
    notify();
    return join(info.parentPath, newName);
  }

  function move(path, destDir) {
    const p = norm(path);
    const info = parentOf(p);
    if (!info || !info.key) throw new Error('The item could not be found.');
    const dest = resolve(destDir);
    if (!dest || dest.type !== 'dir') throw new Error('The destination folder does not exist.');
    if (info.parent === dest) return p;
    const node = info.parent.children[info.key];
    if (node.type === 'dir' && (norm(destDir) + '\\').indexOf(p + '\\') === 0) throw new Error('Cannot move a folder into itself.');
    const name = uniqueName(destDir, info.key);
    dest.children[name] = node;
    delete info.parent.children[info.key];
    touch(dest);
    touch(info.parent);
    notify();
    return join(destDir, name);
  }

  function restore(id) {
    const idx = recycle.findIndex(function (r) { return r.id === id; });
    if (idx < 0) return null;
    const item = recycle[idx];
    let dir = parentPath(item.original);
    let parent = resolve(dir);
    if (!parent || parent.type !== 'dir') {
      dir = 'C:\\My Documents';
      parent = resolve(dir);
      if (!parent) { dir = 'C:\\'; parent = resolve(dir); }
    }
    const name = uniqueName(dir, item.name);
    parent.children[name] = item.node;
    touch(parent);
    recycle.splice(idx, 1);
    notify();
    return join(dir, name);
  }

  function emptyRecycle() {
    recycle = [];
    notify();
  }

  function purge(id) {
    const before = recycle.length;
    recycle = recycle.filter(function (r) { return r.id !== id; });
    if (recycle.length !== before) notify();
  }

  function stats() {
    let files = 0, dirs = 0, bytes = 0;
    function walk(node) {
      if (node.type === 'dir') {
        dirs++;
        Object.keys(node.children).forEach(function (k) { walk(node.children[k]); });
      } else {
        files++; bytes += sizeOf(node);
      }
    }
    if (tree) Object.keys(tree).forEach(function (d) { walk(tree[d]); });
    let used = 0;
    try { used = (localStorage.getItem(FS_KEY) || '').length + (localStorage.getItem(RECYCLE_KEY) || '').length; } catch (e) {}
    return { files: files, dirs: Math.max(0, dirs - 1), bytes: bytes, storageBytes: used, recycle: recycle.length };
  }

  function search(term) {
    const q = String(term || '').toLowerCase();
    const out = [];
    if (!q) return out;
    function walk(node, p) {
      if (node.type === 'dir') {
        Object.keys(node.children).forEach(function (k) {
          const child = node.children[k];
          const cp = join(p, k);
          if (k.toLowerCase().indexOf(q) > -1) out.push(entryFor(p, k, child, cp));
          if (child.type === 'dir' && out.length < 200) walk(child, cp);
        });
      }
    }
    if (tree) Object.keys(tree).forEach(function (d) { walk(tree[d], d + '\\'); });
    return out.slice(0, 100);
  }

  function makeDemoImage() {
    try {
      const c = document.createElement('canvas');
      c.width = 480; c.height = 320;
      const x = c.getContext('2d');
      const sky = x.createLinearGradient(0, 0, 0, 320);
      sky.addColorStop(0, '#0a1a4a'); sky.addColorStop(0.55, '#3a6ea5'); sky.addColorStop(0.56, '#0a2a1a'); sky.addColorStop(1, '#06220f');
      x.fillStyle = sky; x.fillRect(0, 0, 480, 320);
      x.fillStyle = '#ffd75e';
      x.beginPath(); x.arc(380, 82, 34, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 70; i++) x.fillRect(Math.random() * 480, Math.random() * 120, 2, 2);
      x.fillStyle = '#0b3b24';
      x.beginPath(); x.moveTo(0, 210); x.lineTo(120, 120); x.lineTo(230, 210); x.lineTo(330, 140); x.lineTo(480, 230); x.lineTo(480, 320); x.lineTo(0, 320); x.fill();
      x.fillStyle = '#0f5633';
      x.beginPath(); x.moveTo(0, 250); x.lineTo(150, 180); x.lineTo(300, 260); x.lineTo(420, 205); x.lineTo(480, 250); x.lineTo(480, 320); x.lineTo(0, 320); x.fill();
      x.strokeStyle = 'rgba(120,220,160,.28)'; x.lineWidth = 1;
      for (let i = 0; i < 480; i += 24) { x.beginPath(); x.moveTo(i, 320); x.lineTo(240, 200); x.stroke(); }
      for (let i = 180; i < 320; i += 18) { x.beginPath(); x.moveTo(0, i); x.lineTo(480, i); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(20, 238, 286, 58);
      x.strokeStyle = '#7fd06b'; x.lineWidth = 2; x.strokeRect(20, 238, 286, 58);
      x.fillStyle = '#7fd06b'; x.font = 'bold 22px Consolas, monospace';
      x.fillText('WINemulator 98', 36, 264);
      x.fillStyle = '#b9f0c6'; x.font = '12px Consolas, monospace';
      x.fillText('480 x 320  ·  Paint sample', 36, 284);
      return c.toDataURL('image/png');
    } catch (e) {
      return 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="#0a2a4a"/><text x="24" y="160" fill="#7fd06b" font-family="monospace" font-size="24">WINemulator 98</text></svg>');
    }
  }

  function seed() {
    const t = now() - 86400000 * 3;
    function file(content, kind, app) {
      return { type: 'file', created: t, modified: t, content: content, kind: kind || 'text', app: app };
    }
    function dir(children) { return { type: 'dir', created: t, modified: t, children: children || {} }; }

    const welcome = [
      '========================================',
      '        WELCOME TO WINEMULATOR 98',
      '========================================',
      '',
      'You are running a complete Windows-style desktop',
      'inside your browser. No installs. No VM. No waiting.',
      '',
      'THINGS TO TRY',
      '  * Double-click My Computer and browse the C: drive.',
      '  * Open Paint and draw something. Save it to My Documents.',
      '  * Type HELP in the MS-DOS Prompt.',
      '  * Play Minesweeper. Right-click plants a flag.',
      '  * Change your wallpaper in Control Panel.',
      '  * Press Alt+Tab, or use the taskbar, to switch windows.',
      '',
      'KEYBOARD SHORTCUTS',
      '  Ctrl+Esc      Start menu',
      '  Win / Meta    Start menu',
      '  Win+E         My Computer',
      '  Win+R         Run...',
      '  Win+D         Show desktop',
      '  Alt+F4        Close active window',
      '  Ctrl+Shift+Esc Task Manager',
      '  F5            Refresh desktop',
      '',
      'Your files, settings and paintings are saved in this',
      'browser. Use Control Panel > System to back them up.',
      '',
      'Thanks for booting up. Have fun.',
      '',
      '  -- The WINemulator team',
      ''
    ].join('\r\n');

    const todo = [
      'WINEMULATOR TO DO',
      '=================',
      '',
      '[ ] Explore every folder in My Computer',
      '[ ] Draw a masterpiece in Paint',
      '[ ] Beat Minesweeper on Expert',
      '[ ] Run SYSTEMINFO in the MS-DOS Prompt',
      '[ ] Change the wallpaper and theme',
      '[ ] Save three files, then empty the Recycle Bin',
      '[ ] Find the secret in the terminal',
      '',
      'Tip: you can rename files with a slow second click,',
      'or right-click almost anything.',
      ''
    ].join('\r\n');

    const hello = [
      'Dear User,',
      '',
      'This letter was generated on first boot so your file',
      'system would not feel so empty.',
      '',
      'Everything here is stored safely in your browser.',
      'Nothing is uploaded anywhere. To prove it, turn off',
      'your Wi-Fi and reload the page -- WINemulator still',
      'boots, because it is all local.',
      '',
      'Yours,',
      '  The Virtual File System',
      ''
    ].join('\r\n');

    const readme = [
      'WINEMULATOR 98 — READ ME',
      '========================',
      '',
      'This desktop is a simulation: a fast, self-contained',
      'Windows-style environment written from scratch in',
      'plain HTML, CSS and JavaScript.',
      '',
      'Open Control Panel > About for system information',
      'and keyboard shortcuts. Open Help from the Start',
      'menu for a guided tour.',
      '',
      'Have a nice day.',
      ''
    ].join('\r\n');

    tree = {
      'C:': dir({
        'AUTOEXEC.BAT': file('@ECHO OFF\r\nPROMPT $P$G\r\nSET BLASTER=A220 I7 D1\r\nSET WINEMULATOR=1\r\nWIN\r\n', 'text'),
        'CONFIG.SYS': file('DEVICE=C:\\WINDOWS\\HIMEM.SYS\r\nDOS=HIGH,UMB\r\nFILES=30\r\nBUFFERS=20\r\nSTACKS=9,256\r\nSHELL=C:\\WINDOWS\\COMMAND.COM /P\r\n', 'text'),
        'My Documents': dir({
          'Welcome.txt': file(welcome, 'text', 'notepad'),
          'To Do.txt': file(todo, 'text', 'notepad'),
          'Art': dir({ 'demo.png': file(makeDemoImage(), 'image', 'paint') }),
          'Letters': dir({ 'hello.txt': file(hello, 'text', 'notepad') })
        }),
        'Program Files': dir({
          'Accessories': dir({ 'readme.txt': file(readme, 'text', 'notepad') }),
          'Internet Explorer': dir({ 'readme.txt': file('Internet Explorer 4.0\r\n\r\nThis build ships inside WINemulator.\r\nTry winemulator://home in the address bar.\r\n', 'text', 'notepad') })
        }),
        'Windows': dir({
          'Desktop': dir({ 'Read Me.txt': file(readme, 'text', 'notepad') }),
          'System': dir({}),
          'Temp': dir({}),
          'WIN.INI': file('[windows]\r\nload=\r\nrun=\r\nBeep=yes\r\n\r\n[Desktop]\r\nWallpaper=(None)\r\nTileWallpaper=0\r\n\r\n[fonts]\r\n\r\n[WINemulator]\r\nTheme=classic\r\n', 'text'),
          'SYSTEM.INI': file('[boot]\r\nshell=Explorer.exe\r\n\r\n[386Enh]\r\nEMMExclude=A000-FFFF\r\n\r\n[drivers]\r\nwave=mmdrv.dll\r\ntimer=timer.drv\r\n', 'text'),
          'NOTEPAD.EXE': file('', 'binary', null)
        })
      })
    };
    tree.__v = VERSION;
  }

  function ensureSevenFolders() {
    if (!Win.isSeven) return;
    const dirs = [
      'C:\\Users', 'C:\\Users\\User', 'C:\\Users\\User\\Desktop', 'C:\\Users\\User\\Documents',
      'C:\\Users\\User\\Downloads', 'C:\\Users\\User\\Pictures', 'C:\\Users\\User\\Music',
      'C:\\Users\\User\\Videos', 'C:\\Users\\User\\Favorites', 'C:\\Users\\User\\AppData',
      'C:\\Users\\User\\AppData\\Local', 'C:\\Users\\User\\AppData\\Local\\Temp',
      'C:\\Users\\Public', 'C:\\Users\\Public\\Desktop', 'C:\\Users\\Public\\Documents',
      'C:\\Windows\\Temp', 'C:\\Windows\\Fonts',
      'C:\\Windows\\System32', 'C:\\Windows\\System32\\drivers', 'C:\\Windows\\System32\\drivers\\etc',
      'C:\\ProgramData'
    ];
    dirs.forEach(function (p) {
      try { Win.fs.mkdir(p, { parents: true, silent: true }); } catch (e) {}
    });
    const sys32Files = ['cmd.exe', 'powershell.exe', 'notepad.exe', 'explorer.exe', 'calc.exe', 'taskmgr.exe', 'regedit.exe', 'msconfig.exe', 'mmc.exe', 'mspaint.exe'];
    sys32Files.forEach(function (name) {
      const p = 'C:\\Windows\\System32\\' + name;
      if (!Win.fs.exists(p)) {
        try { Win.fs.write(p, '', { kind: 'binary', app: null, silent: true }); } catch (e) {}
      }
    });
    const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    if (!Win.fs.exists(hostsPath)) {
      try { Win.fs.write(hostsPath, '127.0.0.1\tlocalhost\r\n::1\tlocalhost\r\n', { kind: 'text', app: null, silent: true }); } catch (e) {}
    }
    const welcomePath = 'C:\\Users\\User\\Documents\\Welcome.txt';
    if (!Win.fs.exists(welcomePath)) {
      try {
        Win.fs.write(welcomePath, 'Welcome to Windows 7!\r\n\r\nThis is your personal folder. Save files here and they will be available from any program.\r\n', { kind: 'text', app: 'notepad', silent: true });
      } catch (e) {}
    }
  }

  function init() {
    let ok = false;
    try {
      const raw = localStorage.getItem(FS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed['C:'] && parsed['C:'].type === 'dir') { tree = parsed; ok = true; }
      }
    } catch (e) { ok = false; }
    if (!ok) seed();
    try {
      const rr = localStorage.getItem(RECYCLE_KEY);
      recycle = rr ? JSON.parse(rr) : [];
      if (!Array.isArray(recycle)) recycle = [];
    } catch (e) { recycle = []; }
    ensureSevenFolders();
    persist();
    document.dispatchEvent(new CustomEvent('fs:change', { detail: { rev: rev } }));
  }

  function exportData() {
    return JSON.stringify({ app: 'WINemulator', version: VERSION, exportedAt: new Date().toISOString(), tree: tree, recycle: recycle, settings: Win.store.all() }, null, 2);
  }

  function importData(text) {
    const data = JSON.parse(text);
    if (!data || !data.tree || !data.tree['C:']) throw new Error('That is not a WINemulator backup file.');
    tree = data.tree;
    recycle = Array.isArray(data.recycle) ? data.recycle : [];
    if (data.settings) Win.store.set(data.settings);
    notify();
  }

  function resetAll() {
    try {
      localStorage.removeItem(FS_KEY);
      localStorage.removeItem(RECYCLE_KEY);
      localStorage.removeItem('winemulator.settings');
    } catch (e) {}
    seed();
    recycle = [];
    rev++;
    persist();
    document.dispatchEvent(new CustomEvent('fs:change', { detail: { rev: rev } }));
  }

  Win.fs = {
    init: init,
    normalise: norm, norm: norm, split: split, join: join,
    parentPath: parentPath, baseName: baseName, extName: extName,
    resolve: resolve, exists: function (p) { return !!resolve(p); },
    list: list, sizeOf: sizeOf, kindFor: kindFor, appFor: appFor, iconFor: iconFor, typeName: typeName,
    write: write, mkdir: mkdir, remove: remove, rename: rename, move: move, copy: cloneTo,
    restore: restore, emptyRecycle: emptyRecycle, purge: purge,
    recycleList: function () { return recycle.slice(); },
    recycleCount: function () { return recycle.length; },
    uniqueName: uniqueName, stats: stats, search: search,
    read: function (p) { const n = resolve(p); return n && n.type === 'file' ? n.content : null; },
    exportData: exportData, importData: importData, resetAll: resetAll,
    get tree() { return tree; },
    get rev() { return rev; }
  };
})();
