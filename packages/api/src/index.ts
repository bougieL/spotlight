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
  getInstalledApplications: () => Promise<AppInfo[]>;
  launchApp: (path: string) => Promise<void>;
  convertFileSrc: typeof convertFileSrc;
}

export const tauriApi: TauriApi = {
  resizeWindow: (height: number) => invoke('resize_window', { height }),

  saveTempImage: (dataUrl: string) => invoke<string>('save_temp_image', { dataUrl }),

  getClipboardFilePaths: () => invoke<string[]>('get_clipboard_file_paths'),

  getInstalledApplications: () => invoke<AppInfo[]>('get_installed_applications'),

  launchApp: (path: string) => invoke('launch_app', { path }),

  convertFileSrc,
};
