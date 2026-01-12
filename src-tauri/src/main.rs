#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::set_secret,
            commands::get_secret,
            commands::delete_secret,
            commands::encrypt_text,
            commands::decrypt_text,
            commands::get_app_data_dir,
            commands::backup_database,
            commands::list_database_backups,
            commands::restore_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tavern Master");
}
