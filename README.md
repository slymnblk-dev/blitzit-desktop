# Blitzit for Windows

A small desktop app that opens your live Blitzit site and adds:

- **Mini timer**: a frameless, always-on-top window (no browser bar). Start a blitz, then click the pop-out button next to ✕.
- **Tray icon**: left-click opens Blitzit; right-click for Open / Start blitz / Quit.
- **Ctrl+Shift+B**: starts a blitz from anywhere.

It loads `https://dulcet-daifuku-0fb870.netlify.app`, so **every Netlify upload updates the desktop app too**. You only rebuild this app if the desktop features themselves change.

Your account, tasks and sync are the same as on the web and your phone.

---

## Updates

- **App changes** (design, features, mini timer look) arrive automatically with every Netlify upload.
- **Desktop changes** (window, tray, shortcut): bump `version` in `src-tauri/tauri.conf.json` and push to `main`. GitHub builds a signed installer and publishes a release. Installed apps show **"Update ready → Update"** within a few hours, or right away via Settings → Data → Check for updates.

## Install

Open the latest release under **Releases** and run `Blitzit_x.x.x_x64-setup.exe`.
The first time Windows may say "Windows protected your PC" (the app isn't code-signed yet): **More info → Run anyway**.

## Good to know

- The update signing key is stored as the GitHub secret `TAURI_SIGNING_PRIVATE_KEY`. Keep a backup copy: without it, updates can't be published.
- If Ctrl+Shift+B is already used by another app, the shortcut is skipped. The tray menu still works.
- To change the site address, edit `SITE` in `src-tauri/src/lib.rs`, `frontendDist` in `src-tauri/tauri.conf.json` and the URL in `src-tauri/capabilities/default.json`.
