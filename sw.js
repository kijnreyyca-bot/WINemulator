/* WINemulator — offline cache */
'use strict';

const CACHE = 'winemulator-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './css/base.css',
  './css/desktop.css',
  './css/apps.css',
  './js/icons.js',
  './js/util.js',
  './js/sound.js',
  './js/fs.js',
  './js/ui.js',
  './js/wm.js',
  './js/taskbar.js',
  './js/desktop.js',
  './js/boot.js',
  './js/apps/explorer.js',
  './js/apps/notepad.js',
  './js/apps/paint.js',
  './js/apps/calc.js',
  './js/apps/terminal.js',
  './js/apps/minesweeper.js',
  './js/apps/settings.js',
  './js/apps/taskmgr.js',
  './js/apps/browser.js',
  './js/apps/help.js',
  './js/main.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
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

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      const fresh = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () { return null; });

      if (cached) return cached;

      return fresh.then(function (res) {
        if (res) return res;
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
