// A presentation's pictures, videos and sounds kept on disk, never through the page (2026-10-20).
//
// The web view takes in data at some 32 MB/s on Linux (WebKitGTK): handing it a PowerPoint of 417 MB took 13 s before
// anything was read. So the window opens zips itself:
// - zip_open / zip_read / zip_close: a .pptx or a .revela opened with Revela (or chosen in «Open») read here — its
//   list, and the small parts the page needs (XML, relationships, presentation.json).
// - zip_extract: one of its files written to Revela's own folder (<app data>/media/<id>.<ext>), its id the first 16
//   bytes of its SHA-256 in hex — the page's (core/mediastore.js) —; the page shows it from there through the asset
//   protocol (tauri.conf.json: only that folder). From a package, a file whose bytes aren't its id is left out.
// - media_find: a file of that folder by its id (a presentation read back after a restart).
// - media_put: one the page has made (a picture inserted, cropped…), written there too.
// - save_package: a .revela put together here from that folder, piece by piece, where the person chooses.
// - media_gc: what nothing refers to any more, deleted (not files of the last day: their deck may be on its way).
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};

use crate::{ask_where, readable_path, unescape, Files};

#[derive(Default)]
pub struct Zips {
    open: Mutex<HashMap<u64, zip::ZipArchive<std::fs::File>>>,
    next: AtomicU64,
}
// (A path, its id and its size: what the page registers.)
type Stored = (String, String, u64);

static PART: AtomicU64 = AtomicU64::new(0);

fn media_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?.join("media");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}
fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}
fn is_id(s: &str) -> bool {
    s.len() == 32 && s.bytes().all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}
fn safe_ext(e: &str) -> String {
    let e: String = e.chars().filter(|c| c.is_ascii_alphanumeric()).take(8).collect::<String>().to_ascii_lowercase();
    if e.is_empty() { "bin".into() } else { e }
}
// The file of that id in the folder (any extension).
fn find(dir: &Path, id: &str) -> Option<PathBuf> {
    if !is_id(id) { return None; }
    let pre = format!("{id}.");
    std::fs::read_dir(dir).ok()?.flatten().map(|e| e.path()).find(|p| p.is_file() && p.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.starts_with(&pre)))
}

// Bytes read into the folder as they come (hashed on the way): → (id, path, size); None if they aren't `want`.
fn store_from<R: Read>(dir: &Path, mut r: R, ext: &str, want: Option<&str>) -> Result<Option<Stored>, String> {
    let tmp = dir.join(format!(".part-{}-{}", std::process::id(), PART.fetch_add(1, Ordering::Relaxed)));
    let copied = (|| -> std::io::Result<(String, u64)> {
        let mut f = std::fs::File::create(&tmp)?;
        let mut h = Sha256::new();
        let mut buf = vec![0u8; 1 << 20];
        let mut n = 0u64;
        loop {
            let k = r.read(&mut buf)?;
            if k == 0 { break; }
            h.update(&buf[..k]);
            f.write_all(&buf[..k])?;
            n += k as u64;
        }
        f.flush()?;
        Ok((hex(&h.finalize()[..16]), n))
    })();
    let (id, size) = match copied {
        Ok(x) => x,
        Err(e) => { let _ = std::fs::remove_file(&tmp); return Err(e.to_string()); }
    };
    if want.is_some_and(|w| w != id) { let _ = std::fs::remove_file(&tmp); return Ok(None); }
    let path = match find(dir, &id) {
        Some(p) => { let _ = std::fs::remove_file(&tmp); p }          // (the same file, already here)
        None => {
            let p = dir.join(format!("{id}.{}", safe_ext(ext)));
            std::fs::rename(&tmp, &p).map_err(|e| { let _ = std::fs::remove_file(&tmp); e.to_string() })?;
            p
        }
    };
    Ok(Some((id, path.to_string_lossy().into_owned(), size)))
}

// A zip given to Revela: its files (name, size) and a number to read them by.
#[tauri::command]
pub async fn zip_open(path: String, files: State<'_, Files>, zips: State<'_, Zips>) -> Result<(u64, Vec<(String, u64)>), String> {
    let p = readable_path(&files, &path)?;
    let mut a = zip::ZipArchive::new(std::fs::File::open(&p).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let mut list = Vec::with_capacity(a.len());
    for i in 0..a.len() {
        if let Ok(f) = a.by_index(i) {
            if f.is_file() { list.push((f.name().to_string(), f.size())); }
        }
    }
    let token = zips.next.fetch_add(1, Ordering::Relaxed) + 1;
    zips.open.lock().unwrap().insert(token, a);
    Ok((token, list))
}

// One of its files, whole (the small ones: up to 256 MB).
#[tauri::command]
pub async fn zip_read(token: u64, name: String, zips: State<'_, Zips>) -> Result<tauri::ipc::Response, String> {
    let mut open = zips.open.lock().unwrap();
    let a = open.get_mut(&token).ok_or("not open")?;
    let f = a.by_name(&name).map_err(|e| e.to_string())?;
    if f.size() > 256 << 20 { return Err("too big".into()); }
    let mut buf = Vec::with_capacity(f.size() as usize);
    f.take(256 << 20).read_to_end(&mut buf).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(buf))
}

// One of its files into the folder. expect: its id, from a package (anything else: left out → None).
#[tauri::command]
pub async fn zip_extract(app: AppHandle, token: u64, name: String, ext: String, expect: Option<String>, zips: State<'_, Zips>) -> Result<Option<Stored>, String> {
    let dir = media_dir(&app)?;
    if let Some(id) = expect.as_deref() {
        if !is_id(id) { return Ok(None); }
    }
    let mut open = zips.open.lock().unwrap();
    let a = open.get_mut(&token).ok_or("not open")?;
    let f = a.by_name(&name).map_err(|e| e.to_string())?;
    store_from(&dir, f, &ext, expect.as_deref())
}

#[tauri::command]
pub fn zip_close(token: u64, zips: State<'_, Zips>) {
    zips.open.lock().unwrap().remove(&token);
}

// A file of the folder by its id: (path, size), or None.
#[tauri::command]
pub async fn media_find(app: AppHandle, id: String) -> Result<Option<(String, u64)>, String> {
    let dir = media_dir(&app)?;
    Ok(find(&dir, &id).map(|p| { let n = std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0); (p.to_string_lossy().into_owned(), n) }))
}

// Bytes made by the page (its extension in the «x-ext» header), into the folder.
#[tauri::command]
pub async fn media_put(app: AppHandle, request: tauri::ipc::Request<'_>) -> Result<Stored, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else { return Err("expected bytes".into()) };
    let ext = request.headers().get("x-ext").and_then(|v| v.to_str().ok()).unwrap_or("bin").to_string();
    let dir = media_dir(&app)?;
    store_from(&dir, &bytes[..], &ext, None)?.ok_or_else(|| "not stored".to_string())
}

// Everything in the folder that isn't in keep and is more than a day old: deleted. → how many.
#[tauri::command]
pub async fn media_gc(app: AppHandle, keep: Vec<String>) -> Result<u32, String> {
    let dir = media_dir(&app)?;
    let keep: std::collections::HashSet<String> = keep.into_iter().collect();
    let old = |p: &Path| std::fs::metadata(p).and_then(|m| m.modified()).ok().and_then(|t| t.elapsed().ok()).is_some_and(|e| e.as_secs() > 24 * 3600);
    let mut n = 0;
    for e in std::fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
        let p = e.path();
        let Some(name) = p.file_name().and_then(|n| n.to_str()).map(str::to_string) else { continue };
        let stem = name.split('.').next().unwrap_or("");
        let gone = if name.starts_with(".part-") { old(&p) } else { is_id(stem) && !keep.contains(stem) && old(&p) };
        if gone && std::fs::remove_file(&p).is_ok() { n += 1; }
    }
    Ok(n)
}

// A package (.revela) put together here: «mimetype», presentation.json (the page's text) and each file [id, its path in
// the zip] from the folder, as they are (stored: pictures and videos are compressed already). Where the person chooses
// (the system's «Save as»). → the path, or None if cancelled. Half-written (an error): removed.
#[tauri::command]
pub async fn save_package(app: AppHandle, name: String, json: String, files: Vec<(String, String)>) -> Result<Option<String>, String> {
    let dir = media_dir(&app)?;
    let Some(path) = ask_where(&app, &unescape(&name))? else { return Ok(None) };
    let written = (|| -> Result<(), String> {
        let e = |x: zip::result::ZipError| x.to_string();
        let io = |x: std::io::Error| x.to_string();
        let mut w = zip::ZipWriter::new(std::fs::File::create(&path).map_err(io)?);
        let stored = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
        w.start_file("mimetype", stored).map_err(e)?;
        w.write_all(b"application/vnd.revela+zip").map_err(io)?;
        w.start_file("presentation.json", stored).map_err(e)?;
        w.write_all(json.as_bytes()).map_err(io)?;
        for (id, at) in &files {
            if !at.starts_with("files/") || at.contains("..") || at.contains('\\') { continue; }
            let Some(src) = find(&dir, id) else { continue };
            let len = std::fs::metadata(&src).map(|m| m.len()).unwrap_or(0);
            w.start_file(at.as_str(), stored.large_file(len >= 0xFFFF_FFFF)).map_err(e)?;
            std::io::copy(&mut std::fs::File::open(&src).map_err(io)?, &mut w).map_err(io)?;
        }
        let mut f = w.finish().map_err(e)?;
        f.flush().map_err(io)?;
        let _ = f.sync_all();
        Ok(())
    })();
    if let Err(x) = written { let _ = std::fs::remove_file(&path); return Err(x); }
    Ok(Some(path.to_string_lossy().into_owned()))
}
