// Revela as a desktop application: a window with the same web app inside
// (bundled, so the editor opens without the website).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar Revela");
}
