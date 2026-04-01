import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export { createPluginStorage, type PluginStorage } from './storage';
export { listen, emit, on, EventName, type UnlistenFn, type EventNameType } from './event';
export { setupTray, disposeTray, registerTrayItem, unRegisterTrayItem, getTrayInstance, type TrayOptions, type TrayItem } from './tray';

export interface AppInfo {
  name: string;
  path: string;
  icon_data: string | null;
}

export interface ChromeBookmark {
  id: string;
  name: string;
  url: string;
  profile: string;
  folder_path: string[];
}

export interface TauriApi {
  hideWindow: () => Promise<void>;
  resizeWindow: (height: number) => Promise<void>;
  createOverlayWindow: (url: string, label: string) => Promise<void>;
  closeOverlayWindow: (label: string) => Promise<void>;
  detachWindow: (options: { url: string; label: string; title: string }) => Promise<void>;
  exitApp: () => Promise<void>;
  saveTempImage: (dataUrl: string) => Promise<string>;
  saveImageFile: (filePath: string, dataUrl: string) => Promise<void>;
  getClipboardFilePaths: () => Promise<string[]>;
  getClipboardText: () => Promise<string>;
  getClipboardImage: () => Promise<string>;
  setClipboardText: (text: string) => Promise<void>;
  setClipboardImage: (dataUrl: string) => Promise<void>;
  setClipboardFiles: (files: string[]) => Promise<void>;
  startClipboardMonitor: () => Promise<void>;
  stopClipboardMonitor: () => Promise<void>;
  getInstalledApplications: () => Promise<AppInfo[]>;
  getAppIcon: (path: string) => Promise<string | null>;
  launchApp: (path: string) => Promise<void>;
  registerGlobalShortcut: (shortcut: string) => Promise<void>;
  getGlobalShortcut: () => Promise<string>;
  getChromeBookmarks: () => Promise<ChromeBookmark[]>;
  executeShellCommand: (command: string) => Promise<void>;
  searchWithRg: (query: string, path?: string, options?: SearchOptions) => Promise<RipgrepResult[]>;
  searchFilesWithRg: (query: string, path?: string, caseSensitive?: boolean) => Promise<FileResult[]>;
  getAutostartEnabled: () => Promise<boolean>;
  setAutostartEnabled: (enabled: boolean) => Promise<void>;
  convertFileSrc: typeof convertFileSrc;
}

export interface ScreenCapture {
  dataUrl: string;
  width: number;
  height: number;
}

export interface RipgrepResult {
  file: string;
  line: number;
  content: string;
}

export interface FileResult {
  name: string;
  path: string;
}

export interface SearchOptions {
  case_sensitive: boolean;
  whole_word: boolean;
  regex: boolean;
  file_type?: string;
}

export interface WindowInfo {
  hwnd: number;
  title: string;
  processName: string;
  isVisible: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  isAlwaysOnTop: boolean;
}

export const captureFullScreen = (): Promise<ScreenCapture> =>
  invoke<ScreenCapture>('capture_full_screen');

export const searchWithRg = (
  query: string,
  path?: string,
  options?: SearchOptions
): Promise<RipgrepResult[]> =>
  invoke<RipgrepResult[]>('search_with_rg', { query, path, options });

export const searchFilesWithRg = (
  query: string,
  path?: string,
  caseSensitive?: boolean
): Promise<FileResult[]> =>
  invoke<FileResult[]>('search_files_with_rg', { query, path, caseSensitive });

export const executeShellCommand = (command: string): Promise<void> =>
  invoke<void>('execute_shell_command', { command });

export const getUserHome = (): Promise<string> =>
  invoke<string>('get_user_home');

export const exitApp = (): Promise<void> => invoke('exit_app');

export const saveImageFile = (filePath: string, dataUrl: string): Promise<void> =>
  invoke<void>('save_image_file', { filePath, dataUrl });

export const compressPngLossless = (filePath: string): Promise<number[]> =>
  invoke<number[]>('compress_png_lossless', { filePath });

export const globImageFiles = (dirPath: string): Promise<string[]> =>
  invoke<string[]>('glob_image_files', { dirPath });

export const listWindows = (): Promise<WindowInfo[]> =>
  invoke<WindowInfo[]>('list_windows');

export const minimizeWindow = (hwnd: number): Promise<void> =>
  invoke<void>('minimize_window', { hwnd });

export const maximizeWindow = (hwnd: number): Promise<void> =>
  invoke<void>('maximize_window', { hwnd });

export const restoreWindow = (hwnd: number): Promise<void> =>
  invoke<void>('restore_window', { hwnd });

export const closeWindow = (hwnd: number): Promise<void> =>
  invoke<void>('close_window', { hwnd });

export const setWindowAlwaysOnTop = (hwnd: number, onTop: boolean): Promise<void> =>
  invoke<void>('set_window_always_on_top', { hwnd, onTop });

export const focusWindow = (hwnd: number): Promise<void> =>
  invoke<void>('focus_window', { hwnd });

export async function openDirectoryDialog(defaultPath?: string): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath,
  });
  return selected as string | null;
}

export const tauriApi: TauriApi = {
  hideWindow: () => invoke('hide_window'),

  resizeWindow: (height: number) => invoke('resize_window', { height }),

  createOverlayWindow: (url: string, label: string) =>
    invoke('create_overlay_window', { url, label }),

  closeOverlayWindow: (label: string) => invoke('close_overlay_window', { label }),

  detachWindow: ({ url, label, title }) => invoke('detach_window', { url, label, title }),

  exitApp: () => invoke('exit_app'),

  saveTempImage: (dataUrl: string) => invoke<string>('save_temp_image', { dataUrl }),

  saveImageFile: (filePath: string, dataUrl: string) =>
    invoke<void>('save_image_file', { filePath, dataUrl }),

  getClipboardFilePaths: () => invoke<string[]>('get_clipboard_file_paths'),

  getClipboardText: () => invoke<string>('get_clipboard_text'),

  getClipboardImage: () => invoke<string>('get_clipboard_image'),

  setClipboardText: (text: string) => invoke<void>('set_clipboard_text', { text }),

  setClipboardImage: (dataUrl: string) => invoke<void>('set_clipboard_image', { dataUrl }),

  setClipboardFiles: (files: string[]) => invoke<void>('set_clipboard_files', { files }),

  startClipboardMonitor: () => invoke<void>('start_clipboard_monitor'),

  stopClipboardMonitor: () => invoke<void>('stop_clipboard_monitor'),

  getInstalledApplications: () => invoke<AppInfo[]>('get_installed_applications'),

  getAppIcon: (path: string) => invoke<string | null>('get_app_icon', { path }),

  launchApp: (path: string) => invoke('launch_app', { path }),

  registerGlobalShortcut: (shortcut: string) => invoke('register_global_shortcut', { shortcut }),

  getGlobalShortcut: () => invoke<string>('get_global_shortcut'),

  getChromeBookmarks: () => invoke<ChromeBookmark[]>('get_chrome_bookmarks'),

  executeShellCommand: (command: string) => invoke<void>('execute_shell_command', { command }),

  searchWithRg: (query: string, path?: string, options?: SearchOptions) =>
    invoke<RipgrepResult[]>('search_with_rg', { query, path, options }),

  searchFilesWithRg: (query: string, path?: string, caseSensitive?: boolean) =>
    invoke<FileResult[]>('search_files_with_rg', { query, path, caseSensitive }),

  getAutostartEnabled: () => invoke<boolean>('get_autostart_enabled'),

  setAutostartEnabled: (enabled: boolean) => invoke<void>('set_autostart_enabled', { enabled }),

  convertFileSrc,
};
