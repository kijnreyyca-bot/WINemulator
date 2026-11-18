/* WINemulator — VI OS Surf browser (original, no built-in browser engine) */
(function () {
  'use strict';
  const U = Win.util, el = U.el;
  const HOME_URL = 'vi://home';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function homePage() {
    const links = [
      { icon: 'files', title: 'Files', text: 'Browse your folders and open documents.', url: 'vi://file/' + encodeURIComponent('C:\\Users\\User') },
      { icon: 'surf', title: 'About VI OS', text: 'What makes Golden Gate different.', url: 'vi://about' },
      { icon: 'help-mac', title: 'Help', text: 'Shortcuts, apps and tips.', url: 'vi://help' },
      { icon: 'notes', title: 'Read Me', text: 'Release notes for this build.', url: 'vi://readme' },
      { icon: 'user-avatar', title: 'Guestbook', text: 'Leave a note on your own device.', url: 'vi://guestbook' }
    ];
    return '<div class="vi-surf-inner">' +
      '<h1>Surf</h1><p>Welcome to the web, VI OS style. Everything here is generated locally — no account, no tracking, no downloads.</p>' +
      '<div class="vi-surf-form"><input class="field" type="text" data-surf-input placeholder="Search or enter an address (try vi://about)"><button class="btn default" type="button" data-surf-go>Go</button></div>' +
      '<h2>Start pages</h2><div class="vi-surf-cards">' + links.map(function (l) {
        return '<button class="vi-surf-card" type="button" data-url="' + l.url + '">' + Win.icon(l.icon, 30) +
          '<span><b>' + l.title + '</b><small>' + l.text + '</small></span></button>';
      }).join('') + '</div>' +
      '<h2>Try these addresses</h2><p><code>vi://home</code> <code>vi://about</code> <code>vi://help</code> <code>vi://readme</code> <code>vi://guestbook</code> <code>vi://file/C:\Users\User\Documents</code></p>' +
      '</div>';
  }

  function aboutPage() {
    return '<div class="vi-surf-inner">' +
      '<h1>About VI OS</h1><p class="vi-surf-status">Version ' + Win.osVersion + ' · Build ' + Win.osBuild + '</p>' +
      '<p>VI OS <b>' + Win.osEdition + '</b> is an original, Golden-Gate-inspired desktop created for WINemulator. It uses its own monogram, wallpapers, icons and theme — no Apple logos, artwork, fonts or trademarks.</p>' +
      '<h2>Built for the browser</h2><p>Runs entirely from static files. Everything you save stays in your browser storage, and every window, menu and dock item works offline.</p>' +
      '<h2>Highlights</h2>' +
      '<p><b>Menu bar</b> — app menus, status icons, clock and Control Center.<br>' +
      '<b>Dock</b> — magnification, running indicators, Launchpad and Trash.<br>' +
      '<b>Spotlight</b> — press ⌘ Space to find apps and files instantly.<br>' +
      '<b>Files &amp; Surf</b> — native apps with a clean, rounded look.</p>' +
      '<h2>Credits</h2><p>VI Systems · WINemulator Project. Wallpaper and icon artwork are original SVG drawings.</p>' +
      '<p><button type="button" data-url="vi://home">← Back to Surf start</button></p></div>';
  }

  function helpPage() {
    return '<div class="vi-surf-inner">' +
      '<h1>Surf Help</h1><p>Everything you can do with VI OS and Surf.</p>' +
      '<h2>Keyboard shortcuts</h2><table>' +
      '<tr><td>⌘ Space</td><td>Open Spotlight</td></tr>' +
      '<tr><td>⌘ Tab</td><td>App switcher</td></tr>' +
      '<tr><td>⌘ L</td><td>Focus the address bar in Surf</td></tr>' +
      '<tr><td>⌘ ⇧ F</td><td>Enter full screen (browser feature)</td></tr>' +
      '<tr><td>Esc</td><td>Close menus and overlays</td></tr></table>' +
      '<h2>Address formats</h2><table>' +
      '<tr><td>vi://home</td><td>Surf start page</td></tr>' +
      '<tr><td>vi://about</td><td>About VI OS</td></tr>' +
      '<tr><td>vi://file/&lt;path&gt;</td><td>Open a local file or folder in Files</td></tr>' +
      '<tr><td>http(s)://…</td><td>Open a web page in an embedded frame</td></tr></table>' +
      '<p>Some websites block embedded frames. If a page will not load, open it in a new browser tab instead.</p>' +
      '<p><button type="button" data-url="vi://home">← Back to Surf start</button></p></div>';
  }

  function readmePage() {
    return '<div class="vi-surf-inner">' +
      '<h1>Read Me</h1><p class="vi-surf-status">VI OS ' + Win.osVersion + ' · ' + Win.osNameFull + '</p>' +
      '<h2>What is new</h2><p>VI OS Golden Gate brings a rounded, translucent desktop with a traffic-light window layout, a live dock, Spotlight search, Launchpad, Control Center and a calendar popover — all original to WINemulator.</p>' +
      '<h2>Apps included</h2><p>Files, Surf, Notes, Terminal, System Settings, Activity Monitor, Canvas, Calculator, Mines and Virtual PC. All existing WINemulator apps are still available from Launchpad.</p>' +
      '<h2>Storage</h2><p>Files and settings live in this browser only. Use System Settings → General to export or import a backup.</p>' +
      '<p><button type="button" data-url="vi://home">← Back to Surf start</button></p></div>';
  }

  function guestbookPage() {
    const entries = Win.store.get('viGuestbook') || [];
    return '<div class="vi-surf-inner">' +
      '<h1>Guestbook</h1><p>Sign the guestbook. Entries are stored locally on this device.</p>' +
      '<div class="vi-surf-guest"><input class="field" data-gb-name placeholder="Your name" maxlength="40">' +
      '<input class="field" data-gb-msg placeholder="Your message" maxlength="200">' +
      '<button class="btn default" type="button" data-gb-add>Sign guestbook</button></div>' +
      '<h2>Entries</h2>' + (entries.length ? entries.slice().reverse().map(function (e) {
        return '<div class="vi-surf-entry"><b>' + esc(e.name) + '</b>' + esc(e.msg) + '<small>' + esc(new Date(e.at).toLocaleString()) + '</small></div>';
      }).join('') : '<p>No entries yet.</p>') +
      '<p><button type="button" data-url="vi://home">← Back to Surf start</button></p></div>';
  }

  function filePage(url) {
    let p = decodeURIComponent(String(url).slice(('vi://file/').length) || '').replace(/^\/+/, '');
    if (!/^[a-z]:\\/i.test(p)) p = 'C:\\' + p.replace(/\//g, '\\');
    const node = Win.fs.resolve(p);
    if (!node) return '<div class="vi-surf-inner"><h1>File not found</h1><p><code>' + esc(p) + '</code> does not exist.</p><p><button type="button" data-url="vi://home">← Home</button></p></div>';
    return '<div class="vi-surf-inner"><h1>' + esc(Win.fs.baseName(p) || p) + '</h1>' +
      '<p><code>' + esc(p) + '</code> · ' + esc(node.type === 'dir' ? 'Folder' : Win.fs.typeName({ type: node.type, kind: node.kind, ext: Win.fs.extName(p) })) + '</p>' +
      '<p><button class="btn default" type="button" data-surf-open="' + esc(p) + '">Open in Files</button></p>' +
      '<p><button type="button" data-url="vi://home">← Back to Surf start</button></p></div>';
  }

  Win.apps.surf = {
    name: 'Surf', title: 'Surf', icon: 'surf', className: 'app-surf',
    width: 900, height: 600, minWidth: 480, minHeight: 340,
    placement: 'center',
    mount: function (body, ctx) {
      let url = (ctx.args && ctx.args.url) || HOME_URL;
      let history = [], hIndex = -1;

      body.innerHTML =
        '<div class="toolbar vi-surf-toolbar">' +
          '<button class="tool-btn icon-only" data-act="back" title="Back">' + Win.icon('chevron', 16) + '</button>' +
          '<button class="tool-btn icon-only" data-act="fwd" title="Forward">' + Win.icon('chevron', 16) + '</button>' +
          '<button class="tool-btn icon-only" data-act="reload" title="Reload">' + Win.icon('refresh', 16) + '</button>' +
          '<button class="tool-btn icon-only" data-act="home" title="Home">' + Win.icon('surf', 16) + '</button>' +
          '<span class="vi-surf-address"><input class="field" type="text" data-address aria-label="Address"></span>' +
          '<button class="btn default" type="button" data-act="go">Go</button>' +
        '</div>' +
        '<div class="vi-surf-page"></div>' +
        '<div class="statusbar vi-surf-statusbar"><span class="status-cell vi-surf-status">Ready</span></div>';
      const addressEl = body.querySelector('[data-address]');
      const pageEl = body.querySelector('.vi-surf-page');
      const statusEl = body.querySelector('.vi-surf-status');

      function normalize(v) {
        v = String(v || '').trim();
        if (!v) return HOME_URL;
        if (/^(https?:\/\/|file:\/\/)/i.test(v)) return v;
        if (/^www\./i.test(v)) return 'https://' + v;
        return 'https://www.' + v.replace(/\s+/g, '') + '.com';
      }
      // Keep the path portion of vi:// URLs untouched (paths can be mixed case).
      function viUrl(v) {
        const m = String(v).match(/^vi:\/\/([^/]+)(\/.*)?$/i);
        if (!m) return HOME_URL;
        return 'vi://' + m[1].toLowerCase() + (m[2] || '');
      }

      function render() {
        addressEl.value = url;
        ctx.setTitle('Surf — ' + (url.indexOf('vi://') === 0 ? url.slice(5) : url));
        statusEl.textContent = url.indexOf('vi://') === 0 ? 'Local page' : 'External page';
        body.querySelector('[data-act="back"]').style.opacity = hIndex > 0 ? '1' : '.4';
        body.querySelector('[data-act="fwd"]').style.opacity = hIndex < history.length - 1 ? '1' : '.4';
        pageEl.innerHTML = '';
        if (/^https?:\/\//i.test(url)) {
          pageEl.appendChild(el('div', { class: 'vi-surf-note', text: 'External page: ' + url + ' — some sites block being shown in an embedded frame.' }));
          const frame = el('iframe', { class: 'vi-surf-frame', src: url, title: 'External page', referrerpolicy: 'no-referrer' });
          frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
          pageEl.appendChild(frame);
          return;
        }
        const host = url.slice(5).split('/')[0].toLowerCase();
        let html;
        if (host === 'home' || host === '') html = homePage();
        else if (host === 'about') html = aboutPage();
        else if (host === 'help') html = helpPage();
        else if (host === 'readme') html = readmePage();
        else if (host === 'guestbook') html = guestbookPage();
        else if (host === 'file') html = filePage(url);
        else html = '<div class="vi-surf-inner"><h1>Page not found</h1><p>There is no page called <code>' + esc(host) + '</code>.</p><p><button type="button" data-url="vi://home">← Home</button></p></div>';
        pageEl.innerHTML = html;

        pageEl.querySelectorAll('[data-url]').forEach(function (b) {
          b.addEventListener('click', function () { go(b.dataset.url); });
        });
        const input = pageEl.querySelector('[data-surf-input]');
        if (input) {
          const submit = function () { go(input.value); };
          input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') submit(); });
          pageEl.querySelector('[data-surf-go]').addEventListener('click', submit);
        }
        const gbAdd = pageEl.querySelector('[data-gb-add]');
        if (gbAdd) {
          gbAdd.addEventListener('click', function () {
            const name = pageEl.querySelector('[data-gb-name]').value.trim() || 'Anonymous';
            const msg = pageEl.querySelector('[data-gb-msg]').value.trim();
            if (!msg) return;
            const list = Win.store.get('viGuestbook') || [];
            list.push({ name: name, msg: msg, at: Date.now() });
            Win.store.set({ viGuestbook: list.slice(-50) });
            render();
            Win.ui.toast('Signed the guestbook.', 'check', 1500);
          });
        }
        pageEl.querySelectorAll('[data-surf-open]').forEach(function (b) {
          b.addEventListener('click', function () { Win.wm.open('files', { path: b.dataset.surfOpen }); });
        });
      }

      function go(raw, record) {
        const next = /^vi:\/\//i.test(String(raw || '').trim()) ? viUrl(raw) : normalize(raw);
        if (next === url && record !== false) { render(); return; }
        url = next;
        if (record !== false) { history = history.slice(0, hIndex + 1); history.push(url); hIndex = history.length - 1; }
        render();
      }

      body.querySelector('[data-act="go"]').addEventListener('click', function () { go(addressEl.value); });
      addressEl.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(addressEl.value); });
      body.querySelector('[data-act="back"]').addEventListener('click', function () { if (hIndex > 0) { hIndex--; go(history[hIndex], false); } });
      body.querySelector('[data-act="fwd"]').addEventListener('click', function () { if (hIndex < history.length - 1) { hIndex++; go(history[hIndex], false); } });
      body.querySelector('[data-act="reload"]').addEventListener('click', render);
      body.querySelector('[data-act="home"]').addEventListener('click', function () { go(HOME_URL); });
      body.addEventListener('keydown', function (ev) {
        if (ev.key.toLowerCase() === 'l' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); addressEl.focus(); addressEl.select(); }
      });

      history.push(url); hIndex = 0;
      render();
      return {
        onReopen: function (args) { if (args && args.url) go(args.url); },
        go: go, reload: render
      };
    }
  };
})();
