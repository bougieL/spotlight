import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export interface AppInfo {
  name: string;
  path: string;
  icon_data: string | null;
}

export const tauriApi = {
  resizeWindow: (height: number) => invoke('resize_window', { height }),

  saveTempImage: (dataUrl: string) => invoke<string>('save_temp_image', { dataUrl }),

  getClipboardFilePaths: () => invoke<string[]>('get_clipboard_file_paths'),

  getInstalledApplications: () => invoke<AppInfo[]>('get_installed_applications'),

  convertFileSrc,
};
