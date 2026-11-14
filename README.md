# WINemulator — Windows 98, XP & 7 in your browser

A fast, self-contained Windows 98, Windows XP **and** Windows 7 desktop that runs entirely in your browser. No installation, no build step, no framework and no server required. Every icon is an original inline SVG, every sound is synthesised with the Web Audio API, and your files live in the browser's local storage.

**Open `index.html` or visit the GitHub Pages build.** Pick Windows 98 or Windows XP, and the chosen desktop boots in a second or two and keeps working offline.

![WINemulator](assets/favicon.svg)

## Two desktops, one project

`index.html` is a small operating-system selector. It remembers your choice in `localStorage` and opens `desktop.html?os=98` or `desktop.html?os=xp`.

- **Windows 98 Second Edition** — the classic teal desktop, grey chrome, original 98-style icons, boot screen, logon and shutdown flows.
- **Windows XP** — a full Luna shell with the Bliss wallpaper, blue gradient title bars, rounded windows, the two-column XP Start menu, XP taskbar, login screen, boot splash and XP icon set. Blue, Olive Green and Silver themes are included.
- **Switch any time** — use the Start menu, the desktop right-click menu, or Control Panel → Appearance. Your files and settings are shared between both desktops.

## What is inside

- **Desktop shell** — draggable icons, desktop shortcuts, right-click context menus, wallpapers, three Windows 98 themes plus three XP themes, CRT mode and an optional FPS meter.
- **Window manager** — draggable and resizable windows, minimize/maximize/restore, snapping, Alt+Tab, taskbar buttons and focus management.
- **Start menu and taskbar** — programs, documents, settings, find, help, run, quick launch, clock with calendar, volume and network trays. Windows XP uses the familiar two-column Start menu with All Programs and Log Off / Turn Off Computer.
- **Virtual file system** — a persistent `C:` drive with seeded folders and files, Recycle Bin, import/export backups and a shared file picker.
- **Boot experience** — BIOS memory test, Windows 98 or XP splash, logon, logoff, shutdown, restart and an MS-DOS mode. Fast boot can be enabled in Control Panel.
- **Apps** — Notepad, Paint, Calculator, MS-DOS Prompt, Windows Explorer, Internet Explorer, Minesweeper, Control Panel, Task Manager, Help and **Virtual PC**.
- **Offline ready** — a service worker caches the entire desktop, including the x86 emulator, after the first visit.

## Virtual PC (real x86 emulation)

Virtual PC embeds [v86](https://github.com/copy/v86), an open-source x86 PC emulator written in WebAssembly. It is vendored under `vendor/v86/` so it works offline and needs no build tools.

- **Demo disk** — the **Boot the demo disk** button boots a real 1.44 MB floppy image that JavaScript assembles byte by byte: a 16-bit x86 boot sector that switches to text mode, prints through the BIOS teletype interrupt and halts. It is genuine emulated x86, not a mock-up.
- **Your own images** — **Load an image…** accepts `.img`, `.ima`, `.iso`, `.raw`, `.bin` and `.dsk`. `.iso` files are attached as CD-ROM, images up to 2.88 MB as floppy disks, and larger images as hard disks. The maximum accepted size is 512 MB.
- **Controls** — Start, Pause/Resume, Reset, Demo disk, Load image, Ctrl+Alt+Del and Fullscreen. The status bar shows the current media and machine state.
- **Keyboard capture** — key presses are forwarded to the guest only while the Virtual PC screen has focus, so desktop shortcuts keep working normally.

Important limits:

- v86 emulates **32-bit x86**; 64-bit x86 and x64 operating systems are **not supported**.
- **No operating-system images are bundled.** Bring a legally obtained image (FreeDOS, MS-DOS, Windows 98, a Linux ISO, and so on).
- Windows 98 boots reasonably well in v86. Windows XP is **not guaranteed** and may be extremely slow because it needs far more CPU and memory than a browser-hosted emulator can comfortably provide.
- Large images use a lot of browser memory. If a machine fails to boot, try a smaller image or more RAM in the Virtual PC toolbar.

## Run it locally

Because the project is plain static files, you can open `index.html` directly. For the service worker and clean relative paths, serve the folder over HTTP:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

Any static host works — GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket, or a USB stick.

## Deploy to GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main`, and set the folder to `/ (root)`.
4. Save. The site appears at `https://<user>.github.io/<repo>/` after a minute or two.

All URLs are relative, so the app works from a repository subpath as well as a domain root. `.nojekyll` is included so GitHub serves the files unchanged.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Esc` | Start menu |
| `Ctrl+Shift+Esc` | Task Manager |
| `Alt+Tab` | Switch windows |
| `Alt+F4` | Close the active window |
| `F1` | Open Help |
| `F5` | Refresh the desktop or current folder |
| `Win/Cmd+D` | Show the desktop |
| `Win/Cmd+E` | Open My Computer |
| `Win/Cmd+R` | Open the Run dialog |

Inside Explorer: `Enter` opens, `Backspace` goes up, `Alt+Left`/`Alt+Right` navigate, `F2` renames, `Delete` sends to the Recycle Bin, and the usual `Ctrl+C` / `Ctrl+X` / `Ctrl+V` / `Ctrl+A` work. Notepad supports `Ctrl+S`, `Ctrl+O` and `Ctrl+Z`; Paint supports `Ctrl+Z`, `Ctrl+Y` and `Ctrl+S`.

> Your operating system may reserve the Windows key before the browser sees it. The Ctrl and Alt shortcuts always work.

## Project layout

```text
index.html               operating-system selector
desktop.html             shared desktop shell
css/
  base.css               shared chrome and controls
  desktop.css            desktop, windows, taskbar and boot screens
  apps.css               application styles, including Virtual PC
  xp.css                 Windows XP Luna theme and XP boot/login visuals
  selector.css           OS selector page
js/
  icons.js               inline SVG icon sprite for Windows 98
  icons-xp.js            XP-style icon overrides
  os.js                  OS mode detection and switching
  selector.js            selector page behaviour
  util.js                helpers and the settings store
  sound.js               Web Audio sound synthesis
  fs.js                  virtual file system and Recycle Bin
  ui.js                  menus, dialogs, file picker, toasts
  wm.js                  window manager
  taskbar.js             Start menu, taskbar and trays
  desktop.js             icons, wallpapers and the shell
  boot.js                boot, logon, shutdown and MS-DOS mode
  apps/                  one file per program
  main.js                bootstrap and service worker registration
vendor/v86/              vendored v86 emulator, WASM core and BIOS files
sw.js                    offline cache
manifest.webmanifest     installable PWA metadata
```

App modules register themselves as `Win.apps.<id>` with a `mount(body, ctx)` function. There are no ES modules and no bundler, which is why the desktop also runs from `file://` (the service worker and Virtual PC still need HTTP).

## Icons and trademarks

All icons, wallpapers and sounds are original recreations drawn as inline SVG or synthesised in JavaScript. No Microsoft icon files or operating-system images are included. The Bliss-style wallpaper is an original SVG illustration.

## Privacy

Everything stays in your browser. There is no account, analytics, tracking or server-side storage. Files live in `localStorage`; clearing site data or using a private window will discard them. Use **Control Panel → System → Export backup** to keep a copy. External pages opened in Internet Explorer are the only network requests, and they are entirely optional. Virtual PC never uploads disk images; files you choose are read locally and passed straight to the emulator.

## Disclaimer

WINemulator is an independent tribute and a simulation. It is not affiliated with, endorsed by, or connected to Microsoft. Windows, Windows 98 and Windows XP are trademarks of Microsoft Corporation. v86 is an independent open-source project distributed under the BSD 2-Clause licence; see `vendor/v86/LICENSE`.

## License

MIT — see [LICENSE](LICENSE).
