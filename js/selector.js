/* WINemulator — OS chooser */
(function () {
  'use strict';
  const cards = Array.prototype.slice.call(document.querySelectorAll('.os-card'));
  let saved = null;
  try { saved = localStorage.getItem('winemulator.os'); } catch (e) { saved = null; }

  cards.forEach(function (card) {
    if (saved && card.dataset.os === saved) {
      const badge = card.querySelector('[data-last]');
      if (badge) badge.hidden = false;
      card.classList.add('last-used');
    }
    card.addEventListener('click', function () {
      const os = card.dataset.os === 'xp' ? 'xp' : '98';
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
