import { invoke } from '@tauri-apps/api/core';

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

export async function saveTempImage(dataUrl: string): Promise<string> {
  // In mock mode, just return the data URL as-is for testing
  return dataUrl;
}

export async function getClipboardFilePaths(): Promise<string[]> {
  // In mock mode, return empty array
  return [];
}

export async function getClipboardText(): Promise<string> {
  // In mock mode, return empty string
  return '';
}

export async function getClipboardImage(): Promise<string> {
  // In mock mode, return empty string
  return '';
}

export async function setClipboardText(_text: string): Promise<void> {
  // In mock mode, do nothing
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

export async function getChromeBookmarks(): Promise<ChromeBookmark[]> {
  // In mock mode, return sample bookmarks for testing
  return [
    { id: '1', name: 'Google', url: 'https://www.google.com', profile: 'Default', folder_path: ['Bookmarks Bar'] },
    { id: '2', name: 'GitHub', url: 'https://github.com', profile: 'Default', folder_path: ['Bookmarks Bar'] },
    { id: '3', name: 'Vue.js', url: 'https://vuejs.org', profile: 'Default', folder_path: ['Bookmarks Bar', 'JavaScript'] },
    { id: '4', name: 'Rust Programming Language', url: 'https://rust-lang.org', profile: 'Default', folder_path: ['Bookmarks Bar', 'Programming'] },
  ];
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIChatRequest {
  endpoint_type: 'openai' | 'anthropic';
  api_url: string;
  api_key: string;
  messages: AIChatMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AIChatResponse {
  content: string;
  usage?: Record<string, number>;
}

const MOCK_SETTINGS_PREFIX = 'mock_plugin_settings_';

export async function invokeCommand(command: string, args?: Record<string, unknown>) {
  switch (command) {
    case 'save_temp_image':
      return saveTempImage(args?.data_url as string);
    case 'get_clipboard_file_paths':
      return getClipboardFilePaths();
    case 'get_clipboard_text':
      return getClipboardText();
    case 'get_clipboard_image':
      return getClipboardImage();
    case 'set_clipboard_text':
      return setClipboardText(args?.text as string);
    case 'get_installed_applications':
      return getInstalledApplications();
    case 'launch_app':
      console.log('Mock launch_app:', args?.path);
      return Promise.resolve();
    case 'get_chrome_bookmarks':
      return getChromeBookmarks();
    case 'ai_chat':
      return aiChatMock(args?.request as AIChatRequest);
    case 'read_plugin_settings':
      return localStorage.getItem(`${MOCK_SETTINGS_PREFIX}${args?.pluginName}`) || '';
    case 'write_plugin_settings':
      localStorage.setItem(`${MOCK_SETTINGS_PREFIX}${args?.pluginName}`, args?.settings as string);
      return Promise.resolve();
    default:
      return invoke(command, args);
  }
}

async function aiChatMock(request: AIChatRequest): Promise<AIChatResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const lastMessage = request.messages[request.messages.length - 1];
  const userContent = lastMessage?.content || '';

  // Return a mock response
  return {
    content: `[Mock AI Response] You said: "${userContent.substring(0, 50)}${userContent.length > 50 ? '...' : ''}". This is a mock response from the AI chat plugin.`,
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  };
}
