/* WINemulator — operating-system mode helpers */
(function () {
  'use strict';

  const stored = (function () {
    try { return localStorage.getItem('winemulator.os'); } catch (e) { return null; }
  })();
  const value = window.WIN_OS || document.documentElement.getAttribute('data-os') || stored || '98';
  const os = value === 'xp' ? 'xp' : '98';

  window.WIN_OS = os;
  Win.os = os;
  Win.isXP = os === 'xp';
  Win.osName = os === 'xp' ? 'Windows XP' : 'Windows 98';

  /**
   * Switch to the other desktop. The selector page remembers the choice.
   * @param {'98'|'xp'} next
   */
  Win.switchOS = function (next) {
    const target = next === 'xp' ? 'xp' : '98';
    try { localStorage.setItem('winemulator.os', target); } catch (e) {}
    if (target === 'xp') {
      const s = Win.store ? Win.store.all() : {};
      if (!s.wallpaper || s.wallpaper === 'teal') {
        try { Win.store.set({ wallpaper: 'bliss' }); } catch (e) {}
      }
    } else {
      const s = Win.store ? Win.store.all() : {};
      if (!s.wallpaper || s.wallpaper === 'bliss') {
        try { Win.store.set({ wallpaper: 'teal' }); } catch (e) {}
      }
    }
    location.href = 'desktop.html?os=' + target;
  };

  /** Open the OS chooser. */
  Win.showOSChooser = function () {
    location.href = 'index.html';
  };
})();
