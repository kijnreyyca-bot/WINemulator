/* WINemulator — offline cache */
'use strict';

const CACHE = 'winemulator-v80';
const CORE = [
  './',
  './index.html',
  './desktop.html',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/favicon.png',
  './assets/favicon.ico',
  './assets/bliss.svg',
  './assets/harmony.svg',
  './assets/hero.svg',
  './assets/vi-gate.svg',
  './css/base.css',
  './css/desktop.css',
  './css/apps.css',
  './css/xp.css',
  './css/win7.css',
  './css/win10.css',
  './css/w2k.css',
  './css/selector.css',
  './css/vi.css',
  './js/icons.js',
  './js/icons-vi.js',
  './js/icons-xp.js',
  './js/icons-7.js',
  './js/icons-10.js',
  './js/os.js',
  './js/selector.js',
  './js/util.js',
  './js/sound.js',
  './js/fs.js',
  './js/ui.js',
  './js/wm.js',
  './js/taskbar.js',
  './js/desktop.js',
  './js/vi.js',
  './js/boot.js',
  './js/apps/explorer.js',
  './js/apps/files.js',
  './js/apps/surf.js',
  './js/apps/notepad.js',
  './js/apps/paint.js',
  './js/apps/calc.js',
  './js/apps/minesweeper.js',
  './js/apps/terminal.js',
  './js/apps/langs-core.js?v=80',
  './js/apps/langs.js',
  './js/apps/runner.js',
  './js/apps/eaglercraft.js',
  './js/apps/driving.js',
  './js/apps/settings.js',
  './js/apps/taskmgr.js',
  './js/apps/browser.js',
  './js/apps/firefox.js',
  './js/apps/help.js',
  './js/apps/vpc.js',
  './js/main.js',
  './Driving Game/index.html',
  './Driving Game/three.min.js',
  './Driving Game/styles.css',
  './Driving Game/textures.js',
  './Driving Game/car.js',
  './Driving Game/game.js'
];
const EXTRA = [
  './vendor/v86/libv86.js',
  './vendor/v86/v86.wasm',
  './vendor/v86/seabios.bin',
  './vendor/v86/vgabios.bin'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(CORE).then(function () {
        return Promise.all(EXTRA.map(function (url) {
          return fetch(url).then(function (res) {
            if (res && res.status === 200 && res.type === 'basic') return cache.put(url, res);
          }).catch(function () { return null; });
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE ? null : caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  // Network-first so code updates land on the first reload; cache is the offline fallback.
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return caches.match('./index.html').then(function (fallback) {
            return fallback || new Response('WINemulator is offline and its cache is empty. Reconnect once to install it.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
        }
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});
