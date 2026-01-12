#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let handle = app.handle();

            // App menu
            let about = PredefinedMenuItem::about(handle, Some("About TavernMaster"), None)?;
            let quit = PredefinedMenuItem::quit(handle, Some("Quit TavernMaster"))?;
            let app_menu = Submenu::with_items(
                handle,
                "TavernMaster",
                true,
                &[&about, &PredefinedMenuItem::separator(handle)?, &quit],
            )?;

            // File menu
            let new_campaign = MenuItem::with_id(handle, "new_campaign", "New Campaign", true, Some("CmdOrCtrl+N"))?;
            let file_menu = Submenu::with_items(handle, "File", true, &[&new_campaign])?;

            // Edit menu
            let undo_turn = MenuItem::with_id(handle, "undo_turn", "Undo Turn", true, Some("CmdOrCtrl+Z"))?;
            let branch = MenuItem::with_id(handle, "branch", "Branch Campaign", true, Some("CmdOrCtrl+Shift+B"))?;
            let edit_menu = Submenu::with_items(
                handle,
                "Edit",
                true,
                &[
                    &undo_turn,
                    &PredefinedMenuItem::separator(handle)?,
                    &branch,
                ],
            )?;

            // View menu
            let play = MenuItem::with_id(handle, "nav_play", "Play", true, Some("CmdOrCtrl+1"))?;
            let library = MenuItem::with_id(handle, "nav_library", "Campaign Library", true, Some("CmdOrCtrl+2"))?;
            let dev_mode = MenuItem::with_id(handle, "toggle_dev", "Toggle Developer Mode", true, Some("CmdOrCtrl+Shift+D"))?;
            let view_menu = Submenu::with_items(
                handle,
                "View",
                true,
                &[&play, &library, &PredefinedMenuItem::separator(handle)?, &dev_mode],
            )?;

            // Window menu
            let settings = MenuItem::with_id(handle, "nav_settings", "Settings", true, Some("CmdOrCtrl+,"))?;
            let window_menu = Submenu::with_items(handle, "Window", true, &[&settings])?;

            let menu = Menu::with_items(handle, &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(|app, event| {
                let id = event.id().as_ref();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("menu-event", id);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_secret,
            commands::get_secret,
            commands::delete_secret,
            commands::encrypt_text,
            commands::decrypt_text,
            commands::get_app_data_dir,
            commands::backup_database,
            commands::list_database_backups,
            commands::restore_database,
            commands::vault_status,
            commands::vault_initialize,
            commands::vault_unlock,
            commands::vault_rewrap,
            commands::vault_get_data_key,
            commands::vault_lock
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tavern Master");
}
