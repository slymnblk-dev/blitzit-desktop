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
use std::sync::Mutex;

/// Where the mini timer was last left: its bottom-right corner, in logical pixels.
/// Kept in memory while it moves and saved to disk when it closes.
#[derive(Default)]
struct MiniSpot(Mutex<Option<(f64, f64)>>);

/// True while the app itself is closing the mini timer (so its own "closed" handling can be skipped).
#[derive(Default)]
struct MiniClosing(std::sync::atomic::AtomicBool);

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

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
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

/// Called when the browser opens blitzit://auth#... after the user clicks the email link.
/// Keeps the link until the web app takes it, and pokes the page in case it is already loaded.
fn handle_link(app: &AppHandle, url: String) {
    if !url.starts_with("blitzit://") {
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
    Ok(UpdateInfo { current, latest: update.map(|u| u.version) })
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
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(PendingLink::default())
        .manage(MiniSpot::default())
        .manage(MiniClosing::default())
        .on_window_event(|window, event| {
            // closing the main window quits Blitzit, so the mini timer must not linger on its own
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
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
            take_link
        ])
        .setup(|app| {
            // blitzit:// links (email sign-in) open this app
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
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &blitz, &quit])?;
            let mut tray = TrayIconBuilder::new()
                .tooltip(format!("Windaday {}", app.package_info().version))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, e| match e.id.as_ref() {
                    "open" => show_main(app),
                    "blitz" => start_blitz(app),
                    "quit" => app.exit(0),
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

            // Ctrl+Alt+Shift+B starts a blitz from anywhere (ignored if another app already uses it).
            // Not Ctrl+Shift+B (Chrome, Edge, VS Code) or Ctrl+Alt+B (AltGr+B types a character on some keyboards).
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SHIFT), Code::KeyB);
            let _ = app.global_shortcut().register(shortcut);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Windaday");
}
