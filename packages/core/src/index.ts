import type { Component } from 'vue';
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

export interface NavigateToPluginOptions {
  route?: string;
  query?: Record<string, string>;
}

export interface ActionContext {
  navigateToPlugin: (pluginId: string, options?: NavigateToPluginOptions) => void;
}

export interface PanelRoute {
  /** Route name, e.g., 'models', 'settings' */
  name: string;
  /** Component loader for this route */
  componentLoader: () => Promise<Component>;
}

export interface PanelContext {
  query: Ref<string>;
  files: Ref<FileItem[]>;
  clearQuery: () => void;
  isDetached: Ref<boolean>;
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
  path: string;
  src: string;
  type: 'image' | 'file';
}

export interface QuickCommand {
  /** Command trigger string without the leading /, e.g., "calc", "translate" */
  trigger: string;
  /** Description shown in the suggestion dropdown */
  description: string;
  /** Optional icon URL */
  iconUrl?: string;
  /** Execute handler, receives the query text after the /command */
  execute: (query: string) => void | Promise<void>;
}

export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  iconUrl: string;
}

/**
 * Plugin interface that all plugins must implement.
 * Each plugin provides search, actions, and optional lifecycle hooks.
 */
export interface Plugin extends PluginMetadata {
  readonly pluginId: string;
  search(params: SearchParams): Promise<SearchResultItem[]>;
  registerAction(ctx: ActionContext): PluginActions;
  getPanelRoutes?(): PanelRoute[];
  onMount?(): void | Promise<void>;
  onUnmount?(): void | Promise<void>;
  registerQuickCommands?(ctx: ActionContext): QuickCommand[];
  getPublicUrl?(filePath: string): string;
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
