# Windaday for Windows (formerly Blitzit)

A small desktop app that opens your live Blitzit site and adds:

- **Mini timer**: a frameless, always-on-top window (no browser bar). Start a blitz, then click the pop-out button next to ✕.
- **Tray icon**: left-click opens Blitzit; right-click for Open / Start blitz / Quit.
- **Ctrl+Alt+Shift+B**: starts a blitz from anywhere.

It loads `https://dulcet-daifuku-0fb870.netlify.app`, so **every Netlify upload updates the desktop app too**. You only rebuild this app if the desktop features themselves change.

Your account, tasks and sync are the same as on the web and your phone.

---

## Web app

The live app (Netlify) is the `web/` folder. Every push to `main` that changes `web/` is published automatically.

## Updates

- **App changes** (design, features, mini timer look) arrive automatically with every Netlify upload.
- **Desktop changes** (window, tray, shortcut): bump `version` in `src-tauri/tauri.conf.json` and push to `main`. GitHub builds a signed installer and publishes a release. Installed apps show **"Update ready → Update"** within a few hours, or right away via Settings → Data → Check for updates.

## Install

Open the latest release under **Releases** and run `Blitzit_x.x.x_x64-setup.exe`.
The first time Windows may say "Windows protected your PC" (the app isn't code-signed yet): **More info → Run anyway**.

## Good to know

- The update signing key is stored as the GitHub secret `TAURI_SIGNING_PRIVATE_KEY`. Keep a backup copy: without it, updates can't be published.
- If Ctrl+Alt+Shift+B is already used by another app, the shortcut is skipped. The tray menu still works.
- To change the site address, edit `SITE` in `src-tauri/src/lib.rs`, `frontendDist` in `src-tauri/tauri.conf.json` and the URL in `src-tauri/capabilities/default.json`.

## Name and address

- The app is called **Windaday**; the web app lives at https://windaday.com.
- The desktop app deliberately keeps loading `https://dulcet-daifuku-0fb870.netlify.app` (same site, always reachable) and keeps its internal name/identifier `Blitzit`, so updates install in place and local data is kept.

## How changes go live (checks, preview, then live)

1. Changes are pushed to the **`dev`** branch, never straight to `main`.
2. GitHub runs every check in `tests/` in a real browser (app loads on desktop/phone, tasks, undo, focus sessions, resume after reload, mini timer, sign-in links, update window, damaged data, bad backups).
3. If all checks pass, a **preview copy** is published at https://slymnblk-dev.github.io/blitzit-desktop/ (pink "Preview" badge; its data stays in that browser, the live app is untouched).
4. **Go live** when the preview looks right: Actions → *Check and release* → *Run workflow* on `dev` with **go_live** ticked. The checks run again, then `dev` moves to **`main`** → Netlify publishes it to windaday.com.
5. If the desktop app changed (`src-tauri/` or `RELEASE_NOTES.md`), the Windows update is built and published in the same run.

Run the checks locally with `npm test`.

## Where the code lives

The web app is written in small files under `src/` and joined into `web/index.html` (the file Netlify serves) by `npm run build:web`:

- `src/index.html`: the page (head + markup)
- `src/css/`: styles, by area (base, desktop, settings, spaces/home/detail, Tide, profile/update window, fixes)
- `src/js/`: app code, by area (data, tasks, gestures, sheets, Classic, Tide, mini timer + updates, board, spaces, settings, profile, sync/sign-in, startup)

Edit `src/`, never `web/index.html` directly. The number prefixes set the order the parts are joined in.
