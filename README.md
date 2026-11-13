# WINemulator 98

A fast, self-contained Windows 98-style desktop that runs entirely in your browser. No installation, no build step, no external libraries and no server required. Every icon is inline SVG, every sound is synthesised with the Web Audio API, and your files live in the browser's local storage.

**Open `index.html` or visit the GitHub Pages build.** It boots in a second or two and keeps working offline.

![WINemulator](assets/favicon.svg)

## What is inside

- **Desktop shell** — draggable icons, desktop shortcuts, right-click context menus, wallpapers, three themes, CRT mode and an optional FPS meter.
- **Window manager** — draggable and resizable windows, minimize/maximize/restore, snapping, Alt+Tab, taskbar buttons and focus management.
- **Start menu and taskbar** — programs, documents, settings, find, help, run, quick launch, clock with calendar, volume and network trays.
- **Virtual file system** — a persistent `C:` drive with seeded folders and files, Recycle Bin, import/export backups and a shared file picker.
- **Boot experience** — BIOS memory test, Windows splash, logon, logoff, shutdown, restart and an MS-DOS mode. Fast boot can be enabled in Control Panel.
- **Apps** — Notepad, Paint, Calculator, MS-DOS Prompt, Windows Explorer, Internet Explorer, Minesweeper, Control Panel, Task Manager and this Help system.
- **Offline ready** — a service worker caches the entire desktop after the first visit.

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
index.html               shell markup and script order
css/                     base chrome, desktop, and app styles
js/
  icons.js               inline SVG icon sprite
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
sw.js                    offline cache
manifest.webmanifest     installable PWA metadata
```

App modules register themselves as `Win.apps.<id>` with a `mount(body, ctx)` function. There are no ES modules and no bundler, which is why the desktop also runs from `file://`.

## Privacy

Everything stays in your browser. There is no account, analytics, tracking or server-side storage. Files live in `localStorage`; clearing site data or using a private window will discard them. Use **Control Panel → System → Export backup** to keep a copy. External pages opened in Internet Explorer are the only network requests, and they are entirely optional.

## Disclaimer

WINemulator is an independent tribute and a simulation. It is not affiliated with, endorsed by, or connected to Microsoft. Windows and Windows 98 are trademarks of Microsoft Corporation.

## License

MIT — see [LICENSE](LICENSE).
