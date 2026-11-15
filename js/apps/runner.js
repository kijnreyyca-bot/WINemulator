/* WINemulator - Program Runner (for .exe / .com) */
(function () {
  'use strict';
  Win.apps = Win.apps || {};
  Win.apps.runner = {
    name: 'Program',
    title: 'Program',
    icon: 'exe',
    width: 460, height: 320, minWidth: 320, minHeight: 220,
    mount: function (body, ctx) {
      const args = ctx.args || {};
      const path = args.path || '';
      const name = path ? Win.fs.baseName(path) : 'program.exe';
      ctx.setTitle(name + ' - Program');
      ctx.setIcon('exe');

      const out = [];
      body.innerHTML =
        '<div class="app-runner">' +
        '<div class="runner-head">' +
        '<span class="runner-icon">' + Win.icon('exe', 32) + '</span>' +
        '<div class="runner-meta"><div class="runner-name"></div><div class="runner-path"></div></div>' +
        '</div>' +
        '<div class="runner-console" role="log" aria-live="polite"></div>' +
        '<div class="runner-bar"><div class="runner-fill"></div></div>' +
        '<div class="runner-actions">' +
        '<button type="button" class="btn runner-vpc">Run in Virtual PC</button>' +
        '<button type="button" class="btn runner-close">Close</button>' +
        '</div>' +
        '</div>';

      body.querySelector('.runner-name').textContent = name;
      body.querySelector('.runner-path').textContent = path || '(no path)';
      const consoleEl = body.querySelector('.runner-console');
      const fill = body.querySelector('.runner-fill');

      function log(line) {
        const d = document.createElement('div');
        d.textContent = line;
        consoleEl.appendChild(d);
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }

      log('Starting ' + name + '...');
      let progress = 0;
      const timer = setInterval(function () {
        progress += Math.random() * 18 + 6;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        if (progress >= 100) {
          clearInterval(timer);
          log('Program loaded.');
          const node = path ? Win.fs.resolve(path) : null;
          if (node && node.type === 'file' && node.content && String(node.content).trim()) {
            log('--- program output ---');
            String(node.content).split(/\r?\n/).forEach(function (l) { log(l); });
            log('--- end output ---');
          } else {
            log('This is a simulated executable.');
            log('No embedded output was found.');
          }
          log('Program exited with code 0.');
        }
      }, 120);

      body.querySelector('.runner-close').addEventListener('click', function () { ctx.close(true); });
      body.querySelector('.runner-vpc').addEventListener('click', function () {
        if (Win.wm) Win.wm.open('vpc');
        if (Win.ui) Win.ui.toast('Virtual PC opened. Load a disk image containing this program to run it natively.', 'info', 4000);
      });

      return {
        onClose: function () { clearInterval(timer); return true; },
        destroy: function () { clearInterval(timer); }
      };
    }
  };
})();
