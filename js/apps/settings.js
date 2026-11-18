/* WINemulator — Control Panel */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  const TABS = [
    { id: 'appearance', label: 'Appearance', icon: 'monitor' },
    { id: 'background', label: 'Background', icon: 'image' },
    { id: 'sounds', label: 'Sounds', icon: 'sound' },
    { id: 'performance', label: 'Performance', icon: 'taskmgr' },
    { id: 'system', label: 'System', icon: 'computer' },
    { id: 'about', label: 'About', icon: 'flag' }
  ];
  const WALLS = (Win.isMac ? [
    { id: 'gate', name: 'Golden Gate' },
    { id: 'dune', name: 'Dune' },
    { id: 'aurora', name: 'Aurora' }
  ] : []).concat([
    { id: 'teal', name: 'Teal' },
    { id: 'bliss', name: 'Bliss' },
    { id: 'harmony', name: 'Harmony' },
    { id: 'hero', name: 'Hero' },
    { id: 'clouds', name: 'Clouds' },
    { id: 'azure', name: 'Azure' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'graphite', name: 'Graphite' },
    { id: 'grid', name: 'Grid' },
    { id: 'solid', name: 'Solid Color' }
  ]);
  const SOUND_TESTS = ['startup', 'ding', 'notify', 'click', 'open', 'menu', 'error', 'win', 'explode', 'save'];
  const SOLIDS = ['#008080', '#1e5891', '#0a6b6b', '#5a2c52', '#2a2f36', '#3f7cbe', '#005c5c', '#4b3f72'];

  function wallCss(wall, solid) {
    if (wall === 'gate') return 'url("assets/vi-gate.svg") center / cover no-repeat';
    if (wall === 'dune') return 'linear-gradient(170deg, #2d3d62 0%, #8a5a72 38%, #d98b64 66%, #f1c48d 100%)';
    if (wall === 'aurora') return 'linear-gradient(160deg, #0b1530 0%, #17234c 45%, #251a45 100%)';
    if (wall === 'bliss') return 'url("assets/bliss.svg") center / cover no-repeat';
    if (wall === 'harmony') return 'url("assets/harmony.svg") center / cover no-repeat';
    if (wall === 'hero') return 'url("assets/hero.svg") center / cover no-repeat';
    if (wall === 'clouds') {
      return 'radial-gradient(closest-side at 20% 26%, rgba(255,255,255,.95), rgba(255,255,255,.45) 45%, transparent 72%),' +
        'radial-gradient(closest-side at 42% 22%, rgba(255,255,255,.8), transparent 70%),' +
        'radial-gradient(closest-side at 76% 36%, rgba(255,255,255,.7), transparent 75%),' +
        'linear-gradient(180deg, #2465a8 0%, #4e93cf 48%, #a7d2ee 100%)';
    }
    if (wall === 'azure') return 'radial-gradient(circle at 78% 18%, rgba(255,255,255,.55), transparent 32%), linear-gradient(180deg, #062a54 0%, #0d4c8c 40%, #2d7fc5 72%, #8fc6f0 100%)';
    if (wall === 'sunset') return 'radial-gradient(circle at 72% 68%, rgba(255,196,80,.75), transparent 34%), radial-gradient(circle at 20% 80%, rgba(255,90,60,.3), transparent 45%), linear-gradient(180deg, #1b1436 0%, #44265a 32%, #8a3f63 60%, #d96b52 100%)';
    if (wall === 'graphite') return 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.06), transparent 60%), linear-gradient(160deg, #1c2026, #2e343d 60%, #181c22)';
    if (wall === 'grid') {
      return 'linear-gradient(rgba(120,255,230,.14) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(120,255,230,.14) 1px, transparent 1px),' +
        'radial-gradient(ellipse at 50% 45%, rgba(0,255,200,.08), transparent 65%)';
    }
    if (wall === 'solid') return solid || '#008080';
    return '#008080';
  }
  function wallStyle(wall, solid) {
    if (wall === 'grid') return 'background-color:#005c5c;background-image:' + wallCss(wall, solid) + ';background-size:9px 9px, 9px 9px, 100% 100%;';
    return 'background:' + wallCss(wall, solid) + ';';
  }

  function previewHtml(s) {
    return '<div class="set-preview" style="' + wallStyle(s.wallpaper, s.solid) + '">' +
      '<div class="sp-win"></div><div class="sp-icon"></div>' +
      '<div class="sp-taskbar"><div class="sp-start"></div></div></div>' +
      '<div class="set-status">Live preview — changes apply to the desktop immediately.</div>';
  }

  Win.apps.settings = {
    name: 'Control Panel', title: 'Control Panel', icon: 'settings',
    width: 760, height: 540, minWidth: 500, minHeight: 380,
    singleton: true,
    mount: function (body, ctx) {
      body.classList.add('app-settings');
      const args = ctx.args || {};
      let current = TABS.some(function (t) { return t.id === args.tab; }) ? args.tab : 'appearance';

      body.innerHTML =
        '<div class="menubar set-menu"><div class="mb-item" data-menu="file">File</div>' +
        '<div class="mb-item" data-menu="view">View</div><div class="mb-item" data-menu="help">Help</div></div>' +
        '<div class="set-main"><div class="set-side" role="tablist" aria-label="Control Panel sections"></div>' +
        '<div class="set-pane" role="tabpanel"></div></div>' +
        '<input class="set-file" type="file" accept=".json,application/json" aria-hidden="true">';

      const sideEl = body.querySelector('.set-side');
      const paneEl = body.querySelector('.set-pane');
      const fileEl = body.querySelector('.set-file');

      function s() { return Win.store.all(); }
      function set(patch) { Win.store.set(patch); }

      function renderSide() {
        sideEl.innerHTML = '';
        TABS.forEach(function (t) {
          const active = t.id === current;
          const b = el('button', {
            class: 'set-tab' + (active ? ' active' : ''), type: 'button',
            role: 'tab', 'aria-selected': active ? 'true' : 'false'
          });
          b.innerHTML = Win.icon(t.icon, 20) + '<span></span>';
          b.querySelector('span').textContent = t.label;
          b.addEventListener('click', function () { openTab(t.id); });
          sideEl.appendChild(b);
        });
      }

      function openTab(id) {
        if (!TABS.some(function (t) { return t.id === id; })) id = 'appearance';
        current = id;
        renderSide();
        renderPane();
      }

      /* --------------------------------------------------------- shared bits */
      function checkRow(cls, label, desc, checked) {
        return '<div class="set-row"><div class="set-label"><span>' + label + '</span>' +
          (desc ? '<small>' + desc + '</small>' : '') + '</div>' +
          '<label class="set-check"><input type="checkbox" class="' + cls + '"' + (checked ? ' checked' : '') + '></label></div>';
      }
      function themeCards(st) {
        const list = Win.isMac ? [
          { id: 'vi', name: 'VI Light' },
          { id: 'vi-dark', name: 'VI Dark' },
          { id: 'vi-graphite', name: 'VI Graphite' }
        ] : Win.is2000 ? [
  { id: 'classic', name: 'Windows Classic', preview: 'classic' }
] : Win.isNine ? [
            { id: 'win10', name: 'Windows Blue' },
            { id: 'win10mint', name: 'Mint' },
            { id: 'win10violet', name: 'Violet' }
          ] : Win.isSeven ? [
            { id: 'aero', name: 'Aero Glass' },
            { id: 'frost', name: 'Aero Frost' },
            { id: 'dusk', name: 'Aero Dusk' }
          ] : Win.isXP
          ? [
              { id: 'xp', name: 'Windows XP Blue' },
              { id: 'olive', name: 'Olive Green' },
              { id: 'silver', name: 'Silver' }
            ]
          : [
              { id: 'classic', name: 'Windows Classic' },
              { id: 'platinum', name: 'Platinum' },
              { id: 'midnight', name: 'Midnight' }
            ];
        let active = st.theme;
        if (Win.isMac) active = ['vi', 'vi-dark', 'vi-graphite'].indexOf(active) > -1 ? active : 'vi';
        else if (Win.isNine) active = ['win10', 'win10mint', 'win10violet'].indexOf(active) > -1 ? active : 'win10';
        else if (Win.isSeven) active = ['aero', 'frost', 'dusk'].indexOf(active) > -1 ? active : 'aero';
        else if (Win.isXP) active = ['xp', 'olive', 'silver'].indexOf(active) > -1 ? active : 'xp';
        else active = ['classic', 'platinum', 'midnight'].indexOf(active) > -1 ? active : 'classic';
        return '<div class="set-themes">' + list.map(function (t) {
          return '<button class="set-theme' + (active === t.id ? ' active' : '') + '" type="button" data-theme="' + t.id + '">' +
            '<span class="set-theme-prev"><i></i></span><span class="set-theme-name">' + t.name + '</span></button>';
        }).join('') + '</div>';
      }

      function bindThemeCards() {
        paneEl.querySelectorAll('.set-theme').forEach(function (b) {
          b.addEventListener('click', function () {
            set({ theme: b.dataset.theme });
            openTab(current);
          });
        });
      }

      function wallsHtml(st) {
        return '<div class="set-walls">' + WALLS.map(function (w) {
          return '<button class="set-wall' + (st.wallpaper === w.id ? ' active' : '') + '" type="button" data-wall="' + w.id + '">' +
            '<span class="set-wall-prev w-' + w.id + '" style="' + (w.id === 'solid' ? 'background:' + (st.solid || '#008080') + ';' : '') + '"></span>' +
            '<span class="set-wall-name">' + w.name + '</span></button>';
        }).join('') + '</div>';
      }

      function solidRow(st) {
        if (st.wallpaper !== 'solid') return '';
        return '<div class="set-row"><div class="set-label"><span>Desktop color</span>' +
          '<small>Choose the solid background color.</small></div>' +
          '<div class="set-inline"><input type="color" class="field set-solid" value="' + (st.solid || '#008080') + '"></div></div>';
      }

      function bindWalls() {
        paneEl.querySelectorAll('.set-wall').forEach(function (b) {
          b.addEventListener('click', function () {
            const patch = { wallpaper: b.dataset.wall };
            if (b.dataset.wall === 'solid') {
              const st = s();
              if (SOLIDS.indexOf(st.solid) < 0) patch.solid = '#008080';
            }
            set(patch);
            openTab(current);
          });
        });
        const solid = paneEl.querySelector('.set-solid');
        if (solid) {
          solid.addEventListener('input', function () {
            set({ solid: solid.value, wallpaper: 'solid' });
            const pv = paneEl.querySelector('.set-preview');
            if (pv) pv.style.cssText = 'background:' + solid.value;
            paneEl.querySelectorAll('.set-wall-prev.w-solid').forEach(function (n) { n.style.background = solid.value; });
          });
        }
      }

      function bindChecks(map) {
        Object.keys(map).forEach(function (sel) {
          const input = paneEl.querySelector(sel);
          if (!input) return;
          input.addEventListener('change', function () { set(map[sel](input)); });
        });
      }

      /* --------------------------------------------------------- appearance */
      function appearancePane() {
        const st = s();
        return '<h1 class="set-h1">Appearance</h1><p class="set-sub">Choose how windows and the desktop look. Changes are applied immediately.</p>' +
          '<div class="set-group"><h3>' + Win.icon('computer', 16) + ' Operating system</h3>' +
          '<p>This browser can run every desktop. Switching reloads the page and keeps your files and settings.</p>' +
          '<div class="set-actions">' +
          '<button class="btn" type="button" data-os-switch="mac"' + (Win.isMac ? ' disabled' : '') + '>' + Win.icon('vi', 15) + ' VI OS Golden Gate' + (Win.isMac ? ' (current)' : '') + '</button>' +
          '<button class="btn" type="button" data-os-switch="98"' + (Win.is98 ? ' disabled' : '') + '>' + Win.icon('flag', 15) + ' Windows 98' + (Win.is98 ? ' (current)' : '') + '</button>' +
          '<button class="btn" type="button" data-os-switch="xp"' + (Win.isXP ? ' disabled' : '') + '>' + Win.icon('windows', 15) + ' Windows XP' + (Win.isXP ? ' (current)' : '') + '</button>' +
          '<button class="btn" type="button" data-os-switch="7"' + (Win.isSeven ? ' disabled' : '') + '>' + Win.icon('orb', 15) + ' Windows 7' + (Win.isSeven ? ' (current)' : '') + '</button>' +
          '<button class="btn" type="button" data-os-switch="9"' + (Win.isNine ? ' disabled' : '') + '>' + Win.icon('win10', 15) + ' Windows 9' + (Win.isNine ? ' (current)' : '') + '</button>' +
'<button class="btn" type="button" data-os-switch="2k"' + (Win.is2000 ? ' disabled' : '') + '>' + Win.icon('flag', 15) + ' Windows 2000' + (Win.is2000 ? ' (current)' : '') + '</button>' +
'<button class="btn" type="button" data-os-switch="dos"' + (Win.isDOS ? ' disabled' : '') + '>' + Win.icon('terminal', 15) + ' MS-DOS' + (Win.isDOS ? ' (current)' : '') + '</button>' +
          '</div></div>' +
          '<div class="set-group"><h3>' + Win.icon('monitor', 16) + ' ' + (Win.isMac ? 'Appearance theme' : 'Windows theme') + '</h3>' + themeCards(st) + '</div>' +
          '<div class="set-group"><h3>' + Win.icon('image', 16) + ' Desktop preview</h3>' + previewHtml(st) + '</div>' +
          '<div class="set-group"><h3>' + Win.icon('settings', 16) + ' Effects</h3>' +
          checkRow('set-anim', 'Animated windows', 'Window open, close and menu animations.', st.animations !== false) +
          checkRow('set-crt', 'CRT scanlines', 'Adds a nostalgic monitor overlay.', !!st.crt) +
          checkRow('set-clock24', '24-hour clock', 'Show the taskbar clock in 24-hour time.', !!st.clock24) +
          checkRow('set-fps', 'Show FPS meter', 'Display the current frame rate above the taskbar.', !!st.fps) +
          '</div>';
      }
      function bindAppearance() {
        bindThemeCards();
        paneEl.querySelectorAll('[data-os-switch]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (Win.switchOS) Win.switchOS(b.dataset.osSwitch);
          });
        });
        bindChecks({
          '.set-anim': function (i) { return { animations: i.checked }; },
          '.set-crt': function (i) { return { crt: i.checked }; },
          '.set-clock24': function (i) { return { clock24: i.checked }; },
          '.set-fps': function (i) { return { fps: i.checked }; }
        });
        const fps = paneEl.querySelector('.set-fps');
        if (fps) fps.addEventListener('change', function () { if (Win.desktop) Win.desktop.applySettings(); });
        const crt = paneEl.querySelector('.set-crt');
        if (crt) crt.addEventListener('change', function () { if (Win.desktop) Win.desktop.applySettings(); });
      }

      /* --------------------------------------------------------- background */
      function backgroundPane() {
        const st = s();
        return '<h1 class="set-h1">Background</h1><p class="set-sub">Pick a wallpaper for the desktop. Everything is drawn with CSS, so it loads instantly and works offline.</p>' +
          '<div class="set-group"><h3>' + Win.icon('image', 16) + ' Wallpaper</h3>' + wallsHtml(st) + solidRow(st) + '</div>' +
          '<div class="set-group"><h3>' + Win.icon('monitor', 16) + ' Preview</h3>' + previewHtml(st) + '</div>';
      }
      function bindBackground() { bindWalls(); }

      /* ------------------------------------------------------------- sounds */
      function soundsPane() {
        const st = s();
        return '<h1 class="set-h1">Sounds</h1><p class="set-sub">WINemulator synthesises its sounds with the Web Audio API. No audio files are downloaded.</p>' +
          '<div class="set-group"><h3>' + Win.icon('sound', 16) + ' Sound scheme</h3>' +
          checkRow('set-enable', 'Enable sounds', 'Play clicks, startup and notification sounds.', st.sound !== false) +
          '<div class="set-row"><div class="set-label"><span>Volume</span><small>Master volume for all system sounds.</small></div>' +
          '<div class="set-inline"><input type="range" min="0" max="100" class="set-range set-volume" value="' + Math.round((st.volume == null ? 0.55 : st.volume) * 100) + '">' +
          '<span class="set-num set-volnum">' + Math.round((st.volume == null ? 0.55 : st.volume) * 100) + '%</span></div></div>' +
          '<div class="set-row"><div class="set-label"><span>Scheme</span><small>WINemulator Default</small></div>' +
          '<select class="field" disabled><option>WINemulator Default</option></select></div>' +
          '</div>' +
          '<div class="set-group"><h3>' + Win.icon('volume', 16) + ' Test sounds</h3>' +
          '<div class="set-sounds">' + SOUND_TESTS.map(function (n) {
            return '<button class="set-sound" type="button" data-sound="' + n + '">' + Win.icon('volume', 14) + '<span>' + n.charAt(0).toUpperCase() + n.slice(1) + '</span></button>';
          }).join('') + '</div>' +
          '<p style="margin-top:8px">Tip: your browser may keep audio muted until you click somewhere on the page.</p></div>';
      }
      function bindSounds() {
        const enable = paneEl.querySelector('.set-enable');
        if (enable) enable.addEventListener('change', function () {
          set({ sound: enable.checked });
          if (enable.checked) Win.sound.play('ding');
        });
        const range = paneEl.querySelector('.set-volume');
        const num = paneEl.querySelector('.set-volnum');
        if (range) {
          range.addEventListener('input', function () {
            const v = Number(range.value);
            set({ volume: v / 100 });
            num.textContent = v + '%';
          });
          range.addEventListener('change', function () { Win.sound.play('click'); });
        }
        paneEl.querySelectorAll('.set-sound[data-sound]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (s().sound === false) {
              Win.ui.toast('Sounds are muted. Enable sounds above.', 'no-sound', 2200);
              return;
            }
            Win.sound.play(b.dataset.sound);
          });
        });
      }

      /* -------------------------------------------------------- performance */
      function performancePane() {
        const st = s();
        return '<h1 class="set-h1">Performance</h1><p class="set-sub">Tune startup and visual effects. Fast settings are recommended on older devices.</p>' +
          '<div class="set-group"><h3>' + Win.icon('restart', 16) + ' Startup</h3>' +
          checkRow('set-fastboot', 'Fast boot', 'Skip most of the BIOS and splash screens when Windows starts.', !!st.fastBoot) +
          '<div class="set-row"><div class="set-label"><span>Boot screens</span><small>Restart or shut down to see the effect.</small></div>' +
          '<button class="btn set-reboot" type="button">' + Win.icon('restart', 14) + ' Restart now</button></div>' +
          '</div>' +
          '<div class="set-group"><h3>' + Win.icon('monitor', 16) + ' Visual effects</h3>' +
          checkRow('set-anim', 'Window animations', 'Smooth open, close and minimise effects.', st.animations !== false) +
          checkRow('set-crt', 'CRT overlay', 'Scanlines and screen vignette.', !!st.crt) +
          checkRow('set-fps', 'FPS meter', 'Show a live frame rate counter.', !!st.fps) +
          '</div>' +
          '<div class="set-group"><h3>' + Win.icon('refresh', 16) + ' Maintenance</h3>' +
          '<div class="set-row"><div class="set-label"><span>Recent documents</span><small>Clear the list used by the Documents menu.</small></div>' +
          '<button class="btn set-clearrecent" type="button">Clear</button></div>' +
          '<div class="set-row"><div class="set-label"><span>Recycle Bin</span><small>' + Win.fs.recycleCount() + ' item(s) waiting to be deleted.</small></div>' +
          '<button class="btn set-emptybin" type="button">Empty</button></div>' +
          '<div class="set-row"><div class="set-label"><span>Desktop</span><small>Redraw icons and shortcuts.</small></div>' +
          '<button class="btn set-refreshdesk" type="button">Refresh</button></div>' +
          '</div>';
      }
      function bindPerformance() {
        bindChecks({
          '.set-fastboot': function (i) { return { fastBoot: i.checked }; },
          '.set-anim': function (i) { return { animations: i.checked }; },
          '.set-crt': function (i) { return { crt: i.checked }; },
          '.set-fps': function (i) { return { fps: i.checked }; }
        });
        const rb = paneEl.querySelector('.set-reboot');
        if (rb) rb.addEventListener('click', function () {
          Win.ui.confirm('Restart Windows now? All open programs will close.', 'Restart', 'question').then(function (yes) {
            if (yes && Win.boot) Win.boot.power('restart');
          });
        });
        const cr = paneEl.querySelector('.set-clearrecent');
        if (cr) cr.addEventListener('click', function () {
          if (Win.recent) Win.recent.clear();
          Win.ui.toast('Recent documents cleared.', 'check', 1800);
        });
        const eb = paneEl.querySelector('.set-emptybin');
        if (eb) eb.addEventListener('click', function () {
          const n = Win.fs.recycleCount();
          if (!n) { Win.ui.toast('The Recycle Bin is already empty.', 'recycle', 1800); return; }
          Win.ui.confirm('Permanently delete all ' + n + ' item(s) in the Recycle Bin?', 'Confirm Delete', 'warning').then(function (yes) {
            if (!yes) return;
            Win.fs.emptyRecycle();
            Win.ui.toast('Recycle Bin emptied.', 'recycle', 1600);
            openTab('performance');
          });
        });
        const rd = paneEl.querySelector('.set-refreshdesk');
        if (rd) rd.addEventListener('click', function () {
          if (Win.desktop) Win.desktop.render();
          Win.ui.toast('Desktop refreshed.', 'check', 1400);
        });
      }

      /* ------------------------------------------------------------- system */
      function systemPane() {
        const st = s();
        const si = Win.sysinfo ? Win.sysinfo() : {};
        const stats = Win.fs.stats();
        const uptime = U.fmtDuration(Date.now() - (Win.startedAt || Date.now()));
        const boot = Win.bootMs ? (Win.bootMs / 1000).toFixed(2) + ' seconds' : 'n/a';
        const rows = [
          ['Operating system', Win.isDOS ? 'MS-DOS 6.22 (Web)' : (Win.isMac ? Win.osNameFull : 'Microsoft ' + Win.osNameFull) + ' (Web)'],
          ['Version', Win.osVersion + ' — WINemulator ' + (Win.version || '1.0')],
          ['Build', Win.build || 'web-2026'],
          ['Processor', 'WebCore x86 JIT (' + (si.cores || '?') + ' logical cores)'],
          ['Memory', (si.memory || 8) + ' GB reported'],
          ['Display', (si.screen || '') + ' @ ' + (si.dpr || 1) + 'x'],
          ['Browser', String(si.ua || '').slice(0, 110)],
          ['Language', si.lang || 'en'],
          ['Network', navigator.onLine ? 'Connected' : 'Offline'],
          ['System up time', uptime],
          ['Last boot', boot],
          ['Files', stats.files + ' files, ' + stats.dirs + ' folders'],
          ['Disk used', U.fmtBytes(stats.bytes) + ' of 2.00 GB'],
          ['Local storage', U.fmtBytes(stats.storageBytes)],
          ['Virtual PC', 'v86 x86 emulator · ' + (window.V86 ? 'loaded' : 'loads on demand')],
          [Win.isMac ? 'Trash' : 'Recycle Bin', stats.recycle + ' item(s)']
        ];
        return '<h1 class="set-h1">System</h1><p class="set-sub">Information about this browser session and the virtual C: drive.</p>' +
          '<div class="set-group"><h3>' + Win.icon('computer', 16) + ' System information</h3>' +
          '<div class="set-specs">' + rows.map(function (r) {
            return '<span>' + r[0] + '</span><b>' + U.escapeHtml(r[1]) + '</b>';
          }).join('') + '</div></div>' +
          '<div class="set-group"><h3>' + Win.icon('save', 16) + ' Backup and restore</h3>' +
          '<p>Your files, settings and Recycle Bin are stored in this browser. Export a JSON backup to move them to another browser or keep them safe.</p>' +
          '<div class="set-actions">' +
          '<button class="btn set-export" type="button">' + Win.icon('save', 16) + ' Export backup</button>' +
          '<button class="btn set-import" type="button">' + Win.icon('open', 16) + ' Import backup</button>' +
          '</div></div>' +
          '<div class="set-group"><h3>' + Win.icon('warning', 16) + ' Reset</h3>' +
          '<p>Restore the factory desktop: all files, settings and the Recycle Bin will be erased and WINemulator will reboot.</p>' +
          '<div class="set-actions"><button class="btn set-reset" type="button">' + Win.icon('delete', 16) + ' Reset everything</button></div></div>';
      }
      function bindSystem() {
        const ex = paneEl.querySelector('.set-export');
        if (ex) ex.addEventListener('click', function () {
          const d = new Date();
          const name = 'winemulator-backup-' + d.getFullYear() + U.pad2(d.getMonth() + 1) + U.pad2(d.getDate()) + '.json';
          U.download(name, Win.fs.exportData(), 'application/json');
          Win.ui.toast('Backup exported to your downloads folder.', 'save', 2400);
        });
        const im = paneEl.querySelector('.set-import');
        if (im) im.addEventListener('click', function () { fileEl.value = ''; fileEl.click(); });
        const rs = paneEl.querySelector('.set-reset');
        if (rs) rs.addEventListener('click', function () {
          Win.ui.dialog({
            title: 'Reset everything', icon: 'warning', width: 440,
            text: 'This will delete every file, setting and item in the Recycle Bin, then reboot WINemulator.\n\nThis cannot be undone. Continue?',
            buttons: [
              { label: 'Reset', value: true, primary: true },
              { label: 'Cancel', value: false, cancel: true }
            ]
          }).then(function (yes) {
            if (!yes) return;
            Win.fs.resetAll();
            Win.store.reset();
            Win.ui.toast('Restoring the factory desktop...', 'refresh', 1200);
            setTimeout(function () { location.reload(); }, 650);
          });
        });
      }

      function onImportFile() {
        const f = fileEl.files && fileEl.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function () {
          try {
            Win.fs.importData(String(reader.result || ''));
            if (Win.desktop) { Win.desktop.applySettings(); Win.desktop.render(); }
            Win.ui.toast('Backup restored successfully.', 'check', 2400);
            openTab('system');
          } catch (e) {
            Win.ui.error(e.message || 'That file could not be imported.', 'Import');
          }
        };
        reader.onerror = function () { Win.ui.error('The backup file could not be read.', 'Import'); };
        reader.readAsText(f);
      }
      fileEl.addEventListener('change', onImportFile);

      /* -------------------------------------------------------------- about */
      function aboutPane() {
        const si = Win.sysinfo ? Win.sysinfo() : {};
        return '<div class="set-about">' +
          '<div class="set-about-logo">' + Win.icon(Win.isMac ? 'vi' : (Win.isNine ? 'win10' : 'flag'), 60) + '</div>' +
          '<div><div class="set-about-name">' + (Win.isMac ? 'VI OS ' + Win.osShort : 'WINemulator ' + Win.osShort) + '</div>' +
          '<div class="set-about-tag">' + (Win.isMac ? 'VI OS 26 Golden Gate — an original desktop for your browser' : Win.is2000 ? 'The Windows 2000 Professional desktop, entirely in your browser' : Win.isNine ? 'The flat Windows 9 desktop, entirely in your browser' : Win.isSeven ? 'The Windows 7 Aero desktop, entirely in your browser' : Win.isXP ? 'The Windows XP Luna desktop, entirely in your browser' : 'The classic Windows 98 desktop, entirely in your browser') + '</div>' +
          '<p>A fast, zero-install desktop environment written in plain HTML, CSS and JavaScript. No framework, no build step, no Microsoft assets — every icon, sound, wallpaper and pixel is generated locally.</p>' +
          '<p>Your files and settings live in this browser. WINemulator does not upload anything anywhere, and it keeps working when you are offline.</p></div>' +
          '</div>' +
          '<div class="set-group" style="margin-top:14px"><h3>' + Win.icon('info', 16) + ' System</h3>' +
          '<div class="set-specs">' +
          '<span>Version</span><b>' + (Win.version || '1.0.0') + '</b>' +
          '<span>Build</span><b>' + (Win.build || 'web-2026') + '</b>' +
          '<span>Kernel</span><b>JavaScript ' + (String(si.ua).indexOf('Firefox') > -1 ? 'Gecko' : 'WebKit/Blink') + '</b>' +
          '<span>Processor</span><b>' + (si.cores || '?') + ' logical cores</b>' +
          '<span>Display</span><b>' + (si.viewport || '') + ' viewport, ' + (si.dpr || 1) + 'x DPI</b>' +
          '<span>License</span><b>MIT · v86 BSD-2-Clause</b>' +
          '</div></div>' +
          '<div class="set-group"><h3>' + Win.icon('vpc', 16) + ' Virtual PC</h3>' +
          '<p>Virtual PC embeds <b>v86</b>, an open-source x86 CPU and PC emulator written in WebAssembly. It runs real 32-bit x86 code and can boot a disk image you supply. No operating-system images are included.</p>' +
          '<div class="set-actions">' +
          '<button class="btn" type="button" data-open-app="vpc">' + Win.icon('vpc', 16) + ' Open Virtual PC</button>' +
          '</div></div>' +
          '<div class="set-group"><h3>' + Win.icon('help', 16) + ' Learn more</h3>' +
          '<div class="set-actions">' +
          '<button class="btn" type="button" data-open-app="help">Help Topics</button>' +
          '<button class="btn" type="button" data-open-app="python">Python</button>' +
          '<button class="btn" type="button" data-open-app="js">' + (Win.isMac ? 'JS' : 'JavaScript') + '</button>' +
          '<button class="btn" type="button" data-open-app="' + (Win.isMac ? 'surf' : 'browser') + '">' + (Win.isMac ? 'Surf' : 'Internet Explorer') + '</button>' +
          '<button class="btn" type="button" data-open-app="taskmgr">' + (Win.isMac ? 'Activity Monitor' : 'Task Manager') + '</button>' +
          '</div></div>';
      }
      function bindAbout() {
        paneEl.querySelectorAll('[data-open-app]').forEach(function (b) {
          b.addEventListener('click', function () { Win.wm.open(b.dataset.openApp); });
        });
      }

      /* -------------------------------------------------------------- render */
      function renderPane() {
        paneEl.scrollTop = 0;
        if (current === 'appearance') { paneEl.innerHTML = appearancePane(); bindAppearance(); }
        else if (current === 'background') { paneEl.innerHTML = backgroundPane(); bindBackground(); }
        else if (current === 'sounds') { paneEl.innerHTML = soundsPane(); bindSounds(); }
        else if (current === 'performance') { paneEl.innerHTML = performancePane(); bindPerformance(); }
        else if (current === 'system') { paneEl.innerHTML = systemPane(); bindSystem(); }
        else { paneEl.innerHTML = aboutPane(); bindAbout(); }
      }

      function menus() {
        return {
          file: [{ label: 'Close', icon: 'close', action: function () { ctx.close(); } }],
          view: TABS.map(function (t) {
            return {
              label: t.label, icon: t.icon, checked: current === t.id,
              action: function () { openTab(t.id); }
            };
          }),
          help: [
            { label: 'Help Topics', icon: 'help', action: function () { Win.wm.open('help'); } },
            { separator: true },
            { label: Win.isMac ? 'About System Settings' : 'About Control Panel', icon: 'settings', action: function () {
              Win.ui.alert((Win.isMac ? 'VI OS System Settings' : 'WINemulator Control Panel') + '\n' + Win.osNameFull + ' · Version ' + Win.osVersion + '\n\nAppearance, wallpaper, sounds, performance and system tools.\n\nEverything is stored locally in your browser.', Win.isMac ? 'About System Settings' : 'About Control Panel', 'settings');
            } }
          ]
        };
      }
      body.querySelectorAll('.set-menu .mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(menus()[item.dataset.menu] || [], r.left, r.bottom + 1);
        });
      });

      openTab(current);
      ctx.setTitle(Win.isMac ? 'System Settings' : 'Control Panel');

      return {
        onReopen: function (a) { if (a && a.tab) openTab(a.tab); }
      };
    }
  };
})();
