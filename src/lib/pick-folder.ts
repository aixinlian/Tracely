import { open } from "@tauri-apps/plugin-dialog";

/**
 * Open the native folder picker and return the selected absolute path,
 * or null if the user cancelled.
 */
export async function pickFolder(
  title = "选择本地项目文件夹",
): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });
  // `open` returns string | string[] | null; we asked for a single folder.
  if (typeof selected === "string") return selected;
  return null;
}
