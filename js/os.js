/* WINemulator — operating-system mode helpers */
(function () {
  'use strict';

  const stored = (function () {
    try { return localStorage.getItem('winemulator.os'); } catch (e) { return null; }
  })();
  const raw = window.WIN_OS || document.documentElement.getAttribute('data-os') || stored || '98';
  const os = (raw === '7' || raw === 'win7') ? '7'
    : (raw === '9' || raw === 'win9' || raw === '10' || raw === 'win10') ? '9'
      : (raw === '2k' || raw === '2000' || raw === 'w2k' || raw === 'win2k' || raw === 'win2000') ? '2k'
        : raw === 'xp' ? 'xp' : raw === 'dos' ? 'dos' : '98';

  window.WIN_OS = os;
  Win.os = os;
  Win.isSeven = os === '7';
  Win.isNine = os === '9';
  Win.is2000 = os === '2k';
  Win.isXP = os === 'xp';
  Win.is98 = os === '98';
  Win.isDOS = os === 'dos';
  Win.isNT = Win.is2000 || Win.isXP || Win.isSeven || Win.isNine;
  Win.isModern = Win.isSeven || Win.isNine || Win.is2000;
  Win.osName = Win.isDOS ? 'MS-DOS' : Win.is2000 ? 'Windows 2000' : Win.isNine ? 'Windows 9' : Win.isSeven ? 'Windows 7' : Win.isXP ? 'Windows XP' : 'Windows 98';
  Win.osNameFull = Win.isDOS ? 'MS-DOS 6.22' : Win.is2000 ? 'Windows 2000 Professional' : Win.isNine ? 'Windows 9 Pro' : Win.isSeven ? 'Windows 7 Ultimate' : Win.isXP ? 'Windows XP Professional' : 'Windows 98 Second Edition';
  Win.osVersion = Win.isDOS ? '6.22' : Win.is2000 ? '5.0.2195' : Win.isNine ? '6.4.9841' : Win.isSeven ? '6.1.7601' : Win.isXP ? '5.1.2600' : '4.10.2222';
  Win.osBuild = Win.is2000 ? '2195' : Win.isNine ? '9841.fbl_release.260101-0000' : Win.isSeven ? '7601.win7sp1_gdr.260101-0000' : Win.isXP ? '2600.xpsp_sp3_gdr.260101-0000' : '2222 A';
  /* Short brand suffix (WINemulator 98 / 2000 / XP / 7 / 9) and edition name. */
  Win.osShort = Win.isDOS ? 'DOS' : Win.is2000 ? '2000' : Win.isNine ? '9' : Win.isSeven ? '7' : Win.isXP ? 'XP' : '98';
  Win.osEdition = Win.isDOS ? '6.22' : Win.is2000 ? 'Professional' : Win.isNine ? 'Pro' : Win.isSeven ? 'Ultimate' : Win.isXP ? 'Professional' : 'Second Edition';

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
    const target = next === '7' ? '7' : next === '9' ? '9' : next === 'xp' ? 'xp' : next === '2k' || next === '2000' ? '2k' : next === 'dos' ? 'dos' : '98';
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
    } else if (target === '2k') {
      if (!s.wallpaper || s.wallpaper === 'bliss' || s.wallpaper === 'harmony' || s.wallpaper === 'hero') patchSettings({ wallpaper: 'teal' });
      if (!s.theme || allThemes.indexOf(s.theme) > -1) patchSettings({ theme: 'classic' });
    } else if (target === 'dos') {
      if (!s.wallpaper) patchSettings({ wallpaper: 'teal' });
      if (!s.theme || allThemes.indexOf(s.theme) > -1) patchSettings({ theme: 'classic' });
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
