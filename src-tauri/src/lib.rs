//! Blitzit desktop: loads the live web app (Netlify), adds a frameless always-on-top
//! mini timer, a tray icon and a global "start blitz" shortcut.

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use std::sync::Mutex;

/// Where the mini timer was last left: its bottom-right corner, in logical pixels.
/// Kept in memory while it moves and saved to disk when it closes.
#[derive(Default)]
struct MiniSpot(Mutex<Option<(f64, f64)>>);

/// True while the app itself is closing the mini timer (so its own "closed" handling can be skipped).
#[derive(Default)]
struct MiniClosing(std::sync::atomic::AtomicBool);

/// Keep in tray: clicking X hides Windaday instead of quitting (on unless the page turns it off).
struct KeepInTray(std::sync::atomic::AtomicBool);

/// Set when the person picks Quit, so the close is not turned into a hide.
#[derive(Default)]
struct Quitting(std::sync::atomic::AtomicBool);

/// The page tells the app whether X should hide to the tray (Settings → Keep in tray when closed).
#[tauri::command]
fn set_tray(app: AppHandle, keep: bool) {
    if let Some(k) = app.try_state::<KeepInTray>() {
        k.0.store(keep, std::sync::atomic::Ordering::SeqCst);
    }
}

/// Start with Windows: read or change it (Settings → Start with Windows). Starts hidden in the tray.
#[tauri::command]
fn autostart(app: AppHandle, on: Option<bool>) -> bool {
    let a = app.autolaunch();
    match on {
        Some(true) => { let _ = a.enable(); }
        Some(false) => { let _ = a.disable(); }
        None => {}
    }
    a.is_enabled().unwrap_or(false)
}

/// Splash: a small branded window that shows straight away (it is built into the app, so it needs no internet)
/// while the main window stays hidden and loads. When the page is ready, the splash closes and the app appears.
const SPLASH_HTML: &str = include_str!("splash.html");

/// Start-up state: when it began, whether the splash is showing, whether the page has loaded,
/// whether the app window has been revealed, and whether Windows started us quietly in the tray.
struct Boot {
    start: std::time::Instant,
    splash: std::sync::atomic::AtomicBool,
    loaded: std::sync::atomic::AtomicBool,
    revealed: std::sync::atomic::AtomicBool,
    hidden: bool,
}

/// The splash always plays its whole sunrise before the app appears (about 2.4 s).
const SPLASH_MIN_MS: u64 = 2400;

/// Settings → Appearance → Welcome animation also switches the splash; the page passes it on
/// with `set_splash` and the app remembers it in a small file (no file = on).
fn splash_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("splash-off"))
}

#[tauri::command]
fn set_splash(app: AppHandle, on: bool) -> bool {
    if let Some(f) = splash_file(&app) {
        if on {
            let _ = std::fs::remove_file(f);
        } else {
            if let Some(dir) = f.parent() {
                let _ = std::fs::create_dir_all(dir);
            }
            let _ = std::fs::write(f, b"1");
        }
    }
    true
}

fn splash_wanted(app: &AppHandle) -> bool {
    !splash_file(app).map(|f| f.exists()).unwrap_or(false)
}

fn open_splash(app: &AppHandle) -> bool {
    let Ok(url) = tauri::Url::parse("http://splash.localhost/") else { return false };
    // a see-through window holding a rounded card, so the card can fade away over whatever is behind it
    WebviewWindowBuilder::new(app, "splash", WebviewUrl::CustomProtocol(url))
        .title("Windaday")
        .inner_size(420.0, 340.0)
        .resizable(false)
        .maximizable(false)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .center()
        .focused(true)
        .background_color(tauri::window::Color(0, 0, 0, 0))
        .build()
        .is_ok()
}

/// Splash sound: a warm swell and three soft bells (one per ray). Follows Settings → Sounds,
/// which the page passes on with `set_sounds` and the app remembers in a small file.
fn sound_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("sounds-off"))
}

#[tauri::command]
fn set_sounds(app: AppHandle, on: bool) {
    if let Some(f) = sound_file(&app) {
        if on {
            let _ = std::fs::remove_file(f);
        } else {
            if let Some(dir) = f.parent() {
                let _ = std::fs::create_dir_all(dir);
            }
            let _ = std::fs::write(f, b"1");
        }
    }
}

#[cfg(windows)]
fn play_splash_sound(app: &AppHandle) {
    if sound_file(app).map(|f| f.exists()).unwrap_or(false) {
        return;
    }
    static WAV: &[u8] = include_bytes!("splash.wav");
    use windows_sys::Win32::Media::Audio::{PlaySoundW, SND_ASYNC, SND_MEMORY, SND_NODEFAULT};
    // SND_MEMORY: the bytes are a whole WAV file; SND_ASYNC: returns at once while it plays
    unsafe {
        PlaySoundW(WAV.as_ptr() as *const u16, std::ptr::null_mut(), SND_ASYNC | SND_MEMORY | SND_NODEFAULT);
    }
}

#[cfg(not(windows))]
fn play_splash_sound(_app: &AppHandle) {}

fn later(app: &AppHandle, ms: u64, f: impl FnOnce(&AppHandle) + Send + 'static) {
    let h = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(ms));
        let a = h.clone();
        let _ = h.run_on_main_thread(move || f(&a));
    });
}

/// The page has loaded: reveal the app once the splash has finished its sunrise.
/// Only the first load counts, so later reloads never pop the window up from the tray.
fn page_loaded(app: &AppHandle) {
    let Some(b) = app.try_state::<Boot>() else { return };
    if b.loaded.swap(true, std::sync::atomic::Ordering::SeqCst) || b.hidden {
        return;
    }
    let wait = if b.splash.load(std::sync::atomic::Ordering::SeqCst) {
        SPLASH_MIN_MS.saturating_sub(b.start.elapsed().as_millis() as u64)
    } else {
        150 // no splash: just let the first paint happen
    };
    later(app, wait, reveal);
}

/// Calm hand-over: the splash card fades away while the app window appears with its content fading in.
fn reveal(app: &AppHandle) {
    let Some(b) = app.try_state::<Boot>() else { return };
    if b.hidden || b.revealed.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    if let Some(m) = app.get_webview_window("main") {
        let _ = m.eval("document.documentElement.classList.add('win-pre')");
    }
    let splash = app.get_webview_window("splash");
    if let Some(s) = &splash {
        let _ = s.eval("document.body.classList.add('out')");
    }
    later(app, if splash.is_some() { 160 } else { 0 }, |app| {
        show_main(app);
        if let Some(m) = app.get_webview_window("main") {
            let _ = m.eval("requestAnimationFrame(()=>{const r=document.documentElement;r.classList.add('win-in');r.classList.remove('win-pre');setTimeout(()=>r.classList.remove('win-in'),900)})");
        }
        later(app, 520, |app| {
            if let Some(s) = app.get_webview_window("splash") {
                let _ = s.close();
            }
        });
    });
}

fn quit_app(app: &AppHandle) {
    if let Some(q) = app.try_state::<Quitting>() {
        q.0.store(true, std::sync::atomic::Ordering::SeqCst);
    }
    save_spot(app);
    app.exit(0);
}

fn spot_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("mini-position.json"))
}

fn load_spot(app: &AppHandle) -> Option<(f64, f64)> {
    let text = std::fs::read_to_string(spot_file(app)?).ok()?;
    serde_json::from_str::<(f64, f64)>(&text).ok()
}

fn save_spot(app: &AppHandle) {
    let spot = app.try_state::<MiniSpot>().and_then(|s| *s.0.lock().unwrap());
    if let (Some(spot), Some(file)) = (spot, spot_file(app)) {
        if let Some(dir) = file.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(file, serde_json::to_string(&spot).unwrap_or_default());
    }
}

/// Remembers where the mini timer is now (ignores the off-screen spot Windows uses for minimised windows).
fn track_spot(w: &tauri::Window) {
    if let (Ok(pos), Ok(size), Ok(sf)) = (w.outer_position(), w.outer_size(), w.scale_factor()) {
        if pos.x <= -30000 || pos.y <= -30000 {
            return;
        }
        let right = (pos.x as f64 + size.width as f64) / sf;
        let bottom = (pos.y as f64 + size.height as f64) / sf;
        if let Some(state) = w.app_handle().try_state::<MiniSpot>() {
            *state.0.lock().unwrap() = Some((right, bottom));
        }
    }
}

/// The last spot, if it is still on one of the connected screens.
fn saved_position(app: &AppHandle, width: f64, height: f64) -> Option<(f64, f64)> {
    let (right, bottom) = app
        .try_state::<MiniSpot>()
        .and_then(|s| *s.0.lock().unwrap())
        .or_else(|| load_spot(app))?;
    let (x, y) = (right - width, bottom - height);
    let monitors = app.available_monitors().ok()?;
    let visible = monitors.iter().any(|m| {
        let sf = m.scale_factor();
        let wa = m.work_area();
        let (mx, my) = (wa.position.x as f64 / sf, wa.position.y as f64 / sf);
        let (mw, mh) = (wa.size.width as f64 / sf, wa.size.height as f64 / sf);
        x >= mx - 20.0 && y >= my - 20.0 && x + width <= mx + mw + 20.0 && y + height <= my + mh + 20.0
    });
    if visible {
        Some((x, y))
    } else {
        None
    }
}

/// A sign-in link (blitzit://auth#...) waiting for the web app to pick it up.
#[derive(Default)]
struct PendingLink(Mutex<Option<String>>);

/// The live web app. Every Netlify upload updates the desktop app too.
const SITE: &str = "https://dulcet-daifuku-0fb870.netlify.app";

/// The first time the main window appears (after the splash, or from the tray after starting with Windows)
/// it opens maximized, filling the screen. Later it keeps whatever size the person chose.
static FIRST_SHOW: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(true);

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        if FIRST_SHOW.swap(false, std::sync::atomic::Ordering::SeqCst) {
            let _ = w.maximize();
        }
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn start_blitz(app: &AppHandle) {
    show_main(app);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.eval("window.blitzitStart && window.blitzitStart()");
    }
}

/// Bottom-right corner of the screen the main window is on (above the taskbar), in logical pixels.
fn dock_position(app: &AppHandle, width: f64, height: f64) -> Option<(f64, f64)> {
    let main = app.get_webview_window("main")?;
    let mon = main.current_monitor().ok().flatten().or_else(|| main.primary_monitor().ok().flatten())?;
    let sf = mon.scale_factor();
    let wa = mon.work_area();
    let right = (wa.position.x as f64 + wa.size.width as f64) / sf;
    let bottom = (wa.position.y as f64 + wa.size.height as f64) / sf;
    Some((right - width - 12.0, bottom - height - 12.0))
}

/// Called when the browser opens windaday://auth#... (or the older blitzit://) after the user clicks the email link.
/// Keeps the link until the web app takes it, and pokes the page in case it is already loaded.
fn handle_link(app: &AppHandle, url: String) {
    if !url.starts_with("windaday://") && !url.starts_with("blitzit://") {
        return;
    }
    if let Some(state) = app.try_state::<PendingLink>() {
        *state.0.lock().unwrap() = Some(url);
    }
    show_main(app);
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.eval("window.blitzitLink && window.blitzitLink()");
    }
}

/// The web app asks for a waiting sign-in link (returns it once).
#[tauri::command]
fn take_link(state: tauri::State<'_, PendingLink>) -> Option<String> {
    state.0.lock().unwrap().take()
}

/// Opens the frameless, transparent, always-on-top mini timer docked bottom-right,
/// then tucks the main window away (minimised, still in the taskbar).
/// Must be async: creating a window from a sync command deadlocks on Windows.
#[tauri::command]
async fn open_mini(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("mini") {
        let _ = w.set_size(LogicalSize::new(width, height));
        let _ = w.show();
    } else {
        let url = tauri::Url::parse(&format!("{SITE}/mini.html")).map_err(|e| e.to_string())?;
        let mut b = WebviewWindowBuilder::new(&app, "mini", WebviewUrl::External(url))
            .title("Windaday")
            .inner_size(width, height)
            .min_inner_size(150.0, 80.0)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .resizable(true)
            .maximizable(false)
            .minimizable(false)
            .skip_taskbar(true);
        if let Some((x, y)) = saved_position(&app, width, height).or_else(|| dock_position(&app, width, height)) {
            b = b.position(x, y);
        }
        b.build().map_err(|e| e.to_string())?;
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.minimize();
    }
    Ok(())
}

/// Closes the mini timer and (unless restore is false) brings the main window back.
#[tauri::command]
async fn close_mini(app: AppHandle, restore: Option<bool>) {
    if let Some(w) = app.get_webview_window("mini") {
        if let Some(flag) = app.try_state::<MiniClosing>() {
            flag.0.store(true, std::sync::atomic::Ordering::SeqCst);
        }
        if w.close().is_err() {
            if let Some(flag) = app.try_state::<MiniClosing>() {
                flag.0.store(false, std::sync::atomic::Ordering::SeqCst);
            }
        }
    }
    if restore.unwrap_or(true) {
        show_main(&app);
    }
}

/// Resizes the mini timer, keeping its bottom-right corner where it is.
#[tauri::command]
async fn resize_mini(app: AppHandle, width: f64, height: f64) {
    if let Some(w) = app.get_webview_window("mini") {
        let sf = w.scale_factor().unwrap_or(1.0);
        if let (Ok(pos), Ok(size)) = (w.outer_position(), w.outer_size()) {
            let right = (pos.x as f64 + size.width as f64) / sf;
            let bottom = (pos.y as f64 + size.height as f64) / sf;
            let _ = w.set_size(LogicalSize::new(width, height));
            let _ = w.set_position(LogicalPosition::new(right - width, bottom - height));
        } else {
            let _ = w.set_size(LogicalSize::new(width, height));
        }
    }
}

/// What the app knows about updates: the installed version and, if there is one, the newer version.
#[derive(serde::Serialize)]
struct UpdateInfo {
    current: String,
    latest: Option<String>,
    /// "What's new" text from the GitHub release (one bullet per line).
    notes: Option<String>,
}

/// Asks GitHub (latest release) whether a newer desktop app exists.
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    let (latest, notes) = match update {
        Some(u) => (Some(u.version), u.body),
        None => (None, None),
    };
    Ok(UpdateInfo { current, latest, notes })
}

/// Downloads the signed update, installs it and restarts Blitzit.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    if let Some(u) = update {
        u.download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // a second launch just brings the open window forward
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        start_blitz(app);
                    }
                })
                .build(),
        )
        .register_uri_scheme_protocol("splash", |_ctx, _req| {
            tauri::http::Response::builder()
                .header("Content-Type", "text/html; charset=utf-8")
                .body(SPLASH_HTML.as_bytes().to_vec())
                .unwrap()
        })
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && payload.event() == tauri::webview::PageLoadEvent::Finished {
                page_loaded(webview.app_handle());
            }
        })
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(PendingLink::default())
        .manage(MiniSpot::default())
        .manage(MiniClosing::default())
        .manage(KeepInTray(std::sync::atomic::AtomicBool::new(true)))
        .manage(Quitting::default())
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Keep in tray: X hides the window; the app keeps running until Quit in the tray
                    let app = window.app_handle();
                    let keep = app.try_state::<KeepInTray>().map(|k| k.0.load(std::sync::atomic::Ordering::SeqCst)).unwrap_or(true);
                    let quitting = app.try_state::<Quitting>().map(|q| q.0.load(std::sync::atomic::Ordering::SeqCst)).unwrap_or(false);
                    if keep && !quitting {
                        api.prevent_close();
                        let _ = window.hide();
                        let _ = app.emit("windaday-tray", "hidden");
                        return;
                    }
                    // really closing: the mini timer must not linger on its own
                    if let Some(m) = window.app_handle().get_webview_window("mini") {
                        if let Some(flag) = window.app_handle().try_state::<MiniClosing>() {
                            flag.0.store(true, std::sync::atomic::Ordering::SeqCst);
                        }
                        let _ = m.close();
                    }
                }
                return;
            }
            if window.label() != "mini" {
                return;
            }
            match event {
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => track_spot(window),
                tauri::WindowEvent::Destroyed => {
                    let app = window.app_handle();
                    save_spot(app);
                    // closed some other way (e.g. Alt+F4): tell the page and bring Blitzit back
                    let by_app = app
                        .try_state::<MiniClosing>()
                        .map(|f| f.0.swap(false, std::sync::atomic::Ordering::SeqCst))
                        .unwrap_or(false);
                    if !by_app {
                        let _ = app.emit("blitzit-act", "closed");
                        show_main(app);
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_mini,
            close_mini,
            resize_mini,
            check_update,
            install_update,
            set_tray,
            autostart,
            set_sounds,
            set_splash,
            take_link
        ])
        .setup(|app| {
            // windaday:// links (email sign-in) open this app
            let _ = app.deep_link().register_all();
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                if let Some(u) = urls.first() {
                    handle_link(app.handle(), u.to_string());
                }
            }
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(u) = event.urls().first() {
                    handle_link(&handle, u.to_string());
                }
            });

            // tray icon: left click opens Blitzit, right click shows the menu
            let open = MenuItem::with_id(app, "open", "Open Windaday", true, None::<&str>)?;
            let blitz = MenuItem::with_id(app, "blitz", "Win the day   Ctrl+Alt+Shift+B", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Windaday", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &blitz, &quit])?;
            let mut tray = TrayIconBuilder::new()
                .tooltip(format!("Windaday {}", app.package_info().version))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "open" => show_main(app),
                    "blitz" => start_blitz(app),
                    "quit" => quit_app(app),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = e
                    {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            // started with Windows: stay quietly in the tray until the person opens it.
            // Otherwise show the splash while the (hidden) main window loads.
            let hidden = std::env::args().any(|a| a == "--hidden");
            let splash = !hidden && splash_wanted(app.handle()) && open_splash(app.handle());
            app.manage(Boot {
                start: std::time::Instant::now(),
                splash: std::sync::atomic::AtomicBool::new(splash),
                loaded: std::sync::atomic::AtomicBool::new(false),
                revealed: std::sync::atomic::AtomicBool::new(false),
                hidden,
            });
            if hidden {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            } else {
                if splash {
                    play_splash_sound(app.handle());
                }
                // safety net: never leave someone waiting (slow or no internet)
                later(app.handle(), 12000, reveal);
            }

            // Ctrl+Alt+Shift+B starts a blitz from anywhere (ignored if another app already uses it).
            // Not Ctrl+Shift+B (Chrome, Edge, VS Code) or Ctrl+Alt+B (AltGr+B types a character on some keyboards).
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SHIFT), Code::KeyB);
            let _ = app.global_shortcut().register(shortcut);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Windaday");
}
