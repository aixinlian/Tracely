mod ai;
mod git;

use std::path::PathBuf;
use tauri::Manager;
use tracing::{info, error};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Initialize logging to a file in the app's data directory
fn init_logging(log_dir: PathBuf) {
    // Create logs directory if it doesn't exist
    if let Err(e) = std::fs::create_dir_all(&log_dir) {
        eprintln!("Failed to create log directory: {}", e);
        return;
    }

    // Daily rotating log files
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        log_dir,
        "tracely.log"
    );

    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    // Set up tracing subscriber with file output
    tracing_subscriber::registry()
        .with(
            fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .with_target(true)
                .with_line_number(true)
        )
        .with(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .init();

    info!("Tracely application started");
}

/// Ensure a directory exists (creates it if missing) then reveal it in the
/// OS file manager via the opener plugin.
#[tauri::command]
fn open_data_dir(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    info!("Opening data directory: {}", path);
    // Create the directory (and any missing parents) before trying to open it.
    std::fs::create_dir_all(&path).map_err(|e| {
        error!("Failed to create directory {}: {}", path, e);
        format!("创建目录失败：{e}")
    })?;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| {
            error!("Failed to open directory {}: {}", path, e);
            format!("打开目录失败：{e}")
        })
}

/// Delete all log files in the app's log directory.
///
/// On Windows the log file for the current day is still held open by
/// `tracing-appender`, so `remove_file` will fail with a sharing violation.
/// For any file we can't delete we fall back to truncating it to empty, which
/// clears its contents without needing the handle.
#[tauri::command]
fn clear_logs(app: tauri::AppHandle) -> Result<(), String> {
    let log_dir = app.path().app_log_dir()
        .unwrap_or_else(|_| {
            app.path().app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("logs")
        });

    info!("Clearing log files in: {}", log_dir.display());

    let entries = match std::fs::read_dir(&log_dir) {
        Ok(entries) => entries,
        // Nothing to clear if the directory doesn't exist yet.
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => {
            error!("Failed to read log directory {}: {}", log_dir.display(), e);
            return Err(format!("读取日志目录失败：{e}"));
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        if let Err(remove_err) = std::fs::remove_file(&path) {
            // The active log file is locked (mainly on Windows); truncate instead.
            if let Err(trunc_err) = std::fs::File::create(&path) {
                error!(
                    "Failed to clear log file {}: remove={}, truncate={}",
                    path.display(), remove_err, trunc_err
                );
                return Err(format!("清除日志文件失败：{trunc_err}"));
            }
        }
    }

    info!("Log files cleared");
    Ok(())
}

/// Get the log directory path
#[tauri::command]
fn get_log_dir(app: tauri::AppHandle) -> Result<String, String> {
    let log_dir = app.path().app_log_dir()
        .unwrap_or_else(|_| {
            app.path().app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("logs")
        });

    log_dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "无法获取日志目录路径".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize logging
            let log_dir = app.path().app_log_dir()
                .unwrap_or_else(|_| {
                    app.path().app_data_dir()
                        .unwrap_or_else(|_| PathBuf::from("."))
                        .join("logs")
                });
            init_logging(log_dir);

            info!("Application setup completed");
            Ok(())
        });

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
            open_data_dir,
            get_log_dir,
            clear_logs,
            clear_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
