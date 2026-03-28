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
  getAutostartEnabled: () => Promise<boolean>;
  setAutostartEnabled: (enabled: boolean) => Promise<void>;
  convertFileSrc: typeof convertFileSrc;
}

export interface ScreenCapture {
  dataUrl: string;
  width: number;
  height: number;
}

export const captureFullScreen = (): Promise<ScreenCapture> =>
  invoke<ScreenCapture>('capture_full_screen');

export const executeShellCommand = (command: string): Promise<void> =>
  invoke<void>('execute_shell_command', { command });

export const exitApp = (): Promise<void> => invoke('exit_app');

export const tauriApi: TauriApi = {
  hideWindow: () => invoke('hide_window'),

  resizeWindow: (height: number) => invoke('resize_window', { height }),

  createOverlayWindow: (url: string, label: string) =>
    invoke('create_overlay_window', { url, label }),

  closeOverlayWindow: (label: string) => invoke('close_overlay_window', { label }),

  detachWindow: ({ url, label, title }) => invoke('detach_window', { url, label, title }),

  exitApp: () => invoke('exit_app'),

  saveTempImage: (dataUrl: string) => invoke<string>('save_temp_image', { dataUrl }),

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

  getAutostartEnabled: () => invoke<boolean>('get_autostart_enabled'),

  setAutostartEnabled: (enabled: boolean) => invoke<void>('set_autostart_enabled', { enabled }),

  convertFileSrc,
};
