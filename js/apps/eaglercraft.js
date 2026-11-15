/* WINemulator - Eaglercraft 1.8.8 (WASM-GC) */
(function () {
  'use strict';
  (function registerIcon(){
    try {
      if (!window.Win) window.Win = {};
      if (!Win.icons) Win.icons = {};
      Win.icons.eaglercraft = '<image href="assets/eaglercraft.png" width="32" height="32" preserveAspectRatio="xMidYMid slice"/>';
      const sp = document.getElementById('icon-sprite');
      if (sp && !sp.querySelector('#i-eaglercraft')) {
        const sym = document.createElementNS('http://www.w3.org/2000/svg','symbol');
        sym.setAttribute('id','i-eaglercraft');
        sym.setAttribute('viewBox','0 0 32 32');
        sym.innerHTML = Win.icons.eaglercraft;
        sp.appendChild(sym);
      }
    } catch (e) {}
  })();
  Win.apps = Win.apps || {};
  Win.apps.eaglercraft = {
    name: 'Eaglercraft',
    title: 'Eaglercraft 1.8.8',
    icon: 'eaglercraft',
    width: 960, height: 640, minWidth: 640, minHeight: 480,
    mount: function (body, ctx) {
      ctx.setTitle('Eaglercraft 1.8.8');
      ctx.setIcon('eaglercraft');
      body.innerHTML =
        '<div class="app-eaglercraft" style="width:100%;height:100%;margin:0;padding:0;overflow:hidden;">' +
        '<iframe src="eaglercraft.html" style="width:100%;height:100%;border:0;" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>' +
        '</div>';
      return { destroy: function () {} };
    }
  };
})();
