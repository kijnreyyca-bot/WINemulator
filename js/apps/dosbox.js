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
        '<button type="button" class="btn dosbox-load">Load .jsdos bundle</button>' +
        '<input type="file" class="dosbox-file" accept=".jsdos,.zip" hidden>' +
        '<input type="text" class="dosbox-url" placeholder="Or paste a .jsdos URL and press Enter">' +
        '<span class="dosbox-status"></span>' +
        '</div>' +
        '<div class="dosbox-help">DOSBox runs real DOS via js-dos. Load a .jsdos bundle (from dos.zone or your own). Remote bundles must allow CORS.</div>' +
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

      body.querySelector('.dosbox-load').addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        start(url);
      });
      const urlInput = body.querySelector('.dosbox-url');
      urlInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { const u = urlInput.value.trim(); if (u) start(u); }
      });

      // no auto-boot; user loads a bundle or uses the file picker
      status.textContent = 'Load a .jsdos bundle to start.';

      return {
        destroy: function () { if (instance && typeof instance.stop === 'function') { try { instance.stop(); } catch (e) {} } }
      };
    }
  };
})();
