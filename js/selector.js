/* WINemulator — OS chooser */
(function () {
  'use strict';
  const cards = Array.prototype.slice.call(document.querySelectorAll('.os-card'));
  let saved = null;
  try { saved = localStorage.getItem('winemulator.os'); } catch (e) { saved = null; }
  const aliases = { vi: 'mac', osx: 'mac', mvi: 'mac', macos: 'mac', 2000: '2k' };
  if (saved && aliases[saved]) saved = aliases[saved];

  cards.forEach(function (card) {
    if (saved && card.dataset.os === saved) {
      const badge = card.querySelector('[data-last]');
      if (badge) badge.hidden = false;
      card.classList.add('last-used');
    }
    card.addEventListener('click', function () {
      const os = card.dataset.os === 'mac' ? 'mac' : card.dataset.os === '9' ? '9' : card.dataset.os === '7' ? '7' : card.dataset.os === 'xp' ? 'xp' : card.dataset.os === '2k' ? '2k' : card.dataset.os === 'dos' ? 'dos' : '98';
      try { localStorage.setItem('winemulator.os', os); } catch (e) {}
    });
    card.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); card.click(); }
    });
  });

  if (!saved) {
    const first = document.querySelector('.os-card');
    if (first) first.focus();
  }
})();
