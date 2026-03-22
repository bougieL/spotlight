import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export { createPluginStorage, type PluginStorage } from './storage';

export interface AppInfo {
  name: string;
  path: string;
  icon_data: string | null;
}

export interface TauriApi {
  resizeWindow: (height: number) => Promise<void>;
  saveTempImage: (dataUrl: string) => Promise<string>;
  getClipboardFilePaths: () => Promise<string[]>;
  getClipboardText: () => Promise<string>;
  getClipboardImage: () => Promise<string>;
  setClipboardText: (text: string) => Promise<void>;
  getInstalledApplications: () => Promise<AppInfo[]>;
  getAppIcon: (path: string) => Promise<string | null>;
  launchApp: (path: string) => Promise<void>;
  registerGlobalShortcut: (shortcut: string) => Promise<void>;
  getGlobalShortcut: () => Promise<string>;
  convertFileSrc: typeof convertFileSrc;
}

export const tauriApi: TauriApi = {
  resizeWindow: (height: number) => invoke('resize_window', { height }),

  saveTempImage: (dataUrl: string) => invoke<string>('save_temp_image', { dataUrl }),

  getClipboardFilePaths: () => invoke<string[]>('get_clipboard_file_paths'),

  getClipboardText: () => invoke<string>('get_clipboard_text'),

  getClipboardImage: () => invoke<string>('get_clipboard_image'),

  setClipboardText: (text: string) => invoke<void>('set_clipboard_text', { text }),

  getInstalledApplications: () => invoke<AppInfo[]>('get_installed_applications'),

  getAppIcon: (path: string) => invoke<string | null>('get_app_icon', { path }),

  launchApp: (path: string) => invoke('launch_app', { path }),

  registerGlobalShortcut: (shortcut: string) => invoke('register_global_shortcut', { shortcut }),

  getGlobalShortcut: () => invoke<string>('get_global_shortcut'),

  convertFileSrc,
};
