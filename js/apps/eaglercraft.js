/* WINemulator - Eaglercraft 1.8.8 (WASM-GC) */
(function () {
  'use strict';
  Win.apps = Win.apps || {};
  Win.apps.eaglercraft = {
    name: 'Eaglercraft',
    title: 'Eaglercraft 1.8.8',
    icon: 'game',
    width: 960, height: 640, minWidth: 640, minHeight: 480,
    mount: function (body, ctx) {
      ctx.setTitle('Eaglercraft 1.8.8');
      ctx.setIcon('game');
      body.innerHTML =
        '<div class="app-eaglercraft" style="width:100%;height:100%;margin:0;padding:0;overflow:hidden;">' +
        '<iframe src="eaglercraft.html" style="width:100%;height:100%;border:0;" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>' +
        '</div>';
      return { destroy: function () {} };
    }
  };
})();
