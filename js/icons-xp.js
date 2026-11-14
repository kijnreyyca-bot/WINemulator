/* WINemulator — Windows XP style icon set (original SVG recreations)
 * Loaded after icons.js. Only replaces icons when the XP desktop is active.
 */
window.Win = window.Win || {};
(function () {
  'use strict';
  if (!Win.isXP) return;

  const XP = {
    flag:
      '<path d="M2.5 11.2c4.2-2.3 8-3.5 12.4-4.3v7.3c-4.4.9-8.2 2.1-12.4 4.4z" fill="#ee4b32"/>' +
      '<path d="M2.5 19c4.2-2.3 8-3.5 12.4-4.3v7.2c-4.4.9-8.2 2.1-12.4 4.4z" fill="#2f8de0"/>' +
      '<path d="M16.2 6.8c4.4-.9 7.8-1.6 13.3-2.7v7.4c-5.5 1-8.9 1.8-13.3 2.7z" fill="#57c04e"/>' +
      '<path d="M16.2 14.5c4.4-.9 7.8-1.6 13.3-2.7v7.4c-5.5 1.1-8.9 1.8-13.3 2.8z" fill="#ffcb2e"/>' +
      '<path d="M2.5 11.2c4.2-2.3 8-3.5 12.4-4.3M2.5 19c4.2-2.3 8-3.5 12.4-4.3M16.2 6.8c4.4-.9 7.8-1.6 13.3-2.7M16.2 14.5c4.4-.9 7.8-1.6 13.3-2.7" fill="none" stroke="#fff" stroke-width="1" opacity=".38"/>',
    windows:
      '<path d="M3 10.5c4.2-2.1 7.9-3.3 12-4.1v7.2c-4.1.9-7.8 2-12 4.1z" fill="#ef5138"/>' +
      '<path d="M3 18.6c4.2-2.1 7.9-3.3 12-4.1v7.1c-4.1.9-7.8 2.1-12 4.1z" fill="#2f8de0"/>' +
      '<path d="M16.6 6c4.4-.9 7.8-1.6 12.6-2.6v7.2c-4.8 1-8.2 1.7-12.6 2.6z" fill="#57c04e"/>' +
      '<path d="M16.6 13.2c4.4-.9 7.8-1.6 12.6-2.6v7.2c-4.8 1-8.2 1.7-12.6 2.6z" fill="#ffcb2e"/>',

    computer:
      '<rect x="2.4" y="4.4" width="27.2" height="19" rx="2.2" fill="#eef4fb" stroke="#5c708c"/>' +
      '<rect x="4.4" y="6.4" width="23.2" height="14.6" rx="1" fill="#205fa8"/>' +
      '<path d="M5.6 7.6h13.6l-7 12.4H5.6z" fill="#6fb4f0" opacity=".55"/>' +
      '<rect x="2.4" y="4.4" width="27.2" height="4.6" rx="2" fill="#fff" opacity=".58"/>' +
      '<rect x="11.2" y="25" width="9.6" height="2.4" fill="#aebbcb" stroke="#71839a"/>' +
      '<rect x="6.2" y="27.6" width="19.6" height="2.4" rx="1" fill="#d3dde9" stroke="#71839a"/>' +
      '<circle cx="26.8" cy="23.4" r=".9" fill="#5ae05a"/>',
    monitor:
      '<rect x="2.4" y="4.4" width="27.2" height="19" rx="2.2" fill="#eef4fb" stroke="#5c708c"/>' +
      '<rect x="4.4" y="6.4" width="23.2" height="14.6" rx="1" fill="#1b5da6"/>' +
      '<path d="M5.6 7.6h12.8l-6.6 12.4H5.6z" fill="#6fb4f0" opacity=".5"/>' +
      '<rect x="11.2" y="25" width="9.6" height="2.4" fill="#aebbcb" stroke="#71839a"/>' +
      '<rect x="6.2" y="27.6" width="19.6" height="2.4" rx="1" fill="#d3dde9" stroke="#71839a"/>',

    folder:
      '<path d="M2.6 7.2c0-.9.7-1.6 1.6-1.6h8.1l2.4 3h13.1c.9 0 1.6.7 1.6 1.6v3.4H2.6z" fill="#e9a81c" stroke="#9b6a05"/>' +
      '<path d="M2.6 12.4h26.8v14.8c0 1-.8 1.8-1.8 1.8H4.4c-1 0-1.8-.8-1.8-1.8z" fill="#ffd45e" stroke="#9b6a05"/>' +
      '<path d="M2.6 12.4h26.8v3.2H2.6z" fill="#ffeaa0"/>' +
      '<path d="M4.8 17h22.4" stroke="#fff" stroke-width="1" opacity=".45"/>',
    'folder-open':
      '<path d="M2.6 7.2c0-.9.7-1.6 1.6-1.6h8.1l2.4 3h13.1c.9 0 1.6.7 1.6 1.6v3.4H2.6z" fill="#e9a81c" stroke="#9b6a05"/>' +
      '<path d="M4 26.8 7.6 12.6h25l-3.6 14.2z" fill="#ffd96a" stroke="#9b6a05"/>' +
      '<path d="M5.6 14.2h24.4l-2.6 10.4H3.4z" fill="#ffe9a0"/>' +
      '<path d="M2.6 12.4h13v14.4H4.4c-1 0-1.8-.8-1.8-1.8z" fill="#f5bc35" stroke="#9b6a05"/>',
    documents:
      '<path d="M2.6 7.2c0-.9.7-1.6 1.6-1.6h8.1l2.4 3h13.1c.9 0 1.6.7 1.6 1.6v3.4H2.6z" fill="#e9a81c" stroke="#9b6a05"/>' +
      '<path d="M2.6 12.4h26.8v14.8c0 1-.8 1.8-1.8 1.8H4.4c-1 0-1.8-.8-1.8-1.8z" fill="#ffd45e" stroke="#9b6a05"/>' +
      '<rect x="10" y="6.2" width="12.4" height="15.4" fill="#fff" stroke="#7d8794"/>' +
      '<path d="M12.4 9.4h7.6M12.4 12.4h7.6M12.4 15.4h5.4" stroke="#5f86b3" stroke-width="1.1"/>' +
      '<path d="M2.6 12.4h26.8v2.6H2.6z" fill="#ffeaa0" opacity=".8"/>',
    programs:
      '<path d="M2.6 7.2c0-.9.7-1.6 1.6-1.6h8.1l2.4 3h13.1c.9 0 1.6.7 1.6 1.6v3.4H2.6z" fill="#e9a81c" stroke="#9b6a05"/>' +
      '<path d="M2.6 12.4h26.8v14.8c0 1-.8 1.8-1.8 1.8H4.4c-1 0-1.8-.8-1.8-1.8z" fill="#ffd45e" stroke="#9b6a05"/>' +
      '<rect x="8.4" y="8.4" width="15.2" height="12.6" rx=".8" fill="#f2f6fc" stroke="#5c708c"/>' +
      '<rect x="9.4" y="9.4" width="13.2" height="3" fill="#2c6fc0"/>' +
      '<path d="M10.6 14.6h10.8M10.6 17.4h7.4" stroke="#8a99ab" stroke-width="1"/>',

    file:
      '<path d="M6.6 2.6h12l6.8 6.8v20H6.6z" fill="#fff" stroke="#7d8794"/>' +
      '<path d="M18.6 2.6v6.8h6.8" fill="#dde5ef" stroke="#7d8794"/>' +
      '<path d="M9.6 14h11M9.6 17h11M9.6 20h8" stroke="#6f93bd" stroke-width="1.2"/>',
    textfile:
      '<path d="M6.6 2.6h12l6.8 6.8v20H6.6z" fill="#fff" stroke="#7d8794"/>' +
      '<path d="M18.6 2.6v6.8h6.8" fill="#dde5ef" stroke="#7d8794"/>' +
      '<rect x="9" y="11.4" width="11" height="9.6" fill="#f3f8ff" stroke="#a9bed6"/>' +
      '<path d="M10.4 13.4h8.2M10.4 15.4h8.2M10.4 17.4h5.4" stroke="#6f93bd" stroke-width=".9"/>' +
      '<path d="M9.6 23.4h10.6M9.6 26h7" stroke="#8fa9c4" stroke-width="1"/>',
    image:
      '<path d="M6.6 2.6h12l6.8 6.8v20H6.6z" fill="#fff" stroke="#7d8794"/>' +
      '<path d="M18.6 2.6v6.8h6.8" fill="#dde5ef" stroke="#7d8794"/>' +
      '<rect x="9" y="11.4" width="13" height="10.6" fill="#bfe4ff" stroke="#6f93bd"/>' +
      '<circle cx="18.4" cy="14.2" r="1.5" fill="#ffe066"/>' +
      '<path d="m9 21.6 4-5 3 3 2.6-2.6 3.4 4.6z" fill="#5ebc4a"/>',
    imagefile:
      '<rect x="7.4" y="2.6" width="18" height="26.4" rx="1" fill="#fff" stroke="#7d8794"/>' +
      '<rect x="9.4" y="6.4" width="14" height="11" fill="#bfe4ff" stroke="#6f93bd"/>' +
      '<circle cx="19.6" cy="9.4" r="1.6" fill="#ffe066"/>' +
      '<path d="m9.4 17.4 4.4-5.4 3.2 3.2 2.6-2.8 3.6 5z" fill="#5ebc4a"/>' +
      '<path d="M9.6 21h13.6M9.6 24h9.4" stroke="#9fb2c6" stroke-width="1.2"/>',
    exe:
      '<rect x="3.4" y="5.4" width="25.2" height="21.2" rx="1.4" fill="#eef4fb" stroke="#5c708c"/>' +
      '<rect x="3.4" y="5.4" width="25.2" height="5.2" rx="1.2" fill="#2c6fc0"/>' +
      '<rect x="6" y="13.4" width="20" height="10" rx=".6" fill="#fff" stroke="#8a99ab"/>' +
      '<path d="m10.4 16.2 7.4 3.2-7.4 3.2z" fill="#3f9e45" stroke="#22702a"/>',

    paint:
      '<ellipse cx="14.4" cy="17.4" rx="11.4" ry="9.2" fill="#e8c79a" stroke="#7a5a34"/>' +
      '<circle cx="9.4" cy="12.8" r="1.9" fill="#e0402f"/>' +
      '<circle cx="15.4" cy="10.2" r="1.9" fill="#f0b823"/>' +
      '<circle cx="21.4" cy="12.6" r="1.9" fill="#3a9d4e"/>' +
      '<circle cx="23" cy="18.4" r="1.9" fill="#2f6fc4"/>' +
      '<circle cx="9.6" cy="20.6" r="1.9" fill="#8b53c0"/>' +
      '<path d="m18.6 27.6 7.4-16 3 1.4-7.4 16z" fill="#9a6428" stroke="#57330f"/>' +
      '<path d="m25.6 11.8 2.8-6 2.2 1.1-2.8 6z" fill="#d9dee6" stroke="#5c708c"/>' +
      '<path d="m17.4 27 3.4-3.6 2.4 2.2-3.4 3.4z" fill="#2a2a2a"/>',
    calc:
      '<rect x="5" y="2.4" width="22" height="27.2" rx="2.2" fill="#e8eef7" stroke="#5c708c"/>' +
      '<rect x="7.4" y="5" width="17.2" height="6.4" rx="1" fill="#b8e3a4" stroke="#5f7f52"/>' +
      '<path d="M9.4 8.2h13" stroke="#2f5c2a" stroke-width="2"/>' +
      '<g fill="#f8fbff" stroke="#8a99ab"><rect x="7.6" y="14" width="4" height="3.6" rx=".6"/>' +
      '<rect x="14" y="14" width="4" height="3.6" rx=".6"/><rect x="20.4" y="14" width="4" height="3.6" rx=".6"/>' +
      '<rect x="7.6" y="19.4" width="4" height="3.6" rx=".6"/><rect x="14" y="19.4" width="4" height="3.6" rx=".6"/>' +
      '<rect x="7.6" y="24.8" width="10.4" height="3.4" rx=".6"/></g>' +
      '<rect x="20.4" y="19.4" width="4" height="3.6" rx=".6" fill="#f0a03a" stroke="#8a5a10"/>' +
      '<rect x="20.4" y="24.8" width="4" height="3.4" rx=".6" fill="#5aa0e8" stroke="#2f6ba8"/>',
    terminal:
      '<rect x="2.4" y="4.4" width="27.2" height="23.2" rx="2" fill="#e8eef7" stroke="#5c708c"/>' +
      '<rect x="4.2" y="6.2" width="23.6" height="17.6" rx=".8" fill="#05080a"/>' +
      '<path d="m7.4 11 3.4 3.2-3.4 3.2" fill="none" stroke="#55e06a" stroke-width="1.7"/>' +
      '<path d="M13 17.4h7.6" stroke="#55e06a" stroke-width="1.7"/>' +
      '<rect x="2.4" y="4.4" width="27.2" height="4.4" rx="2" fill="#fff" opacity=".6"/>' +
      '<rect x="13.4" y="27.4" width="5.2" height="1.8" fill="#aebbcb"/>',
    mine:
      '<circle cx="16" cy="19.4" r="8.6" fill="#3a3f46" stroke="#15181c"/>' +
      '<circle cx="13.2" cy="16.6" r="2.6" fill="#7d8794" opacity=".8"/>' +
      '<circle cx="13.2" cy="16.6" r="1" fill="#d8e0e8"/>' +
      '<path d="M16 10.8c0-3 2-5 5-6" fill="none" stroke="#b67826" stroke-width="1.8"/>' +
      '<path d="m21 4.4 3.2-1.2-1 3.2 3.2-1-2.2 3.2" fill="none" stroke="#d39828" stroke-width="1.2"/>' +
      '<path d="M6.6 19.6h18.8M16 10.4v18M9.2 12.8l13.6 13.2M22.8 12.8 9.2 26" stroke="#15181c" stroke-width="1.4"/>',
    'mine-flag':
      '<path d="M13.4 3.6v24.8" stroke="#3a3f46" stroke-width="2"/>' +
      '<path d="M14.4 4.4h12.4l-3 4.2 3 4.2H14.4z" fill="#e63a2e" stroke="#94140c"/>' +
      '<path d="M7.8 28.8h14.4" stroke="#3a3f46" stroke-width="2"/>' +
      '<circle cx="14.2" cy="5" r="1.3" fill="#ffd75e" stroke="#9b6a05"/>',
    ie:
      '<ellipse cx="16" cy="17" rx="15.2" ry="6.4" fill="none" stroke="#f2b705" stroke-width="2.2" transform="rotate(-18 16 17)"/>' +
      '<text x="16" y="26" text-anchor="middle" font-family="Georgia,serif" font-size="27" font-weight="700" font-style="italic" fill="#2f8de0" stroke="#0a4b8f" stroke-width=".8">e</text>' +
      '<path d="M9.4 12.2c2.4-5.6 15-6.4 15 3.2 0 4.2-4.2 5.2-8.4 4.2" fill="none" stroke="#2f8de0" stroke-width="2.4"/>' +
      '<path d="M17 11.6c-1.8 0-4 1.4-4 4.2 0 2 1.4 3 3.4 3 2.4 0 3.6-1.4 3.6-3 0-2-1.2-4.2-3-4.2z" fill="#6fb4f0" opacity=".55"/>',
    settings:
      '<rect x="2.6" y="4.6" width="26.8" height="23" rx="1.8" fill="#e8eef7" stroke="#5c708c"/>' +
      '<rect x="2.6" y="4.6" width="26.8" height="5" rx="1.6" fill="#2c6fc0"/>' +
      '<g stroke="#8a99ab" stroke-width="1.4"><path d="M8 14.4h16M8 19.4h16M8 24.2h16"/></g>' +
      '<circle cx="13.4" cy="14.4" r="2.4" fill="#f4f8fd" stroke="#5c708c"/>' +
      '<circle cx="21" cy="19.4" r="2.4" fill="#f4f8fd" stroke="#5c708c"/>' +
      '<circle cx="11.4" cy="24.2" r="2.4" fill="#f4f8fd" stroke="#5c708c"/>',
    taskmgr:
      '<rect x="2.6" y="4" width="26.8" height="24.4" rx="1.8" fill="#e8eef7" stroke="#5c708c"/>' +
      '<rect x="2.6" y="4" width="26.8" height="4.8" rx="1.6" fill="#2c6fc0"/>' +
      '<rect x="5.4" y="11" width="21.2" height="14.4" rx=".8" fill="#0b2412"/>' +
      '<path d="M7.8 22.4v-4.2M11.6 22.4v-7.2M15.4 22.4v-9.4M19.2 22.4v-5.6M23 22.4v-3" stroke="#59e06a" stroke-width="2.4"/>',
    recycle:
      '<path d="M7.4 9h17.2l-2.4 19.4H9.8z" fill="#bcd8ee" fill-opacity=".7" stroke="#4b6f92"/>' +
      '<path d="M10.4 9V6.2h11.2V9" fill="#a9c8e4" stroke="#4b6f92"/>' +
      '<path d="M5 9h22" stroke="#4b6f92" stroke-width="2"/>' +
      '<path d="m16 13 3.2 6h-2.2v4h-2v-4h-2.2z" fill="#2f7de1" stroke="#12406b"/>' +
      '<path d="M9.4 11.4 8.8 26M22.6 11.4l.6 14.6" stroke="#e6f2fc" stroke-width="1" opacity=".7"/>',
    'recycle-full':
      '<path d="M7.4 9h17.2l-2.4 19.4H9.8z" fill="#bcd8ee" fill-opacity=".7" stroke="#4b6f92"/>' +
      '<path d="M10.4 9V6.2h11.2V9" fill="#a9c8e4" stroke="#4b6f92"/>' +
      '<path d="M5 9h22" stroke="#4b6f92" stroke-width="2"/>' +
      '<path d="m10.4 8-3.6-4.6 4.8 1.8M20.6 7.4 23.4 2.4l1.8 4" fill="#fff" stroke="#7d8794"/>' +
      '<path d="m16 13 3.2 6h-2.2v4h-2v-4h-2.2z" fill="#2f7de1" stroke="#12406b"/>',

    drive:
      '<rect x="2.4" y="8.4" width="27.2" height="16.4" rx="2.2" fill="#c9d4e2" stroke="#5c708c"/>' +
      '<rect x="4.4" y="10.4" width="23.2" height="8" rx="1" fill="#eef4fb"/>' +
      '<circle cx="22.6" cy="18.4" r="3.8" fill="#9fb0c4" stroke="#5c708c"/>' +
      '<circle cx="22.6" cy="18.4" r="1.2" fill="#eef4fb"/>' +
      '<rect x="7" y="12.4" width="8.6" height="1.8" rx=".6" fill="#8a99ab"/>' +
      '<rect x="7" y="16.2" width="6" height="1.8" rx=".6" fill="#8a99ab"/>' +
      '<circle cx="27" cy="22" r=".9" fill="#57d957"/>' +
      '<rect x="2.4" y="8.4" width="27.2" height="3.4" rx="2" fill="#fff" opacity=".6"/>',
    floppy:
      '<rect x="4.4" y="3.4" width="23.2" height="25.2" rx="1.4" fill="#2f6fc0" stroke="#16406f"/>' +
      '<rect x="9.4" y="3.4" width="13.2" height="9.6" fill="#d5dee9" stroke="#71839a"/>' +
      '<rect x="12" y="4.4" width="5" height="7" fill="#5c708c"/>' +
      '<rect x="7.8" y="17" width="16.4" height="10.6" rx=".6" fill="#f4f8fd" stroke="#71839a"/>' +
      '<path d="M10 21.4h12.4M10 24.4h8" stroke="#2f6fc0" stroke-width="1.2"/>' +
      '<path d="M4.4 3.4h23.2v3.4H4.4z" fill="#fff" opacity=".35"/>',
    cdrom:
      '<circle cx="16" cy="16" r="12.6" fill="#dbe7f4" stroke="#5c708c"/>' +
      '<circle cx="16" cy="16" r="5" fill="#eef4fb" stroke="#71839a"/>' +
      '<circle cx="16" cy="16" r="1.8" fill="#9fb0c4"/>' +
      '<path d="M7.6 10.6a12.6 12.6 0 0 1 9-7.2" fill="none" stroke="#fff" stroke-width="2.4"/>' +
      '<path d="M24.4 21.4a12.6 12.6 0 0 1-9 7.2" fill="none" stroke="#9fc4e8" stroke-width="2"/>',
    network:
      '<rect x="2.4" y="5.4" width="12.6" height="9.6" rx="1.2" fill="#e8eef7" stroke="#5c708c"/>' +
      '<rect x="3.8" y="6.8" width="9.8" height="7" fill="#2f6fc0"/>' +
      '<rect x="6" y="15" width="5.4" height="1.8" fill="#aebbcb"/>' +
      '<rect x="3" y="19" width="11.4" height="1.8" rx=".7" fill="#c9d4e2" stroke="#71839a"/>' +
      '<rect x="17.4" y="10.6" width="12.6" height="9.6" rx="1.2" fill="#e8eef7" stroke="#5c708c"/>' +
      '<rect x="18.8" y="12" width="9.8" height="7" fill="#2f6fc0"/>' +
      '<rect x="21" y="20.2" width="5.4" height="1.8" fill="#aebbcb"/>' +
      '<rect x="18" y="24.2" width="11.4" height="1.8" rx=".7" fill="#c9d4e2" stroke="#71839a"/>' +
      '<path d="M9 17.4v2.8h14.4v-2.8" fill="none" stroke="#4cb84c" stroke-width="1.8"/>',
    volume:
      '<path d="M4 12.4h5.6l6.6-5.8v18.8l-6.6-5.8H4z" fill="#dbe7f4" stroke="#4b6f92"/>' +
      '<path d="M20.4 10.4c3 2.4 3 9.2 0 11.6M23.4 7.4c5.2 4.4 5.2 13.8 0 18.2" fill="none" stroke="#2f6fc0" stroke-width="2"/>' +
      '<path d="M5.4 13.4h3.2v5.2H5.4z" fill="#fff" opacity=".5"/>',
    user:
      '<rect x="3" y="3" width="26" height="26" rx="3" fill="#e8eef7" stroke="#5c708c"/>' +
      '<circle cx="16" cy="12.4" r="5.4" fill="#f0d0a6" stroke="#8a6a42"/>' +
      '<path d="M5.4 27.4c.6-7 4.6-10.6 10.6-10.6s10 3.6 10.6 10.6z" fill="#2f6fc0" stroke="#16406f"/>' +
      '<path d="M11 10.6c2.4-2.2 7.6-2.2 10 0" fill="none" stroke="#8a6a42" stroke-width="1.6"/>',

    notepad:
      '<rect x="4.4" y="3.4" width="23.2" height="25.4" rx="1" fill="#2f6fc0" stroke="#16406f"/>' +
      '<rect x="7.4" y="5.6" width="17.2" height="20.8" fill="#fff" stroke="#8a99ab"/>' +
      '<path d="M10.4 9.6h11M10.4 13h11M10.4 16.4h11M10.4 19.8h7" stroke="#6f93bd" stroke-width="1.1"/>' +
      '<g fill="#c9d4e2" stroke="#71839a"><rect x="3.4" y="6" width="2.4" height="2"/><rect x="3.4" y="10" width="2.4" height="2"/>' +
      '<rect x="3.4" y="14" width="2.4" height="2"/><rect x="3.4" y="18" width="2.4" height="2"/><rect x="3.4" y="22" width="2.4" height="2"/></g>' +
      '<path d="m20 24 5.6-9.6 3 1.8-5.6 9.6z" fill="#f0b823" stroke="#8a5a10"/>',
    help:
      '<path d="M4.4 5.4h8.4c2 0 3.2 1.4 3.2 3.4 0-2 1.2-3.4 3.2-3.4h8.4v18.4h-8c-1.8 0-2.8 1-3 2.6-.2-1.6-1.2-2.6-3-2.6h-8z" fill="#f4c33c" stroke="#9b6a05"/>' +
      '<path d="M16 8v17.6" stroke="#c99a1e" stroke-width="1.4"/>' +
      '<text x="16" y="22" text-anchor="middle" font-family="Tahoma,sans-serif" font-size="12" font-weight="700" fill="#8a5a00">?</text>',
    search:
      '<circle cx="13.4" cy="13.4" r="8.6" fill="#cfe8ff" stroke="#4b6f92" stroke-width="2"/>' +
      '<path d="M9 9a6 6 0 0 1 7-2.4" fill="none" stroke="#fff" stroke-width="1.8"/>' +
      '<path d="m20 20 7.4 7.4" stroke="#8a5a2a" stroke-width="3.6" stroke-linecap="round"/>' +
      '<circle cx="12.6" cy="12.6" r="6" fill="#8fc6f0" opacity=".35"/>',
    run:
      '<rect x="2.6" y="5.4" width="26.8" height="21.2" rx="1.6" fill="#eef4fb" stroke="#5c708c"/>' +
      '<rect x="2.6" y="5.4" width="26.8" height="4.8" rx="1.4" fill="#2c6fc0"/>' +
      '<path d="m10.4 14 7.6 3.6-7.6 3.6z" fill="#3f9e45" stroke="#22702a"/>' +
      '<path d="M20 14h5M20 17.6h5M20 21.2h3.6" stroke="#8a99ab" stroke-width="1.2"/>',

    shutdown:
      '<circle cx="16" cy="16" r="12.4" fill="#d63a1b" stroke="#8a1a08"/>' +
      '<path d="M16 6.4v9.2" stroke="#fff" stroke-width="3"/>' +
      '<path d="M9.8 9.6a10 10 0 1 0 12.4 0" fill="none" stroke="#fff" stroke-width="2.6"/>' +
      '<path d="M9.4 8.4a11 11 0 0 1 4-2.6" fill="none" stroke="#ff9d7a" stroke-width="1.4"/>',
    logoff:
      '<rect x="4.4" y="4.4" width="13.2" height="23.2" rx="1.4" fill="#f0c34a" stroke="#8a5a10"/>' +
      '<rect x="14.4" y="12" width="2.6" height="8" rx="1" fill="#e8d8b0" stroke="#8a5a10"/>' +
      '<path d="M20.4 16h8M25 11.6l4.4 4.4-4.4 4.4" fill="none" stroke="#3f9e45" stroke-width="2.6"/>' +
      '<path d="M4.4 4.4h13.2v3.2H4.4z" fill="#fff" opacity=".4"/>',
    restart:
      '<path d="M26.4 12.4a11 11 0 1 0 1.2 9.6" fill="none" stroke="#2f6fc0" stroke-width="3"/>' +
      '<path d="M25.4 5.4v8.4H17" fill="none" stroke="#2f6fc0" stroke-width="3"/>' +
      '<path d="M11 10.6a8 8 0 0 1 4-1.8" fill="none" stroke="#8fc6f0" stroke-width="1.6"/>',
    pause:
      '<rect x="7.4" y="6.4" width="6" height="19.2" rx="1.4" fill="#2f6fc0" stroke="#16406f"/>' +
      '<rect x="18.6" y="6.4" width="6" height="19.2" rx="1.4" fill="#2f6fc0" stroke="#16406f"/>' +
      '<rect x="7.4" y="6.4" width="6" height="4" rx="1.4" fill="#8fc6f0" opacity=".6"/>',
    power:
      '<circle cx="16" cy="16" r="12.4" fill="#3f9e45" stroke="#22702a"/>' +
      '<path d="M16 6.4v9.2" stroke="#fff" stroke-width="3"/>' +
      '<path d="M9.8 9.6a10 10 0 1 0 12.4 0" fill="none" stroke="#fff" stroke-width="2.6"/>',

    warning:
      '<path d="M16 3 30 28H2z" fill="#ffd63c" stroke="#9b6a05" stroke-width="1.6"/>' +
      '<path d="M16 10v10" stroke="#3a2c00" stroke-width="3"/>' +
      '<circle cx="16" cy="24.4" r="1.8" fill="#3a2c00"/>' +
      '<path d="M16 4.6 27.4 25.6" stroke="#fff" stroke-width="1.2" opacity=".5"/>',
    error:
      '<circle cx="16" cy="16" r="12.6" fill="#d63a1b" stroke="#8a1a08"/>' +
      '<path d="m10.4 10.4 11.2 11.2M21.6 10.4 10.4 21.6" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="12" cy="11" r="3" fill="#ff9d7a" opacity=".45"/>',
    info:
      '<circle cx="16" cy="16" r="12.6" fill="#2f8de0" stroke="#12406b"/>' +
      '<circle cx="16" cy="9.4" r="2" fill="#fff"/>' +
      '<path d="M16 13.4v10" stroke="#fff" stroke-width="4"/>' +
      '<circle cx="12" cy="11" r="3" fill="#8fc6f0" opacity=".5"/>',
    question:
      '<circle cx="16" cy="16" r="12.6" fill="#2f8de0" stroke="#12406b"/>' +
      '<path d="M11.4 11.6c0-5.6 9.2-5.6 9.2 0 0 2.8-4.6 2.8-4.6 6.6" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<circle cx="16" cy="23.4" r="1.9" fill="#fff"/>',
    save:
      '<rect x="4.4" y="3.4" width="23.2" height="25.2" rx="1.4" fill="#2f6fc0" stroke="#16406f"/>' +
      '<rect x="9.4" y="3.4" width="13.2" height="9.6" fill="#d5dee9" stroke="#71839a"/>' +
      '<rect x="12" y="4.4" width="5" height="7" fill="#5c708c"/>' +
      '<rect x="7.8" y="17" width="16.4" height="10.6" rx=".6" fill="#f4f8fd" stroke="#71839a"/>' +
      '<path d="M10 21.4h12.4M10 24.4h8" stroke="#2f6fc0" stroke-width="1.2"/>',
    open:
      '<path d="M2.6 8.4c0-.9.7-1.6 1.6-1.6h8.1l2.4 3h13.1c.9 0 1.6.7 1.6 1.6v3H2.6z" fill="#e9a81c" stroke="#9b6a05"/>' +
      '<path d="M4 26.4 7.6 13h25l-3.6 13.4z" fill="#ffd96a" stroke="#9b6a05"/>' +
      '<path d="M5.6 14.6h24.2l-2.6 9.8H3.6z" fill="#ffeaa0"/>',
    print:
      '<rect x="6" y="11.4" width="20" height="9.6" rx="1.2" fill="#d5dee9" stroke="#5c708c"/>' +
      '<rect x="9.4" y="4" width="13.2" height="8.4" fill="#fff" stroke="#71839a"/>' +
      '<path d="M9.4 17.4h13.2v10.4H9.4z" fill="#fff" stroke="#71839a"/>' +
      '<path d="M12 20.4h8M12 23h8M12 25.6h5" stroke="#6f93bd" stroke-width="1"/>' +
      '<circle cx="23" cy="14.4" r="1.2" fill="#4cb84c"/>',
    mail:
      '<rect x="2.4" y="7.4" width="27.2" height="18.4" rx="1.4" fill="#eef4fb" stroke="#5c708c"/>' +
      '<path d="m2.4 7.4 13.6 10.6L29.6 7.4" fill="#fff" stroke="#8a99ab"/>' +
      '<path d="m2.4 25.8 9.6-9.6M29.6 25.8 20 16.2" stroke="#b8c6d6"/>' +
      '<path d="M3 8.4 16 18.4 29 8.4" fill="none" stroke="#5f86b3" stroke-width="1.2"/>',

    vpc:
      '<rect x="2.4" y="4.4" width="20.4" height="15.6" rx="1.8" fill="#eef4fb" stroke="#5c708c"/>' +
      '<rect x="4.2" y="6.2" width="16.8" height="12" rx=".8" fill="#14508f"/>' +
      '<path d="M5.4 7.4h8.6l-4.4 9.6H5.4z" fill="#6fb4f0" opacity=".5"/>' +
      '<rect x="8.4" y="20.6" width="8.4" height="1.8" fill="#aebbcb"/>' +
      '<rect x="4.6" y="22.8" width="16" height="1.8" rx=".7" fill="#c9d4e2" stroke="#71839a"/>' +
      '<rect x="12.4" y="13.4" width="16.8" height="12.6" rx="1.6" fill="#f4f8fd" stroke="#2f6fc0" stroke-width="1.4"/>' +
      '<rect x="14" y="15" width="13.6" height="7.6" rx=".6" fill="#2f6fc0"/>' +
      '<path d="M15.4 20.6 18 17l2 2.4 1.6-1.6 2.6 2.8z" fill="#7fd06b"/>' +
      '<circle cx="24" cy="17.6" r="1" fill="#ffe066"/>' +
      '<rect x="14.4" y="23.4" width="8.6" height="1.4" rx=".6" fill="#c9d4e2"/>',

    properties:
      '<rect x="4.4" y="5.4" width="23.2" height="21.2" rx="1.4" fill="#eef4fb" stroke="#5c708c"/>' +
      '<rect x="4.4" y="5.4" width="23.2" height="4.4" rx="1.2" fill="#2c6fc0"/>' +
      '<path d="M8.4 15.4h15.2M8.4 20.4h15.2" stroke="#8a99ab" stroke-width="1.6"/>' +
      '<rect x="12.4" y="12.4" width="3.4" height="6" rx=".6" fill="#fff" stroke="#5c708c"/>' +
      '<rect x="17.4" y="17.4" width="3.4" height="6" rx=".6" fill="#fff" stroke="#5c708c"/>',
    game:
      '<rect x="1.8" y="10" width="28.4" height="14.4" rx="7" fill="#e8eef7" stroke="#5c708c"/>' +
      '<path d="M8.4 15v5M5.9 17.5h5" stroke="#2f6fc0" stroke-width="2"/>' +
      '<circle cx="22" cy="15" r="2" fill="#d63a1b"/><circle cx="25.2" cy="19" r="2" fill="#f0b823"/>' +
      '<circle cx="11.4" cy="22.4" r="1.2" fill="#8a99ab"/>',
    star:
      '<path d="m16 2.4 4.2 9 9.8 1-7.4 6.6 2.2 9.6L16 23.4l-8.8 5.2 2.2-9.6L2 12.4l9.8-1z" fill="#ffd63c" stroke="#9b6a05"/>' +
      '<path d="m16 5 2.8 6.2 6.6.7-5 4.4 1.4 6.4L16 19.4l-5.8 3.3 1.4-6.4-5-4.4 6.6-.7z" fill="#ffe89a"/>',
    heart:
      '<path d="M16 28.4C2.4 18.4 3.4 7 10.4 7c3 0 5 2 5.6 4 .6-2 2.6-4 5.6-4 7 0 8 11.4-5.6 21.4z" fill="#e6422e" stroke="#8a1a08"/>' +
      '<path d="M10.6 10.4c-2.4 1-2.6 4.6-1 7" fill="none" stroke="#ff9d7a" stroke-width="1.6"/>'
  };

  /* Replace the shared sprite symbols and register new icon ids. */
  const sprite = document.getElementById('icon-sprite');
  if (!sprite) return;
  Object.keys(XP).forEach(function (name) {
    let symbol = document.getElementById('i-' + name);
    if (!symbol) {
      symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.setAttribute('id', 'i-' + name);
      symbol.setAttribute('viewBox', '0 0 32 32');
      sprite.appendChild(symbol);
    }
    symbol.innerHTML = XP[name];
  });
  Object.assign(Win.icons, XP);
})();
