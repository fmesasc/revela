// Revela as a desktop application: a window with the same web app inside
// (bundled, so the editor opens without the website).
//
// What the window adds to the web app (ui/shell/desktop.js asks for it):
// - Saving: the web app's downloads go through save_file, which asks where with the system's own «Save as»
//   dialog and writes there — the page never chooses a path by itself.
// - Opening: a presentation opened with Revela («Open with», a double click on a .pptx or .odp, or dropped on
//   its icon) is given to the page by opened_files / read_opened — only those files, nothing else of the disk.
//   On macOS it arrives as an event (RunEvent::Opened); elsewhere as the program's arguments.
// - Updates: update_available / install_update. The page asks, in the interface's language; the installer is
//   downloaded, its signature checked against the public key in tauri.conf.json, installed and the app
//   restarted. Without internet it simply opens as it is. Linux .deb/.rpm installs can't replace themselves
//   (only the AppImage can): there it opens the download page instead.
// The menu bar is built by the page too (its labels are translated there), with Tauri's menu API.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

const RELEASES: &str = "https://github.com/fmesasc/revela/releases/latest";
// What Revela opens (the rest of the arguments are ignored).
const OPENS: [&str; 8] = ["pptx", "pptm", "potx", "ppsx", "odp", "otp", "key", "json"];

// The files given to Revela to open, waiting for the page (and allowed to be read by it).
#[derive(Default)]
struct Opened(Mutex<Vec<PathBuf>>);

fn opens(p: &PathBuf) -> bool {
    p.is_file()
        && p.extension().and_then(|e| e.to_str()).is_some_and(|e| OPENS.contains(&e.to_lowercase().as_str()))
}

// (The page sends the suggested name percent-encoded in a header: headers are ASCII.)
fn unescape(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3]).ok().and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

// The bytes of a download, saved where the person chooses. → the path, or None if cancelled.
#[tauri::command]
async fn save_file(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<Option<String>, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("expected bytes".into()) };
    let name = request.headers().get("x-name").and_then(|v| v.to_str().ok()).map(unescape).unwrap_or_default();
    // (Only a file name: no folders from the page.)
    let name = name.rsplit(['/', '\\']).next().unwrap_or("").trim().to_string();
    let name = if name.is_empty() { "Revela".to_string() } else { name };
    let mut dialog = app.dialog().file().set_file_name(&name);
    if let Some(ext) = name.rsplit_once('.').map(|(_, e)| e.to_string()).filter(|e| !e.is_empty() && e.len() <= 8) {
        dialog = dialog.add_filter(ext.to_uppercase(), &[ext.as_str()]);
    }
    let Some(path) = dialog.blocking_save_file() else { return Ok(None) };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

// The files given to open, and forgotten (each one is opened once).
#[tauri::command]
fn opened_files(opened: State<'_, Opened>) -> Vec<String> {
    opened.0.lock().unwrap().iter().map(|p| p.to_string_lossy().into_owned()).collect()
}

// One of them, its bytes (an ArrayBuffer in the page). Any other path: refused.
#[tauri::command]
fn read_opened(path: String, opened: State<'_, Opened>) -> Result<tauri::ipc::Response, String> {
    let mut list = opened.0.lock().unwrap();
    let Some(at) = list.iter().position(|p| p.to_string_lossy() == path) else { return Err("not opened".into()) };
    let p = list.remove(at);
    std::fs::read(&p).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

// A newer version, if there is one: its number.
#[tauri::command]
async fn update_available(app: AppHandle) -> Result<Option<String>, String> {
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(update.map(|u| u.version))
}

// → "page" (the download page opened: a .deb or .rpm), or the app restarts updated.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<String, String> {
    if cfg!(target_os = "linux") && std::env::var_os("APPIMAGE").is_none() {
        app.opener().open_url(RELEASES, None::<&str>).map_err(|e| e.to_string())?;
        return Ok("page".into());
    }
    let Some(update) = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())? else {
        return Ok("none".into());
    };
    update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
    app.restart();
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Opened::default())
        .invoke_handler(tauri::generate_handler![save_file, opened_files, read_opened, update_available, install_update])
        .setup(|app| {
            // Windows and Linux: what to open comes as arguments («Open with», a double click).
            let given: Vec<PathBuf> = std::env::args_os().skip(1).map(PathBuf::from).filter(opens).collect();
            app.state::<Opened>().0.lock().unwrap().extend(given);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("no se pudo iniciar Revela");
    app.run(|handle, event| {
        // macOS: files opened with Revela, also while it's running (the page listens).
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = event {
            let files: Vec<PathBuf> = urls.into_iter().filter_map(|u| u.to_file_path().ok()).filter(opens).collect();
            if !files.is_empty() {
                handle.state::<Opened>().0.lock().unwrap().extend(files);
                let _ = handle.emit("revela://opened", ());
            }
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (handle, event);
    });
}
