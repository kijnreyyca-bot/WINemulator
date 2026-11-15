/* WINemulator — bootstrap */
(function () {
  'use strict';
  Win.version = '1.0.0';
  Win.build = 'web-2026';

  function sysinfo() {
    let gpu = 'Canvas / software';
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      }
    } catch (e) {}
    return {
      cores: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 8,
      screen: window.screen.width + '×' + window.screen.height,
      viewport: innerWidth + '×' + innerHeight,
      dpr: window.devicePixelRatio || 1,
      gpu: String(gpu),
      ua: navigator.userAgent,
      platform: navigator.platform || 'Web',
      lang: navigator.language || 'en',
      bootMs: Win.bootMs || 0,
      startedAt: Win.startedAt || Date.now(),
      online: navigator.onLine
    };
  }
  Win.sysinfo = sysinfo;

  function init() {
    Win.fs.init();
    Win.taskbar.init();
    Win.desktop.init();
    if (window.innerWidth < 760) document.body.classList.add('is-mobile');
    window.addEventListener('resize', function () {
      document.body.classList.toggle('is-mobile', window.innerWidth < 760);
    });
    document.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest && ev.target.closest('button, .menu-item, .sm-item, .task-btn, .fd-quick')) {
        Win.sound.play('click');
      }
    }, true);
    Win.boot.start();
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      const hadController = !!navigator.serviceWorker.controller;
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!hadController || refreshing) return;
        refreshing = true;
        location.reload();
      });
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
