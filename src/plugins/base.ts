import type { Component } from 'vue';

export interface SearchResultItem {
  icon: Component;
  title: string;
  desc?: string;
  action: () => void;
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
  abstract name: string;
  abstract version: string;
  description?: string;
  author?: string;

  abstract search(_params: SearchParams): Promise<SearchResultItem[]>;

  abstract render(_params: RenderParams): Promise<Component | null>;
}
