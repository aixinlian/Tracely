import { invoke } from "@tauri-apps/api/core";

/**
 * Get the application log directory path
 */
export async function getLogDir(): Promise<string> {
  return invoke<string>("get_log_dir");
}

/**
 * Open the log directory in the system file manager
 */
export async function openLogDir(): Promise<void> {
  const logDir = await getLogDir();
  await invoke("open_data_dir", { path: logDir });
}
