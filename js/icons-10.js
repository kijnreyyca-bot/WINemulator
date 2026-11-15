/* WINemulator — Windows 9 (flat) icon set
 * Loaded after icons.js / icons-xp.js / icons-7.js. Only overrides icons when
 * the Windows 9 desktop is active. Shapes are drawn from scratch in a flat,
 * square, accent-coloured style.
 */
window.Win = window.Win || {};
(function () {
  'use strict';
  if (!Win.isNine) return;

  const FLAT = {
    /* four square panes: the flat Start mark (no circle) */
    win10:
      '<rect x="3" y="3" width="11.5" height="11.5" fill="#f4f8ff"/>' +
      '<rect x="17.5" y="3" width="11.5" height="11.5" fill="#f4f8ff"/>' +
      '<rect x="3" y="17.5" width="11.5" height="11.5" fill="#f4f8ff"/>' +
      '<rect x="17.5" y="17.5" width="11.5" height="11.5" fill="#f4f8ff"/>',
    flag:
      '<rect x="3" y="3" width="11.5" height="11.5" fill="#4cc2ff"/>' +
      '<rect x="17.5" y="3" width="11.5" height="11.5" fill="#4cc2ff"/>' +
      '<rect x="3" y="17.5" width="11.5" height="11.5" fill="#4cc2ff"/>' +
      '<rect x="17.5" y="17.5" width="11.5" height="11.5" fill="#4cc2ff"/>',
    windows:
      '<rect x="3" y="3" width="11.5" height="11.5" fill="#4cc2ff"/>' +
      '<rect x="17.5" y="3" width="11.5" height="11.5" fill="#4cc2ff"/>' +
      '<rect x="3" y="17.5" width="11.5" height="11.5" fill="#4cc2ff"/>' +
      '<rect x="17.5" y="17.5" width="11.5" height="11.5" fill="#4cc2ff"/>',

    computer:
      '<rect x="2" y="4" width="28" height="19" rx="1" fill="#2d2d30"/>' +
      '<rect x="3.6" y="5.6" width="24.8" height="15.8" fill="#0a4f8f"/>' +
      '<path d="M3.6 13.6h24.8v7.8H3.6z" fill="#1277c4"/>' +
      '<rect x="9" y="24" width="14" height="2.4" fill="#5f6368"/>' +
      '<rect x="5" y="27" width="22" height="2.4" rx="1" fill="#8a8f94"/>',
    monitor:
      '<rect x="2" y="4" width="28" height="19" rx="1" fill="#2d2d30"/>' +
      '<rect x="3.6" y="5.6" width="24.8" height="15.8" fill="#0a4f8f"/>' +
      '<rect x="9" y="24" width="14" height="2.4" fill="#5f6368"/>' +
      '<rect x="5" y="27" width="22" height="2.4" rx="1" fill="#8a8f94"/>',
    folder:
      '<path d="M2 8h10l3 3h15v16H2z" fill="#ffc83d"/>' +
      '<path d="M2 11h28v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="#ffd35c"/>',
    'folder-open':
      '<path d="M2 8h10l3 3h14v4H2z" fill="#ffc83d"/>' +
      '<path d="M4 12h27l-4 15H1z" fill="#ffd35c"/>',
    documents:
      '<path d="M4 6h10l3 3h14v17H4z" fill="#ffc83d"/>' +
      '<path d="M6 12h20v12H6z" fill="#fff3cf"/>',
    recycle:
      '<path d="M8 9h16l-1.6 18H9.6z" fill="#5ba8e8"/>' +
      '<path d="M7 7h18v3H7z" fill="#3d86c6"/>' +
      '<path d="M13 12v11M17 12v11M21 12v11" stroke="#e8f4ff" stroke-width="1.4"/>',
    'recycle-full':
      '<path d="M8 9h16l-1.6 18H9.6z" fill="#5ba8e8"/>' +
      '<path d="M7 7h18v3H7z" fill="#3d86c6"/>' +
      '<path d="M11 5l2-3h6l2 3z" fill="#8a8f94"/>',

    notepad:
      '<rect x="5" y="3" width="22" height="26" rx="1" fill="#ffffff" stroke="#b9bfc6"/>' +
      '<rect x="5" y="3" width="22" height="6" fill="#0078d7"/>' +
      '<path d="M9 13h14M9 18h14M9 23h9" stroke="#6b7076" stroke-width="1.6"/>',
    paint:
      '<path d="M4 22c0-9 7-16 15-16 5 0 8 3 8 7 0 5-5 8-12 8H4z" fill="#e8f2fb" stroke="#b0c4d8"/>' +
      '<circle cx="12" cy="11" r="2.2" fill="#e8503a"/>' +
      '<circle cx="19" cy="9.4" r="2.2" fill="#ffc83d"/>' +
      '<circle cx="24" cy="14" r="2.2" fill="#4cc2ff"/>' +
      '<path d="M3 27c4-3 8-3 12 0" stroke="#8a8f94" stroke-width="2" fill="none"/>',
    terminal:
      '<rect x="2" y="4" width="28" height="24" rx="1" fill="#101010" stroke="#3a3a3a"/>' +
      '<path d="M6 11l5 5-5 5" stroke="#4cc2ff" stroke-width="2.2" fill="none"/>' +
      '<path d="M14 21h10" stroke="#f4f8ff" stroke-width="2"/>',
    powershell:
      '<rect x="2" y="4" width="28" height="24" rx="1" fill="#012456"/>' +
      '<path d="M6 10l7 6-7 6" stroke="#8fd3ff" stroke-width="2.2" fill="none"/>' +
      '<path d="M14 22h11" stroke="#dceeff" stroke-width="2"/>',
    settings:
      '<rect x="3" y="3" width="26" height="26" rx="2" fill="#4cc2ff"/>' +
      '<circle cx="16" cy="16" r="7.4" fill="#ffffff"/>' +
      '<circle cx="16" cy="16" r="3.2" fill="#0a6bb0"/>' +
      '<path d="M16 8.6v-3M16 26.4v-3M8.6 16h-3M26.4 16h-3" stroke="#ffffff" stroke-width="2.4"/>',
    user:
      '<circle cx="16" cy="11" r="6" fill="#8fc7ef"/>' +
      '<path d="M4 28c1-7 6-10 12-10s11 3 12 10z" fill="#4c9bd8"/>',
    search:
      '<circle cx="14" cy="14" r="9" fill="none" stroke="#4cc2ff" stroke-width="3"/>' +
      '<path d="M20.5 20.5 28 28" stroke="#4cc2ff" stroke-width="3.6" stroke-linecap="round"/>',
    mine:
      '<circle cx="16" cy="17" r="10" fill="#2d2d30"/>' +
      '<path d="M16 3v6M16 25v6M3 17h6M25 17h6M7 8l4 4M25 8l-4 4M7 26l4-4M25 26l-4-4" stroke="#2d2d30" stroke-width="2.4"/>' +
      '<circle cx="12" cy="13" r="2" fill="#f4f8ff"/>',
    game:
      '<rect x="1.8" y="10.2" width="28.4" height="14.2" rx="4" fill="#2d2d30"/>' +
      '<path d="M8.4 15.2v5M5.9 17.7h5" stroke="#4cc2ff" stroke-width="2"/>' +
      '<circle cx="22" cy="15.2" r="2" fill="#ff6f6f"/><circle cx="25.2" cy="19.2" r="2" fill="#ffc83d"/>',
    calc:
      '<rect x="5" y="2" width="22" height="28" rx="2" fill="#3a3a3a"/>' +
      '<rect x="8" y="5" width="16" height="6" fill="#b9e6ff"/>' +
      '<g fill="#8a8f94"><rect x="8" y="14" width="4" height="4"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="4" height="4"/>' +
      '<rect x="8" y="20" width="4" height="4"/><rect x="14" y="20" width="4" height="4"/><rect x="20" y="20" width="4" height="4"/>' +
      '<rect x="8" y="26" width="10" height="2"/></g>',
    taskmgr:
      '<rect x="2" y="3" width="28" height="26" rx="1" fill="#f7f9fb" stroke="#b9bfc6"/>' +
      '<rect x="2" y="3" width="28" height="5" fill="#0078d7"/>' +
      '<path d="M6 24l4-7 4 4 4-9 4 6 4-4" stroke="#0078d7" stroke-width="2" fill="none"/>',
    vpc:
      '<rect x="2" y="5" width="22" height="16" rx="1" fill="#2d2d30"/>' +
      '<rect x="3.6" y="6.6" width="18.8" height="12.8" fill="#1277c4"/>' +
      '<rect x="9" y="25" width="22" height="4" rx="1" fill="#8a8f94"/>' +
      '<rect x="23" y="13" width="8" height="12" rx="1" fill="#4cc2ff"/>',
    help:
      '<circle cx="16" cy="16" r="13" fill="#0078d7"/>' +
      '<path d="M12.4 12.4c.4-2.4 2-3.8 4.2-3.8 2.5 0 4.2 1.5 4.2 3.7 0 2-1 2.9-2.8 4.1-1.4 1-1.8 1.7-1.8 3.1v.6" stroke="#fff" stroke-width="2.4" fill="none"/>' +
      '<circle cx="16" cy="24.4" r="1.8" fill="#fff"/>',
    programs:
      '<rect x="3" y="3" width="12" height="12" fill="#4cc2ff"/>' +
      '<rect x="17" y="3" width="12" height="12" fill="#ffc83d"/>' +
      '<rect x="3" y="17" width="12" height="12" fill="#ff6f6f"/>' +
      '<rect x="17" y="17" width="12" height="12" fill="#7ad17a"/>',
    image:
      '<rect x="3" y="5" width="26" height="22" rx="1" fill="#dceaf6" stroke="#a8bccd"/>' +
      '<circle cx="11" cy="12" r="3" fill="#ffc83d"/>' +
      '<path d="M4 25l7-8 5 5 4-4 8 7z" fill="#4cc2ff"/>',
    sound:
      '<path d="M5 12h5l6-5v18l-6-5H5z" fill="#4cc2ff"/>' +
      '<path d="M20 11c2 2 2 8 0 10M24 8c4 4 4 12 0 16" stroke="#4cc2ff" stroke-width="2.2" fill="none"/>',
    shutdown:
      '<circle cx="16" cy="17" r="11" fill="none" stroke="#4cc2ff" stroke-width="3"/>' +
      '<path d="M16 3v9" stroke="#4cc2ff" stroke-width="3.4"/>',
    logoff:
      '<path d="M12 4h-8v24h8" fill="none" stroke="#4cc2ff" stroke-width="3"/>' +
      '<path d="M14 16h14M22 10l6 6-6 6" fill="none" stroke="#4cc2ff" stroke-width="3"/>',
    restart:
      '<path d="M16 4a12 12 0 1 1-8.5 3.5" fill="none" stroke="#4cc2ff" stroke-width="3"/>' +
      '<path d="M4 4v7h7" fill="none" stroke="#4cc2ff" stroke-width="3"/>',
    lock:
      '<rect x="7" y="14" width="18" height="15" rx="1" fill="#4cc2ff"/>' +
      '<path d="M11 14v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#4cc2ff" stroke-width="3"/>' +
      '<circle cx="16" cy="21" r="2" fill="#0a4f8f"/>',
    pause:
      '<rect x="9" y="5" width="5" height="22" fill="#4cc2ff"/><rect x="18" y="5" width="5" height="22" fill="#4cc2ff"/>',
    volume:
      '<path d="M3 12h6l7-6v20l-7-6H3z" fill="#e8f2fb"/>' +
      '<path d="M20 11c2 2 2 8 0 10M24 8c4 4 4 12 0 16" stroke="#e8f2fb" stroke-width="2.2" fill="none"/>',
    'no-sound':
      '<path d="M3 12h6l7-6v20l-7-6H3z" fill="#e8f2fb"/>' +
      '<path d="M21 12l7 8M28 12l-7 8" stroke="#ff8080" stroke-width="2.4"/>',
    network:
      '<rect x="3" y="20" width="26" height="8" fill="#4cc2ff"/>' +
      '<path d="M8 20v-6M16 20V9M24 20v-8" stroke="#4cc2ff" stroke-width="2.4"/>',
    mail:
      '<rect x="2" y="7" width="28" height="18" fill="#4cc2ff"/>' +
      '<path d="M2 7l14 11L30 7" fill="none" stroke="#e8f2fb" stroke-width="2"/>',
    'textfile':
      '<path d="M7 2h12l7 7v21H7z" fill="#ffffff" stroke="#b9bfc6"/>' +
      '<path d="M19 2v7h7" fill="#dceaf6" stroke="#b9bfc6"/>' +
      '<path d="M11 14h10M11 18h10M11 22h7" stroke="#6b7076" stroke-width="1.6"/>',
    open:
      '<path d="M2 8h10l3 3h13v6H2z" fill="#ffc83d"/>' +
      '<path d="M4 14h27l-4 13H1z" fill="#ffd35c"/>',
    save:
      '<rect x="4" y="3" width="24" height="26" fill="#4cc2ff"/>' +
      '<rect x="9" y="4" width="14" height="9" fill="#e8f2fb"/>' +
      '<rect x="8" y="18" width="16" height="10" fill="#ffffff"/>'
  };

  const sprite = document.getElementById('icon-sprite');
  if (!sprite) return;
  Object.keys(FLAT).forEach(function (name) {
    let symbol = document.getElementById('i-' + name);
    if (!symbol) {
      symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.setAttribute('id', 'i-' + name);
      symbol.setAttribute('viewBox', '0 0 32 32');
      sprite.appendChild(symbol);
    }
    symbol.innerHTML = FLAT[name];
  });
  Object.assign(Win.icons, FLAT);
})();
