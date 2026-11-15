/* WINemulator - DOSBox (js-dos) */
(function () {
  'use strict';
  Win.apps = Win.apps || {};
  Win.apps.dosbox = {
    name: 'DOSBox',
    title: 'DOSBox',
    icon: 'terminal',
    width: 760, height: 520, minWidth: 480, minHeight: 320,
    mount: function (body, ctx) {
      ctx.setTitle('DOSBox');
      ctx.setIcon('terminal');
      body.innerHTML =
        '<div class="app-dosbox">' +
        '<div class="dosbox-toolbar">' +
        '<button type="button" class="btn dosbox-default">Boot FreeDOS</button>' +
        '<button type="button" class="btn dosbox-load">Load .jsdos bundle</button>' +
        '<input type="file" class="dosbox-file" accept=".jsdos,.zip" hidden>' +
        '<span class="dosbox-status"></span>' +
        '</div>' +
        '<div class="dosbox-screen" id="dosbox-screen"></div>' +
        '</div>';

      const screen = body.querySelector('#dosbox-screen');
      const status = body.querySelector('.dosbox-status');
      const fileInput = body.querySelector('.dosbox-file');
      let instance = null;

      async function start(url) {
        status.textContent = 'Starting...';
        if (instance && typeof instance.stop === 'function') { try { await instance.stop(); } catch (e) {} }
        instance = null;
        screen.innerHTML = '';
        try {
          instance = await window.Dos(screen, { url: url, autoStart: true, kiosk: false });
          status.textContent = 'Running';
        } catch (e) {
          status.textContent = 'Error: ' + (e && e.message ? e.message : e);
          screen.textContent = String(e);
        }
      }

      body.querySelector('.dosbox-default').addEventListener('click', function () {
        start('https://br.cdn.dos.zone/js-dos/system/system-dos7.1-v1.jsdos');
      });
      body.querySelector('.dosbox-load').addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        start(url);
      });

      // no auto-boot; user loads a bundle or uses the file picker
      status.textContent = 'Load a .jsdos bundle to start (or use the button above).';

      return {
        destroy: function () { if (instance && typeof instance.stop === 'function') { try { instance.stop(); } catch (e) {} } }
      };
    }
  };
})();
