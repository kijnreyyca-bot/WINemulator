/* WINemulator — Windows 7 style icon set (original SVG recreations)
 * Loaded after icons.js and icons-xp.js. Only overrides icons when the
 * Windows 7 desktop is active. Every shape is drawn from scratch; nothing is
 * traced from a Microsoft icon file.
 */
window.Win = window.Win || {};
(function () {
  'use strict';
  if (!Win.isSeven) return;

  const GLASS = {
    flag:
      '<path d="M3 9.4c4.1-2 7.7-3 11.5-3.5v7.4C10.7 13.8 7.1 14.8 3 16.8z" fill="#f2503a"/>' +
      '<path d="M3 18.4c4.1-2 7.7-3 11.5-3.5v7.4c-3.8.5-7.4 1.5-11.5 3.5z" fill="#2f8fe0"/>' +
      '<path d="M16.6 5.6C20.9 5 24.4 4.5 29 3.5v7.4c-4.6 1-8.1 1.5-12.4 2.1z" fill="#57c04e"/>' +
      '<path d="M16.6 14.7c4.3-.6 7.8-1.1 12.4-2.1v7.4c-4.6 1-8.1 1.5-12.4 2.1z" fill="#ffcb2e"/>' +
      '<path d="M3 9.4 14.5 5.9 29 3.5l-.4 1.4L16.2 7.1 3.4 10.8z" fill="#fff" opacity=".42"/>' +
      '<path d="M16.2 7.1v7.2l12.4-1.9V4.9z" fill="#fff" opacity=".12"/>',
    windows:
      '<path d="M3 9.4c4.1-2 7.7-3 11.5-3.5v7.4C10.7 13.8 7.1 14.8 3 16.8z" fill="#f2503a"/>' +
      '<path d="M3 18.4c4.1-2 7.7-3 11.5-3.5v7.4c-3.8.5-7.4 1.5-11.5 3.5z" fill="#2f8fe0"/>' +
      '<path d="M16.6 5.6C20.9 5 24.4 4.5 29 3.5v7.4c-4.6 1-8.1 1.5-12.4 2.1z" fill="#57c04e"/>' +
      '<path d="M16.6 14.7c4.3-.6 7.8-1.1 12.4-2.1v7.4c-4.6 1-8.1 1.5-12.4 2.1z" fill="#ffcb2e"/>' +
      '<path d="M3 9.4 14.5 5.9 29 3.5l-.4 1.4L16.2 7.1 3.4 10.8z" fill="#fff" opacity=".42"/>',
    orb:
      '<circle cx="16" cy="16" r="14" fill="#062a4d"/>' +
      '<circle cx="16" cy="16" r="13.1" fill="#1e6fb0"/>' +
      '<circle cx="16" cy="16" r="11.6" fill="#3aa4e2" opacity=".55"/>' +
      '<path d="M15.4 8.6c-3 .5-5 .9-7.2 1.5v4.8c2.2-.6 4.2-.9 7.2-1.4z" fill="#f2503a"/>' +
      '<path d="M15.4 16.3c-3 .5-5 .9-7.2 1.5v4.6c2.2-.6 4.2-1 7.2-1.5z" fill="#2f8fe0"/>' +
      '<path d="M16.9 8.1c3-.4 5.3-.7 7.9-1.2v4.8c-2.6.5-4.9.8-7.9 1.2z" fill="#57c04e"/>' +
      '<path d="M16.9 15.8c3-.4 5.3-.7 7.9-1.2v4.8c-2.6.5-4.9.8-7.9 1.2z" fill="#ffcb2e"/>' +
      '<ellipse cx="12.2" cy="10.2" rx="6.6" ry="3.4" fill="#fff" opacity=".34"/>' +
      '<path d="M5.4 12.4a12 12 0 0 1 17.8-6.2" fill="none" stroke="#eaffff" stroke-width="1.2" opacity=".55"/>' +
      '<circle cx="16" cy="16" r="13.1" fill="none" stroke="#9fe6ff" stroke-width="1" opacity=".7"/>',

    computer:
      '<rect x="2" y="4" width="28" height="20" rx="2.6" fill="#dbe8f3" stroke="#4d637a"/>' +
      '<rect x="3.6" y="5.6" width="24.8" height="15.4" rx="1.4" fill="#0d4e8a"/>' +
      '<path d="M3.6 15.2h24.8v4.4c0 .8-.6 1.4-1.4 1.4H5c-.8 0-1.4-.6-1.4-1.4z" fill="#2f9fe0"/>' +
      '<path d="M5 6.8h14.2L8 19.4H5z" fill="#7fd4ff" opacity=".28"/>' +
      '<rect x="3.6" y="5.6" width="24.8" height="4.4" rx="1.3" fill="#fff" opacity=".3"/>' +
      '<rect x="11.4" y="25" width="9.2" height="2.4" fill="#9fb3c6" stroke="#5d748b"/>' +
      '<rect x="5.6" y="27.6" width="20.8" height="2.6" rx="1.2" fill="#d7e3ef" stroke="#5d748b"/>' +
      '<circle cx="26.2" cy="23.2" r=".9" fill="#5ae05a"/>',
    monitor:
      '<rect x="2" y="4" width="28" height="20" rx="2.6" fill="#e0ebf5" stroke="#4d637a"/>' +
      '<rect x="3.6" y="5.6" width="24.8" height="15.4" rx="1.4" fill="#0c477e"/>' +
      '<path d="M3.6 15.2h24.8v4.4c0 .8-.6 1.4-1.4 1.4H5c-.8 0-1.4-.6-1.4-1.4z" fill="#2f9fe0"/>' +
      '<path d="M5 6.8h13L8 19.4H5z" fill="#7fd4ff" opacity=".24"/>' +
      '<rect x="11.4" y="25" width="9.2" height="2.4" fill="#9fb3c6" stroke="#5d748b"/>' +
      '<rect x="5.6" y="27.6" width="20.8" height="2.6" rx="1.2" fill="#d7e3ef" stroke="#5d748b"/>',

    folder:
      '<path d="M2.4 7.6c0-1 .8-1.8 1.8-1.8h8.1l2.4 3.1h13.1c1 0 1.8.8 1.8 1.8v3.2H2.4z" fill="#e7a41c" stroke="#956306"/>' +
      '<path d="M2.4 12.6h27.2v13.8c0 1.1-.9 2-2 2H4.4c-1.1 0-2-.9-2-2z" fill="#ffd15a" stroke="#956306"/>' +
      '<path d="M2.4 12.6h27.2v2.4H2.4z" fill="#ffeaa4"/>' +
      '<path d="M4.2 16.6h23.6" stroke="#fff" stroke-width="1.1" opacity=".55"/>' +
      '<path d="M5 18.8h21" stroke="#f0a923" stroke-width="1" opacity=".55"/>',
    'folder-open':
      '<path d="M2.4 7.6c0-1 .8-1.8 1.8-1.8h8.1l2.4 3.1h13.1c1 0 1.8.8 1.8 1.8v3.2H2.4z" fill="#e7a41c" stroke="#956306"/>' +
      '<path d="M4.2 27.2 7.8 12.8h24.6l-3.8 14.4z" fill="#ffdc72" stroke="#956306"/>' +
      '<path d="M6.2 14.4h23.6l-2.7 10.8H3.5z" fill="#ffeaa4"/>' +
      '<path d="M2.4 12.6h12.4v14.2H4.4c-1.1 0-2-.9-2-2z" fill="#f5b72e" stroke="#956306"/>',
    documents:
      '<path d="M2.4 7.6c0-1 .8-1.8 1.8-1.8h8.1l2.4 3.1h13.1c1 0 1.8.8 1.8 1.8v3.2H2.4z" fill="#e7a41c" stroke="#956306"/>' +
      '<path d="M2.4 12.6h27.2v13.8c0 1.1-.9 2-2 2H4.4c-1.1 0-2-.9-2-2z" fill="#ffd15a" stroke="#956306"/>' +
      '<rect x="10" y="5.8" width="12.6" height="15.8" rx=".7" fill="#fff" stroke="#75899c"/>' +
      '<path d="M12.4 9.2h7.8M12.4 12.2h7.8M12.4 15.2h5.4" stroke="#5b8cba" stroke-width="1.1"/>' +
      '<path d="M2.4 12.6h27.2v2.2H2.4z" fill="#fff0b8" opacity=".8"/>',
    programs:
      '<path d="M2.4 7.6c0-1 .8-1.8 1.8-1.8h8.1l2.4 3.1h13.1c1 0 1.8.8 1.8 1.8v3.2H2.4z" fill="#e7a41c" stroke="#956306"/>' +
      '<path d="M2.4 12.6h27.2v13.8c0 1.1-.9 2-2 2H4.4c-1.1 0-2-.9-2-2z" fill="#ffd15a" stroke="#956306"/>' +
      '<rect x="8" y="8" width="16" height="12.6" rx="1" fill="#eef6fd" stroke="#5c748b"/>' +
      '<rect x="9" y="9" width="14" height="3" fill="#2f7fc4"/>' +
      '<path d="M10.4 14.4h11.2M10.4 17.2h7.8" stroke="#8a9cae" stroke-width="1"/>',

    file:
      '<path d="M6.4 2.4h12l7 7v20.2H6.4z" fill="#fff" stroke="#75899c"/>' +
      '<path d="M18.4 2.4v7h7" fill="#dbe6f2" stroke="#75899c"/>' +
      '<path d="M9.4 14h11.2M9.4 17h11.2M9.4 20h8" stroke="#6b93bd" stroke-width="1.2"/>' +
      '<path d="M6.4 2.4h12l-12 12z" fill="#f4f9ff" opacity=".55"/>',
    textfile:
      '<path d="M6.4 2.4h12l7 7v20.2H6.4z" fill="#fff" stroke="#75899c"/>' +
      '<path d="M18.4 2.4v7h7" fill="#dbe6f2" stroke="#75899c"/>' +
      '<rect x="8.8" y="11" width="11.4" height="10" rx=".6" fill="#f2f8ff" stroke="#a6bdd5"/>' +
      '<path d="M10.4 13.4h8.2M10.4 15.6h8.2M10.4 17.8h5.2" stroke="#6b93bd" stroke-width=".9"/>' +
      '<path d="M9.4 23.4h10.6M9.4 26h7" stroke="#8fa9c4" stroke-width="1"/>',
    image:
      '<path d="M6.4 2.4h12l7 7v20.2H6.4z" fill="#fff" stroke="#75899c"/>' +
      '<path d="M18.4 2.4v7h7" fill="#dbe6f2" stroke="#75899c"/>' +
      '<rect x="8.8" y="11" width="13.4" height="10.8" rx=".6" fill="#bfe8ff" stroke="#6b93bd"/>' +
      '<circle cx="18.6" cy="14" r="1.7" fill="#ffe066"/>' +
      '<path d="m8.8 21.8 4.2-5.4 3.2 3.2 2.6-2.8 3.4 5z" fill="#5ebc4a"/>' +
      '<rect x="8.8" y="11" width="13.4" height="3.2" fill="#fff" opacity=".4"/>',
    imagefile:
      '<rect x="7.2" y="2.4" width="18" height="27" rx="1.2" fill="#fff" stroke="#75899c"/>' +
      '<rect x="9.2" y="6.2" width="14" height="11.4" rx=".6" fill="#bfe8ff" stroke="#6b93bd"/>' +
      '<circle cx="19.8" cy="9.4" r="1.7" fill="#ffe066"/>' +
      '<path d="m9.2 17.6 4.4-5.6 3.2 3.2 2.6-2.8 3.8 5.2z" fill="#5ebc4a"/>' +
      '<path d="M10.4 21.6h11.2M10.4 24.4h7.4" stroke="#8fa9c4" stroke-width="1"/>',
    exe:
      '<rect x="2.8" y="4.4" width="26.4" height="23.2" rx="1.6" fill="#dce8f4" stroke="#4d637a"/>' +
      '<rect x="4.2" y="5.8" width="23.6" height="4.6" fill="#1b5f9e"/>' +
      '<rect x="7.8" y="13.6" width="16.4" height="10.2" rx=".7" fill="#fff" stroke="#7d93a9"/>' +
      '<path d="m11 16 6 2.8-6 2.8z" fill="#3aa35a" stroke="#1d6b35"/>' +
      '<path d="M20.4 17h2.2M20.4 20h2.2" stroke="#9fb3c6" stroke-width="1"/>',
    paint:
      '<ellipse cx="14.6" cy="17.4" rx="11.4" ry="9.6" fill="#e6c191" stroke="#6f522f"/>' +
      '<ellipse cx="14.6" cy="15.4" rx="11.4" ry="8" fill="#f2d7b0" opacity=".55"/>' +
      '<circle cx="9.6" cy="12.4" r="1.9" fill="#e33"/><circle cx="15.4" cy="10.2" r="1.9" fill="#e6b800"/>' +
      '<circle cx="21.2" cy="12.6" r="1.9" fill="#2a9d4a"/><circle cx="22.2" cy="18.2" r="1.9" fill="#2f6fd0"/>' +
      '<circle cx="10.4" cy="20.2" r="1.9" fill="#8a4fbf"/>' +
      '<path d="m19.4 28.4 7.2-16.2 3.2 1.6-7.2 16.2z" fill="#9a6331" stroke="#4c2f14"/>' +
      '<path d="m26.6 12.2 3-6.2 2.2 1.1-2.2 6.3z" fill="#d8d8d8" stroke="#444"/>' +
      '<path d="m18.4 27.4 3-3.2 2.2 2.1-2.2 3.2z" fill="#222"/>',
    calc:
      '<rect x="5" y="2.2" width="22" height="27.6" rx="2" fill="#1d4977" stroke="#0d2c4d"/>' +
      '<rect x="7" y="4.2" width="18" height="5.4" rx=".8" fill="#bfe8c8" stroke="#4d6f55"/>' +
      '<path d="M9 7h14" stroke="#2f4f2f" stroke-width="2"/>' +
      '<g fill="#e9f2fa" stroke="#7d93a9"><rect x="7.6" y="12" width="4" height="3.4" rx=".6"/><rect x="14" y="12" width="4" height="3.4" rx=".6"/><rect x="20.4" y="12" width="4" height="3.4" rx=".6"/><rect x="7.6" y="17.4" width="4" height="3.4" rx=".6"/><rect x="14" y="17.4" width="4" height="3.4" rx=".6"/><rect x="20.4" y="17.4" width="4" height="3.4" rx=".6"/><rect x="7.6" y="22.8" width="10.4" height="3.2" rx=".6"/><rect x="20.4" y="22.8" width="4" height="3.2" rx=".6"/></g>' +
      '<rect x="20.4" y="12" width="4" height="3.4" rx=".6" fill="#3a9ad9" stroke="#1b5c8c"/>' +
      '<rect x="5" y="4.2" width="22" height="7" rx="1.6" fill="#fff" opacity=".14"/>',
    terminal:
      '<rect x="2.2" y="4.2" width="27.6" height="23.6" rx="1.8" fill="#dce8f4" stroke="#4d637a"/>' +
      '<rect x="3.8" y="5.8" width="24.4" height="20.4" rx=".8" fill="#061426"/>' +
      '<path d="m7 11 3.4 3.2L7 17.4" fill="none" stroke="#9fe6ff" stroke-width="1.7"/>' +
      '<path d="M12.6 17.4h8" stroke="#9fe6ff" stroke-width="1.7"/>' +
      '<rect x="3.8" y="5.8" width="24.4" height="4.2" rx=".8" fill="#fff" opacity=".12"/>',
    powershell:
      '<rect x="2.2" y="4.2" width="27.6" height="23.6" rx="1.8" fill="#c9dcf0" stroke="#41607f"/>' +
      '<rect x="3.8" y="5.8" width="24.4" height="20.4" rx=".8" fill="#0a2a52"/>' +
      '<path d="M3.8 5.8h24.4v4.2H3.8z" fill="#2f7fc4" opacity=".85"/>' +
      '<path d="m7.2 12.6 3.2 3-3.2 3" fill="none" stroke="#7fd4ff" stroke-width="1.6"/>' +
      '<path d="M12.4 18.6h5.2" stroke="#7fd4ff" stroke-width="1.6"/>' +
      '<path d="M20 12.6h4.6M20 15.6h6M20 18.6h4" stroke="#cfe9ff" stroke-width="1.1" opacity=".8"/>',
    mine:
      '<circle cx="16" cy="19" r="9.2" fill="#26303a" stroke="#0b0f14"/>' +
      '<circle cx="13" cy="16" r="2.1" fill="#7d8b99"/>' +
      '<path d="M16 10c0-3 2-5 5-6" fill="none" stroke="#9a6331" stroke-width="2.1"/>' +
      '<path d="m21 4 3-1-1 3 3-1-2 3" fill="none" stroke="#ffb000" stroke-width="1.4"/>' +
      '<path d="M7 19h18M16 11v16M9 12l14 14M23 12 9 26" stroke="#05080b" stroke-width="1.7"/>' +
      '<circle cx="12.4" cy="15.2" r="2.6" fill="#fff" opacity=".18"/>',
    'mine-flag':
      '<path d="M14 4v24" stroke="#26303a" stroke-width="2.2"/>' +
      '<path d="M15 5h12l-3 4 3 4H15z" fill="#e63b2e" stroke="#7a0d12"/>' +
      '<path d="M8 28h14" stroke="#26303a" stroke-width="2.2"/>' +
      '<path d="M16 6.4h6" stroke="#fff" stroke-width="1" opacity=".45"/>',
    ie:
      '<circle cx="16" cy="16" r="12.2" fill="#2f8fe0" stroke="#14547f"/>' +
      '<path d="M6.4 12.4c6-2.8 18-2.6 22 .6" fill="none" stroke="#7fe0ff" stroke-width="2" opacity=".7"/>' +
      '<path d="M8 20.4c5 2 14 2 18-.8" fill="none" stroke="#7fe0ff" stroke-width="1.6" opacity=".5"/>' +
      '<ellipse cx="16" cy="17.4" rx="15.4" ry="6" fill="none" stroke="#ffc23a" stroke-width="2.2" transform="rotate(-16 16 17.4)"/>' +
      '<text x="16" y="25.4" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="700" font-style="italic" fill="#eaf8ff" stroke="#0f4f7a" stroke-width=".7">e</text>' +
      '<path d="M9.6 9.4c2.4-3.2 11.4-3.8 12.6 2.6" fill="none" stroke="#fff" stroke-width="2" opacity=".35"/>',
    settings:
      '<rect x="3" y="4.6" width="26" height="23" rx="2" fill="#e8f1fa" stroke="#4d637a"/>' +
      '<rect x="4.4" y="6" width="23.2" height="4.4" fill="#2f7fc4"/>' +
      '<path d="M7.4 14h17.2M7.4 19h17.2M7.4 24h17.2" stroke="#8fa6bb" stroke-width="1.4"/>' +
      '<circle cx="12" cy="14" r="2.1" fill="#fff" stroke="#3b7fb0"/><circle cx="20.4" cy="19" r="2.1" fill="#fff" stroke="#3b7fb0"/>' +
      '<circle cx="15.2" cy="24" r="2.1" fill="#fff" stroke="#3b7fb0"/>' +
      '<rect x="3" y="4.6" width="26" height="6.6" rx="2" fill="#fff" opacity=".18"/>',
    taskmgr:
      '<rect x="3" y="4.2" width="26" height="23.6" rx="2" fill="#e8f1fa" stroke="#4d637a"/>' +
      '<rect x="4.4" y="5.6" width="23.2" height="4.4" fill="#2f7fc4"/>' +
      '<rect x="6" y="11.4" width="20" height="13.4" rx=".7" fill="#0a1f33"/>' +
      '<rect x="8.6" y="19.4" width="3.2" height="4" fill="#43d675"/>' +
      '<rect x="13.6" y="15.6" width="3.2" height="7.8" fill="#ffd23f"/>' +
      '<rect x="18.6" y="12.6" width="3.2" height="10.8" fill="#ff6b57"/>' +
      '<path d="M7.4 13.6h17.2" stroke="#2f7f4f" stroke-width="1"/>',
    recycle:
      '<path d="M7 9.4h18l-2.4 19.2H9.4z" fill="#c8dbea" fill-opacity=".85" stroke="#3d5368"/>' +
      '<path d="M10.4 9.4V6h11.2v3.4" fill="#a8c2d6" stroke="#3d5368"/>' +
      '<path d="M5 9.4h22" stroke="#3d5368" stroke-width="2.1"/>' +
      '<path d="m16 13.8 3.4 6.2h-2.2v4.2h-2.4V20h-2.2z" fill="#2f8fe0" stroke="#14547f"/>' +
      '<path d="M8.6 11.4h2.2M14 11.4h4M21.2 11.4h2.2" stroke="#fff" stroke-width="1.2" opacity=".7"/>',
    'recycle-full':
      '<path d="M7 9.4h18l-2.4 19.2H9.4z" fill="#c8dbea" fill-opacity=".9" stroke="#3d5368"/>' +
      '<path d="M10.4 9.4V6h11.2v3.4" fill="#a8c2d6" stroke="#3d5368"/>' +
      '<path d="M5 9.4h22" stroke="#3d5368" stroke-width="2.1"/>' +
      '<path d="m11.4 8.4-4-4.6 5 1.8M20.6 7.6l3-4.4 2 3.6" fill="#fff" stroke="#6a8298"/>' +
      '<path d="m16 13.8 3.4 6.2h-2.2v4.2h-2.4V20h-2.2z" fill="#2f8fe0" stroke="#14547f"/>',
    drive:
      '<rect x="2.4" y="8" width="27.2" height="17" rx="2.4" fill="#cfdae5" stroke="#3d5368"/>' +
      '<rect x="4.4" y="10" width="23.2" height="13" rx="1.2" fill="#eaf2f9"/>' +
      '<circle cx="22.4" cy="16.6" r="4.6" fill="#a8bbc9" stroke="#4d637a"/>' +
      '<circle cx="22.4" cy="16.6" r="1.5" fill="#f4f8fb"/>' +
      '<rect x="7" y="13" width="9" height="2" fill="#7d93a9"/>' +
      '<rect x="7" y="18" width="6" height="2" fill="#9fb3c6"/>' +
      '<circle cx="27.2" cy="21.4" r="1.1" fill="#4ad66a"/>' +
      '<rect x="2.4" y="8" width="27.2" height="4" rx="2" fill="#fff" opacity=".4"/>',
    network:
      '<rect x="2.4" y="6.4" width="13" height="10" rx="1.2" fill="#dce8f4" stroke="#4d637a"/>' +
      '<rect x="3.8" y="7.8" width="10.2" height="7.2" fill="#1f5f9e"/>' +
      '<rect x="6" y="16.4" width="5" height="2" fill="#8fa6bb"/>' +
      '<rect x="3.4" y="20.4" width="11" height="2.2" rx="1" fill="#cfdae5" stroke="#4d637a"/>' +
      '<rect x="16.6" y="12.4" width="13" height="10" rx="1.2" fill="#dce8f4" stroke="#4d637a"/>' +
      '<rect x="18" y="13.8" width="10.2" height="7.2" fill="#1f5f9e"/>' +
      '<rect x="20.4" y="22.4" width="5" height="2" fill="#8fa6bb"/>' +
      '<rect x="17.6" y="26.4" width="11" height="2.2" rx="1" fill="#cfdae5" stroke="#4d637a"/>' +
      '<path d="M8 18.4v3.4h16v-3.4" fill="none" stroke="#3aa35a" stroke-width="2"/>' +
      '<circle cx="8" cy="18" r="1.4" fill="#4ad66a"/><circle cx="24" cy="18" r="1.4" fill="#4ad66a"/>',
    volume:
      '<path d="M4 12h6l7-6v20l-7-6H4z" fill="#dce8f4" stroke="#41576d"/>' +
      '<path d="M21 10c3 2 3 10 0 12M24 7c5 4 5 14 0 18" fill="none" stroke="#2f8fe0" stroke-width="2.1"/>' +
      '<path d="M4 12h6l7-6v6l-7 5H4z" fill="#fff" opacity=".3"/>',
    user:
      '<rect x="2.4" y="2.6" width="27.2" height="26.8" rx="3" fill="#cfe4f7" stroke="#5c748b"/>' +
      '<rect x="3.6" y="3.8" width="24.8" height="24.4" rx="2.2" fill="#6fb4e8"/>' +
      '<circle cx="16" cy="12.6" r="5.4" fill="#f4e2c8" stroke="#8a6a4a"/>' +
      '<path d="M6.4 28c0-6.6 4.3-10.4 9.6-10.4S25.6 21.4 25.6 28z" fill="#2f6fa8" stroke="#1a4a75"/>' +
      '<path d="M10.6 11.4c2-2.6 8.8-2.6 10.8 0" fill="none" stroke="#8a6a4a" stroke-width="1.8"/>' +
      '<rect x="3.6" y="3.8" width="24.8" height="9" rx="2.2" fill="#fff" opacity=".2"/>',
    notepad:
      '<rect x="4.4" y="3" width="23.2" height="26" rx="1.6" fill="#dce8f4" stroke="#4d637a"/>' +
      '<rect x="7" y="5.2" width="17.4" height="21.8" rx=".6" fill="#fff" stroke="#7d93a9"/>' +
      '<path d="M10 9.4h11.4M10 13h11.4M10 16.6h11.4M10 20.2h7.4" stroke="#5b8cba" stroke-width="1.2"/>' +
      '<path d="m20.4 23.8 5.4-8.2 2.6 1.7-5.4 8.3z" fill="#ffd23f" stroke="#8a6a05"/>' +
      '<path d="M4.4 6h2.2M4.4 10h2.2M4.4 14h2.2M4.4 18h2.2M4.4 22h2.2" stroke="#9fb3c6" stroke-width="1.3"/>',
    help:
      '<circle cx="16" cy="16" r="13" fill="#3a9ae0" stroke="#14547f"/>' +
      '<circle cx="16" cy="16" r="10.8" fill="#6fc6f5" opacity=".4"/>' +
      '<path d="M11 11.4c0-6 10-6 10 0 0 3-5 3-5 7" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="16" cy="23.4" r="2" fill="#fff"/>' +
      '<ellipse cx="12" cy="9" rx="5" ry="2.6" fill="#fff" opacity=".3"/>',
    search:
      '<circle cx="14" cy="14" r="9" fill="#bfe8ff" fill-opacity=".65" stroke="#2f5f8f" stroke-width="2"/>' +
      '<path d="m20.5 20.5 7 7" stroke="#6b4a26" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M10 10a6 6 0 0 1 7-2" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>',
    run:
      '<rect x="3" y="6" width="26" height="20" rx="1.6" fill="#e8f1fa" stroke="#4d637a"/>' +
      '<rect x="4.4" y="7.4" width="23.2" height="4.2" fill="#2f7fc4"/>' +
      '<rect x="7" y="14" width="18" height="9" rx=".8" fill="#fff" stroke="#7d93a9"/>' +
      '<path d="m11.6 16 6.4 3-6.4 3z" fill="#3aa35a" stroke="#1d6b35"/>',
    shutdown:
      '<circle cx="16" cy="16" r="12.4" fill="#e2513f" stroke="#7a1c12"/>' +
      '<path d="M16 7.4v8.8" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M10 10a10 10 0 1 0 12 0" fill="none" stroke="#fff" stroke-width="2.6"/>' +
      '<ellipse cx="12.4" cy="9.4" rx="5" ry="2.4" fill="#fff" opacity=".25"/>',
    power:
      '<circle cx="16" cy="16" r="12.4" fill="#3aa35a" stroke="#175c2f"/>' +
      '<path d="M16 7.4v8.8" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M10 10a10 10 0 1 0 12 0" fill="none" stroke="#fff" stroke-width="2.6"/>',
    logoff:
      '<rect x="4.4" y="4" width="13" height="24" rx="1.6" fill="#e8f1fa" stroke="#4d637a"/>' +
      '<rect x="6" y="5.6" width="9.8" height="20.8" fill="#dce8f4"/>' +
      '<rect x="14.6" y="13" width="3" height="6" fill="#8fa6bb" stroke="#4d637a"/>' +
      '<path d="M21 16h8M26 12l4 4-4 4" fill="none" stroke="#3aa35a" stroke-width="3"/>',
    restart:
      '<path d="M27 12a11 11 0 1 0 1 10" fill="none" stroke="#2f8fe0" stroke-width="3"/>' +
      '<path d="M26 4v9h-9" fill="none" stroke="#2f8fe0" stroke-width="3"/>',
    lock:
      '<rect x="6.4" y="13.4" width="19.2" height="14.6" rx="2" fill="#d9b83c" stroke="#6b5200"/>' +
      '<path d="M10.6 13.4V8.8a5.4 5.4 0 0 1 10.8 0v4.6" fill="none" stroke="#5d748b" stroke-width="3"/>' +
      '<circle cx="16" cy="19.6" r="2.2" fill="#6b5200"/>' +
      '<path d="M16 21.6v3.2" stroke="#6b5200" stroke-width="2"/>' +
      '<rect x="6.4" y="13.4" width="19.2" height="4" rx="1.6" fill="#fff" opacity=".3"/>',
    mail:
      '<rect x="2.4" y="7" width="27.2" height="19" rx="1.8" fill="#dce8f4" stroke="#4d637a"/>' +
      '<path d="m3 8 13 10 13-10" fill="#eef6fd" stroke="#6b8298"/>' +
      '<path d="m3 25 9.4-9.4M29 25l-9.4-9.4" stroke="#9fb3c6"/>',
    star:
      '<path d="m16 2.4 4.2 9.2 10 .9-7.6 6.6 2.3 9.8L16 23.6l-8.9 5.3 2.3-9.8L1.8 12.5l10-.9z" fill="#ffd23f" stroke="#8a6a05"/>' +
      '<path d="m16 5.4 2.8 6.2 6.6.7-5 4.4 1.5 6.4-5.9-3.4-5.9 3.4 1.5-6.4-5-4.4 6.6-.7z" fill="#fff1a8"/>',
    heart:
      '<path d="M16 28.2C3.2 18.8 4 7.4 10.8 7.4c3 0 4.8 2 5.2 3.9.4-1.9 2.2-3.9 5.2-3.9 6.8 0 7.6 11.4-5.2 20.8z" fill="#e6422e" stroke="#8a1a08"/>' +
      '<path d="M10.8 10.6c-2.2 1-2.4 4.4-.8 6.8" fill="none" stroke="#ffb09a" stroke-width="1.7"/>',
    game:
      '<rect x="1.8" y="10.2" width="28.4" height="14.2" rx="7.1" fill="#dce8f4" stroke="#4d637a"/>' +
      '<path d="M8.4 15.2v5M5.9 17.7h5" stroke="#2f7fc4" stroke-width="2"/>' +
      '<circle cx="22" cy="15.2" r="2" fill="#f2503a"/><circle cx="25.2" cy="19.2" r="2" fill="#ffd23f"/>' +
      '<circle cx="11.4" cy="22.4" r="1.2" fill="#8fa6bb"/>',
    'arrow-right': '<path d="m10 6 11 10-11 10z" fill="#1f6eaa"/>',
    'arrow-down': '<path d="m6 10 10 11L26 10z" fill="#1f6eaa"/>'
  };

  /* Replace the shared sprite symbols and register new icon ids. */
  const sprite = document.getElementById('icon-sprite');
  if (!sprite) return;
  Object.keys(GLASS).forEach(function (name) {
    let symbol = document.getElementById('i-' + name);
    if (!symbol) {
      symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.setAttribute('id', 'i-' + name);
      symbol.setAttribute('viewBox', '0 0 32 32');
      sprite.appendChild(symbol);
    }
    symbol.innerHTML = GLASS[name];
  });
  Object.assign(Win.icons, GLASS);
})();
