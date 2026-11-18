/* WINemulator - 3D Driving Simulator launcher */
(function () {
  'use strict';
  Win.apps = Win.apps || {};
  Win.apps.driving = {
    name: '3D Driving Simulator',
    title: '3D Driving Simulator',
    icon: 'game',
    width: 980, height: 660, minWidth: 640, minHeight: 480,
    mount: function (body, ctx) {
      ctx.setTitle('3D Driving Simulator');
      ctx.setIcon('game');
      body.innerHTML = '<div style="width:100%;height:100%;margin:0;padding:0;overflow:hidden;"><iframe src="Driving%20Game/index.html?v=80" style="width:100%;height:100%;border:0;" allowfullscreen></iframe></div>';
      return { destroy: function () {} };
    }
  };
})();
