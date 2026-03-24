import type { Component } from 'vue';

export interface SearchResultItemContext {
  setPanel: (component: Component, pluginName?: string) => void;
  clearQuery: () => void;
}

export interface SearchResultItem {
  icon?: Component;
  iconUrl?: string;
  iconComponentName?: string;
  title: string;
  desc?: string;
  score?: number;
  action: (ctx: SearchResultItemContext) => void | Promise<void>;
  sourcePlugin?: string;
  actionId: string;
  actionData?: unknown;
}

export interface SearchParams {
  query: string;
  files?: FileItem[];
  limit?: number;
}

export interface FileItem {
  id: string;
  name: string;
  src: string;
  type: 'image' | 'file';
}

export interface RenderParams {
  query: string;
}

export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
}

export abstract class BasePlugin implements PluginMetadata {
  abstract get name(): string;
  abstract pluginId: string;
  abstract version: string;
  abstract get description(): string | undefined;
  author?: string;

  abstract search(_params: SearchParams): Promise<SearchResultItem[]>;

  abstract render(_params: RenderParams): Promise<Component | null>;

  getPublicUrl(filePath: string): string {
    const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    return `/plugins/${this.pluginId}/${normalizedPath}`;
  }
}

/**
 * Get the URL path for a plugin public file.
 * @param pluginId - The plugin directory name (e.g. "color-picker-plugin")
 * @param filePath - The file path within the plugin's public directory
 * @returns The URL path for accessing the file (e.g. "/plugins/color-picker-plugin/icon.svg")
 */
export function getPluginPublicUrl(pluginId: string, filePath: string): string {
  const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  return `/plugins/${pluginId}/${normalizedPath}`;
}
