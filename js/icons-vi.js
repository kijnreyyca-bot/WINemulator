/* WINemulator — original VI OS icon set (no Apple assets) */
(function () {
  'use strict';
  if (!window.Win || !Win.icons) return;

  const D = {
    vi: '<defs><linearGradient id="vi-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ed4ff"/><stop offset=".5" stop-color="#4f9bf3"/><stop offset="1" stop-color="#6a63e8"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-g)"/><rect x="2.6" y="2.6" width="26.8" height="26.8" rx="6.5" fill="none" stroke="#fff" stroke-opacity=".45"/>' +
      '<path d="M9 10.5 14.2 23h3.1L22.5 10.5h-3.3l-3.1 8.6-3.2-8.6z" fill="#fff"/>',

    'vi-mark': '<path d="M5 7h5l4.4 12.2L18.6 7h5L16.4 27h-3.8z" fill="currentColor"/>',

    files: '<defs><linearGradient id="vi-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd7ff"/><stop offset="1" stop-color="#2f86df"/></linearGradient></defs>' +
      '<path d="M3 8.5a3 3 0 0 1 3-3h6.4l2.6 3H26a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#1f6db8"/>' +
      '<rect x="3" y="9.5" width="26" height="18" rx="3" fill="url(#vi-f)"/><path d="M4 11.5h24v2H4z" fill="#fff" opacity=".38"/>',

    surf: '<defs><radialGradient id="vi-s" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#8ee7ff"/><stop offset=".55" stop-color="#2f9fe0"/><stop offset="1" stop-color="#1e5eb8"/></radialGradient></defs>' +
      '<circle cx="16" cy="16" r="13" fill="url(#vi-s)"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="#fff" stroke-opacity=".65"/>' +
      '<path d="m21.5 10.5-3.6 7.4-7.4 3.6 3.6-7.4z" fill="#fff"/><path d="m10.5 21.5 7.4-3.6-3.6-7.4z" fill="#ff6b61"/><circle cx="16" cy="16" r="1.4" fill="#174b8c"/>',

    notes: '<defs><linearGradient id="vi-n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff5bd"/><stop offset="1" stop-color="#ffd85e"/></linearGradient></defs>' +
      '<rect x="5" y="3" width="22" height="26" rx="3" fill="#e0a629"/><rect x="6.5" y="4.5" width="19" height="23" rx="2.2" fill="url(#vi-n)"/>' +
      '<path d="M10 10h12M10 14h12M10 18h9" stroke="#c99a2f" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M5 8h-2v18h2" fill="#c98f22"/>',

    'terminal-mac': '<defs><linearGradient id="vi-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b4254"/><stop offset="1" stop-color="#11141d"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-t)"/><rect x="5" y="7" width="22" height="18" rx="3" fill="#090c12"/>' +
      '<path d="m9 12 4 4-4 4M16 20h7" fill="none" stroke="#8ef2b4" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',

    'settings-mac': '<defs><linearGradient id="vi-set" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f4f7"/><stop offset="1" stop-color="#a9b1bd"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-set)"/>' +
      '<path d="M13.5 5h5l.7 3.1 2.2 1.3 3-.9 2.5 4.3-2.3 2.2v2.5l2.3 2.2-2.5 4.3-3-.9-2.2 1.3-.7 3.1h-5l-.7-3.1-2.2-1.3-3 .9-2.5-4.3 2.3-2.2v-2.5L5.1 12.8l2.5-4.3 3 .9 2.2-1.3z" fill="#717b89"/>' +
      '<circle cx="16" cy="16" r="4.4" fill="#d9dee6"/><circle cx="16" cy="16" r="2.5" fill="#8793a3"/>',

    activity: '<defs><linearGradient id="vi-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c4453"/><stop offset="1" stop-color="#12161d"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-a)"/>' +
      '<path d="M5.5 17h5l2.4-6 4.1 12 2.7-7h6.3" fill="none" stroke="#5be0a0" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',

    canvas: '<defs><linearGradient id="vi-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd66e"/><stop offset="1" stop-color="#ff8a5b"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-c)"/>' +
      '<path d="M16 7a9 9 0 0 0-1 17.9c1.4.2 2-1.1 1.2-2-.7-.8-.2-2 1-2h3.3A5.5 5.5 0 0 0 26 15.4C26 10.7 21.5 7 16 7z" fill="#fff" opacity=".92"/>' +
      '<circle cx="11" cy="14" r="1.6" fill="#ff6b61"/><circle cx="16" cy="11.5" r="1.6" fill="#ffbe3d"/><circle cx="21" cy="14" r="1.6" fill="#5ac8fa"/><circle cx="12.5" cy="19" r="1.6" fill="#7ee0a1"/>',

    launchpad: '<rect x="3" y="3" width="26" height="26" rx="6" fill="#e9edf3"/>' +
      '<g fill="#5b9df0"><rect x="7" y="7" width="5" height="5" rx="1.4"/><rect x="13.5" y="7" width="5" height="5" rx="1.4" fill="#ff9f66"/><rect x="20" y="7" width="5" height="5" rx="1.4" fill="#64d394"/>' +
      '<rect x="7" y="13.5" width="5" height="5" rx="1.4" fill="#f4c95d"/><rect x="13.5" y="13.5" width="5" height="5" rx="1.4" fill="#a68cf0"/><rect x="20" y="13.5" width="5" height="5" rx="1.4" fill="#5ac8fa"/>' +
      '<rect x="7" y="20" width="5" height="5" rx="1.4" fill="#ea7a8e"/><rect x="13.5" y="20" width="5" height="5" rx="1.4" fill="#72c7c1"/><rect x="20" y="20" width="5" height="5" rx="1.4" fill="#9aa7b8"/></g>',

    trash: '<defs><linearGradient id="vi-tr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cdd6e0"/><stop offset=".45" stop-color="#f6f9fc"/><stop offset="1" stop-color="#a9b5c3"/></linearGradient></defs>' +
      '<path d="M9 9h14l-1.3 19H10.3z" fill="url(#vi-tr)" stroke="#8492a3"/><path d="M8 7h16v3H8z" fill="#dce4ed" stroke="#8492a3"/>' +
      '<path d="M12.5 4h7v3h-7z" fill="#c3ceda" stroke="#8492a3"/><path d="M13 13v11M16 13v11M19 13v11" stroke="#94a2b2" stroke-width="1.2"/>',

    'help-mac': '<circle cx="16" cy="16" r="13" fill="#5ea8e8"/><path d="M16 24.5v1.2" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M12 12.4a4.2 4.2 0 0 1 8.2 1.2c0 2.8-4.2 3.3-4.2 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',

    'vpc-mac': '<rect x="2" y="5" width="28" height="20" rx="3" fill="#cbd4df" stroke="#7d8a99"/><rect x="4.5" y="7.5" width="23" height="14" rx="1.5" fill="#252c3a"/>' +
      '<path d="M7 18 11 13l3 3 2.5-2.5L19 18z" fill="#65d59a"/><circle cx="21" cy="10.5" r="1.2" fill="#ffd166"/>' +
      '<path d="M12 25h8l1 3H11z" fill="#aab6c4"/>',

    'calc-mac': '<rect x="2" y="2" width="28" height="28" rx="7" fill="#3d4452"/><rect x="5" y="5" width="22" height="7" rx="2" fill="#202632"/>' +
      '<path d="M22 7.5h2" stroke="#ffb84d" stroke-width="1.6"/><g fill="#798394"><rect x="6" y="14" width="4" height="4" rx="1"/><rect x="11.5" y="14" width="4" height="4" rx="1"/><rect x="17" y="14" width="4" height="4" rx="1"/><rect x="22.5" y="14" width="4" height="4" rx="1"/><rect x="6" y="19.5" width="4" height="4" rx="1"/><rect x="11.5" y="19.5" width="4" height="4" rx="1"/><rect x="17" y="19.5" width="4" height="4" rx="1"/><rect x="22.5" y="19.5" width="4" height="4" rx="1"/><rect x="6" y="25" width="4" height="4" rx="1"/><rect x="11.5" y="25" width="4" height="4" rx="1"/><rect x="17" y="25" width="4" height="4" rx="1"/></g>' +
      '<g fill="#ff9f43"><rect x="22.5" y="19.5" width="4" height="9.5" rx="1"/></g>',

    'mines-mac': '<defs><linearGradient id="vi-mi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f5f8"/><stop offset="1" stop-color="#b9c4d0"/></linearGradient></defs>' +
      '<rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-mi)"/><circle cx="16" cy="17" r="8" fill="#2d3542"/>' +
      '<path d="M16 10v3M16 21v3M9 17h3M20 17h3M11 12l2 2M21 12l-2 2" stroke="#2d3542" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="13.5" cy="14.5" r="1.5" fill="#8c9bab"/>',

    'drive-mac': '<defs><linearGradient id="vi-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f8fb"/><stop offset="1" stop-color="#c2ccd8"/></linearGradient></defs>' +
      '<ellipse cx="16" cy="10" rx="12" ry="5" fill="#aab6c4"/><path d="M4 10v12c0 2.8 5.4 5 12 5s12-2.2 12-5V10" fill="url(#vi-d)"/>' +
      '<ellipse cx="16" cy="12" rx="9" ry="3.4" fill="#8fb8d8"/><circle cx="24" cy="20" r="1.6" fill="#5bcf8b"/>',

    wifi: '<path d="M16 23.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="currentColor"/>' +
      '<path d="M10.6 17.2a7.6 7.6 0 0 1 10.8 0M7 13.4a12.7 12.7 0 0 1 18 0M3.8 9.5a17.8 17.8 0 0 1 24.4 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    bluetooth: '<path d="M13 5v22l9-7.5-7-5 7-5z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="m6 11 7 5-7 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>',
    sun: '<circle cx="16" cy="16" r="6" fill="currentColor"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M25.2 6.8l-2.8 2.8M9.6 22.4l-2.8 2.8"/></g>',
    moon: '<path d="M24.5 20.8A10.5 10.5 0 0 1 11.2 7.5 10.5 10.5 0 1 0 24.5 20.8z" fill="currentColor"/>',
    search: '<circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="m20 20 7 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    'control-center': '<rect x="4" y="5" width="24" height="22" rx="6" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="8" y="9" width="6" height="6" rx="3" fill="currentColor"/><rect x="18" y="9" width="6" height="6" rx="3" fill="currentColor" opacity=".45"/><rect x="8" y="18" width="6" height="4" rx="2" fill="currentColor" opacity=".45"/><rect x="18" y="18" width="6" height="4" rx="2" fill="currentColor"/>',
    battery: '<rect x="3" y="10" width="23" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="27" y="14" width="2.5" height="4" rx="1" fill="currentColor"/><rect x="5.5" y="12.5" width="17" height="7" rx="1.5" fill="currentColor"/>',
    'user-avatar': '<circle cx="16" cy="11" r="6" fill="currentColor"/><path d="M4.5 28c1-6 5.7-9 11.5-9s10.5 3 11.5 9z" fill="currentColor"/>',
    speaker: '<path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 12a6 6 0 0 1 0 8M24 9a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    chevron: '<path d="m12 7 9 9-9 9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    'grid-view': '<g fill="currentColor"><rect x="5" y="5" width="9" height="9" rx="2"/><rect x="18" y="5" width="9" height="9" rx="2"/><rect x="5" y="18" width="9" height="9" rx="2"/><rect x="18" y="18" width="9" height="9" rx="2"/></g>',
    'list-view': '<g fill="currentColor"><rect x="5" y="7" width="4" height="4" rx="1"/><rect x="12" y="7.5" width="15" height="3" rx="1.5"/><rect x="5" y="14" width="4" height="4" rx="1"/><rect x="12" y="14.5" width="15" height="3" rx="1.5"/><rect x="5" y="21" width="4" height="4" rx="1"/><rect x="12" y="21.5" width="15" height="3" rx="1.5"/></g>',
    plus: '<path d="M16 6v20M6 16h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    lock: '<rect x="7" y="14" width="18" height="14" rx="3" fill="currentColor"/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/>',
    power: '<path d="M16 4v11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M9 7.5a10 10 0 1 0 14 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',

    'python-mac': '<defs><linearGradient id="vi-py" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#73b8ef"/><stop offset="1" stop-color="#2867b2"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-py)"/><rect x="2.6" y="2.6" width="26.8" height="26.8" rx="6.5" fill="none" stroke="#fff" stroke-opacity=".45"/><path d="M8 12c0-3.6 3.2-5.6 7-5.6 4.2 0 6.5 2 6.5 5.1 0 4.1-4.8 4.4-4.8 6.6 0 1.4 1.4 2.2 3.4 2.2 2.3 0 4.2-1.1 5.1-2.8" fill="none" stroke="#ffd86a" stroke-width="2.2" stroke-linecap="round"/><circle cx="21.5" cy="10.5" r="1.3" fill="#fff"/><text x="9.5" y="24" font-family="Avenir Next,Segoe UI,sans-serif" font-size="9.5" font-weight="700" fill="#fff">Py</text>',

    'js-mac': '<defs><linearGradient id="vi-js" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe07a"/><stop offset="1" stop-color="#e6a51a"/></linearGradient></defs><rect x="2" y="2" width="28" height="28" rx="7" fill="url(#vi-js)"/><rect x="2.6" y="2.6" width="26.8" height="26.8" rx="6.5" fill="none" stroke="#fff" stroke-opacity=".5"/><text x="7" y="22" font-family="Avenir Next,Segoe UI,sans-serif" font-size="13" font-weight="800" fill="#4a3200">JS</text><path d="M20 9v14M26 9v14M20 16h6" stroke="#4a3200" stroke-width="2.2" stroke-linecap="round"/>'
  };

  // The mine icon above is built from two concatenated strings; keep the object valid.
  Object.keys(D).forEach(function (k) { Win.icons[k] = D[k]; });

  const sprite = document.getElementById('icon-sprite');
  if (sprite) {
    sprite.insertAdjacentHTML('beforeend', Object.keys(D).map(function (k) {
      return '<symbol id="i-' + k + '" viewBox="0 0 32 32">' + D[k] + '</symbol>';
    }).join(''));
  }
})();
