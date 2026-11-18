# WINemulator — VI OS Golden Gate & Windows desktops in your browser

A fast, self-contained **VI OS 26 Golden Gate** desktop plus Windows 98, Windows 2000, Windows XP, Windows 7 and Windows 9 environments that run entirely in your browser. No installation, no build step, no framework and no server required. Every icon and wallpaper is an original inline SVG drawn for this project, every sound is synthesised with the Web Audio API, and your files live in the browser's local storage. VI OS is an original mac-style shell inspired by rounded modern desktops — it uses its own VI monogram, icons and artwork, with no Apple logos, assets or branding.

**Open `index.html` or visit the GitHub Pages build.** Pick one of the desktops, and it boots in a second or two and keeps working offline.

![WINemulator](assets/favicon.svg)

## Six desktops, one project

`index.html` is a small operating-system selector. It remembers your choice in `localStorage` and opens `desktop.html?os=mac`, `?os=98`, `?os=2k`, `?os=xp`, `?os=7`, `?os=9` or the standalone `?os=dos` shell. Direct links also accept the aliases `vi`, `osx`, `mvi` and `macos` for VI OS.

- **VI OS 26 Golden Gate** — an original mac-style desktop with a translucent menu bar, magnifying Dock, Spotlight, Launchpad, Control Center, calendar clock, rounded windows with left-side traffic lights and right-aligned desk icons. Includes native Files and Surf apps plus VI Light, Dark and Graphite themes.
- **Windows 98 Second Edition** — the classic teal desktop, grey chrome, original 98-style icons, boot screen, logon and shutdown flows.
- **Windows 2000 Professional** — the classic NT desktop with the blue taskbar, grey window chrome, 2000 boot splash and logon screen, and the shared Command Prompt.
- **Windows XP** — a full Luna shell with the Bliss wallpaper, blue gradient title bars, rounded windows, the two-column XP Start menu, XP taskbar, login screen, boot splash and XP icon set. Blue, Olive Green and Silver themes are included.
- **Windows 7** — the glassy Aero shell with a Superbar taskbar, orb Start menu, live wallpaper thumbnails, Aero Snap, the Command Prompt and PowerShell, and an Aero glass icon set. Blue, Frost and Dusk themes are included.
- **Windows 9** — a fictional flat, modern desktop in the Windows 10 style: a dark taskbar, square windows with white title bars, an accent-coloured four-pane Start mark (no glossy orb), a tile Start menu with search, flat icons, and a modern Notepad with zoom, dark mode and line-ending indicators. Blue, Mint and Violet themes are included.
- **Switch any time** — use the Start menu (or the VI menu on VI OS), the desktop right-click menu, or Control Panel / System Settings → Appearance. Your files and settings are shared between all desktops.

## What is inside

- **Desktop shell** — draggable icons, desktop shortcuts, right-click context menus, wallpapers, VI OS's menu bar and Dock, three Windows 98 themes, a Windows 2000 Classic theme, three XP themes, three Aero themes and three flat Windows 9 themes, CRT mode and an optional FPS meter. VI OS adds the `vi`, `vi-dark` and `vi-graphite` themes with Golden Gate, Dune and Aurora wallpapers.
- **Window manager** — draggable and resizable windows, minimize/maximize/restore, snapping, Alt+Tab or ⌘+Tab, taskbar buttons or Dock indicators, and focus management. VI OS windows use soft shadows, rounded corners, centered titles and left-side traffic-light controls.
- **Start menu and taskbar** — programs, documents, settings, find, help, run, quick launch, clock with calendar, volume and network trays. Windows XP uses the familiar two-column Start menu; Windows 7 and Windows 9 use searchable Start menus, and Windows 9 adds a tile grid. VI OS replaces them with a menu bar (app menus, Wi-Fi, Bluetooth, Control Center, battery, Spotlight and a calendar clock) and a magnifying Dock with running indicators.
- **Virtual file system** — a persistent `C:` drive with seeded folders and files, Recycle Bin (called Trash on VI OS), import/export backups and a shared file picker. VI OS users get `C:\Users\User` as a Home folder alongside the classic Windows locations.
- **Boot experience** - BIOS memory test, a VI OS Golden Gate splash or a Windows 98, 2000, XP, 7 or 9 splash, logon, logoff, shutdown, restart and an MS-DOS mode. VI OS has its own blurred wallpaper login, Spotlight hint and shutdown wording. Fast boot can be enabled in Control Panel or System Settings. MS-DOS mode accepts the full Command Prompt command set; type `msdos - dos` to switch to the plain MS-DOS shell and `msdos - cmd` to return. Type `msdos - <file>` (also available from the Command Prompt or Run dialog) to run a `.bat`/`.cmd` file or open a file in MS-DOS mode. Type `msdos` (or `dos`) at the Command Prompt to switch straight into MS-DOS mode; type `windows.sys` (or `win.sys`) there to start Windows again.
- **Apps** — Notepad, Paint, Calculator, Command Prompt (MS-DOS Prompt on 98), Windows Explorer, Internet Explorer, Minesweeper, Python, JavaScript, Control Panel, Task Manager, Help and **Virtual PC**. VI OS renames the classic apps Notes, Canvas, Calculator, Terminal, Files, Surf, Mines, System Settings, Activity Monitor and Help, keeping the same underlying programs (the classic Explorer is still available as `explorer-classic`). Python and JavaScript keep their names on VI OS but use VI-style icons.
- **Language REPLs** — Python (`python`, `py`, `python3`) and JavaScript (`js`, `javascript`, `node`) are original, sandboxed simulations with an editor, output pane, examples, file open/save and a small standard library. They cover variables, functions, loops, conditions, arrays, objects and common built-ins; they do not use `eval`, `fetch` or host APIs. `.py` and `.js` files open in their matching REPL, and both interpreters also work from CMD, PowerShell and MS-DOS mode.
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

On VI OS, the same actions use mac-style keys:

| Shortcut | Action |
| --- | --- |
| `⌘ Space` | Spotlight search |
| `⌘ Tab` | App switcher |
| `⌘ W` | Close the active window |
| `⌘ M` | Minimize the active window |
| `⌘ H` | Hide the active app |
| `⌘ ,` | System Settings |
| `⌘ L` | Surf (focus the address bar) |

Inside Explorer / Files: `Enter` opens, `Backspace` goes up, `Alt+Left`/`Alt+Right` (`⌘ Left`/`⌘ Right` on VI OS) navigate, `F2` renames, `Delete` sends to the Recycle Bin or Trash, and the usual `Ctrl+C` / `Ctrl+X` / `Ctrl+V` / `Ctrl+A` (or `⌘C` / `⌘X` / `⌘V` / `⌘A`) work. Notepad supports `Ctrl+S`, `Ctrl+O`, `Ctrl+F`, `Ctrl+H` and `Ctrl+Z`, and on Windows 9 also `Ctrl++`, `Ctrl+-` and `Ctrl+0` for zoom; Paint supports `Ctrl+Z`, `Ctrl+Y` and `Ctrl+S`.

> Your operating system may reserve the Windows or Command key before the browser sees it. The Ctrl and Alt shortcuts always work; VI OS also accepts Ctrl in place of ⌘.

## Project layout

```text
index.html               operating-system selector
desktop.html             shared desktop shell
assets/
  vi-gate.svg            original Golden Gate-inspired wallpaper for VI OS
css/
  base.css               shared chrome and controls
  desktop.css            desktop, windows, taskbar and boot screens
  apps.css               application styles, including Virtual PC
  xp.css                 Windows XP Luna theme and XP boot/login visuals
  win7.css               Windows 7 Aero theme and boot/login visuals
  win10.css              Windows 9 flat shell, Start menu and boot visuals
  vi.css                 VI OS Golden Gate theme, menu bar, Dock and windows
  selector.css           OS selector page (includes the VI OS card)
js/
  icons.js               inline SVG icon sprite for Windows 98
  icons-vi.js            VI OS monogram and mac-style icon overrides
  icons-xp.js            XP-style icon overrides
  icons-7.js             Windows 7 glass icon overrides
  icons-10.js            Windows 9 flat icon overrides
  os.js                  OS mode detection and switching
  selector.js            selector page behaviour
  util.js                helpers and the settings store
  sound.js               Web Audio sound synthesis
  fs.js                  virtual file system and Recycle Bin
  ui.js                  menus, dialogs, file picker, toasts
  wm.js                  window manager
  taskbar.js             Start menu, taskbar and trays
  desktop.js             icons, wallpapers and the shell
  vi.js                  VI OS menu bar, Dock, Spotlight, Launchpad and shortcuts
  boot.js                boot, logon, shutdown and MS-DOS mode
  apps/                  one file per program, including files.js (Files), surf.js (Surf) and langs.js (Python + JavaScript REPLs)
  main.js                bootstrap and service worker registration
vendor/v86/              vendored v86 emulator, WASM core and BIOS files
sw.js                    offline cache
manifest.webmanifest     installable PWA metadata
```

App modules register themselves as `Win.apps.<id>` with a `mount(body, ctx)` function. There are no ES modules and no bundler, which is why the desktop also runs from `file://` (the service worker and Virtual PC still need HTTP).

## Icons and trademarks

All icons, wallpapers and sounds are original recreations drawn as inline SVG or synthesised in JavaScript. No Microsoft or Apple icon files or operating-system images are included. The Bliss-style, Harmony-style, Windows 9-style and VI OS Golden Gate wallpapers are original SVG illustrations; the VI OS monogram is a custom rounded "VI" tile, not an apple or any other company's mark.

## Privacy

Everything stays in your browser. There is no account, analytics, tracking or server-side storage. Files live in `localStorage`; clearing site data or using a private window will discard them. Use **Control Panel → System → Export backup** (**System Settings → System** on VI OS) to keep a copy. External pages opened in Internet Explorer or Surf are the only network requests, and they are entirely optional. Virtual PC never uploads disk images; files you choose are read locally and passed straight to the emulator.

## Disclaimer

WINemulator is an independent tribute and a simulation. It is not affiliated with, endorsed by, or connected to Microsoft or Apple. Windows, Windows 98, Windows 2000, Windows XP, Windows 7 and Windows 9 are names used descriptively; Windows is a trademark of Microsoft Corporation. Windows 9 is not a Microsoft product. VI OS is an original creation; Apple and macOS are trademarks of Apple Inc. v86 is an independent open-source project distributed under the BSD 2-Clause licence; see `vendor/v86/LICENSE`.

## License

MIT — see [LICENSE](LICENSE).
