// Revela as a desktop application: a window with the same web app inside
// (bundled, so the editor opens without the website).
//
// What the window adds to the web app (ui/shell/desktop.js asks for it):
// - Saving: the web app's downloads go through save_file, which asks where with the system's own «Save as»
//   dialog and writes there — the page never chooses a path by itself.
// - Opening: a presentation opened with Revela («Open with», a double click on a .pptx or .odp, or dropped on
//   its icon) is given to the page by opened_files / read_opened. On macOS it arrives as an event
//   (RunEvent::Opened); elsewhere as the program's arguments.
// - Big files (a package of gigabytes, .revela): written a piece at a time (save_begin / save_chunk / save_end)
//   and read a piece at a time (opened_size / read_range / release_opened) — never whole in memory, nor twice.
// - Choosing files: pick_files shows the system's «Open» dialog (the web view's own, on Linux, filters only by
//   MIME type and hid PowerPoint files). Only what is opened with Revela or chosen there can be read
//   (read_opened), once: nothing else of the disk.
// - Pictures, videos and sounds on disk (media.rs): a .pptx or .revela unzipped here, its files in Revela's own folder,
//   shown from there; a .revela put together from them. The page gets only the text.
// - Updates: update_available / install_update. The page asks, in the interface's language; the installer is
//   downloaded, its signature checked against the public key in tauri.conf.json, installed and the app
//   restarted. Without internet it simply opens as it is. Linux .deb/.rpm installs can't replace themselves
//   (only the AppImage can): from Revela's apt repository, apt updates it after the system's password window; otherwise
//   it opens the download page. Installed from Flathub, never: Flathub
//   forbids apps that update themselves (flatpak updates it), so there's simply never a newer version.
// - Links (revela://, desktop/src-tauri/tauri.conf.json): open?doc=<id>, a presentation of Revela's cloud, which the page
//   opens (opened_links); open?downloaded=<name>, a .revela the web app has just downloaded for a presentation too big
//   for the browser (ui/shell/bigdeck.js): looked for in Downloads only — by its name, a .revela, written in the last
//   minutes —, waited for until it has finished downloading, and then opened as any file given to Revela.
// - One window: opening a file or a link while Revela is open goes to that window (single-instance), not a second one.
// The menu bar is built by the page too (its labels are translated there), with Tauri's menu API.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

mod media;

const RELEASES: &str = "https://github.com/fmesasc/revela/releases/latest";
// (Written by install.sh: Revela's own apt repository.)
const APT_LIST: &str = "/etc/apt/sources.list.d/revela.list";
// What Revela opens (the rest of the arguments are ignored): presentations, its projects, PDFs («Open with»).
const OPENS: [&str; 10] = ["pptx", "pptm", "potx", "ppsx", "odp", "otp", "key", "json", "revela", "pdf"];

// The files given to Revela to open, waiting for the page (pending), and those the page may read: given to open,
// or chosen in the «Open» dialog (readable; each read once).
#[derive(Default)]
struct Files {
    pending: Mutex<Vec<PathBuf>>,
    readable: Mutex<Vec<PathBuf>>,
}
// Presentations of Revela's cloud asked for by a link (their ids), waiting for the page.
#[derive(Default)]
struct Links {
    pending: Mutex<Vec<String>>,
    // (A link may come twice — as an argument and through the link plugin —: the same one, within seconds, once.)
    seen: Mutex<Vec<(String, std::time::Instant)>>,
}

// What the program is given (its arguments, a second launch's, a link): files to open and revela:// links. (On Linux
// the menu entry passes a file as a file:// address.)
fn take_args<I: IntoIterator<Item = String>>(app: &AppHandle, args: I) {
    let mut files = Vec::new();
    for a in args {
        if a.starts_with("revela://") { follow_link(app, &a); continue; }
        let p = if a.starts_with("file://") { tauri::Url::parse(&a).ok().and_then(|u| u.to_file_path().ok()) } else { Some(PathBuf::from(&a)) };
        if let Some(p) = p.filter(opens) { files.push(p); }
    }
    if !files.is_empty() {
        app.state::<Files>().pending.lock().unwrap().extend(files);
        let _ = app.emit("revela://opened", ());
    }
}

fn show_window(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") { let _ = w.unminimize(); let _ = w.show(); let _ = w.set_focus(); }
}

// revela://open?doc=<id> or ?downloaded=<name>; anything else, ignored.
fn follow_link(app: &AppHandle, link: &str) {
    let Ok(u) = tauri::Url::parse(link) else { return };
    if u.scheme() != "revela" { return; }
    {
        let links = app.state::<Links>();
        let mut seen = links.seen.lock().unwrap();
        seen.retain(|(_, t)| t.elapsed().as_secs() < 10);
        if seen.iter().any(|(l, _)| l == link) { return; }
        seen.push((link.to_string(), std::time::Instant::now()));
    }
    for (k, v) in u.query_pairs() {
        let v = v.into_owned();
        if k == "doc" && (16..=40).contains(&v.len()) && v.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
            app.state::<Links>().pending.lock().unwrap().push(v);
            let _ = app.emit("revela://link", ());
        } else if k == "downloaded" {
            let app = app.clone();
            std::thread::spawn(move || wait_download(&app, &v));
        }
    }
    show_window(app);
}

// The .revela just downloaded with that name — or the browser's «name (1).revela» —, in Downloads, written in the last
// 15 minutes; once it has finished (no «.crdownload» / «.part» beside it, the same size a second later). Up to 4
// minutes: a package of hundreds of MB takes a while to save.
fn wait_download(app: &AppHandle, name: &str) {
    let low = name.to_ascii_lowercase();
    if name.is_empty() || name.len() > 200 || name.contains(['/', '\\', ':']) || name.starts_with('.') || !low.ends_with(".revela") { return; }
    let Ok(dir) = app.path().download_dir() else { return };
    let stem = &name[..name.len() - ".revela".len()];
    let recent = |m: &std::fs::Metadata| m.modified().ok().and_then(|t| t.elapsed().ok()).is_some_and(|e| e.as_secs() < 15 * 60);
    for _ in 0..240 {
        let mut best: Option<(PathBuf, std::time::SystemTime)> = None;
        if let Ok(list) = std::fs::read_dir(&dir) {
            for e in list.flatten() {
                let n = e.file_name().to_string_lossy().into_owned();
                if !n.to_ascii_lowercase().ends_with(".revela") || !n.starts_with(stem) { continue; }
                let middle = n[stem.len()..n.len() - ".revela".len()].trim();
                if !(middle.is_empty() || (middle.starts_with('(') && middle.ends_with(')'))) { continue; }
                let Ok(m) = e.metadata() else { continue };
                if !m.is_file() || !recent(&m) { continue; }
                let t = m.modified().unwrap_or(std::time::UNIX_EPOCH);
                if best.as_ref().map_or(true, |(_, bt)| t > *bt) { best = Some((e.path(), t)); }
            }
        }
        if let Some((p, _)) = best {
            let busy = ["crdownload", "part", "download"].iter().any(|x| { let mut q = p.clone().into_os_string(); q.push(format!(".{x}")); PathBuf::from(q).exists() });
            let size = || std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
            let a = size();
            std::thread::sleep(std::time::Duration::from_secs(1));
            if !busy && a > 0 && a == size() {
                app.state::<Files>().pending.lock().unwrap().push(p);
                let _ = app.emit("revela://opened", ());
                show_window(app);
                return;
            }
        } else {
            std::thread::sleep(std::time::Duration::from_secs(1));
        }
    }
}

// The cloud presentations asked for by links, for the page (each once).
#[tauri::command]
fn opened_links(links: State<'_, Links>) -> Vec<String> {
    links.pending.lock().unwrap().drain(..).collect()
}

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

// The system's «Save as» for a suggested name (only a file name: no folders from the page). → the path, or None.
fn ask_where(app: &AppHandle, name: &str) -> Result<Option<PathBuf>, String> {
    let name = name.rsplit(['/', '\\']).next().unwrap_or("").trim().to_string();
    let name = if name.is_empty() { "Revela".to_string() } else { name };
    let mut dialog = app.dialog().file().set_file_name(&name);
    if let Some(ext) = name.rsplit_once('.').map(|(_, e)| e.to_string()).filter(|e| !e.is_empty() && e.len() <= 8) {
        dialog = dialog.add_filter(ext.to_uppercase(), &[ext.as_str()]);
    }
    let Some(path) = dialog.blocking_save_file() else { return Ok(None) };
    path.into_path().map(Some).map_err(|e| e.to_string())
}

// The bytes of a download, saved where the person chooses. → the path, or None if cancelled.
#[tauri::command]
async fn save_file(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<Option<String>, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("expected bytes".into()) };
    let name = request.headers().get("x-name").and_then(|v| v.to_str().ok()).map(unescape).unwrap_or_default();
    let Some(path) = ask_where(&app, &name)? else { return Ok(None) };
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

// A big download written a piece at a time: where (save_begin → a number, or None if cancelled), its pieces in order
// (save_chunk, the number in the «x-token» header), and the end (save_end: kept → the path; not kept — it failed
// half way — the half-written file removed).
#[derive(Default)]
struct Saves {
    open: Mutex<HashMap<u64, (std::fs::File, PathBuf)>>,
    next: Mutex<u64>,
}

#[tauri::command]
async fn save_begin(app: AppHandle, name: String, saves: State<'_, Saves>) -> Result<Option<u64>, String> {
    let Some(path) = ask_where(&app, &unescape(&name))? else { return Ok(None) };
    let file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    let id = {
        let mut n = saves.next.lock().unwrap();
        *n += 1;
        *n
    };
    saves.open.lock().unwrap().insert(id, (file, path));
    Ok(Some(id))
}

#[tauri::command]
fn save_chunk(request: tauri::ipc::Request<'_>, saves: State<'_, Saves>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("expected bytes".into()) };
    let id: u64 = request.headers().get("x-token").and_then(|v| v.to_str().ok()).and_then(|v| v.parse().ok()).ok_or("no token")?;
    let mut open = saves.open.lock().unwrap();
    let (file, _) = open.get_mut(&id).ok_or("not saving")?;
    file.write_all(bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_end(token: u64, keep: bool, saves: State<'_, Saves>) -> Result<Option<String>, String> {
    let Some((mut file, path)) = saves.open.lock().unwrap().remove(&token) else { return Err("not saving".into()) };
    if !keep {
        drop(file);
        let _ = std::fs::remove_file(&path);
        return Ok(None);
    }
    file.flush().map_err(|e| e.to_string())?;
    let _ = file.sync_all();
    Ok(Some(path.to_string_lossy().into_owned()))
}

// The files given to open, now readable (each one is opened once).
#[tauri::command]
fn opened_files(files: State<'_, Files>) -> Vec<String> {
    let given: Vec<PathBuf> = files.pending.lock().unwrap().drain(..).collect();
    let out = given.iter().map(|p| p.to_string_lossy().into_owned()).collect();
    files.readable.lock().unwrap().extend(given);
    out
}

// The system's «Open» dialog: filters [[name, [extensions]]] («*»: any), one file or several. → the paths
// chosen, now readable.
#[tauri::command]
async fn pick_files(app: AppHandle, filters: Vec<(String, Vec<String>)>, multiple: bool, files: State<'_, Files>) -> Result<Vec<String>, String> {
    let mut dialog = app.dialog().file();
    for (name, exts) in &filters {
        let exts: Vec<&str> = exts.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(name, &exts);
    }
    let chosen: Vec<PathBuf> = if multiple {
        dialog.blocking_pick_files().unwrap_or_default().into_iter().filter_map(|p| p.into_path().ok()).collect()
    } else {
        dialog.blocking_pick_file().and_then(|p| p.into_path().ok()).into_iter().collect()
    };
    let out = chosen.iter().map(|p| p.to_string_lossy().into_owned()).collect();
    files.readable.lock().unwrap().extend(chosen);
    Ok(out)
}

// One of them, its bytes (an ArrayBuffer in the page). Any other path: refused.
#[tauri::command]
fn read_opened(path: String, files: State<'_, Files>) -> Result<tauri::ipc::Response, String> {
    let mut list = files.readable.lock().unwrap();
    let Some(at) = list.iter().position(|p| p.to_string_lossy() == path) else { return Err("not opened".into()) };
    let p = list.remove(at);
    std::fs::read(&p).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

// A big opened file, read a piece at a time: its size, a piece of it (up to 64 MB), and, once read, no longer readable.
fn readable_path(files: &State<'_, Files>, path: &str) -> Result<PathBuf, String> {
    files.readable.lock().unwrap().iter().find(|p| p.to_string_lossy() == path).cloned().ok_or_else(|| "not opened".to_string())
}

#[tauri::command]
fn opened_size(path: String, files: State<'_, Files>) -> Result<u64, String> {
    let p = readable_path(&files, &path)?;
    std::fs::metadata(&p).map(|m| m.len()).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_range(path: String, start: u64, len: u64, files: State<'_, Files>) -> Result<tauri::ipc::Response, String> {
    let p = readable_path(&files, &path)?;
    let mut f = std::fs::File::open(&p).map_err(|e| e.to_string())?;
    f.seek(SeekFrom::Start(start)).map_err(|e| e.to_string())?;
    let mut buf = Vec::with_capacity(len.min(64 << 20) as usize);
    f.take(len.min(64 << 20)).read_to_end(&mut buf).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(buf))
}

#[tauri::command]
fn release_opened(path: String, files: State<'_, Files>) {
    files.readable.lock().unwrap().retain(|p| p.to_string_lossy() != path);
}

// The menu bar shown or hidden (Windows and Linux: hidden until Alt, as in Firefox or Edge; desktop.js decides).
#[tauri::command]
fn menu_bar(window: tauri::Window, show: bool) -> Result<(), String> {
    if show { window.show_menu() } else { window.hide_menu() }.map_err(|e| e.to_string())
}

// Running inside a Flatpak (Flathub): flatpak sets FLATPAK_ID and puts /.flatpak-info in every sandbox. There
// the app must not update itself (Flathub's rule; it couldn't anyway: its files are read-only) — flatpak does.
fn in_flatpak() -> bool {
    std::env::var_os("FLATPAK_ID").is_some() || std::path::Path::new("/.flatpak-info").exists()
}

// A newer version, if there is one: its number. (In a Flatpak: none — the page then says it's up to date.)
#[tauri::command]
async fn update_available(app: AppHandle) -> Result<Option<String>, String> {
    if in_flatpak() {
        return Ok(None);
    }
    let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    Ok(update.map(|u| u.version))
}

// → "page" (the download page opened: a .deb or .rpm), or the app restarts updated.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<String, String> {
    if in_flatpak() {
        return Err("Flatpak: updates come from flatpak (flatpak update)".into());
    }
    if cfg!(target_os = "linux") && std::env::var_os("APPIMAGE").is_none() {
        // Installed from Revela's apt repository (install.sh): updated by apt — which checks the package's signature —,
        // after the system's own password window (pkexec); only that repository is refreshed. Then restarted, new.
        if std::path::Path::new(APT_LIST).exists() && std::path::Path::new("/usr/bin/pkexec").exists() {
            let cmd = format!("export DEBIAN_FRONTEND=noninteractive; apt-get update -o Dir::Etc::sourcelist={APT_LIST} -o Dir::Etc::sourceparts=- -o APT::Get::List-Cleanup=0 && apt-get install -y --only-upgrade revela");
            let status = tauri::async_runtime::spawn_blocking(move || std::process::Command::new("/usr/bin/pkexec").args(["/bin/sh", "-c", cmd.as_str()]).status())
                .await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())?;
            match status.code() {
                Some(0) => app.restart(),
                Some(126) => return Ok("cancelled".into()),            // (the password window closed)
                _ => {}                                                  // (no password window here, or apt failed: the page)
            }
        }
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
        // (First: a second launch — a file or a link opened while Revela is open — hands them to this one and quits.)
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| { take_args(app, argv.into_iter().skip(1)); show_window(app); }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Files::default())
        .manage(Saves::default())
        .manage(Links::default())
        .manage(media::Zips::default())
        .invoke_handler(tauri::generate_handler![opened_links, save_file, save_begin, save_chunk, save_end, opened_files, pick_files, read_opened, opened_size, read_range, release_opened, menu_bar, update_available, install_update,
            media::zip_open, media::zip_read, media::zip_extract, media::zip_close, media::media_find, media::media_put, media::media_gc, media::save_package])
        .setup(|app| {
            // Windows and Linux: what to open comes as arguments («Open with», a double click, a revela:// link).
            let mut files = Vec::new();
            for a in std::env::args_os().skip(1) {
                match a.to_str() {
                    Some(t) if t.starts_with("revela://") || t.starts_with("file://") => take_args(app.handle(), [t.to_string()]),
                    _ => { let p = PathBuf::from(a); if opens(&p) { files.push(p); } }
                }
            }
            app.state::<Files>().pending.lock().unwrap().extend(files);
            // revela:// links: registered for this app (the AppImage has no installer to do it), and those that come
            // while it runs (macOS: all of them).
            #[cfg(any(windows, target_os = "linux"))]
            let _ = app.deep_link().register_all();
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| { for u in event.urls() { follow_link(&handle, u.as_str()); } });
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
                handle.state::<Files>().pending.lock().unwrap().extend(files);
                let _ = handle.emit("revela://opened", ());
            }
        }
        #[cfg(not(target_os = "macos"))]
        let _ = (handle, event);
    });
}
