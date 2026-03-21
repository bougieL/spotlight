import { invoke } from '@tauri-apps/api/core';

export async function saveTempImage(dataUrl: string): Promise<string> {
  // In mock mode, just return the data URL as-is for testing
  return dataUrl;
}

export async function invokeCommand(command: string, args?: Record<string, unknown>) {
  switch (command) {
    case 'save_temp_image':
      return saveTempImage(args?.data_url as string);
    default:
      return invoke(command, args);
  }
}
