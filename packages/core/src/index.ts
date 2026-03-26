import type { Component } from 'vue';
import type { Router } from 'vue-router';
import type { InjectionKey, Ref } from 'vue';
import { inject } from 'vue';

// Route name constants to avoid magic strings
export const ROUTE_NAMES = {
  SEARCH: 'search',
} as const;

export type RouteName = typeof ROUTE_NAMES[keyof typeof ROUTE_NAMES];

export function getPanelRouteName(pluginId: string): string {
  return pluginId;
}

export interface ActionContext {
  router: Router;
}

export interface PanelContext {
  query: Ref<string>;
  files: Ref<FileItem[]>;
  clearQuery: () => void;
}

export const panelContext = Symbol('panelContext') as InjectionKey<PanelContext>;

export function usePanelContext(): PanelContext {
  const ctx = inject(panelContext);
  if (!ctx) {
    throw new Error('PanelContext not provided');
  }
  return ctx;
}

export type ActionHandler = (data: unknown) => void | Promise<void>;

export type PluginActions = Record<string, ActionHandler>;

export interface SearchResultItem {
  iconUrl?: string;
  title: string;
  desc?: string;
  /**
   * Relevance score for ranking search results.
   * Higher scores appear higher in results.
   * - 1000: Exact match (title equals query)
   * - 900: Prefix match (title starts with query)
   * - 800: Contains match (title includes query)
   * - 700: Fallback score (default when not specified)
   *
   * If not provided, PluginRegistry will calculate a default score
   * based on query/title fuzzy matching.
   */
  score?: number;
  pluginId?: string;
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

  abstract registerAction(ctx: ActionContext): PluginActions;

  /**
   * Returns the panel component loader for this plugin.
   * Used for dynamic route registration.
   * Override this to provide a panel component.
   */
  getPanelComponentLoader?(): () => Promise<Component>;

  /**
   * Called when the plugin is registered and the app is ready.
   * Override this to start background tasks or initialize resources.
   */
  onMount?(): void | Promise<void>;

  /**
   * Called when the app is shutting down or the plugin is being unloaded.
   * Override this to stop background tasks and clean up resources.
   */
  onUnmount?(): void | Promise<void>;

  getPublicUrl(filePath: string): string {
    const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const path = `/packages/${this.pluginId}/${normalizedPath}`;
    return `${window.location.protocol}//${window.location.host}${path}`;
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
