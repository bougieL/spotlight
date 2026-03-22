import { invoke, convertFileSrc } from '@tauri-apps/api/core';

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
  getAppIcon: (path: string) => Promise<string | null>;
  launchApp: (path: string) => Promise<void>;
  getPluginStorageDir: (pluginName: string) => Promise<string>;
  convertFileSrc: typeof convertFileSrc;
}

export const tauriApi: TauriApi = {
  resizeWindow: (height: number) => invoke('resize_window', { height }),

  saveTempImage: (dataUrl: string) => invoke<string>('save_temp_image', { dataUrl }),

  getClipboardFilePaths: () => invoke<string[]>('get_clipboard_file_paths'),

  getInstalledApplications: () => invoke<AppInfo[]>('get_installed_applications'),

  getAppIcon: (path: string) => invoke<string | null>('get_app_icon', { path }),

  launchApp: (path: string) => invoke('launch_app', { path }),

  getPluginStorageDir: (pluginName: string) => invoke<string>('get_plugin_storage_dir', { plugin_name: pluginName }),

  convertFileSrc,
};
