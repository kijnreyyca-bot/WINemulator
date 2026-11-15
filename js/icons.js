/* WINemulator — hand-drawn SVG icon set (no external assets) */
window.Win = window.Win || {};
(function () {
  const DATA = {
    flag: '<path d="M4 8.5 14.5 5v9.5L4 18z" fill="#ff3b30" stroke="#111" stroke-width=".8"/><path d="M16.5 4.3 29 1.5V13l-12.5 2.8z" fill="#48c94f" stroke="#111" stroke-width=".8"/><path d="M4 19.6 14.5 16v9.4L4 29z" fill="#2f7de1" stroke="#111" stroke-width=".8"/><path d="M16.5 17.4 29 14.6V26l-12.5 3.4z" fill="#ffcc00" stroke="#111" stroke-width=".8"/>',

    computer: '<rect x="2" y="4" width="27" height="19" rx="1" fill="#c8c8c8" stroke="#111"/><rect x="4" y="6" width="23" height="14" fill="#0a3d78"/><rect x="5" y="7" width="21" height="12" fill="#2a6db5"/><path d="M6 8h9v2H6z" fill="#8fc0ea" opacity=".75"/><rect x="12" y="23" width="8" height="3" fill="#9c9c9c" stroke="#111"/><rect x="7" y="27" width="18" height="3" fill="#c8c8c8" stroke="#111"/><rect x="25" y="8" width="2" height="2" fill="#63e36b"/>',
    monitor: '<rect x="2" y="4" width="27" height="19" rx="1" fill="#c8c8c8" stroke="#111"/><rect x="4" y="6" width="23" height="14" fill="#14508f"/><path d="M5 7h10v8H5z" fill="#2e78c2" opacity=".8"/><rect x="12" y="23" width="8" height="3" fill="#9c9c9c" stroke="#111"/><rect x="7" y="27" width="18" height="3" fill="#c8c8c8" stroke="#111"/>',

    folder: '<path d="M2 6h10l2.3 3.2H30V27H2z" fill="#d7a219" stroke="#6d5200"/><path d="M2 11h28v15.4H2z" fill="#ffd75e" stroke="#6d5200"/><path d="M3.2 12.2h25.6v2H3.2z" fill="#fff2ae"/>',
    'folder-open': '<path d="M2 6h10l2.3 3.2H30v4H2z" fill="#d7a219" stroke="#6d5200"/><path d="M2 11h28v15.4H2z" fill="#ffd75e" stroke="#6d5200"/><path d="M5 26 9 13h23l-4 13z" fill="#ffe58c" stroke="#6d5200"/><path d="M6.5 14.2h22.7l-2.6 9.6H4z" fill="#ffe58c"/>',
    documents: '<path d="M2 7h10l2 3h16v17H2z" fill="#d7a219" stroke="#6d5200"/><path d="M2 11h28v15H2z" fill="#ffd75e" stroke="#6d5200"/><path d="M11 9h12v15H11z" fill="#fff" stroke="#555"/><path d="M13 12h8M13 15h8M13 18h6" stroke="#3b6ea5" stroke-width="1.2"/>',
    programs: '<path d="M2 7h10l2 3h16v17H2z" fill="#d7a219" stroke="#6d5200"/><path d="M2 11h28v15H2z" fill="#ffd75e" stroke="#6d5200"/><rect x="10" y="10" width="14" height="12" fill="#c8c8c8" stroke="#111"/><rect x="11" y="11" width="12" height="3" fill="#000080"/><path d="M12 15h8M12 18h6" stroke="#555"/>',

    file: '<path d="M7 2h12l7 7v21H7z" fill="#fff" stroke="#444"/><path d="M19 2v7h7" fill="#d6d6d6" stroke="#444"/><path d="M10 14h11M10 17h11M10 20h8M10 23h9" stroke="#3b6ea5" stroke-width="1.2"/>',
    textfile: '<path d="M7 2h12l7 7v21H7z" fill="#fff" stroke="#444"/><path d="M19 2v7h7" fill="#d6d6d6" stroke="#444"/><path d="M10 12h11M10 15h11M10 18h11M10 21h7" stroke="#3b6ea5" stroke-width="1.2"/><path d="M9 6h6v6H9z" fill="#eaf3ff" stroke="#9bb8d6"/>',
    image: '<path d="M5 3h17l5 5v21H5z" fill="#fff" stroke="#444"/><path d="M22 3v5h5" fill="#d6d6d6" stroke="#444"/><rect x="8" y="10" width="16" height="12" fill="#8fd3ff"/><circle cx="20" cy="13" r="2" fill="#ffe066"/><path d="m8 22 5-6 4 4 3-3 4 5z" fill="#4caf50"/><rect x="7.5" y="9.5" width="17" height="13" fill="none" stroke="#666"/>',
    exe: '<rect x="3" y="5" width="26" height="22" fill="#d8d8d8" stroke="#111"/><rect x="4" y="6" width="24" height="4" fill="#000080"/><rect x="8" y="14" width="16" height="9" fill="#fff" stroke="#666"/><path d="M11 17h10M11 20h7" stroke="#3b6ea5"/>',
    imagefile: '<rect x="8" y="3" width="20" height="26" fill="#fff" stroke="#444"/><rect x="10" y="7" width="16" height="12" fill="#8fd3ff"/><path d="m10 19 4-5 3 3 3-3 6 5z" fill="#4caf50"/><path d="M11 22h13M11 25h8" stroke="#999"/>',

    paint: '<ellipse cx="15" cy="17" rx="12" ry="10" fill="#d9b382" stroke="#6b4e2e"/><circle cx="10" cy="12" r="2" fill="#e33"/><circle cx="16" cy="9.5" r="2" fill="#e6b800"/><circle cx="22" cy="12" r="2" fill="#2a9d4a"/><circle cx="23" cy="18" r="2" fill="#2f6fd0"/><circle cx="10" cy="20" r="2" fill="#8a4fbf"/><path d="m20 28 7-16 3 1.5-7 16z" fill="#8d5a2b" stroke="#4c2f14"/><path d="m27 12 3-6 2 1-2 6z" fill="#d0d0d0" stroke="#444"/><path d="m19 27 3-3 2 2-2 3z" fill="#222"/>',
    calc: '<rect x="5" y="2" width="22" height="28" rx="1" fill="#c8c8c8" stroke="#111"/><rect x="8" y="5" width="16" height="6" fill="#b7d9a8" stroke="#333"/><path d="M10 8h12" stroke="#2f4f2f" stroke-width="2"/><g fill="#e8e8e8" stroke="#555"><rect x="8" y="14" width="4" height="4"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="4" height="4"/><rect x="8" y="20" width="4" height="4"/><rect x="14" y="20" width="4" height="4"/><rect x="20" y="20" width="4" height="4"/><rect x="8" y="25" width="10" height="3"/><rect x="20" y="25" width="4" height="3"/></g><rect x="20" y="14" width="4" height="4" fill="#e06c2b" stroke="#803010"/>',
    terminal: '<rect x="2" y="4" width="28" height="24" rx="1" fill="#c8c8c8" stroke="#111"/><rect x="4" y="6" width="24" height="18" fill="#050805"/><path d="m7 11 3 3-3 3" fill="none" stroke="#4be04b" stroke-width="1.6"/><path d="M12 17h8" stroke="#4be04b" stroke-width="1.6"/><rect x="13" y="28" width="6" height="2" fill="#999"/><path d="M6 8h5" stroke="#2f7d2f"/>',
    mine: '<circle cx="16" cy="19" r="9" fill="#222" stroke="#000"/><path d="M16 10c0-3 2-5 5-6" fill="none" stroke="#a06020" stroke-width="2"/><path d="m21 4 3-1-1 3 3-1-2 3" fill="none" stroke="#ffb000" stroke-width="1.4"/><circle cx="13" cy="16" r="2" fill="#777"/><path d="M7 19h18M16 11v16M9 12l14 14M23 12 9 26" stroke="#000" stroke-width="1.6"/>',
    'mine-flag': '<path d="M14 4v24" stroke="#222" stroke-width="2"/><path d="M15 5h12l-3 4 3 4H15z" fill="#e01b24" stroke="#7a0d12"/><path d="M8 28h14" stroke="#222" stroke-width="2"/>',
    ie: '<ellipse cx="16" cy="17" rx="15" ry="6.5" fill="none" stroke="#f2b705" stroke-width="2.2" transform="rotate(-18 16 17)"/><text x="16" y="26" text-anchor="middle" font-family="Georgia,serif" font-size="28" font-weight="700" font-style="italic" fill="#1c6fbd" stroke="#0a3c73" stroke-width=".7">e</text><path d="M10 12c2-5 14-6 14 3 0 4-4 5-8 4" fill="none" stroke="#1c6fbd" stroke-width="2.4"/>',
    settings: '<rect x="3" y="5" width="26" height="22" fill="#c8c8c8" stroke="#111"/><rect x="4" y="6" width="24" height="4" fill="#000080"/><path d="M7 14h18M7 19h18M7 24h18" stroke="#777"/><rect x="10" y="12" width="4" height="4" fill="#d33" stroke="#500"/><rect x="17" y="17" width="4" height="4" fill="#2a7fd0" stroke="#12406b"/><rect x="13" y="22" width="4" height="4" fill="#2f9d4a" stroke="#14501f"/>',
    taskmgr: '<rect x="3" y="4" width="26" height="24" fill="#c8c8c8" stroke="#111"/><rect x="4" y="5" width="24" height="4" fill="#000080"/><rect x="6" y="11" width="20" height="14" fill="#071207"/><rect x="9" y="19" width="3" height="4" fill="#35d035"/><rect x="14" y="15" width="3" height="8" fill="#e8d33a"/><rect x="19" y="12" width="3" height="11" fill="#e04b3a"/><path d="M8 13h16" stroke="#2f6d2f"/>',
    recycle: '<path d="M7 9h18l-2.5 20H9.5z" fill="#b8c0c8" stroke="#3d4650"/><path d="M10 9V6h12v3" fill="#9aa4ae" stroke="#3d4650"/><path d="M5 9h22" stroke="#3d4650" stroke-width="2"/><path d="m16 13 3.4 6h-2.2v4h-2.4v-4H12.6z" fill="#2f7de1" stroke="#12406b"/><path d="M11 25h10" stroke="#7b8794"/>',
    'recycle-full': '<path d="M7 9h18l-2.5 20H9.5z" fill="#b8c0c8" stroke="#3d4650"/><path d="M10 9V6h12v3" fill="#9aa4ae" stroke="#3d4650"/><path d="M5 9h22" stroke="#3d4650" stroke-width="2"/><path d="m11 8-4-5 5 2M20 7l3-5 2 4" fill="#fff" stroke="#666"/><path d="m16 13 3.4 6h-2.2v4h-2.4v-4H12.6z" fill="#2f7de1" stroke="#12406b"/>',

    drive: '<rect x="2" y="8" width="28" height="17" rx="2" fill="#9fa5ad" stroke="#222"/><rect x="4" y="10" width="24" height="13" fill="#c8ccd2"/><circle cx="22" cy="16.5" r="4.5" fill="#8b919a" stroke="#444"/><circle cx="22" cy="16.5" r="1.4" fill="#e6e6e6"/><rect x="7" y="13" width="9" height="2" fill="#6c737c"/><rect x="7" y="18" width="6" height="2" fill="#6c737c"/><circle cx="27" cy="21" r="1.2" fill="#3f0"/>',
    floppy: '<rect x="4" y="3" width="24" height="26" fill="#2c5f9e" stroke="#111"/><rect x="9" y="3" width="14" height="10" fill="#c8c8c8" stroke="#333"/><rect x="12" y="4" width="5" height="7" fill="#333"/><rect x="8" y="17" width="16" height="11" fill="#e8e8e8" stroke="#333"/><path d="M10 22h12M10 25h8" stroke="#2c5f9e"/>',
    cdrom: '<circle cx="16" cy="16" r="13" fill="#cfd6de" stroke="#444"/><circle cx="16" cy="16" r="4" fill="#88909a" stroke="#555"/><circle cx="16" cy="16" r="1.5" fill="#e8e8e8"/><path d="M6 12a13 13 0 0 1 8-7" fill="none" stroke="#fff" stroke-width="2"/>',
    network: '<rect x="2" y="6" width="13" height="10" fill="#c8c8c8" stroke="#111"/><rect x="3.5" y="7.5" width="10" height="7" fill="#1f5d9e"/><rect x="6" y="16" width="5" height="2" fill="#999"/><rect x="3" y="20" width="11" height="2" fill="#c8c8c8" stroke="#111"/><rect x="17" y="12" width="13" height="10" fill="#c8c8c8" stroke="#111"/><rect x="18.5" y="13.5" width="10" height="7" fill="#1f5d9e"/><rect x="21" y="22" width="5" height="2" fill="#999"/><rect x="18" y="26" width="11" height="2" fill="#c8c8c8" stroke="#111"/><path d="M8 18v3h16v-3" fill="none" stroke="#2a9d4a" stroke-width="2"/>',
    volume: '<path d="M4 12h6l7-6v20l-7-6H4z" fill="#d8d8d8" stroke="#333" stroke-width="1.2"/><path d="M21 10c3 2 3 10 0 12M24 7c5 4 5 14 0 18" fill="none" stroke="#2a6db5" stroke-width="2"/>',
    clock: '<circle cx="16" cy="16" r="13" fill="#fff" stroke="#333" stroke-width="2"/><circle cx="16" cy="16" r="1.5" fill="#333"/><path d="M16 16V8M16 16l6 4" stroke="#333" stroke-width="2" stroke-linecap="round"/><path d="M16 5v2M16 25v2M5 16h2M25 16h2" stroke="#888"/>',
    calendar: '<rect x="3" y="5" width="26" height="24" fill="#fff" stroke="#333"/><rect x="3" y="5" width="26" height="6" fill="#b12020"/><path d="M8 3v4M24 3v4" stroke="#333" stroke-width="2"/><g fill="#9bb8d6"><rect x="7" y="14" width="3" height="3"/><rect x="12" y="14" width="3" height="3"/><rect x="17" y="14" width="3" height="3"/><rect x="22" y="14" width="3" height="3"/><rect x="7" y="19" width="3" height="3"/><rect x="12" y="19" width="3" height="3"/><rect x="17" y="19" width="3" height="3"/><rect x="22" y="19" width="3" height="3"/><rect x="7" y="24" width="3" height="3"/><rect x="12" y="24" width="3" height="3"/></g>',

    back: '<path d="M28 6 14 16l14 10z" fill="#2f9d4a" stroke="#14501f"/><path d="M18 6 4 16l14 10z" fill="#4cd964" stroke="#14501f"/>',
    forward: '<path d="M4 6l14 10L4 26z" fill="#2f9d4a" stroke="#14501f"/><path d="M14 6l14 10-14 10z" fill="#4cd964" stroke="#14501f"/>',
    up: '<path d="M3 10h9l2 3h15v15H3z" fill="#ffd75e" stroke="#6d5200"/><path d="m16 7 8 8h-5v8h-6v-8H8z" fill="#2f7de1" stroke="#12406b"/>',
    cut: '<circle cx="8" cy="25" r="3" fill="none" stroke="#333" stroke-width="2"/><circle cx="22" cy="25" r="3" fill="none" stroke="#333" stroke-width="2"/><path d="M10 23 24 4M20 23 6 4" stroke="#666" stroke-width="2"/><path d="M10 23 15 16M20 23 17 16" stroke="#333" stroke-width="2"/>',
    copy: '<path d="M4 4h15v20H4z" fill="#fff" stroke="#555"/><path d="M9 8h15v20H9z" fill="#eef5ff" stroke="#555"/><path d="M12 13h9M12 16h9M12 19h6" stroke="#3b6ea5"/>',
    paste: '<rect x="6" y="5" width="20" height="25" rx="1" fill="#c8a05a" stroke="#5b3d13"/><rect x="10" y="3" width="12" height="6" fill="#e8e8e8" stroke="#555"/><rect x="9" y="10" width="14" height="17" fill="#fff" stroke="#777"/><path d="M12 15h8M12 18h8M12 21h5" stroke="#3b6ea5"/>',
    delete: '<path d="M8 9h16l-2 20H10z" fill="#d8d8d8" stroke="#555"/><path d="M6 9h20M12 9V5h8v4" fill="none" stroke="#333" stroke-width="2"/><path d="M13 14v10M19 14v10" stroke="#b02020" stroke-width="2"/>',
    undo: '<path d="M12 9H6v-6" fill="none" stroke="#2f6fd0" stroke-width="3"/><path d="M6 9c18-8 24 8 17 17" fill="none" stroke="#2f6fd0" stroke-width="3"/>',
    redo: '<path d="M20 9h6v-6" fill="none" stroke="#2f6fd0" stroke-width="3"/><path d="M26 9C8 1 2 17 9 26" fill="none" stroke="#2f6fd0" stroke-width="3"/>',
    'view-large': '<rect x="3" y="3" width="11" height="11" fill="#2f7de1" stroke="#12406b"/><rect x="18" y="3" width="11" height="11" fill="#e6b800" stroke="#7a5c00"/><rect x="3" y="18" width="11" height="11" fill="#2f9d4a" stroke="#14501f"/><rect x="18" y="18" width="11" height="11" fill="#d04a3a" stroke="#6b1a10"/>',
    'view-list': '<g fill="#2f7de1"><rect x="3" y="6" width="3" height="3"/><rect x="3" y="14" width="3" height="3"/><rect x="3" y="22" width="3" height="3"/></g><path d="M9 7.5h20M9 15.5h20M9 23.5h20" stroke="#444" stroke-width="2"/>',
    'view-details': '<rect x="3" y="4" width="26" height="4" fill="#2f6fd0"/><path d="M3 10h26M3 16h26M3 22h26" stroke="#888"/><path d="M3 13h26M3 19h26M3 25h26" stroke="#ccc"/>',
    'view-icons': '<rect x="4" y="4" width="10" height="10" fill="#2f7de1"/><rect x="18" y="4" width="10" height="10" fill="#e6b800"/><rect x="4" y="18" width="10" height="10" fill="#2f9d4a"/><rect x="18" y="18" width="10" height="10" fill="#d04a3a"/>',
    properties: '<rect x="4" y="5" width="24" height="22" fill="#d8d8d8" stroke="#111"/><rect x="5" y="6" width="22" height="4" fill="#000080"/><path d="M8 15h16M8 20h16" stroke="#777" stroke-width="2"/><rect x="12" y="12.5" width="4" height="5" fill="#fff" stroke="#333"/><rect x="17" y="17.5" width="4" height="5" fill="#fff" stroke="#333"/>',
    search: '<circle cx="14" cy="14" r="9" fill="#bfe2ff" stroke="#2f5f8f" stroke-width="2"/><path d="m20.5 20.5 7 7" stroke="#5b3d13" stroke-width="4" stroke-linecap="round"/><path d="M10 10a6 6 0 0 1 7-2" fill="none" stroke="#fff" stroke-width="2"/>',
    help: '<path d="M4 5h9c3 0 4 2 4 4 0-2 1-4 4-4h7v21h-8c-2 0-3 1-3 3 0-2-1-3-3-3H4z" fill="#ffd75e" stroke="#6d5200"/><path d="M7 8h5M7 12h5M20 8h5M20 12h5" stroke="#8a6d00"/><text x="16" y="23" text-anchor="middle" font-family="Tahoma,sans-serif" font-size="12" font-weight="700" fill="#8a4a00">?</text>',
    run: '<rect x="3" y="6" width="26" height="20" fill="#d8d8d8" stroke="#111"/><rect x="4" y="7" width="24" height="4" fill="#000080"/><rect x="7" y="14" width="18" height="9" fill="#fff" stroke="#666"/><path d="m11 16 7 3-7 3z" fill="#2f9d4a" stroke="#14501f"/>',
    shutdown: '<circle cx="16" cy="16" r="12" fill="#c33" stroke="#711"/><path d="M16 7v9" stroke="#fff" stroke-width="3"/><path d="M10 10a10 10 0 1 0 12 0" fill="none" stroke="#fff" stroke-width="2.5"/>',
    logoff: '<path d="M5 4h13v24H5z" fill="#c8a05a" stroke="#5b3d13"/><rect x="15" y="12" width="3" height="8" fill="#e8d8b0" stroke="#5b3d13"/><path d="M22 16h7M26 12l4 4-4 4" fill="none" stroke="#2f9d4a" stroke-width="3"/>',
    restart: '<path d="M26 12a11 11 0 1 0 1 10" fill="none" stroke="#2f6fd0" stroke-width="3"/><path d="M25 5v8h-8" fill="none" stroke="#2f6fd0" stroke-width="3"/>',
    error: '<circle cx="16" cy="16" r="13" fill="#cf2b2b" stroke="#6b1010"/><path d="m10 10 12 12M22 10 10 22" stroke="#fff" stroke-width="3"/>',
    warning: '<path d="M16 3 30 28H2z" fill="#ffd400" stroke="#8a6d00" stroke-width="1.5"/><path d="M16 11v9" stroke="#111" stroke-width="3"/><circle cx="16" cy="24" r="1.8" fill="#111"/>',
    info: '<circle cx="16" cy="16" r="13" fill="#2f7de1" stroke="#12406b"/><circle cx="16" cy="9" r="2" fill="#fff"/><path d="M16 13v10" stroke="#fff" stroke-width="4"/>',
    question: '<circle cx="16" cy="16" r="13" fill="#2f7de1" stroke="#12406b"/><path d="M11 11c0-6 10-6 10 0 0 3-5 3-5 7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="16" cy="24" r="2" fill="#fff"/>',
    save: '<rect x="4" y="3" width="24" height="26" fill="#2c5f9e" stroke="#111"/><rect x="9" y="3" width="14" height="10" fill="#c8c8c8" stroke="#333"/><rect x="12" y="4" width="5" height="7" fill="#333"/><rect x="8" y="17" width="16" height="11" fill="#e8e8e8" stroke="#333"/><path d="M10 22h12M10 25h8" stroke="#2c5f9e"/>',
    open: '<path d="M2 7h10l2 3h16v17H2z" fill="#d7a219" stroke="#6d5200"/><path d="M2 11h28v15H2z" fill="#ffd75e" stroke="#6d5200"/><path d="M5 26 9 13h23l-4 13z" fill="#ffe58c" stroke="#6d5200"/>',
    print: '<rect x="6" y="12" width="20" height="10" fill="#c8c8c8" stroke="#333"/><rect x="9" y="4" width="14" height="9" fill="#fff" stroke="#555"/><path d="M9 18h14v10H9z" fill="#fff" stroke="#555"/><path d="M12 21h8M12 24h8" stroke="#3b6ea5"/><circle cx="23" cy="15" r="1.3" fill="#2f9d4a"/>',
    mail: '<rect x="2" y="7" width="28" height="19" fill="#e8e8e8" stroke="#333"/><path d="m2 7 14 11L30 7" fill="#fff" stroke="#555"/><path d="m2 26 10-10M30 26 20 16" stroke="#999"/>',
    globe: '<circle cx="16" cy="16" r="13" fill="#3f8ed8" stroke="#12406b"/><path d="M7 11c5 3 13 3 18 0M8 22c5-3 13-3 18 0M16 3c-5 5-5 21 0 26M16 3c5 5 5 21 0 26" fill="none" stroke="#7fd06b" stroke-width="2"/><circle cx="16" cy="16" r="13" fill="none" stroke="#9fd4ff"/>',
    star: '<path d="m16 2 4.2 9.2 10 .9-7.6 6.5 2.3 9.8L16 23.2l-8.9 5.2 2.3-9.8L1.8 12l10-.9z" fill="#ffd400" stroke="#8a6d00"/>',
    heart: '<path d="M16 28C2 18 3 7 10 7c3 0 5 2 6 4 1-2 3-4 6-4 7 0 8 11-6 21z" fill="#e01b24" stroke="#7a0d12"/>',
    user: '<circle cx="16" cy="10" r="6" fill="#f0d0a0" stroke="#6b4e2e"/><path d="M4 29c0-8 5-12 12-12s12 4 12 12z" fill="#2f6fd0" stroke="#12406b"/><path d="M10 9c2-3 10-3 12 0" fill="none" stroke="#6b4e2e" stroke-width="2"/>',
    mouse: '<rect x="10" y="3" width="12" height="21" rx="6" fill="#d8d8d8" stroke="#333"/><path d="M16 3v8" stroke="#333"/><path d="M10 11h12" stroke="#333"/><rect x="14" y="13" width="4" height="7" fill="#2f7de1"/><path d="M16 24v5" stroke="#333" stroke-width="2"/>',
    keyboard: '<rect x="2" y="9" width="28" height="15" rx="1" fill="#d8d8d8" stroke="#333"/><g fill="#888"><rect x="5" y="12" width="3" height="3"/><rect x="9" y="12" width="3" height="3"/><rect x="13" y="12" width="3" height="3"/><rect x="17" y="12" width="3" height="3"/><rect x="21" y="12" width="3" height="3"/><rect x="25" y="12" width="2" height="3"/><rect x="5" y="16" width="4" height="3"/><rect x="10" y="16" width="3" height="3"/><rect x="14" y="16" width="3" height="3"/><rect x="18" y="16" width="3" height="3"/><rect x="22" y="16" width="5" height="3"/><rect x="8" y="20" width="16" height="2"/></g>',
    sound: '<path d="M4 12h6l7-6v20l-7-6H4z" fill="#d8d8d8" stroke="#333"/><path d="M21 10c3 2 3 10 0 12M24 7c5 4 5 14 0 18" fill="none" stroke="#2a6db5" stroke-width="2"/>',
    'no-sound': '<path d="M4 12h6l7-6v20l-7-6H4z" fill="#d8d8d8" stroke="#333"/><path d="m20 11 8 10M28 11l-8 10" stroke="#c33" stroke-width="3"/>',
    lock: '<rect x="7" y="14" width="18" height="14" fill="#e6c34a" stroke="#6b5200"/><path d="M11 14V9a5 5 0 0 1 10 0v5" fill="none" stroke="#555" stroke-width="3"/><circle cx="16" cy="20" r="2" fill="#6b5200"/><path d="M16 22v3" stroke="#6b5200" stroke-width="2"/>',
    power: '<circle cx="16" cy="16" r="12" fill="#2f9d4a" stroke="#14501f"/><path d="M16 7v9" stroke="#fff" stroke-width="3"/><path d="M10 10a10 10 0 1 0 12 0" fill="none" stroke="#fff" stroke-width="2.5"/>',
    windows: '<path d="M4 8.5 14.5 5v9.5L4 18z" fill="#ff3b30"/><path d="M16.5 4.3 29 1.5V13l-12.5 2.8z" fill="#48c94f"/><path d="M4 19.6 14.5 16v9.4L4 29z" fill="#2f7de1"/><path d="M16.5 17.4 29 14.6V26l-12.5 3.4z" fill="#ffcc00"/>',
    'arrow-right': '<path d="m10 6 11 10-11 10z" fill="#222"/>',
    'arrow-down': '<path d="m6 10 10 11L26 10z" fill="#222"/>',
    check: '<path d="m5 16 7 7L27 7" fill="none" stroke="#1f8f36" stroke-width="5" stroke-linecap="round"/>',
    dot: '<circle cx="16" cy="16" r="6" fill="#222"/>',
    game: '<rect x="2" y="10" width="28" height="15" rx="7" fill="#8a8f98" stroke="#222"/><path d="M9 15v5M6.5 17.5h5" stroke="#222" stroke-width="2"/><circle cx="22" cy="15" r="2" fill="#d33"/><circle cx="25" cy="19" r="2" fill="#e6b800"/>',
    folderx: '<path d="M2 7h10l2 3h16v17H2z" fill="#d7a219" stroke="#6d5200"/><path d="M2 11h28v15H2z" fill="#ffd75e" stroke="#6d5200"/><path d="m12 16 8 8M20 16l-8 8" stroke="#b02020" stroke-width="3"/>',
    notepad: '<rect x="4" y="3" width="23" height="26" fill="#2c5f9e" stroke="#111"/><rect x="7" y="5" width="17" height="22" fill="#fff" stroke="#777"/><path d="M10 9h11M10 13h11M10 17h11M10 21h7" stroke="#3b6ea5" stroke-width="1.3"/><path d="M4 6h3M4 10h3M4 14h3M4 18h3M4 22h3M4 26h3" stroke="#dbe8f5" stroke-width="1.4"/><path d="m20 24 6-9 3 2-6 9z" fill="#e6b800" stroke="#7a5c00"/>',
    refresh: '<path d="M27 16a11 11 0 1 1-3.2-7.8" fill="none" stroke="#2f9d4a" stroke-width="3.2"/><path d="M27 4v9h-9" fill="none" stroke="#2f9d4a" stroke-width="3.2"/><path d="M14 13a6 6 0 0 0-4 5" fill="none" stroke="#7fd06b" stroke-width="2"/>',
    minimize: '<rect x="4" y="5" width="24" height="22" fill="#d8d8d8" stroke="#111"/><rect x="5" y="6" width="22" height="4" fill="#000080"/><path d="M9 24h14" stroke="#2f6fd0" stroke-width="3"/>',
    maximize: '<rect x="4" y="5" width="24" height="22" fill="#d8d8d8" stroke="#111"/><rect x="5" y="6" width="22" height="4" fill="#000080"/><rect x="10" y="14" width="12" height="8" fill="#bfe2ff" stroke="#12406b"/>',
    restore: '<rect x="4" y="8" width="18" height="16" fill="#d8d8d8" stroke="#111"/><rect x="5" y="9" width="16" height="3" fill="#000080"/><rect x="10" y="4" width="18" height="16" fill="#c8c8c8" stroke="#111"/><rect x="11" y="5" width="16" height="3" fill="#1084d0"/>',
    close: '<path d="m8 8 16 16M24 8 8 24" stroke="#c02626" stroke-width="4" stroke-linecap="round"/>'
  };

  DATA.start = DATA.flag;
  DATA['folder-new'] = DATA.folder;
  DATA.pause = '<rect x="8" y="7" width="5" height="18" rx="1.2" fill="#2f6fc0" stroke="#16406f"/><rect x="19" y="7" width="5" height="18" rx="1.2" fill="#2f6fc0" stroke="#16406f"/>';
  DATA.firefox = '<circle cx="16" cy="16" r="13" fill="#3b82f6" stroke="#1e3a8a"/><path d="M16 3c-3.2 0-6.2 1.6-8 4.2 2.4-.6 5.2-.2 7.4 1.4-1.6-.2-3.4.4-4.6 1.8 2.6-.8 5.6.2 7 2.8-1.4-.6-3.2-.4-4.4.6 2.2 0 4.4 1.4 5 3.8-.8-.8-2-.8-3 0 1.6.4 3 2 3.2 4 .4-1.2.2-2.6-.6-3.6 1.8 1.4 2.4 4 1.4 6.2-.8-1.6-2.4-2.6-4-2.6 2 .8 3 3 3 5.2-1.2-1.8-3.2-2.6-5.2-2.4 1.6 1.2 2 3.4.8 5.2-1.6-2-4-2.6-6.2-1.8 2 .6 3.4 2.4 3.4 4.6-1.6-1.6-4-2-6-.8" fill="#f97316" stroke="#9a3412" stroke-width=".6"/>' +
    '<ellipse cx="16" cy="16" rx="6" ry="6" fill="#dbeafe" opacity=".35"/>';
  DATA.vpc = '<rect x="2" y="4" width="21" height="16" rx="1" fill="#c8c8c8" stroke="#111"/><rect x="4" y="6" width="17" height="11" fill="#0a3d78"/><rect x="5" y="7" width="15" height="9" fill="#2a6db5"/><path d="M6 8h7v2H6z" fill="#8fc0ea" opacity=".7"/><rect x="9" y="20" width="7" height="2" fill="#9c9c9c" stroke="#111"/><rect x="5" y="22" width="15" height="2" fill="#c8c8c8" stroke="#111"/><rect x="12" y="13" width="16" height="12" rx="1" fill="#e8eef7" stroke="#16406f"/><rect x="13.5" y="14.5" width="13" height="7" fill="#2f6fc0"/><path d="M14.5 20 17 17l2 2.2 1.6-1.4 2.4 2.6z" fill="#7fd06b"/><circle cx="24" cy="16.6" r="1" fill="#ffe066"/><rect x="14" y="22.4" width="8" height="1.4" fill="#c9d4e2"/>';


  DATA.eaglercraft = '<image href="assets/eaglercraft.png" width="32" height="32" preserveAspectRatio="xMidYMid slice"/>';
  const ns = 'http://www.w3.org/2000/svg';
  const sprite = document.createElementNS(ns, 'svg');
  sprite.setAttribute('id', 'icon-sprite');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  sprite.innerHTML = Object.keys(DATA).map(function (k) {
    return '<symbol id="i-' + k + '" viewBox="0 0 32 32">' + DATA[k] + '</symbol>';
  }).join('');
  document.body.appendChild(sprite);

  Win.icons = DATA;
  /**
   * Return an inline SVG icon.
   * @param {string} name icon id
   * @param {number} size pixel size
   * @param {string} cls extra classes
   */
  Win.icon = function (name, size, cls) {
    size = size || 16;
    if (!DATA[name]) name = 'file';
    return '<svg class="ico ' + (cls || '') + '" width="' + size + '" height="' + size +
      '" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
  };
  Win.iconEl = function (name, size, cls) {
    const holder = document.createElement('span');
    holder.innerHTML = Win.icon(name, size, cls);
    return holder.firstChild;
  };
})();
