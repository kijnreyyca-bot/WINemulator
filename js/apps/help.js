/* WINemulator — Help Topics */
(function () {
  'use strict';
  const U = Win.util, el = U.el;

  const WELCOME_DOC = 'C:\\My Documents\\Welcome.txt';
  const README_DOC = 'C:\\Windows\\Desktop\\Read Me.txt';

  /* ------------------------------------------------------------- fragments */
  function topicLink(id, label) {
    return '<a href="#" data-topic="' + id + '">' + label + '</a>';
  }
  function appLink(id, label) {
    return '<a href="#" data-app="' + id + '">' + label + '</a>';
  }
  function card(attr, value, icon, title, desc) {
    return '<button class="hlp-card" type="button" data-' + attr + '="' + value + '">' +
      Win.icon(icon, 24) + '<span><b>' + title + '</b><small>' + desc + '</small></span></button>';
  }
  function topicCard(id, icon, title, desc) { return card('topic', id, icon, title, desc); }
  function appCard(id, icon, title, desc) { return card('app', id, icon, title, desc); }
  function actionBtn(action, icon, label) {
    return '<button class="btn" type="button" data-action="' + action + '">' +
      Win.icon(icon, 16) + ' ' + label + '</button>';
  }
  function appBtn(id, icon, label, tab) {
    return '<button class="btn" type="button" data-app="' + id + '"' +
      (tab ? ' data-tab="' + tab + '"' : '') + '>' + Win.icon(icon, 16) + ' ' + label + '</button>';
  }

  /* ----------------------------------------------------------------- pages */
  function pageWelcome() {
    return '<div class="hlp-hero">' +
      '<span class="hlp-flag">' + Win.icon('flag', 72) + '</span>' +
      '<div><h1>Welcome to WINemulator 98</h1>' +
      '<p>A complete Windows-style desktop that boots in your browser. No installs, no virtual machine, no waiting.</p></div>' +
      '</div>' +
      '<p class="hlp-lead">This copy is yours. Files, drawings, settings and even the wallpaper are saved locally in this browser, so everything is right where you left it next time.</p>' +
      '<div class="hlp-cards">' +
      topicCard('tour', 'computer', 'Quick Tour', 'A two-minute walk through the desktop.') +
      topicCard('programs', 'programs', 'Programs', 'Notepad, Paint, Minesweeper and friends.') +
      topicCard('files', 'folder', 'Files & Storage', 'Where things are saved and how to find them.') +
      topicCard('shortcuts', 'keyboard', 'Keyboard & Mouse', 'The shortcuts that save the most time.') +
      topicCard('appearance', 'monitor', 'Make It Yours', 'Themes, wallpaper, sounds and effects.') +
      topicCard('offline', 'network', 'Offline & Privacy', 'How everything keeps working without the web.') +
      '</div>' +
      '<div class="hlp-note"><b>First time here?</b> Start with the Quick Tour, or just double-click an icon on the desktop. Nothing you do here can break the real computer.</div>' +
      '<div class="hlp-actions">' +
      actionBtn('tour', 'forward', 'Take the tour') +
      actionBtn('computer', 'computer', 'Open My Computer') +
      actionBtn('welcome-doc', 'textfile', 'Read Welcome.txt') +
      '</div>' +
      '<h2>What you can do today</h2>' +
      '<ul>' +
      '<li>Write a note in ' + appLink('notepad', 'Notepad') + ' and save it to <code>C:\\My Documents</code>.</li>' +
      '<li>Draw something in ' + appLink('paint', 'Paint') + ', then set it as a file on the virtual drive.</li>' +
      '<li>Play ' + appLink('minesweeper', 'Minesweeper') + ' on Beginner, Intermediate or Expert.</li>' +
      '<li>Browse the local web with ' + appLink('browser', 'Internet Explorer') + ' — try <code>winemulator://home</code>.</li>' +
      '<li>Type <code>HELP</code> in the ' + appLink('terminal', 'MS-DOS Prompt') + ' for a full command list.</li>' +
      '<li>Change the theme, wallpaper or sounds in the ' + appLink('settings', 'Control Panel') + '.</li>' +
      '</ul>' +
      '<div class="hlp-footnote">WINemulator ' + (Win.version || '1.0.0') + ' &middot; Build ' + (Win.build || 'web-2026') +
      ' &middot; A simulation, not a real operating system. Nothing leaves this browser.</div>';
  }

  function pageTour() {
    return '<h1>Quick Tour</h1><p class="hlp-lead">Everything here should feel familiar. Here is the short version.</p>' +
      '<h2>1. The desktop</h2>' +
      '<p>The icons on the left open programs and folders. Double-click one to start it. You can drag icons anywhere you like — their positions are remembered. Right-click an empty part of the desktop for wallpaper, refresh and new-document options.</p>' +
      '<h2>2. The Start menu</h2>' +
      '<p>Click <b>Start</b> in the bottom-left corner, or press <code>Ctrl+Esc</code>. Programs, Documents, Settings, Find, Help and Run all live there. The bottom bar is the taskbar: every open window gets a button, and the tray on the right holds the clock, volume and network icons.</p>' +
      '<h2>3. Windows behave like windows</h2>' +
      '<ul>' +
      '<li>Drag the title bar to move a window.</li>' +
      '<li>Drag any edge or corner to resize it.</li>' +
      '<li>Double-click the title bar to maximize or restore it.</li>' +
      '<li>Use the buttons to minimize, maximize or close it.</li>' +
      '<li>Press <code>Alt+Tab</code> to switch between open programs.</li>' +
      '</ul>' +
      '<h2>4. Right-click almost everything</h2>' +
      '<p>Context menus are everywhere: desktop, files, folders, taskbar buttons, the Recycle Bin. If you are not sure what an item can do, right-click it.</p>' +
      '<h2>5. Your files are real (sort of)</h2>' +
      '<p>Open ' + appLink('explorer', 'Windows Explorer') + ' or double-click <b>My Computer</b> to browse the virtual <code>C:</code> drive. Files you save from Notepad and Paint appear there. Deleted items go to the Recycle Bin and can be restored.</p>' +
      '<h2>6. Make it yours</h2>' +
      '<p>The ' + appLink('settings', 'Control Panel') + ' changes the theme, wallpaper, sounds, animations and boot behaviour. Changes apply immediately, and they are saved for your next visit.</p>' +
      '<div class="hlp-actions">' +
      actionBtn('programs', 'programs', 'See all programs') +
      actionBtn('files', 'folder', 'Learn about files') +
      actionBtn('shortcuts', 'keyboard', 'Keyboard shortcuts') +
      '</div>';
  }

  function pagePrograms() {
    return '<h1>Programs</h1><p class="hlp-lead">Small, fast and deliberately familiar. Click any card to open the program.</p>' +
      '<div class="hlp-cards">' +
      appCard('notepad', 'notepad', 'Notepad', 'Plain-text editing. Opens .txt files from the virtual drive.') +
      appCard('paint', 'paint', 'Paint', 'Draw with pencils, brushes and shapes, then save as an image.') +
      appCard('calc', 'calc', 'Calculator', 'A standard four-function calculator with memory keys.') +
      appCard('terminal', 'terminal', 'MS-DOS Prompt', 'A working command line for the virtual C: drive.') +
      appCard('explorer', 'folder', 'Windows Explorer', 'Browse, organize, copy and delete files and folders.') +
      appCard('browser', 'ie', 'Internet Explorer', 'A retro browser with a small local web.') +
      appCard('minesweeper', 'mine', 'Minesweeper', 'The classic puzzle. Right-click plants a flag.') +
      appCard('settings', 'settings', 'Control Panel', 'Appearance, wallpaper, sounds, performance and system tools.') +
      appCard('taskmgr', 'taskmgr', 'Task Manager', 'See running programs and end unresponsive tasks.') +
      appCard('help', 'help', 'Help', 'This guide. Press F1 from almost anywhere.') +
      '</div>' +
      '<h2>Handy commands</h2>' +
      '<p>Open the ' + appLink('terminal', 'MS-DOS Prompt') + ' and try:</p>' +
      '<ul>' +
      '<li><code>HELP</code> — list every command.</li>' +
      '<li><code>DIR</code> — list the current folder.</li>' +
      '<li><code>CD C:\\My Documents</code> — change folders.</li>' +
      '<li><code>TYPE Welcome.txt</code> — print a text file.</li>' +
      '<li><code>SYSTEMINFO</code> — show information about this session.</li>' +
      '<li><code>START notepad</code> — launch another program.</li>' +
      '<li><code>CLS</code> — clear the screen; <code>EXIT</code> closes the prompt.</li>' +
      '</ul>' +
      '<h2>Minesweeper in ten seconds</h2>' +
      '<p>Left-click a square to open it. A number tells you how many mines touch that square. Right-click (or long-press on a touch screen) to plant a flag. Double-click a number surrounded by the right number of flags to open its neighbours. Your first click is always safe.</p>' +
      '<div class="hlp-actions">' +
      appBtn('minesweeper', 'mine', 'Play Minesweeper') +
      appBtn('browser', 'ie', 'Open Internet Explorer') +
      appBtn('terminal', 'terminal', 'Open MS-DOS Prompt') +
      '</div>';
  }

  function pageFiles() {
    return '<h1>Files &amp; Storage</h1><p class="hlp-lead">There is one virtual drive, <code>C:</code>, and it lives in your browser.</p>' +
      '<h2>Finding your way around</h2>' +
      '<p>Double-click <b>My Computer</b> on the desktop, then <b>Local Disk (C:)</b>. Windows Explorer has an address bar, Back and Forward buttons, and several view modes. Press <code>Backspace</code> to go up one folder, or <code>Alt+Left</code> to go back.</p>' +
      '<p>A few useful places are already there:</p>' +
      '<ul>' +
      '<li><code>C:\\My Documents</code> — Welcome.txt, To Do.txt, the Art folder and Letters.</li>' +
      '<li><code>C:\\Windows\\Desktop</code> — files that appear as desktop icons.</li>' +
      '<li><code>C:\\Program Files</code> — read-me files for the installed programs.</li>' +
      '<li><code>C:\\</code> — AUTOEXEC.BAT, CONFIG.SYS and the Windows folder.</li>' +
      '</ul>' +
      '<h2>Saving and opening</h2>' +
      '<p>Notepad and Paint use the standard file dialog. Choose <b>File &gt; Save</b> (or <code>Ctrl+S</code>) to write to the drive, and <b>File &gt; Open</b> (<code>Ctrl+O</code>) to load a file. Text files are saved as plain text; Paint saves PNG images. The file system is shared, so a note saved in Notepad can be opened from Explorer.</p>' +
      '<h2>Organizing</h2>' +
      '<ul>' +
      '<li>Right-click a folder and choose <b>New &gt; Folder</b> in Explorer.</li>' +
      '<li>Use <code>Ctrl+C</code>, <code>Ctrl+X</code> and <code>Ctrl+V</code> to copy, cut and paste.</li>' +
      '<li>Press <code>F2</code> to rename, <code>Delete</code> to send to the Recycle Bin, and <code>F5</code> to refresh.</li>' +
      '<li>Double-click a file to open it with its associated program.</li>' +
      '</ul>' +
      '<h2>The Recycle Bin</h2>' +
      '<p>Deleted files wait in the Recycle Bin on the desktop. Open it, select an item and use <b>Restore</b> to put it back, or <b>Empty</b> to remove everything permanently. Deleting from inside the Recycle Bin is also permanent.</p>' +
      '<h2>Backups and moving to another browser</h2>' +
      '<p>All data is stored under this browser profile. Clearing site data will erase it. To move your files, open ' + appLink('settings', 'Control Panel') + ' &gt; <b>System</b> and choose <b>Export backup</b>. The JSON file can be imported on another computer or browser. The same tab can reset the whole desktop.</p>' +
      '<div class="hlp-actions">' +
      appBtn('explorer', 'folder', 'Open Explorer') +
      appBtn('settings', 'save', 'Back up my files', 'system') +
      actionBtn('welcome-doc', 'textfile', 'Open Welcome.txt') +
      '</div>';
  }

  function pageAppearance() {
    return '<h1>Make It Yours</h1><p class="hlp-lead">The Control Panel changes the desktop in real time. Everything is remembered for next time.</p>' +
      '<h2>Appearance</h2>' +
      '<p>Choose between the classic Windows look, a softer Platinum theme and a dark Midnight theme. You can also turn window animations on or off, enable CRT scanlines, switch to a 24-hour clock and show a frame-rate meter.</p>' +
      '<div class="hlp-actions">' + appBtn('settings', 'monitor', 'Open Appearance', 'appearance') + '</div>' +
      '<h2>Background</h2>' +
      '<p>Pick Teal, Clouds, Azure, Sunset, Graphite or Grid — all drawn with CSS gradients, so there are no images to download. Choose <b>Solid Color</b> to pick any desktop color.</p>' +
      '<div class="hlp-actions">' + appBtn('settings', 'image', 'Change wallpaper', 'background') + '</div>' +
      '<h2>Sounds</h2>' +
      '<p>WINemulator synthesises its sounds with the Web Audio API. There are no audio files. You can mute everything, adjust the master volume and preview each sound.</p>' +
      '<p class="hlp-note">Browsers keep audio silent until you interact with the page. If you do not hear the startup sound, click the desktop once and try a sound test.</p>' +
      '<div class="hlp-actions">' + appBtn('settings', 'sound', 'Sound settings', 'sounds') + '</div>' +
      '<h2>Performance</h2>' +
      '<p><b>Fast boot</b> skips most of the BIOS and splash sequence. Disabling animations and the CRT overlay helps on older devices. <b>Restart now</b> reboots without closing the browser tab.</p>' +
      '<div class="hlp-actions">' + appBtn('settings', 'taskmgr', 'Performance options', 'performance') + '</div>' +
      '<h2>Handy extras</h2>' +
      '<ul>' +
      '<li>Right-click the desktop to change the wallpaper or refresh icons.</li>' +
      '<li>The taskbar clock opens a calendar when clicked.</li>' +
      '<li>Click the speaker icon for a volume slider, or the network icon for connection details.</li>' +
      '<li>Desktop icon positions are saved automatically.</li>' +
      '</ul>';
  }

  function pageShortcuts() {
    return '<h1>Keyboard &amp; Mouse</h1><p class="hlp-lead">A few keys are worth memorizing. The mouse works the way you expect, too.</p>' +
      '<h2>Global shortcuts</h2>' +
      '<table class="hlp-kbd"><tr><th>Shortcut</th><th>What it does</th></tr>' +
      '<tr><td>Ctrl+Esc</td><td>Open or close the Start menu.</td></tr>' +
      '<tr><td>Ctrl+Shift+Esc</td><td>Open Task Manager.</td></tr>' +
      '<tr><td>Alt+Tab</td><td>Switch between open windows. Hold Alt and press Tab again to cycle.</td></tr>' +
      '<tr><td>Alt+F4</td><td>Close the active window.</td></tr>' +
      '<tr><td>F1</td><td>Open Help.</td></tr>' +
      '<tr><td>F5</td><td>Refresh the desktop (or the current folder in Explorer).</td></tr>' +
      '<tr><td>Win/Cmd+D</td><td>Show the desktop and minimize all windows.</td></tr>' +
      '<tr><td>Win/Cmd+E</td><td>Open My Computer.</td></tr>' +
      '<tr><td>Win/Cmd+R</td><td>Open the Run dialog.</td></tr>' +
      '<tr><td>Esc</td><td>Close menus and pop-ups, or cancel a dialog.</td></tr>' +
      '</table>' +
      '<p class="hlp-note">Your real operating system may reserve the Windows key before the browser sees it. The Ctrl and Alt shortcuts always work.</p>' +
      '<h2>Windows and the desktop</h2>' +
      '<ul>' +
      '<li><b>Double-click</b> a desktop icon to open it.</li>' +
      '<li><b>Drag</b> a title bar to move a window; drag an edge or corner to resize.</li>' +
      '<li><b>Double-click</b> a title bar to maximize or restore.</li>' +
      '<li><b>Right-click</b> the desktop, a file, a folder or a taskbar button for its menu.</li>' +
      '<li><b>Click</b> a taskbar button to minimize or restore its window.</li>' +
      '</ul>' +
      '<h2>Explorer</h2>' +
      '<table class="hlp-kbd"><tr><th>Shortcut</th><th>What it does</th></tr>' +
      '<tr><td>Enter</td><td>Open the selected item.</td></tr>' +
      '<tr><td>Backspace</td><td>Go up one folder.</td></tr>' +
      '<tr><td>Alt+Left / Alt+Right</td><td>Back and Forward.</td></tr>' +
      '<tr><td>F2</td><td>Rename the selection.</td></tr>' +
      '<tr><td>Delete</td><td>Send the selection to the Recycle Bin.</td></tr>' +
      '<tr><td>Ctrl+C / Ctrl+X / Ctrl+V</td><td>Copy, cut and paste.</td></tr>' +
      '<tr><td>Ctrl+A</td><td>Select everything in the folder.</td></tr>' +
      '</table>' +
      '<h2>Inside programs</h2>' +
      '<ul>' +
      '<li><b>Notepad:</b> <code>Ctrl+S</code> save, <code>Ctrl+O</code> open, <code>Ctrl+Z</code> undo, <code>F5</code> insert the time and date.</li>' +
      '<li><b>Paint:</b> <code>Ctrl+Z</code> undo, <code>Ctrl+Y</code> redo, <code>Ctrl+S</code> save. Press a tool\'s letter to select it.</li>' +
      '<li><b>Minesweeper:</b> <code>F2</code> starts a new game.</li>' +
      '<li><b>Terminal:</b> use the up and down arrows to recall previous commands.</li>' +
      '</ul>';
  }

  function pageOffline() {
    return '<h1>Offline &amp; Privacy</h1><p class="hlp-lead">WINemulator is designed to work with the network unplugged.</p>' +
      '<h2>Nothing is uploaded</h2>' +
      '<p>There is no account, no analytics and no server-side storage. Every program, icon, sound and wallpaper is generated locally by the page. Your files and settings are kept in this browser\'s local storage.</p>' +
      '<h2>Working offline</h2>' +
      '<p>After the first visit, a service worker caches the desktop so it can start without an internet connection. If you opened this copy from a local file, it already works offline. When you are offline, external websites in Internet Explorer will not load — the local <code>winemulator://</code> pages still do.</p>' +
      '<h2>What is stored where</h2>' +
      '<ul>' +
      '<li><b>Files</b> — in a virtual file system inside local storage.</li>' +
      '<li><b>Settings</b> — theme, wallpaper, sounds and options.</li>' +
      '<li><b>Recent documents</b> — a short list used by the Documents menu.</li>' +
      '<li><b>Desktop layout</b> — icon positions and shortcuts.</li>' +
      '<li><b>Minesweeper records</b> — your best times.</li>' +
      '</ul>' +
      '<h2>Keeping your data safe</h2>' +
      '<p>Clearing your browser\'s site data, using private browsing, or resetting the desktop will erase these files. Export a backup from ' + appLink('settings', 'Control Panel') + ' &gt; <b>System</b> before clearing anything. Private windows usually discard storage as soon as they close.</p>' +
      '<div class="hlp-actions">' +
      appBtn('settings', 'save', 'Back up now', 'system') +
      actionBtn('ie-home', 'ie', 'Visit the local home page') +
      '</div>' +
      '<h2>Good to know</h2>' +
      '<ul>' +
      '<li>External sites in Internet Explorer may refuse to appear inside a frame. Use the <b>Open in new tab</b> button when that happens.</li>' +
      '<li>Downloads from Notepad or Paint use your browser\'s normal download folder.</li>' +
      '<li>Your browser may limit local storage to a few megabytes. The System tab shows how much is in use.</li>' +
      '</ul>';
  }

  function pageTroubleshooting() {
    return '<h1>Troubleshooting</h1><p class="hlp-lead">Most problems have a simple answer. Try these first.</p>' +
      '<h2>A program will not start</h2>' +
      '<p>Open ' + appLink('taskmgr', 'Task Manager') + ' with <code>Ctrl+Shift+Esc</code>, select the stuck task and choose <b>End Task</b>. Then launch the program again from the Start menu. If the desktop itself is misbehaving, press <code>F5</code> to refresh it.</p>' +
      '<h2>A file will not save</h2>' +
      '<ul>' +
      '<li>Check that the folder still exists in Explorer.</li>' +
      '<li>Make sure the file name is not already used by a folder.</li>' +
      '<li>Local storage may be full. Open Control Panel &gt; System to see usage, then empty the Recycle Bin or delete unneeded files.</li>' +
      '<li>If storage is blocked entirely, the desktop still runs, but changes will not survive a reload.</li>' +
      '</ul>' +
      '<h2>There is no sound</h2>' +
      '<p>Browsers require a click before audio can play. Click the desktop, then test a sound in Control Panel &gt; Sounds. Check that sounds are enabled and the volume is above zero. The taskbar speaker icon also opens a quick volume slider.</p>' +
      '<h2>An external web page is blank</h2>' +
      '<p>Many sites forbid being embedded in a frame. Use the <b>Open in new tab</b> button in the Internet Explorer toolbar. If you are offline, external pages cannot load at all; the local pages under <code>winemulator://</code> still work.</p>' +
      '<h2>The screen is too small</h2>' +
      '<p>Windows resize and maximize. On a phone or a narrow window, the taskbar, Start menu and most apps switch to a compact layout. Rotate the device or maximize the browser for more room.</p>' +
      '<h2>Start over</h2>' +
      '<p>Control Panel &gt; System &gt; <b>Reset everything</b> erases all files and settings, restores the original desktop and reboots. Export a backup first if you want to keep anything.</p>' +
      '<div class="hlp-actions">' +
      appBtn('taskmgr', 'taskmgr', 'Open Task Manager') +
      appBtn('settings', 'warning', 'Reset options', 'system') +
      actionBtn('restart', 'restart', 'Restart Windows') +
      '</div>' +
      '<h2>Still stuck?</h2>' +
      '<p>Reload the browser tab. WINemulator saves its state as it goes, so a reload usually brings everything back. If a single program misbehaves, closing its window and reopening it clears that program without touching your files.</p>';
  }

  function pageAbout() {
    const si = Win.sysinfo ? Win.sysinfo() : {};
    return '<div class="hlp-hero">' +
      '<span class="hlp-flag">' + Win.icon('flag', 64) + '</span>' +
      '<div><h1>About WINemulator</h1><p>A tribute to the desktop that made computers feel friendly.</p></div>' +
      '</div>' +
      '<p class="hlp-lead">WINemulator is a self-contained Windows 98-style environment written in plain HTML, CSS and JavaScript. It is a simulation, not a real operating system, and it is not affiliated with Microsoft.</p>' +
      '<h2>Version</h2>' +
      '<table class="hlp-kbd"><tr><th>Item</th><th>Value</th></tr>' +
      '<tr><td>Edition</td><td>WINemulator 98, Second Edition (Web)</td></tr>' +
      '<tr><td>Version</td><td>' + U.escapeHtml(Win.version || '1.0.0') + '</td></tr>' +
      '<tr><td>Build</td><td>' + U.escapeHtml(Win.build || 'web-2026') + '</td></tr>' +
      '<tr><td>Engine</td><td>JavaScript, HTML and CSS — no frameworks</td></tr>' +
      '<tr><td>Display</td><td>' + U.escapeHtml(si.viewport || (innerWidth + '×' + innerHeight)) + ' at ' + (si.dpr || 1) + 'x</td></tr>' +
      '<tr><td>Storage</td><td>Browser local storage</td></tr>' +
      '<tr><td>License</td><td>MIT</td></tr>' +
      '</table>' +
      '<h2>Credits</h2>' +
      '<p>Every icon is an inline SVG drawn for this project. Every sound is synthesised with the Web Audio API. Wallpapers are CSS gradients. No external libraries, fonts, trackers or CDNs are used.</p>' +
      '<p>Thanks to the classic Windows interface for the inspiration, and to everyone who ever lost an afternoon to Minesweeper.</p>' +
      '<h2>Learn more</h2>' +
      '<div class="hlp-actions">' +
      actionBtn('open-ie', 'ie', 'Open local home page') +
      appBtn('settings', 'info', 'System information', 'about') +
      appBtn('taskmgr', 'taskmgr', 'Task Manager') +
      '</div>' +
      '<div class="hlp-footnote">Microsoft, Windows and Windows 98 are trademarks of Microsoft Corporation. This project is an independent, non-commercial homage.</div>';
  }

  /* ---------------------------------------------------------------- topics */
  const TOPICS = [
    { id: 'welcome', title: 'Welcome', group: 'Getting started', icon: 'flag', keywords: 'home start first run introduction help', page: pageWelcome },
    { id: 'tour', title: 'Quick Tour', group: 'Getting started', icon: 'computer', keywords: 'guide basics desktop start taskbar windows', page: pageTour },
    { id: 'programs', title: 'Programs', group: 'Using Windows', icon: 'programs', keywords: 'apps notepad paint calculator dos explorer browser minesweeper task manager', page: pagePrograms },
    { id: 'files', title: 'Files & Storage', group: 'Using Windows', icon: 'folder', keywords: 'drive folders save open recycle bin backup explorer', page: pageFiles },
    { id: 'appearance', title: 'Make It Yours', group: 'Using Windows', icon: 'monitor', keywords: 'theme wallpaper background sound volume settings control panel', page: pageAppearance },
    { id: 'shortcuts', title: 'Keyboard & Mouse', group: 'Reference', icon: 'keyboard', keywords: 'hotkeys keys mouse clicking drag double click', page: pageShortcuts },
    { id: 'offline', title: 'Offline & Privacy', group: 'Reference', icon: 'network', keywords: 'offline privacy storage local data service worker', page: pageOffline },
    { id: 'troubleshooting', title: 'Troubleshooting', group: 'Reference', icon: 'warning', keywords: 'problem error sound blank reset stuck save', page: pageTroubleshooting },
    { id: 'about', title: 'About', group: 'Reference', icon: 'info', keywords: 'version credits license build system', page: pageAbout }
  ];

  function topicById(id) {
    return TOPICS.find(function (t) { return t.id === id; }) || null;
  }

  /* ---------------------------------------------------------- text helpers */
  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return String(d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  const textCache = {};
  function topicText(t) {
    if (!textCache[t.id]) textCache[t.id] = stripHtml(t.page());
    return textCache[t.id];
  }
  function snippet(text, terms) {
    const low = text.toLowerCase();
    let pos = -1;
    terms.forEach(function (term) {
      const i = low.indexOf(term);
      if (i > -1 && (pos < 0 || i < pos)) pos = i;
    });
    if (pos < 0) return text.slice(0, 150) + (text.length > 150 ? '…' : '');
    const start = Math.max(0, pos - 60);
    const end = Math.min(text.length, pos + 110);
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
  }
  function searchTopics(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const out = [];
    TOPICS.forEach(function (t) {
      const title = t.title.toLowerCase();
      const keys = (t.keywords || '').toLowerCase();
      const text = topicText(t);
      const low = text.toLowerCase();
      let score = 0;
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        let hit = 0;
        if (title.indexOf(term) > -1) hit += 100;
        if (keys.indexOf(term) > -1) hit += 45;
        if (low.indexOf(term) > -1) hit += 12;
        if (!hit) return;
        score += hit;
      }
      if (title === q.toLowerCase()) score += 60;
      out.push({ topic: t, score: score, snippet: snippet(text, terms) });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  /* --------------------------------------------------------------- the app */
  Win.apps.help = {
    name: 'Help', title: 'Help', icon: 'help',
    width: 820, height: 590, minWidth: 430, minHeight: 340,
    singleton: true,
    mount: function (body, ctx) {
      body.classList.add('app-help');
      const args = ctx.args || {};

      let currentId = null;
      let searchQuery = '';
      let history = [];
      let hidx = -1;

      body.innerHTML =
        '<div class="menubar hlp-menu">' +
        '<div class="mb-item" data-menu="file">File</div>' +
        '<div class="mb-item" data-menu="edit">Edit</div>' +
        '<div class="mb-item" data-menu="view">View</div>' +
        '<div class="mb-item" data-menu="help">Help</div>' +
        '</div>' +
        '<div class="toolbar hlp-toolbar">' +
        '<button class="tool-btn hlp-back" type="button" title="Back" disabled>' + Win.icon('back', 20) + '<span class="tool-label">Back</span></button>' +
        '<button class="tool-btn hlp-forward" type="button" title="Forward" disabled>' + Win.icon('forward', 20) + '<span class="tool-label">Forward</span></button>' +
        '<button class="tool-btn hlp-home" type="button" title="Help home">' + Win.icon('windows', 20) + '<span class="tool-label">Home</span></button>' +
        '<div class="tool-sep"></div>' +
        '<button class="tool-btn hlp-print" type="button" title="Print this topic">' + Win.icon('print', 20) + '<span class="tool-label">Print</span></button>' +
        '<div class="hlp-search"><input class="field hlp-input" type="text" placeholder="Search Help" aria-label="Search Help" spellcheck="false">' +
        '<button class="tool-btn hlp-go" type="button" title="Search" aria-label="Search">' + Win.icon('search', 16) + '</button></div>' +
        '</div>' +
        '<div class="hlp-body">' +
        '<div class="hlp-side" role="navigation" aria-label="Help topics"></div>' +
        '<div class="hlp-content" tabindex="0"></div>' +
        '</div>' +
        '<div class="statusbar hlp-status"><span class="status-cell hlp-status-left">Welcome</span>' +
        '<span class="status-cell" style="flex:0 0 130px;text-align:center">WINemulator Help</span></div>';

      const sideEl = body.querySelector('.hlp-side');
      const contentEl = body.querySelector('.hlp-content');
      const statusEl = body.querySelector('.hlp-status-left');
      const inputEl = body.querySelector('.hlp-input');
      const backBtn = body.querySelector('.hlp-back');
      const forwardBtn = body.querySelector('.hlp-forward');

      /* ------------------------------------------------------------ sidebar */
      function renderSide() {
        const groups = [];
        TOPICS.forEach(function (t) {
          let g = groups.find(function (x) { return x.name === t.group; });
          if (!g) { g = { name: t.group, items: [] }; groups.push(g); }
          g.items.push(t);
        });
        sideEl.innerHTML = groups.map(function (g) {
          return '<div class="hlp-side-title">' + U.escapeHtml(g.name) + '</div>' +
            g.items.map(function (t) {
              const active = t.id === currentId && !searchQuery;
              return '<button class="hlp-topic' + (active ? ' active' : '') + '" type="button" data-topic="' + t.id + '"' +
                (active ? ' aria-current="page"' : '') + '>' + Win.icon(t.icon, 18) +
                '<span>' + U.escapeHtml(t.title) + '</span></button>';
            }).join('');
        }).join('');
      }

      /* -------------------------------------------------------------- history */
      function updateNav() {
        backBtn.disabled = hidx <= 0;
        forwardBtn.disabled = hidx >= history.length - 1;
      }
      function setStatus(text) {
        if (statusEl) statusEl.textContent = text;
      }

      function renderTopic(id, opts) {
        const t = topicById(id);
        if (!t) return;
        opts = opts || {};
        currentId = id;
        searchQuery = '';
        inputEl.value = '';
        contentEl.innerHTML = '<div class="hlp-page">' + t.page() + '</div>';
        contentEl.scrollTop = 0;
        contentEl.focus({ preventScroll: true });
        renderSide();
        setStatus('Topic: ' + t.title);
        ctx.setTitle('Help - ' + t.title);
        if (opts.push !== false) {
          if (history[hidx] !== id) {
            history = history.slice(0, hidx + 1);
            history.push(id);
            hidx = history.length - 1;
          }
        }
        updateNav();
      }

      function navigate(id, push) {
        if (!topicById(id)) return;
        renderTopic(id, { push: push !== false });
      }

      function goBack() {
        if (hidx <= 0) return;
        hidx -= 1;
        renderTopic(history[hidx], { push: false });
      }
      function goForward() {
        if (hidx >= history.length - 1) return;
        hidx += 1;
        renderTopic(history[hidx], { push: false });
      }

      /* --------------------------------------------------------------- search */
      function renderSearch(q) {
        searchQuery = q;
        const results = searchTopics(q);
        let html = '<h1>Search Results</h1><p class="hlp-lead">' +
          (results.length ? results.length + ' topic' + (results.length === 1 ? '' : 's') + ' matching ' : 'No topics matching ') +
          '<b>' + U.escapeHtml(q) + '</b>.</p>';
        if (!results.length) {
          html += '<div class="hlp-empty">' + Win.icon('search', 40) +
            '<p>Try a broader word, or browse the topics on the left.</p>' +
            '<div class="hlp-actions" style="justify-content:center">' +
            '<button class="btn" type="button" data-action="tour">' + Win.icon('computer', 16) + ' Quick Tour</button>' +
            '<button class="btn" type="button" data-action="clear-search">' + Win.icon('refresh', 16) + ' Clear search</button>' +
            '</div></div>';
        } else {
          html += results.map(function (r) {
            return '<button class="hlp-card" type="button" data-topic="' + r.topic.id + '" style="margin-bottom:6px;width:100%">' +
              Win.icon(r.topic.icon, 24) + '<span><b>' + U.escapeHtml(r.topic.title) + '</b>' +
              '<small>' + U.escapeHtml(r.snippet) + '</small></span></button>';
          }).join('');
        }
        currentId = null;
        contentEl.innerHTML = '<div class="hlp-page">' + html + '</div>';
        contentEl.scrollTop = 0;
        renderSide();
        setStatus(results.length + ' result' + (results.length === 1 ? '' : 's') + ' for "' + q + '"');
        ctx.setTitle('Help - Search');
      }

      function cancelSearch() {
        if (currentId) renderTopic(currentId, { push: false });
        else if (history[hidx]) renderTopic(history[hidx], { push: false });
        else navigate('welcome');
      }

      function doSearch() {
        const q = inputEl.value.trim();
        if (!q) {
          cancelSearch();
          return;
        }
        renderSearch(q);
      }

      /* --------------------------------------------------------------- print */
      function printTopic() {
        const title = (currentId && topicById(currentId)) ? topicById(currentId).title : 'Search Results';
        const clone = contentEl.cloneNode(true);
        clone.querySelectorAll('button, .hlp-actions').forEach(function (n) { n.remove(); });
        const w = window.open('', '_blank', 'width=780,height=680');
        if (!w) {
          Win.ui.toast('Allow pop-ups to print Help.', 'warning', 2600);
          return;
        }
        const css = 'body{font:12px Tahoma,Verdana,sans-serif;color:#000;line-height:1.55;margin:28px;}' +
          'h1{font-size:21px;margin:0 0 6px}h2{font-size:15px;margin:20px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}' +
          'h3{font-size:13px}.hlp-lead{color:#444;margin:0 0 14px}' +
          '.hlp-hero{display:flex;gap:14px;align-items:center;border:1px solid #999;padding:16px;margin:0 0 18px;background:#f3f3f3}' +
          '.hlp-hero h1{color:#000;margin:0 0 4px}.hlp-hero p{color:#333;margin:0}' +
          'a{color:#000;text-decoration:none}code{font:11px Consolas,monospace}' +
          'ul,ol{padding-left:20px;margin:0 0 10px}.hlp-kbd{width:100%;border-collapse:collapse;margin:8px 0 14px}' +
          '.hlp-kbd th,.hlp-kbd td{border:1px solid #999;padding:4px 7px;text-align:left;font-size:11px}' +
          '.hlp-note{border-left:3px solid #999;background:#f3f3f3;padding:8px 10px;margin:10px 0}' +
          '.hlp-footnote{margin-top:22px;border-top:1px solid #999;padding-top:8px;font-size:10px;color:#555}' +
          '@media print{body{margin:12mm}}';
        w.document.open();
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' +
          U.escapeHtml(title + ' - WINemulator Help') + '</title><style>' + css + '</style></head><body>' +
          clone.innerHTML + '</body></html>');
        w.document.close();
        w.focus();
        setTimeout(function () { try { w.print(); } catch (e) {} }, 300);
      }

      function exportTopic() {
        const t = currentId ? topicById(currentId) : null;
        const title = t ? t.title : 'Search Results';
        const text = title + '\r\n' + new Array(title.length + 1).join('=') + '\r\n\r\n' +
          contentEl.innerText.trim() + '\r\n\r\n-- WINemulator Help\r\n';
        const name = title.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') + '.txt';
        U.download(name, text, 'text/plain');
        Win.ui.toast('Saved "' + name + '" to your downloads.', 'save', 2200);
      }

      /* -------------------------------------------------------------- actions */
      function openDoc(path) {
        try { Win.shell.openPath(path); }
        catch (e) { Win.ui.error(e.message || 'That document could not be opened.', 'Help'); }
      }
      function runAction(action) {
        if (action === 'tour') navigate('tour');
        else if (action === 'computer') openDoc('::computer');
        else if (action === 'welcome-doc') openDoc(WELCOME_DOC);
        else if (action === 'readme') openDoc(README_DOC);
        else if (action === 'restart') {
          Win.ui.confirm('Restart Windows now? All open programs will close.', 'Restart', 'question').then(function (yes) {
            if (yes && Win.boot) Win.boot.power('restart');
          });
        } else if (action === 'ie-home') {
          Win.wm.open('browser', { url: 'winemulator://home' });
        } else if (action === 'open-ie') {
          Win.wm.open('browser', { url: 'winemulator://help' });
        } else if (action === 'clear-search') {
          inputEl.value = '';
          cancelSearch();
          setTimeout(function () { inputEl.focus(); }, 20);
        } else if (action === 'print') {
          printTopic();
        } else if (action === 'export') {
          exportTopic();
        }
      }

      body.addEventListener('click', function (ev) {
        const hit = ev.target.closest('[data-topic], [data-app], [data-path], [data-action]');
        if (!hit) return;
        ev.preventDefault();
        if (hit.dataset.topic) { navigate(hit.dataset.topic); return; }
        if (hit.dataset.action) { runAction(hit.dataset.action); return; }
        if (hit.dataset.path) {
          try { Win.shell.openPath(hit.dataset.path); }
          catch (e) { Win.ui.error(e.message, 'Help'); }
          return;
        }
        if (hit.dataset.app) {
          const extra = {};
          if (hit.dataset.tab) extra.tab = hit.dataset.tab;
          Win.wm.open(hit.dataset.app, extra);
        }
      });

      /* ----------------------------------------------------------- navigation */
      backBtn.addEventListener('click', goBack);
      forwardBtn.addEventListener('click', goForward);
      body.querySelector('.hlp-home').addEventListener('click', function () { navigate('welcome'); });
      body.querySelector('.hlp-print').addEventListener('click', printTopic);

      inputEl.addEventListener('input', U.debounce(function () {
        doSearch();
      }, 140));
      inputEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const q = inputEl.value.trim();
          if (!q) return;
          const results = searchTopics(q);
          if (results.length === 1) navigate(results[0].topic.id);
          else if (results.length > 1) renderSearch(q);
        } else if (ev.key === 'Escape') {
          inputEl.value = '';
          cancelSearch();
          inputEl.blur();
        }
      });
      body.querySelector('.hlp-go').addEventListener('click', function () {
        if (!inputEl.value.trim()) { inputEl.focus(); return; }
        doSearch();
      });

      /* --------------------------------------------------------------- menus */
      function menus() {
        return {
          file: [
            { label: 'Open Welcome.txt', icon: 'open', action: function () { openDoc(WELCOME_DOC); } },
            { label: 'Open Read Me', icon: 'textfile', action: function () { openDoc(README_DOC); } },
            { separator: true },
            { label: 'Print...', icon: 'print', action: printTopic },
            { label: 'Save Topic as Text...', icon: 'save', action: exportTopic },
            { separator: true },
            { label: 'Close', icon: 'close', action: function () { ctx.close(); } }
          ],
          edit: [
            { label: 'Copy', icon: 'copy', shortcut: 'Ctrl+C', action: function () {
              const sel = String(window.getSelection ? window.getSelection() : '');
              if (sel.trim()) U.copyText(sel);
              else Win.ui.toast('Select some text in the Help page first.', 'info', 1800);
            } },
            { label: 'Select All', icon: 'check', shortcut: 'Ctrl+A', action: function () {
              const range = document.createRange();
              range.selectNodeContents(contentEl);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            } },
            { separator: true },
            { label: 'Find...', icon: 'search', action: function () { inputEl.focus(); inputEl.select(); } }
          ],
          view: [
            { label: 'Home', icon: 'windows', action: function () { navigate('welcome'); } },
            { label: 'Back', icon: 'back', disabled: hidx <= 0, action: goBack },
            { label: 'Forward', icon: 'forward', disabled: hidx >= history.length - 1, action: goForward },
            { separator: true },
            { label: 'Open in Internet Explorer', icon: 'ie', action: function () { Win.wm.open('browser', { url: 'winemulator://help' }); } }
          ],
          help: [
            { label: 'Help Topics', icon: 'help', action: function () { navigate('welcome'); } },
            { label: 'Keyboard & Mouse', icon: 'keyboard', action: function () { navigate('shortcuts'); } },
            { separator: true },
            { label: 'About WINemulator Help', icon: 'info', action: function () {
              Win.ui.alert('WINemulator Help\nVersion 4.10.2222 (Web Edition)\n\nA local guide to the desktop, its programs, files, shortcuts and settings.\n\nTip: press F1 at any time to open Help.', 'About Help', 'help');
            } },
            { label: 'About WINemulator', icon: 'flag', action: function () { navigate('about'); } }
          ]
        };
      }

      body.querySelectorAll('.hlp-menu .mb-item').forEach(function (item) {
        item.addEventListener('click', function () {
          const r = item.getBoundingClientRect();
          Win.ui.menu(menus()[item.dataset.menu] || [], r.left, r.bottom + 1);
        });
      });

      const initial = args.topic && topicById(args.topic) ? args.topic : 'welcome';
      history = [];
      hidx = -1;
      renderTopic(initial, { push: true });
      ctx.setTitle('Help - ' + (topicById(initial) || {}).title);

      return {
        onReopen: function (a) {
          if (!a) { navigate('welcome'); return; }
          if (a.topic && topicById(a.topic)) { navigate(a.topic); return; }
          if (a.welcome) navigate('welcome');
        }
      };
    }
  };
})();
