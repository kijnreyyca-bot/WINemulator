/* WINemulator — Virtual PC (v86 x86 emulator integration)
 *
 * v86 is vendored under vendor/v86 (BSD-2-Clause). It runs real x86 code in
 * WebAssembly. No operating-system images are bundled; the demo boots a tiny
 * 16-bit boot sector generated below. Users can load their own disk images.
 */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  let loaderPromise = null;

  function loadV86() {
    if (window.V86) return Promise.resolve(window.V86);
    if (!loaderPromise) {
      loaderPromise = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = 'vendor/v86/libv86.js';
        s.async = true;
        s.onload = function () {
          if (window.V86) resolve(window.V86);
          else reject(new Error('The v86 runtime loaded but did not register itself.'));
        };
        s.onerror = function () {
          loaderPromise = null;
          reject(new Error('Could not load vendor/v86/libv86.js. Check that the vendor folder was deployed.'));
        };
        document.head.appendChild(s);
      });
    }
    return loaderPromise;
  }

  /* ----------------------------------------------------------- demo image */
  /* A real 16-bit x86 boot sector: set text mode, print a message through the
     BIOS teletype service, then halt. Assembled by hand so it needs no tools. */
  function buildDemoFloppy() {
    const FLOPPY_SIZE = 1474560;
    const img = new Uint8Array(FLOPPY_SIZE);
    const code = [];
    const at = function () { return code.length; };

    code.push(0xB8, 0x03, 0x00);        // mov ax, 0x0003   (80x25 text mode)
    code.push(0xCD, 0x10);              // int 0x10
    code.push(0xBE);                    // mov si, msg
    const siAt = at(); code.push(0, 0);
    const loop = at();
    code.push(0xAC);                    // lodsb
    code.push(0x84, 0xC0);              // test al, al
    code.push(0x74); const jzAt = at(); code.push(0); // jz hang
    code.push(0xB4, 0x0E);              // mov ah, 0x0e (teletype)
    code.push(0xCD, 0x10);              // int 0x10
    code.push(0xEB); const jmpAt = at(); code.push(0); // jmp loop
    const hang = at();
    code.push(0xFA);                    // cli
    code.push(0xF4);                    // hlt
    code.push(0xEB, 0xFD);              // jmp $-1
    const msgAt = at();

    const text =
      '\r\n' +
      '  ==============================================\r\n' +
      '     W I N e m u l a t o r   V i r t u a l   P C\r\n' +
      '  ==============================================\r\n' +
      '\r\n' +
      '  Powered by v86 - a real x86 PC in WebAssembly.\r\n' +
      '\r\n' +
      '  This machine just booted from a 1.44 MB floppy\r\n' +
      '  image that JavaScript assembled, byte by byte.\r\n' +
      '  The CPU is emulating 16-bit real mode right now.\r\n' +
      '\r\n' +
      '  Load your own disk image to boot something bigger:\r\n' +
      '\r\n' +
      '    * FreeDOS or MS-DOS  .img\r\n' +
      '    * Windows 98         .img / .raw\r\n' +
      '    * Linux              .iso\r\n' +
      '\r\n' +
      '  Toolbar: Pause  Reset  Ctrl+Alt+Del  Fullscreen\r\n' +
      '\r\n' +
      '  No operating-system images are bundled with this\r\n' +
      '  project. Only x86 (32-bit) code is supported.\r\n' +
      '\r\n' +
      '  Press any key or click Reset to run it again.\r\n' +
      '\r\n' +
      '  _\r\n';
    for (let i = 0; i < text.length; i++) code.push(text.charCodeAt(i) & 0xFF);
    code.push(0);

    code[siAt] = (0x7C00 + msgAt) & 0xFF;
    code[siAt + 1] = ((0x7C00 + msgAt) >> 8) & 0xFF;
    code[jzAt] = (hang - (jzAt + 1)) & 0xFF;
    code[jmpAt] = (loop - (jmpAt + 1)) & 0xFF;

    img.set(code, 0);
    img[510] = 0x55;
    img[511] = 0xAA;
    return img.buffer;
  }

  /* --------------------------------------------------------- scancode map */
  const SCAN = {
    Escape: 0x01,
    Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05, Digit5: 0x06,
    Digit6: 0x07, Digit7: 0x08, Digit8: 0x09, Digit9: 0x0A, Digit0: 0x0B,
    Minus: 0x0C, Equal: 0x0D, Backspace: 0x0E, Tab: 0x0F,
    KeyQ: 0x10, KeyW: 0x11, KeyE: 0x12, KeyR: 0x13, KeyT: 0x14,
    KeyY: 0x15, KeyU: 0x16, KeyI: 0x17, KeyO: 0x18, KeyP: 0x19,
    BracketLeft: 0x1A, BracketRight: 0x1B, Enter: 0x1C, ControlLeft: 0x1D,
    KeyA: 0x1E, KeyS: 0x1F, KeyD: 0x20, KeyF: 0x21, KeyG: 0x22,
    KeyH: 0x23, KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26,
    Semicolon: 0x27, Quote: 0x28, Backquote: 0x29, ShiftLeft: 0x2A,
    Backslash: 0x2B, KeyZ: 0x2C, KeyX: 0x2D, KeyC: 0x2E, KeyV: 0x2F,
    KeyB: 0x30, KeyN: 0x31, KeyM: 0x32, Comma: 0x33, Period: 0x34,
    Slash: 0x35, ShiftRight: 0x36, NumpadMultiply: 0x37, AltLeft: 0x38,
    Space: 0x39, CapsLock: 0x3A,
    F1: 0x3B, F2: 0x3C, F3: 0x3D, F4: 0x3E, F5: 0x3F, F6: 0x40,
    F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, NumLock: 0x45, ScrollLock: 0x46,
    Numpad7: 0x47, Numpad8: 0x48, Numpad9: 0x49, NumpadSubtract: 0x4A,
    Numpad4: 0x4B, Numpad5: 0x4C, Numpad6: 0x4D, NumpadAdd: 0x4E,
    Numpad1: 0x4F, Numpad2: 0x50, Numpad3: 0x51, Numpad0: 0x52,
    NumpadDecimal: 0x53, F11: 0x57, F12: 0x58
  };
  const SCAN_EXT = {
    ArrowUp: 0x48, ArrowDown: 0x50, ArrowLeft: 0x4B, ArrowRight: 0x4D,
    Home: 0x47, End: 0x4F, PageUp: 0x49, PageDown: 0x51,
    Insert: 0x52, Delete: 0x53,
    ControlRight: 0x1D, AltRight: 0x38, NumpadEnter: 0x1C, NumpadDivide: 0x35,
    MetaLeft: 0x5B, MetaRight: 0x5C
  };

  function fmtSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 2) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  Win.apps.vpc = {
    name: 'Virtual PC', title: 'Virtual PC', icon: 'vpc',
    width: 820, height: 620, minWidth: 500, minHeight: 380,
    singleton: true,
    mount: function (body, ctx) {
      body.classList.add('app-vpc');
      body.innerHTML =
        '<div class="vpc-toolbar">' +
        '  <button class="btn vpc-start" type="button" data-act="start">' + Win.icon('power', 14) + ' Start</button>' +
        '  <button class="btn vpc-pause" type="button" data-act="pause" disabled>' + Win.icon('pause', 14) + ' Pause</button>' +
        '  <button class="btn vpc-reset" type="button" data-act="reset" disabled>' + Win.icon('restart', 14) + ' Reset</button>' +
        '  <button class="btn vpc-demo" type="button" data-act="demo">' + Win.icon('run', 14) + ' Demo disk</button>' +
        '  <button class="btn vpc-load" type="button" data-act="load">' + Win.icon('open', 14) + ' Load image…</button>' +
        '  <span class="vpc-sep"></span>' +
        '  <label class="vpc-memlab">RAM <select class="field vpc-mem">' +
        '    <option value="32">32 MB</option><option value="64" selected>64 MB</option>' +
        '    <option value="128">128 MB</option><option value="256">256 MB</option>' +
        '  </select></label>' +
        '  <span class="vpc-sep"></span>' +
        '  <button class="btn vpc-cad" type="button" data-act="cad" disabled title="Send Ctrl+Alt+Del">Ctrl+Alt+Del</button>' +
        '  <button class="btn vpc-full" type="button" data-act="full">' + Win.icon('monitor', 14) + ' Fullscreen</button>' +
        '  <input class="vpc-file" type="file" accept=".img,.ima,.iso,.raw,.bin,.dsk" hidden>' +
        '</div>' +
        '<div class="vpc-stage" tabindex="0" role="application" aria-label="Virtual machine display">' +
        '  <div class="vpc-screen">' +
        '    <div class="vpc-text"></div>' +
        '    <canvas></canvas>' +
        '  </div>' +
        '  <div class="vpc-welcome">' +
        '    <div class="vpc-welcome-inner">' +
        '      <div class="vpc-logo">' + Win.icon('vpc', 56) + '</div>' +
        '      <h2>Virtual PC</h2>' +
        '      <p>A real x86 computer, emulated in WebAssembly by <b>v86</b>. It can boot DOS, Windows 98, Linux and other 32-bit x86 systems from a disk image you supply.</p>' +
        '      <div class="vpc-welcome-btns">' +
        '        <button class="btn vpc-w-demo" type="button">' + Win.icon('run', 16) + ' Boot the demo disk</button>' +
        '        <button class="btn vpc-w-load" type="button">' + Win.icon('open', 16) + ' Load an image…</button>' +
        '      </div>' +
        '      <div class="vpc-legal">No operating-system images are bundled. 64-bit x86 is not supported by v86. Windows XP images may be very slow and are not guaranteed to boot.</div>' +
        '    </div>' +
        '  </div>' +
        '</div>' +
        '<div class="vpc-status">' +
        '  <span class="vpc-led" data-state="off"></span>' +
        '  <span class="vpc-msg">Powered off</span>' +
        '  <span class="vpc-media"></span>' +
        '  <span class="vpc-badge">x86 &middot; v86</span>' +
        '</div>';

      const stage = body.querySelector('.vpc-stage');
      const screenEl = body.querySelector('.vpc-screen');
      const canvas = body.querySelector('.vpc-screen canvas');
      const textEl = body.querySelector('.vpc-text');
      const welcome = body.querySelector('.vpc-welcome');
      const fileEl = body.querySelector('.vpc-file');
      const led = body.querySelector('.vpc-led');
      const msgEl = body.querySelector('.vpc-msg');
      const mediaEl = body.querySelector('.vpc-media');
      const startBtn = body.querySelector('.vpc-start');
      const pauseBtn = body.querySelector('.vpc-pause');
      const resetBtn = body.querySelector('.vpc-reset');
      const cadBtn = body.querySelector('.vpc-cad');
      const demoBtn = body.querySelector('.vpc-demo');
      const loadBtn = body.querySelector('.vpc-load');
      const memSel = body.querySelector('.vpc-mem');
      const fullBtn = body.querySelector('.vpc-full');

      let emulator = null;
      let running = false;
      let paused = false;
      let busy = false;
      let mediaLabel = '';

      function setState(state, message) {
        led.dataset.state = state;
        if (message) msgEl.textContent = message;
        const on = state === 'running' || state === 'paused' || state === 'loading';
        startBtn.disabled = on || busy;
        pauseBtn.disabled = !(state === 'running' || state === 'paused');
        resetBtn.disabled = !on;
        cadBtn.disabled = !(state === 'running' || state === 'paused');
        demoBtn.disabled = busy;
        loadBtn.disabled = busy;
        memSel.disabled = on;
        pauseBtn.innerHTML = (state === 'paused' ? Win.icon('run', 14) + ' Resume' : Win.icon('pause', 14) + ' Pause');
        pauseBtn.dataset.act = state === 'paused' ? 'resume' : 'pause';
        if (on) welcome.hidden = true;
      }

      function setMedia(text) {
        mediaLabel = text || '';
        mediaEl.textContent = mediaLabel;
      }

      function destroy() {
        if (emulator) {
          try { emulator.destroy(); } catch (e) {}
          emulator = null;
        }
        running = false;
        paused = false;
        canvas.style.display = 'none';
        textEl.textContent = '';
      }

      function boot(image) {
        if (busy) return;
        busy = true;
        welcome.hidden = true;
        setState('loading', 'Loading the x86 core…');
        destroy();
        const mem = (parseInt(memSel.value, 10) || 64) * 1024 * 1024;
        loadV86().then(function (V86) {
          const opts = {
            wasm_path: 'vendor/v86/v86.wasm',
            bios: { url: 'vendor/v86/seabios.bin' },
            vga_bios: { url: 'vendor/v86/vgabios.bin' },
            screen_container: screenEl,
            memory_size: mem,
            vga_memory_size: 8 * 1024 * 1024,
            autostart: true,
            disable_keyboard: true,
            disable_mouse: false,
            boot_order: 0x321
          };
          if (image.kind === 'cdrom') {
            opts.cdrom = { buffer: image.buffer };
            opts.boot_order = 0x213;
          } else if (image.kind === 'hda') {
            opts.hda = { buffer: image.buffer };
            opts.boot_order = 0x132;
          } else {
            opts.fda = { buffer: image.buffer };
            opts.boot_order = 0x321;
          }
          emulator = new V86(opts);
          running = true;
          paused = false;
          busy = false;
          setMedia(image.label);
          setState('running', 'Running — click the screen, then type');
          emulator.add_listener('emulator-stopped', function () {
            if (running && !paused) { running = false; setState('off', 'The machine stopped'); }
          });
          emulator.add_listener('download-error', function (e) {
            if (e && e.file_name) Win.ui.toast('Virtual PC could not load ' + e.file_name + '.', 'warning', 3200);
          });
          setTimeout(function () { stage.focus({ preventScroll: true }); }, 120);
        }).catch(function (err) {
          busy = false;
          running = false;
          setState('off', 'Could not start the emulator');
          Win.ui.error(err && err.message ? err.message : String(err), 'Virtual PC');
          welcome.hidden = false;
        });
      }

      function bootDemo() {
        setMedia('demo.img · 1.44 MB floppy');
        boot({ kind: 'fda', buffer: buildDemoFloppy(), label: 'demo.img · 1.44 MB floppy' });
      }

      function pickKind(name, size) {
        const ext = String(name).toLowerCase().split('.').pop();
        if (ext === 'iso') return 'cdrom';
        if (size > 0 && size <= 2949120) return 'fda';
        return 'hda';
      }

      function onFile() {
        const f = fileEl.files && fileEl.files[0];
        if (!f) return;
        if (f.size > 512 * 1024 * 1024) {
          Win.ui.error('That image is larger than 512 MB. Browser memory limits would make it unreliable.', 'Virtual PC');
          return;
        }
        const kind = pickKind(f.name, f.size);
        setState('loading', 'Reading ' + f.name + '…');
        const reader = new FileReader();
        reader.onload = function () {
          const label = f.name + ' · ' + fmtSize(f.size) + (kind === 'cdrom' ? ' (CD-ROM)' : kind === 'fda' ? ' (floppy)' : ' (hard disk)');
          boot({ kind: kind, buffer: reader.result, label: label });
        };
        reader.onerror = function () {
          setState('off', 'Could not read that file');
          Win.ui.error('That disk image could not be read.', 'Virtual PC');
        };
        reader.readAsArrayBuffer(f);
      }

      function pause() {
        if (!emulator) return;
        if (paused) {
          emulator.run();
          paused = false;
          setState('running', 'Running');
        } else {
          emulator.stop();
          paused = true;
          setState('paused', 'Paused');
        }
      }

      function reset() {
        if (!emulator) return;
        try { emulator.restart(); paused = false; setState('running', 'Restarted'); }
        catch (e) { Win.ui.error('The machine could not be restarted.', 'Virtual PC'); }
      }

      function cad() {
        if (!emulator) return;
        try { emulator.keyboard_send_scancodes([0x1D, 0x38, 0x53, 0x9D, 0xB8, 0xD3]); }
        catch (e) {}
        stage.focus({ preventScroll: true });
      }

      /* Keyboard is captured only while the VM display has focus, so the rest of
         the desktop keeps working normally. */
      stage.addEventListener('keydown', function (ev) {
        if (!emulator || !running) return;
        if (ev.metaKey) return;
        if (ev.ctrlKey && ['r', 'w', 't', 'n', 'l', 'p'].indexOf(ev.key.toLowerCase()) > -1) return;
        if (ev.key === 'F5' || ev.key === 'F11' || ev.key === 'F12') return;

        const ext = SCAN_EXT[ev.code];
        if (ext !== undefined) {
          try { emulator.keyboard_send_scancodes([0xE0, ext]); } catch (e) {}
          ev.preventDefault(); ev.stopPropagation();
          return;
        }
        const code = SCAN[ev.code];
        if (code !== undefined) {
          try { emulator.keyboard_send_scancodes([code]); } catch (e) {}
          ev.preventDefault(); ev.stopPropagation();
          return;
        }
        if (ev.key && ev.key.length === 1) {
          try { emulator.keyboard_send_text(ev.key); } catch (e) {}
          ev.preventDefault(); ev.stopPropagation();
        }
      });
      stage.addEventListener('keyup', function (ev) {
        if (!emulator || !running) return;
        const ext = SCAN_EXT[ev.code];
        if (ext !== undefined) {
          try { emulator.keyboard_send_scancodes([0xE0, ext | 0x80]); } catch (e) {}
          ev.preventDefault(); ev.stopPropagation();
          return;
        }
        const code = SCAN[ev.code];
        if (code !== undefined) {
          try { emulator.keyboard_send_scancodes([code | 0x80]); } catch (e) {}
          ev.preventDefault(); ev.stopPropagation();
        }
      });
      stage.addEventListener('pointerdown', function () { stage.focus({ preventScroll: true }); });

      body.addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-act], .vpc-w-demo, .vpc-w-load');
        if (!b) return;
        if (b.classList.contains('vpc-w-demo')) { bootDemo(); return; }
        if (b.classList.contains('vpc-w-load')) { fileEl.value = ''; fileEl.click(); return; }
        const act = b.dataset.act;
        if (act === 'start' || act === 'demo') bootDemo();
        else if (act === 'load') { fileEl.value = ''; fileEl.click(); }
        else if (act === 'pause' || act === 'resume') pause();
        else if (act === 'reset') reset();
        else if (act === 'cad') cad();
        else if (act === 'full') {
          if (document.fullscreenElement) document.exitFullscreen();
          else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () {});
        }
      });
      fileEl.addEventListener('change', onFile);
      fullBtn.addEventListener('click', function () {});
      document.addEventListener('fullscreenchange', function () {
        fullBtn.innerHTML = (document.fullscreenElement ? Win.icon('monitor', 14) + ' Windowed' : Win.icon('monitor', 14) + ' Fullscreen');
      });

      setState('off', 'Powered off');
      ctx.setTitle('Virtual PC');
      if (Win.isXP) ctx.setIcon('vpc');

      return {
        onClose: function () { destroy(); },
        destroy: destroy
      };
    }
  };
})();
