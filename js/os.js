/* WINemulator — operating-system mode helpers */
(function () {
  'use strict';

  const stored = (function () {
    try { return localStorage.getItem('winemulator.os'); } catch (e) { return null; }
  })();
  const raw = window.WIN_OS || document.documentElement.getAttribute('data-os') || stored || '98';
  const os = (raw === '7' || raw === 'win7') ? '7'
    : (raw === '9' || raw === 'win9' || raw === '10' || raw === 'win10') ? '9'
      : raw === 'xp' ? 'xp' : '98';

  window.WIN_OS = os;
  Win.os = os;
  Win.isSeven = os === '7';
  Win.isNine = os === '9';
  Win.isXP = os === 'xp';
  Win.is98 = os === '98';
  Win.isModern = Win.isSeven || Win.isNine;
  Win.osName = Win.isNine ? 'Windows 9' : Win.isSeven ? 'Windows 7' : Win.isXP ? 'Windows XP' : 'Windows 98';
  Win.osNameFull = Win.isNine ? 'Windows 9 Pro' : Win.isSeven ? 'Windows 7 Ultimate' : Win.isXP ? 'Windows XP Professional' : 'Windows 98 Second Edition';
  Win.osVersion = Win.isNine ? '6.4.9841' : Win.isSeven ? '6.1.7601' : Win.isXP ? '5.1.2600' : '4.10.2222';
  Win.osBuild = Win.isNine ? '9841.fbl_release.260101-0000' : Win.isSeven ? '7601.win7sp1_gdr.260101-0000' : Win.isXP ? '2600.xpsp_sp3_gdr.260101-0000' : '2222 A';

  function patchSettings(patch) {
    try {
      const rawSettings = localStorage.getItem('winemulator.settings');
      const data = rawSettings ? JSON.parse(rawSettings) : {};
      Object.assign(data, patch);
      localStorage.setItem('winemulator.settings', JSON.stringify(data));
    } catch (e) {}
  }

  /**
   * Switch desktop mode. The selector page remembers the choice.
   * @param {'98'|'xp'|'7'|'9'} next
   */
  Win.switchOS = function (next) {
    const target = next === '7' ? '7' : next === '9' ? '9' : next === 'xp' ? 'xp' : '98';
    try { localStorage.setItem('winemulator.os', target); } catch (e) {}
    const s = Win.store ? Win.store.all() : {};
    const desktopTheme = ['classic', 'platinum', 'midnight'];
    const glossyTheme = ['xp', 'olive', 'silver'];
    const glassTheme = ['aero', 'frost', 'dusk'];
    const flatTheme = ['win10'];
    const allThemes = desktopTheme.concat(glossyTheme, glassTheme, flatTheme);
    if (target === '9') {
      if (!s.wallpaper || s.wallpaper === 'teal' || s.wallpaper === 'bliss' || s.wallpaper === 'harmony') patchSettings({ wallpaper: 'hero' });
      if (!s.theme || allThemes.indexOf(s.theme) > -1) patchSettings({ theme: 'win10' });
    } else if (target === '7') {
      if (!s.wallpaper || s.wallpaper === 'teal' || s.wallpaper === 'bliss' || s.wallpaper === 'hero') patchSettings({ wallpaper: 'harmony' });
      if (!s.theme || allThemes.indexOf(s.theme) > -1) patchSettings({ theme: 'aero' });
    } else if (target === 'xp') {
      if (!s.wallpaper || s.wallpaper === 'teal' || s.wallpaper === 'harmony' || s.wallpaper === 'hero') patchSettings({ wallpaper: 'bliss' });
      if (!s.theme || allThemes.indexOf(s.theme) > -1) patchSettings({ theme: 'xp' });
    } else {
      if (!s.wallpaper || s.wallpaper === 'bliss' || s.wallpaper === 'harmony' || s.wallpaper === 'hero') patchSettings({ wallpaper: 'teal' });
      if (!s.theme || allThemes.indexOf(s.theme) > -1) patchSettings({ theme: 'classic' });
    }
    location.href = 'desktop.html?os=' + target;
  };

  /** Open the OS chooser. */
  Win.showOSChooser = function () {
    location.href = 'index.html';
  };
})();
