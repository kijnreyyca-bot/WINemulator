/* WINemulator — Mozilla Firefox */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  const HOME = 'winemulator://home';
  const GUEST_KEY = 'winemulator.guestbook.v1';

  const PAGE_INDEX = [
    { id: 'home', title: 'WINemulator Home', icon: 'firefox', desc: 'The starting page for the local web.' },
    { id: 'files', title: 'My Documents', icon: 'documents', desc: 'Browse and open files from the virtual C: drive.' },
    { id: 'help', title: 'Help & Shortcuts', icon: 'help', desc: 'Keyboard shortcuts and a quick tour.' },
    { id: 'settings', title: 'Control Panel', icon: 'settings', desc: 'Change themes, wallpaper and sounds.' },
    { id: 'readme', title: 'Read Me', icon: 'textfile', desc: 'The WINemulator welcome document.' },
    { id: 'guestbook', title: 'Guestbook', icon: 'mail', desc: 'Sign the local guestbook. No server required.' },
    { id: 'about', title: 'About WINemulator', icon: 'flag', desc: 'Version, credits and technical notes.' },
    { id: 'credits', title: 'Credits', icon: 'star', desc: 'The people and tools behind the desktop.' }
  ];

  function esc(s) { return U.escapeHtml(s); }
  function decode(s) {
    try { return decodeURIComponent(String(s || '').replace(/\+/g, ' ')); }
    catch (e) { return String(s || ''); }
  }
  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch (e) { return url; }
  }
  function normUrl(raw) {
    let s = String(raw == null ? '' : raw).trim();
    if (!s) return HOME;
    if (/^winemulator:\/\//i.test(s)) return 'winemulator://' + s.slice('winemulator://'.length);
    if (/^about:home$/i.test(s)) return HOME;
    if (/^https?:\/\//i.test(s)) return s;
    if (/^www\./i.test(s)) return 'https://' + s;
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(s) && !/\s/.test(s)) return 'https://' + s;
    return 'winemulator://search?q=' + encodeURIComponent(s);
  }

  function fileRows(entries) {
    if (!entries.length) return '<div class="ie-note">This folder is empty.</div>';
    return '<div class="ie-filelist">' + entries.map(function (e) {
      return '<button class="ie-file" type="button" data-path="' + esc(e.path) + '" data-kind="' + e.type + '">' +
        Win.icon(e.icon, 16) + '<span class="ie-file-name">' + esc(e.name) + '</span>' +
        '<span class="ie-file-type">' + esc(e.typeName) + '</span></button>';
    }).join('') + '</div>';
  }

  function readWelcome() {
    const candidates = ['C:\\My Documents\\Welcome.txt', 'C:\\Program Files\\Accessories\\readme.txt', 'C:\\Windows\\Desktop\\Read Me.txt'];
    for (let i = 0; i < candidates.length; i++) {
      if (Win.fs.exists(candidates[i])) {
        const text = Win.fs.read(candidates[i]);
        if (text) return text;
      }
    }
    return 'Welcome to ' + Win.osNameFull + '.\r\n\r\nThis desktop runs entirely in your browser.';
  }

  function guestEntries() {
    try {
      const v = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  Win.apps.firefox = {
    name: 'Mozilla Firefox', title: 'WINemulator - Mozilla Firefox', icon: 'firefox',
    width: 840, height: 620, minWidth: 430, minHeight: 330,
    mount: function (body, ctx) {
      body.classList.add('app-browser', 'app-firefox');
      const args = ctx.args || {};
      let history = [], hidx = -1;
      let currentUrl = '';
      let loadingTimer = 0, doneTimer = 0;
      let lastHtml = '';

      body.innerHTML =
        '<div class="menubar ie-menu"><div class="mb-item" data-menu="file">File</div>' +
        '<div class="mb-item" data-menu="edit">Edit</div><div class="mb-item" data-menu="view">View</div>' +
        '<div class="mb-item" data-menu="go">Go</div><div class="mb-item" data-menu="fav">Favorites</div>' +
        '<div class="mb-item" data-menu="help">Help</div></div>' +
        '<div class="ie-toolbar">' +
        '  <div class="ie-nav">' +
        '    <button class="tool-btn" data-act="back" title="Back (Alt+Left)">' + Win.icon('back', 18) + '<span class="tool-label">Back</span></button>' +
        '    <button class="tool-btn" data-act="forward" title="Forward (Alt+Right)">' + Win.icon('forward', 18) + '<span class="tool-label">Forward</span></button>' +
        '    <button class="tool-btn" data-act="stop" title="Stop">' + Win.icon('close', 18) + '<span class="tool-label">Stop</span></button>' +
        '    <button class="tool-btn" data-act="refresh" title="Refresh (F5)">' + Win.icon('refresh', 18) + '<span class="tool-label">Refresh</span></button>' +
        '    <button class="tool-btn" data-act="home" title="Home">' + Win.icon('firefox', 18) + '<span class="tool-label">Home</span></button>' +
        '    <div class="tool-sep"></div>' +
        '    <button class="tool-btn" data-act="search" title="Search the local web">' + Win.icon('search', 18) + '<span class="tool-label">Search</span></button>' +
        '    <button class="tool-btn" data-act="fav" title="Favorites">' + Win.icon('star', 18) + '<span class="tool-label">Favorites</span></button>' +
        '    <button class="tool-btn" data-act="history" title="History">' + Win.icon('clock', 18) + '<span class="tool-label">History</span></button>' +
        '    <div class="ie-throb" title="Mozilla Firefox">' + Win.icon('firefox', 22) + '</div>' +
        '  </div>' +
        '  <div class="ie-addrrow"><span class="ie-addr-label">Address</span>' +
        '    <span class="ie-addr-box field">' + Win.icon('globe', 15) + '<input class="ie-addr" spellcheck="false" autocomplete="off" aria-label="Address"></span>' +
        '    <button class="btn ie-go" type="button">Go</button></div>' +
        '</div>' +
        '<div class="ie-doc" tabindex="0"></div>' +
        '<div class="statusbar ie-status">' +
        '<span class="status-cell ie-status-text">Ready</span>' +
        '<span class="status-cell ie-meter"><i></i></span>' +
        '<span class="status-cell fixed ie-zone">My Computer</span></div>';

      const docEl = body.querySelector('.ie-doc');
      const addrEl = body.querySelector('.ie-addr');
      const goBtn = body.querySelector('.ie-go');
      const statusEl = body.querySelector('.ie-status-text');
      const meterEl = body.querySelector('.ie-meter i');
      const zoneEl = body.querySelector('.ie-zone');
      const throbEl = body.querySelector('.ie-throb');
      const backBtn = body.querySelector('[data-act=back]');
      const fwdBtn = body.querySelector('[data-act=forward]');

      function setProgress(p) { meterEl.style.width = Math.max(0, Math.min(100, p)) + '%'; }
      function setStatus(t) { statusEl.textContent = t; }
      function setBusy(on) {
        throbEl.classList.toggle('busy', !!on);
        clearTimeout(doneTimer);
        if (on) {
          setProgress(12);
          clearInterval(loadingTimer);
          loadingTimer = setInterval(function () {
            const w = parseFloat(meterEl.style.width) || 12;
            if (w < 88) setProgress(w + Math.random() * 14);
          }, 220);
        } else {
          clearInterval(loadingTimer);
          loadingTimer = 0;
          setProgress(100);
          doneTimer = setTimeout(function () { setProgress(0); }, 450);
        }
      }
      function updateNav() {
        backBtn.disabled = hidx <= 0;
        fwdBtn.disabled = hidx >= history.length - 1;
      }

      /* -------------------------------------------------------------- pages */
      function pageHome() {
        return {
          title: 'WINemulator Home',
          html: '<div class="ie-hero"><div class="ie-badge">' + Win.icon('globe', 14) + ' WINemulator Online</div>' +
            '<h1>Welcome to the World Wide Web</h1>' +
            '<p>Your desktop is online — well, sort of. This portal lives on your own computer, so it loads instantly and works even with the network cable unplugged.</p>' +
            '<div class="ie-search"><input class="field ie-home-q" type="text" placeholder="Search the local web..." aria-label="Search">' +
            '<button class="btn ie-home-go" type="button">' + Win.icon('search', 14) + ' Search</button></div></div>' +
            '<h2>Explore this computer</h2>' +
            '<div class="ie-tiles">' +
            tile('files', 'documents', 'My Documents', 'Open files and folders') +
            tile('help', 'help', 'Help & Shortcuts', 'Learn your way around') +
            tile('settings', 'settings', 'Control Panel', 'Change how Windows looks') +
            tile('guestbook', 'mail', 'Guestbook', 'Leave a message for nobody') +
            '</div>' +
            '<h2>Today on WINemulator</h2>' +
            '<div class="ie-note"><b>Tip of the day:</b> press <code>Alt+Tab</code> to switch between programs. ' +
            'Everything you save in Notepad, Paint or the file system is kept in this browser.</div>' +
            '<h3>Quick launches</h3>' +
            '<div class="ie-tiles">' +
            '<button class="ie-tile" type="button" data-open-app="notepad">' + Win.icon('notepad', 28) + '<span><b>Notepad</b><small>Write something</small></span></button>' +
            '<button class="ie-tile" type="button" data-open-app="paint">' + Win.icon('paint', 28) + '<span><b>Paint</b><small>Draw a masterpiece</small></span></button>' +
            '<button class="ie-tile" type="button" data-open-app="minesweeper">' + Win.icon('mine', 28) + '<span><b>Minesweeper</b><small>Clear the minefield</small></span></button>' +
            '<button class="ie-tile" type="button" data-open-app="terminal">' + Win.icon('terminal', 28) + '<span><b>' + ((Win.is98 || Win.isDOS) ? 'MS-DOS Prompt' : 'Command Prompt') + '</b><small>Type DIR to browse the drive</small></span></button>' +
            '</div>' +
            '<p class="ie-small" style="margin-top:18px">WINemulator ' + Win.osShort + ' · Best viewed at 800×600 · <span data-go="' + HOME + '">Home</span> · ' +
            '<span data-go="winemulator://about">About</span></p>'
        };
      }

      function tile(page, icon, name, desc) {
        return '<button class="ie-tile" type="button" data-go="winemulator://' + page + '">' +
          Win.icon(icon, 28) + '<span><b>' + name + '</b><small>' + desc + '</small></span></button>';
      }

      function pageFiles() {
        const dir = 'C:\\My Documents';
        return {
          title: 'My Documents',
          html: '<h1>My Documents</h1><p class="ie-lead">A direct view of the virtual folder. Double-click files in Explorer, or click one here to open it.</p>' +
            fileRows(Win.fs.list(dir)) +
            '<div class="ie-actions" style="display:flex;gap:6px;margin-top:14px;flex-wrap:wrap">' +
            '<button class="btn" type="button" data-open-explorer="' + esc(dir) + '">' + Win.icon('folder', 14) + ' Open in Explorer</button>' +
            '<button class="btn" type="button" data-go="winemulator://home">Home</button></div>' +
            '<div class="ie-note">Files are stored in your browser’s local storage. Nothing is uploaded.</div>'
        };
      }

      function pageHelp() {
        return {
          title: 'Help & Shortcuts',
          html: '<h1>Help & Shortcuts</h1><p class="ie-lead">A few things worth knowing before you get lost in ' + Win.osName + '.</p>' +
            '<h2>Keyboard</h2>' +
            '<table class="ie-kbdtable"><tr><td>Ctrl+Esc</td><td>Open the Start menu</td></tr>' +
            '<tr><td>Win+E</td><td>Open My Computer</td></tr>' +
            '<tr><td>Win+R</td><td>Open the Run dialog</td></tr>' +
            '<tr><td>Win+D</td><td>Show the desktop</td></tr>' +
            '<tr><td>Alt+Tab</td><td>Switch between windows</td></tr>' +
            '<tr><td>Alt+F4</td><td>Close the active window</td></tr>' +
            '<tr><td>Ctrl+Shift+Esc</td><td>Open Task Manager</td></tr>' +
            '<tr><td>F5</td><td>Refresh the desktop or Explorer</td></tr></table>' +
            '<h2>Programs</h2>' +
            '<div class="ie-tiles">' +
            '<button class="ie-tile" type="button" data-open-app="notepad">' + Win.icon('notepad', 28) + '<span><b>Notepad</b><small>Plain text editing</small></span></button>' +
            '<button class="ie-tile" type="button" data-open-app="paint">' + Win.icon('paint', 28) + '<span><b>Paint</b><small>Bitmaps and brushes</small></span></button>' +
            '<button class="ie-tile" type="button" data-open-app="explorer">' + Win.icon('folder', 28) + '<span><b>Explorer</b><small>Browse the C: drive</small></span></button>' +
            '<button class="ie-tile" type="button" data-open-app="taskmgr">' + Win.icon('taskmgr', 28) + '<span><b>Task Manager</b><small>See what is running</small></span></button>' +
            '</div>' +
            '<h2>The local web</h2>' +
            '<p>Addresses beginning with <code>winemulator://</code> are served from inside the browser. Try:</p>' +
            '<ul><li><span data-go="winemulator://home">winemulator://home</span></li>' +
            '<li><span data-go="winemulator://files">winemulator://files</span></li>' +
            '<li><span data-go="winemulator://guestbook">winemulator://guestbook</span></li>' +
            '<li><span data-go="winemulator://about">winemulator://about</span></li></ul>' +
            '<p>Typing anything else attempts a real web page. Some sites refuse to appear in a frame — use the <b>Open in new tab</b> button in that case.</p>'
        };
      }

      function pageSettings() {
        const st = Win.store.all();
        return {
          title: 'Control Panel',
          html: '<h1>Control Panel</h1><p class="ie-lead">Change the look of your desktop without leaving the browser.</p>' +
            '<div class="ie-note">Current theme: <b>' + esc(st.theme) + '</b> · Wallpaper: <b>' + esc(st.wallpaper) + '</b> · Sounds: <b>' + (st.sound ? 'On' : 'Off') + '</b></div>' +
            '<div class="ie-tiles">' +
            '<button class="ie-tile" type="button" data-settings-tab="appearance">' + Win.icon('monitor', 28) + '<span><b>Appearance</b><small>Themes and effects</small></span></button>' +
            '<button class="ie-tile" type="button" data-settings-tab="background">' + Win.icon('image', 28) + '<span><b>Background</b><small>Wallpaper and colors</small></span></button>' +
            '<button class="ie-tile" type="button" data-settings-tab="sounds">' + Win.icon('sound', 28) + '<span><b>Sounds</b><small>Volume and tests</small></span></button>' +
            '<button class="ie-tile" type="button" data-settings-tab="system">' + Win.icon('computer', 28) + '<span><b>System</b><small>Info and backups</small></span></button>' +
            '</div>'
        };
      }

      function pageReadme() {
        return {
          title: 'Read Me',
          html: '<h1>Read Me</h1><p class="ie-lead">From the virtual file system, without a text editor.</p>' +
            '<pre class="ie-pre">' + esc(readWelcome()) + '</pre>' +
            '<div class="ie-actions" style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">' +
            '<button class="btn" type="button" data-open-app="notepad">' + Win.icon('notepad', 14) + ' Open Notepad</button>' +
            '<button class="btn" type="button" data-go="' + HOME + '">Home</button></div>'
        };
      }

      function pageGuestbook() {
        const entries = guestEntries();
        return {
          title: 'Guestbook',
          html: '<h1>Guestbook</h1><p class="ie-lead">The classic web experience. Leave a note; it is stored only in this browser.</p>' +
            '<div class="ie-form">' +
            '<label>Name <input class="field gb-name" type="text" maxlength="40" placeholder="Anonymous visitor"></label>' +
            '<label>Message <input class="field gb-msg" type="text" maxlength="160" placeholder="This desktop is amazing!"></label>' +
            '<button class="btn gb-sign" type="button">' + Win.icon('mail', 14) + ' Sign guestbook</button></div>' +
            '<h2>Recent entries</h2><div class="ie-guest-list">' +
            (entries.length ? entries.map(function (e) {
              return '<div class="ie-guest"><b>' + esc(e.name || 'Anonymous') + '</b><span class="ie-small">' + esc(U.fmtDate(e.at)) + '</span><p>' + esc(e.msg) + '</p></div>';
            }).join('') : '<div class="ie-empty">No entries yet. Be the first!</div>') +
            '</div>'
        };
      }

      function pageAbout() {
        return {
          title: 'About WINemulator',
          html: '<h1>About WINemulator ' + Win.osShort + '</h1><p class="ie-lead">A Windows-style desktop written from scratch for the browser.</p>' +
            '<p>WINemulator is a simulation, not an emulator of real x86 software. It re-creates the <i>feel</i> of a ' + Win.osName + ' desktop using nothing but HTML, CSS and JavaScript: hand-drawn SVG icons, synthesised sounds and a virtual file system backed by local storage.</p>' +
            '<h2>Technical notes</h2><ul>' +
            '<li>No frameworks, no build step and no external assets.</li>' +
            '<li>Works offline after the first load; a service worker caches the shell.</li>' +
            '<li>Your files, settings and guestbook entries never leave this browser.</li>' +
            '<li>Performance graphs and process lists are simulated for atmosphere.</li></ul>' +
            '<h2>Version</h2><table class="ie-kbdtable"><tr><td>Version</td><td>' + esc(Win.version || '1.0.0') + '</td></tr>' +
            '<tr><td>Build</td><td>' + esc(Win.build || 'web-2026') + '</td></tr>' +
            '<tr><td>License</td><td>MIT</td></tr></table>' +
            '<div class="ie-actions" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">' +
            '<button class="btn" type="button" data-go="winemulator://credits">' + Win.icon('star', 14) + ' Credits</button>' +
            '<button class="btn" type="button" data-go="' + HOME + '">Home</button></div>'
        };
      }

      function pageCredits() {
        return {
          title: 'Credits',
          html: '<h1>Credits</h1><p class="ie-lead">Built with a browser, a text editor and a fondness for beige computers.</p>' +
            '<ul><li><b>Design &amp; code:</b> the WINemulator project.</li>' +
            '<li><b>Icons:</b> hand-drawn inline SVG, no icon fonts.</li>' +
            '<li><b>Sounds:</b> Web Audio API oscillators and noise.</li>' +
            '<li><b>Typography:</b> the fonts already on your computer.</li>' +
            '<li><b>Inspiration:</b> every Windows desktop that ever booted.</li></ul>' +
            '<div class="ie-note">This is an independent tribute project. It is not affiliated with Microsoft, and no original Windows code or artwork is included.</div>' +
            '<button class="btn" type="button" data-go="' + HOME + '">Back to home</button>'
        };
      }

      function pageSearch(q) {
        const term = q;
        const files = term ? Win.fs.search(term) : [];
        const pages = PAGE_INDEX.filter(function (p) {
          const hay = (p.title + ' ' + p.desc + ' ' + p.id).toLowerCase();
          return term && hay.indexOf(term.toLowerCase()) > -1;
        });
        const web = 'https://duckduckgo.com/?q=' + encodeURIComponent(term);
        return {
          title: 'Search: ' + term,
          html: '<h1>Search results</h1><p class="ie-lead">Results for <b>' + esc(term) + '</b> on this computer.</p>' +
            '<div class="ie-note">The internet is optional here. <button class="btn ie-websearch" type="button" data-web="' + esc(web) + '">' + Win.icon('globe', 14) + ' Search the web in a new tab</button></div>' +
            '<h2>Local pages (' + pages.length + ')</h2>' +
            (pages.length ? '<div class="ie-tiles">' + pages.map(function (p) {
              return '<button class="ie-tile" type="button" data-go="winemulator://' + p.id + '">' + Win.icon(p.icon, 28) +
                '<span><b>' + p.title + '</b><small>' + p.desc + '</small></span></button>';
            }).join('') + '</div>' : '<p>No pages matched.</p>') +
            '<h2>Files (' + files.length + ')</h2>' + fileRows(files.slice(0, 40)) +
            '<p style="margin-top:14px"><button class="btn" type="button" data-go="' + HOME + '">Back to home</button></p>'
        };
      }

      function internalPage(url) {
        const rest = url.replace(/^winemulator:\/\//i, '');
        const qm = rest.indexOf('?');
        const id = (qm > -1 ? rest.slice(0, qm) : rest).replace(/\/+$/, '').toLowerCase() || 'home';
        const query = qm > -1 ? new URLSearchParams(rest.slice(qm + 1)) : null;
        if (id === 'home' || id === 'index.html' || id === '') return pageHome();
        if (id === 'files' || id === 'documents' || id === 'mydocuments') return pageFiles();
        if (id === 'help' || id === 'shortcuts') return pageHelp();
        if (id === 'settings' || id === 'control' || id === 'controlpanel') return pageSettings();
        if (id === 'readme' || id === 'read-me') return pageReadme();
        if (id === 'guestbook') return pageGuestbook();
        if (id === 'about') return pageAbout();
        if (id === 'credits') return pageCredits();
        if (id === 'search') return pageSearch(query ? decode(query.get('q')) : '');
        return {
          title: 'Page not found',
          html: '<h1>Page not found</h1><p class="ie-lead">WINemulator could not find <code>' + esc(url) + '</code>.</p>' +
            '<div class="ie-note">Check the address, or start again from the <span data-go="' + HOME + '">home page</span>.</div>' +
            '<button class="btn" type="button" data-go="' + HOME + '">Take me home</button>'
        };
      }

      /* ------------------------------------------------------------- render */
      function renderInternal(url) {
        const page = internalPage(url);
        lastHtml = page.html;
        currentUrl = url;
        docEl.innerHTML = '<div class="ie-page">' + page.html + '</div>';
        docEl.scrollTop = 0;
        zoneEl.textContent = 'My Computer';
        ctx.setTitle(page.title + ' - Mozilla Firefox');
        setStatus('Done');
        setBusy(false);
        bindPage();
        updateNav();
      }

      function renderExternal(url) {
        currentUrl = url;
        zoneEl.textContent = navigator.onLine ? 'Internet' : 'Offline';
        ctx.setTitle(domainOf(url) + ' - Mozilla Firefox');
        if (!navigator.onLine) {
          docEl.innerHTML = '<div class="ie-page"><div class="ie-blocked"><h1>Working Offline</h1>' +
            '<p class="ie-lead">Your browser reports that there is no network connection, so this page cannot be loaded.</p>' +
            '<div class="ie-note">WINemulator itself still works perfectly: the local <code>winemulator://</code> pages never need the internet.</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" type="button" data-go="' + HOME + '">Go home</button>' +
            '<button class="btn ie-retry" type="button" data-retry="' + esc(url) + '">Try again</button></div></div></div>';
          setStatus('Offline');
          setBusy(false);
          bindPage();
          updateNav();
          return;
        }
        docEl.innerHTML =
          '<div class="ie-embed">' +
          '  <div class="ie-embed-bar">' + Win.icon('globe', 14) + '<span class="ie-embed-url"></span>' +
          '  <button class="btn ie-newtab" type="button">' + Win.icon('open', 14) + ' Open in new tab</button></div>' +
          '  <iframe title="Web page" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>' +
          '</div>';
        docEl.querySelector('.ie-embed-url').textContent = url;
        const frame = docEl.querySelector('iframe');
        const openBtn = docEl.querySelector('.ie-newtab');
        openBtn.addEventListener('click', function () { window.open(url, '_blank', 'noopener,noreferrer'); });
        let framesLoaded = false;
        frame.addEventListener('load', function () {
          if (framesLoaded) return;
          framesLoaded = true;
          setStatus('Done — if the page is blank, the site refused to be embedded.');
          setBusy(false);
        });
        frame.src = url;
        docEl.scrollTop = 0;
        setStatus('Connecting to ' + domainOf(url) + '...');
        setBusy(true);
        bindPage();
        updateNav();
      }

      function bindPage() {
        docEl.querySelectorAll('[data-go]').forEach(function (n) {
          n.addEventListener('click', function () { go(n.dataset.go, true); });
        });
        docEl.querySelectorAll('[data-path]').forEach(function (n) {
          n.addEventListener('click', function () {
            const p = n.dataset.path;
            try {
              if (n.dataset.kind === 'dir') Win.wm.open('explorer', { path: p });
              else Win.shell.openFile(p);
            } catch (e) { Win.ui.error(e.message, 'Mozilla Firefox'); }
          });
        });
        docEl.querySelectorAll('[data-open-app]').forEach(function (n) {
          n.addEventListener('click', function () { Win.wm.open(n.dataset.openApp); });
        });
        docEl.querySelectorAll('[data-open-explorer]').forEach(function (n) {
          n.addEventListener('click', function () { Win.wm.open('explorer', { path: n.dataset.openExplorer }); });
        });
        docEl.querySelectorAll('[data-settings-tab]').forEach(function (n) {
          n.addEventListener('click', function () { Win.wm.open('settings', { tab: n.dataset.settingsTab }); });
        });
        docEl.querySelectorAll('[data-web]').forEach(function (n) {
          n.addEventListener('click', function () { window.open(n.dataset.web, '_blank', 'noopener,noreferrer'); });
        });
        docEl.querySelectorAll('[data-retry]').forEach(function (n) {
          n.addEventListener('click', function () { go(n.dataset.retry, false); });
        });

        const homeQ = docEl.querySelector('.ie-home-q');
        const homeGo = docEl.querySelector('.ie-home-go');
        if (homeQ && homeGo) {
          const submit = function () { go('winemulator://search?q=' + encodeURIComponent(homeQ.value.trim()), true); };
          homeGo.addEventListener('click', submit);
          homeQ.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });
        }

        const gb = docEl.querySelector('.gb-sign');
        if (gb) {
          gb.addEventListener('click', function () {
            const nameEl = docEl.querySelector('.gb-name');
            const msgEl = docEl.querySelector('.gb-msg');
            const name = (nameEl.value || '').trim() || 'Anonymous visitor';
            const msg = (msgEl.value || '').trim();
            if (!msg) { Win.ui.error('Type a message before signing the guestbook.', 'Guestbook'); return; }
            const list = guestEntries();
            list.unshift({ name: name.slice(0, 40), msg: msg.slice(0, 160), at: Date.now() });
            try { localStorage.setItem(GUEST_KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
            Win.sound.play('notify');
            go('winemulator://guestbook', false);
          });
        }
      }

      /* ------------------------------------------------------------- history */
      function go(raw, push) {
        const url = normUrl(raw);
        currentUrl = url;
        addrEl.value = url;
        if (push !== false) {
          history = history.slice(0, hidx + 1);
          if (history[history.length - 1] !== url) history.push(url);
          hidx = history.length - 1;
        }
        updateNav();
        if (/^winemulator:\/\//i.test(url)) renderInternal(url);
        else renderExternal(url);
      }

      function loadAt(i) {
        if (i < 0 || i >= history.length) return;
        hidx = i;
        go(history[hidx], false);
      }

      function back() { loadAt(hidx - 1); }
      function forward() { loadAt(hidx + 1); }

      function stop() {
        clearInterval(loadingTimer);
        clearTimeout(doneTimer);
        setBusy(false);
        setStatus('Stopped');
      }

      function favMenu() {
        return PAGE_INDEX.map(function (p) {
          return {
            label: p.title, icon: p.icon,
            action: function () { go('winemulator://' + p.id, true); }
          };
        }).concat([
          { separator: true },
          { label: 'Add Page to Favorites...', icon: 'star', disabled: true }
        ]);
      }

      function historyMenu() {
        const items = history.slice().reverse().slice(0, 14).map(function (url) {
          return {
            label: (url.indexOf('winemulator://') === 0 ? url.replace('winemulator://', '') : domainOf(url)), icon: 'globe',
            action: function () { go(url, true); }
          };
        });
        if (!items.length) items.push({ label: 'No history yet', disabled: true });
        items.push({ separator: true });
        items.push({ label: 'Clear History', icon: 'delete', action: function () { history = []; hidx = -1; updateNav(); Win.ui.toast('History cleared.', 'check', 1500); } });
        return items;
      }

      function menus(name) {
        if (name === 'file') {
          return [
            { label: 'New Window', icon: 'firefox', action: function () { Win.wm.open('browser', { url: HOME }); } },
            { label: 'Open...', icon: 'open', action: function () {
              Win.ui.fileDialog({ mode: 'open', title: 'Open', startPath: 'C:\\My Documents' }).then(function (p) {
                if (p) { try { Win.shell.openFile(p); } catch (e) { Win.ui.error(e.message, 'Open'); } }
              });
            } },
            { separator: true },
            { label: 'Open Current Page in New Tab', icon: 'open', disabled: currentUrl.indexOf('winemulator://') === 0, action: function () { window.open(currentUrl, '_blank', 'noopener,noreferrer'); } },
            { separator: true },
            { label: 'Close', icon: 'close', action: function () { ctx.close(); } }
          ];
        }
        if (name === 'edit') {
          return [
            { label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C', action: function () {
              const sel = String(window.getSelection ? window.getSelection() : '');
              if (sel) U.copyText(sel);
              else Win.ui.toast('Select some text first.', 'info', 1500);
            } },
            { label: 'Select All', shortcut: 'Ctrl+A', action: function () {
              const r = document.createRange(); r.selectNodeContents(docEl);
              const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
            } },
            { separator: true },
            { label: 'Find on this Computer...', icon: 'search', action: function () {
              Win.ui.prompt({ title: 'Search', label: 'Find a page or file on this computer:', value: '' }).then(function (q) {
                if (q) go('winemulator://search?q=' + encodeURIComponent(q), true);
              });
            } }
          ];
        }
        if (name === 'view') {
          return [
            { label: 'Refresh', icon: 'refresh', shortcut: 'F5', action: function () { go(currentUrl, false); } },
            { label: 'Stop', icon: 'close', shortcut: 'Esc', action: stop },
            { separator: true },
            { label: 'Home Page', icon: 'firefox', action: function () { go(HOME, true); } },
            { label: 'Full Screen', icon: 'monitor', disabled: true }
          ];
        }
        if (name === 'go') {
          return [
            { label: 'Back', icon: 'back', shortcut: 'Alt+Left', disabled: hidx <= 0, action: back },
            { label: 'Forward', icon: 'forward', shortcut: 'Alt+Right', disabled: hidx >= history.length - 1, action: forward },
            { label: 'Home Page', icon: 'firefox', action: function () { go(HOME, true); } },
            { separator: true },
            { label: 'Search the Web...', icon: 'search', action: function () {
              Win.ui.prompt({ title: 'Search the Web', label: 'Enter a search term. This opens DuckDuckGo in a new tab.', value: '' }).then(function (q) {
                if (q) window.open('https://duckduckgo.com/?q=' + encodeURIComponent(q), '_blank', 'noopener,noreferrer');
              });
            } }
          ];
        }
        if (name === 'fav') return favMenu();
        return [
          { label: 'Help Topics', icon: 'help', action: function () { Win.wm.open('help'); } },
          { separator: true },
          { label: 'About Mozilla Firefox', icon: 'firefox', action: function () {
            Win.ui.alert('WINemulator Mozilla Firefox\nVersion 1.0 (Web Edition)\n\nA retro browser shell with a small local web.\n\nTry winemulator://home in the address bar.\nExternal sites open in an embedded frame when they allow it, or in a new tab.', 'About Mozilla Firefox', 'ie');
          } }
        ];
      }

      body.querySelectorAll('.ie-menu .mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(menus(item.dataset.menu), r.left, r.bottom + 1);
        });
      });

      body.querySelector('.ie-nav').addEventListener('click', function (ev) {
        const btn = ev.target.closest('[data-act]');
        if (!btn || btn.disabled) return;
        const a = btn.dataset.act;
        if (a === 'back') back();
        else if (a === 'forward') forward();
        else if (a === 'stop') stop();
        else if (a === 'refresh') go(currentUrl, false);
        else if (a === 'home') go(HOME, true);
        else if (a === 'fav') {
          const r = btn.getBoundingClientRect();
          Win.ui.menu(favMenu(), r.left, r.bottom + 1);
        } else if (a === 'history') {
          const r = btn.getBoundingClientRect();
          Win.ui.menu(historyMenu(), r.left, r.bottom + 1);
        } else if (a === 'search') {
          go('winemulator://search?q=', true);
          setTimeout(function () {
            const q = docEl.querySelector('.ie-home-q');
            if (q) q.focus();
          }, 40);
        }
      });

      goBtn.addEventListener('click', function () { go(addrEl.value, true); });
      addrEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); go(addrEl.value, true); addrEl.blur(); }
        else if (ev.key === 'Escape') { addrEl.value = currentUrl; addrEl.blur(); }
      });
      addrEl.addEventListener('focus', function () { addrEl.select(); });

      body.addEventListener('keydown', function (ev) {
        if (ev.key === 'F5' && !U.isTyping(ev.target)) { ev.preventDefault(); go(currentUrl, false); return; }
        if (ev.altKey && ev.key === 'ArrowLeft') { ev.preventDefault(); back(); return; }
        if (ev.altKey && ev.key === 'ArrowRight') { ev.preventDefault(); forward(); return; }
        if (ev.ctrlKey && ev.key.toLowerCase() === 'l') { ev.preventDefault(); addrEl.focus(); return; }
        if (ev.key === 'Escape' && !U.isTyping(ev.target)) stop();
      });

      // Start at the requested URL (or the home page).
      go(args.url || HOME, true);

      return {
        onReopen: function (a) { if (a && a.url) go(a.url, true); },
        destroy: function () { clearInterval(loadingTimer); clearTimeout(doneTimer); },
        navigate: function (u) { go(u, true); },
        get url() { return currentUrl; }
      };
    }
  };
})();
