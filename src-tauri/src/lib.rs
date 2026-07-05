mod ai;
mod git;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Ensure a directory exists (creates it if missing) then reveal it in the
/// OS file manager via the opener plugin.
#[tauri::command]
fn open_data_dir(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    // Create the directory (and any missing parents) before trying to open it.
    std::fs::create_dir_all(&path).map_err(|e| format!("创建目录失败：{e}"))?;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| format!("打开目录失败：{e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init());

    // Autostart is a desktop-only capability.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        None,
    ));

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            git::list_branches,
            git::get_repo_activity,
            git::get_git_user_name,
            git::scan_git_repos,
            ai::chat_completion,
            ai::list_models,
            open_data_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
