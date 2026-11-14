/* WINemulator — operating-system mode helpers */
(function () {
  'use strict';

  const stored = (function () {
    try { return localStorage.getItem('winemulator.os'); } catch (e) { return null; }
  })();
  const value = window.WIN_OS || document.documentElement.getAttribute('data-os') || stored || '98';
  const os = value === '7' || value === 'win7' ? '7' : value === 'xp' ? 'xp' : '98';

  window.WIN_OS = os;
  Win.os = os;
  Win.isSeven = os === '7';
  Win.isXP = os === 'xp';
  Win.is98 = os === '98';
  Win.osName = Win.isSeven ? 'Windows 7' : Win.isXP ? 'Windows XP' : 'Windows 98';
  Win.osNameFull = Win.isSeven ? 'Windows 7 Ultimate' : Win.isXP ? 'Windows XP Professional' : 'Windows 98 Second Edition';
  Win.osVersion = Win.isSeven ? '6.1.7601' : Win.isXP ? '5.1.2600' : '4.10.2222';
  Win.osBuild = Win.isSeven ? '7601.win7sp1_gdr.260101-0000' : Win.isXP ? '2600.xpsp_sp3_gdr.260101-0000' : '2222 A';

  function patchSettings(patch) {
    try {
      const raw = localStorage.getItem('winemulator.settings');
      const data = raw ? JSON.parse(raw) : {};
      Object.assign(data, patch);
      localStorage.setItem('winemulator.settings', JSON.stringify(data));
    } catch (e) {}
  }

  /**
   * Switch desktop mode. The selector page remembers the choice.
   * @param {'98'|'xp'|'7'} next
   */
  Win.switchOS = function (next) {
    const target = next === '7' ? '7' : next === 'xp' ? 'xp' : '98';
    try { localStorage.setItem('winemulator.os', target); } catch (e) {}
    if (target === '7') {
      const s = Win.store ? Win.store.all() : {};
      if (!s.wallpaper || s.wallpaper === 'teal' || s.wallpaper === 'bliss') patchSettings({ wallpaper: 'harmony' });
      if (!s.theme || ['classic', 'platinum', 'midnight', 'xp', 'olive', 'silver'].indexOf(s.theme) > -1) patchSettings({ theme: 'aero' });
    } else if (target === 'xp') {
      const s = Win.store ? Win.store.all() : {};
      if (!s.wallpaper || s.wallpaper === 'teal' || s.wallpaper === 'harmony') patchSettings({ wallpaper: 'bliss' });
      if (!s.theme || ['classic', 'platinum', 'midnight', 'aero', 'frost', 'dusk'].indexOf(s.theme) > -1) patchSettings({ theme: 'xp' });
    } else {
      const s = Win.store ? Win.store.all() : {};
      if (!s.wallpaper || s.wallpaper === 'bliss' || s.wallpaper === 'harmony') patchSettings({ wallpaper: 'teal' });
      if (!s.theme || ['xp', 'olive', 'silver', 'aero', 'frost', 'dusk'].indexOf(s.theme) > -1) patchSettings({ theme: 'classic' });
    }
    location.href = 'desktop.html?os=' + target;
  };

  /** Open the OS chooser. */
  Win.showOSChooser = function () {
    location.href = 'index.html';
  };
})();
