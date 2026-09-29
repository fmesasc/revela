// Revela as a desktop application: a window with the same web app inside
// (bundled, so the editor opens without the website).
//
// Updates: on start it looks for a newer version in the GitHub releases
// (latest.json), and if there is one it asks; the installer is downloaded,
// its signature checked against the public key in tauri.conf.json, installed
// and the app restarted. Without internet it simply opens as it is.
// Linux .deb/.rpm installs can't replace themselves (only the AppImage can):
// there it offers the download page instead.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

const RELEASES: &str = "https://github.com/fmesasc/revela/releases/latest";

async fn check_for_update(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    let Some(update) = app.updater()?.check().await? else { return Ok(()) };
    let version = update.version.clone();
    let handle = app.clone();
    let installable = !cfg!(target_os = "linux") || std::env::var_os("APPIMAGE").is_some();
    if !installable {
        app.dialog()
            .message(format!(
                "Hay una versión nueva de Revela ({version}). ¿Abrir la página de descarga? \
                 (El paquete .deb o .rpm se actualiza instalando el nuevo; el AppImage se actualiza solo.)"
            ))
            .title("Actualización disponible")
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancel)
            .show(move |accepted| {
                if accepted {
                    let _ = handle.opener().open_url(RELEASES, None::<&str>);
                }
            });
        return Ok(());
    }
    app.dialog()
        .message(format!(
            "Hay una versión nueva de Revela ({version}). ¿Actualizar ahora? Se reiniciará en unos segundos."
        ))
        .title("Actualización disponible")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancel)
        .show(move |accepted| {
            if !accepted {
                return;
            }
            tauri::async_runtime::spawn(async move {
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(()) => handle.restart(),
                    Err(e) => {
                        handle
                            .dialog()
                            .message(format!("No se pudo actualizar: {e}"))
                            .kind(MessageDialogKind::Error)
                            .show(|_| {});
                    }
                }
            });
        });
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = check_for_update(handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("no se pudo iniciar Revela");
}
