import { invoke } from '@tauri-apps/api/core';

export interface AppInfo {
  name: string;
  path: string;
  icon_data: string | null;
}

export async function saveTempImage(dataUrl: string): Promise<string> {
  // In mock mode, just return the data URL as-is for testing
  return dataUrl;
}

export async function getClipboardFilePaths(): Promise<string[]> {
  // In mock mode, return empty array
  return [];
}

export async function getInstalledApplications(): Promise<AppInfo[]> {
  // In mock mode, return sample apps for testing
  return [
    { name: 'Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', icon_data: null },
    { name: 'Firefox', path: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe', icon_data: null },
    { name: 'Notepad', path: 'C:\\Windows\\notepad.exe', icon_data: null },
    { name: 'VS Code', path: 'C:\\Users\\User\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe', icon_data: null },
  ];
}

export async function invokeCommand(command: string, args?: Record<string, unknown>) {
  switch (command) {
    case 'save_temp_image':
      return saveTempImage(args?.data_url as string);
    case 'get_clipboard_file_paths':
      return getClipboardFilePaths();
    case 'get_installed_applications':
      return getInstalledApplications();
    case 'launch_app':
      console.log('Mock launch_app:', args?.path);
      return Promise.resolve();
    default:
      return invoke(command, args);
  }
}
