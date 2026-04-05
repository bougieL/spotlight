import type { RouteRecordRaw } from 'vue-router';
import type { Plugin } from '@spotlight/core';
import { pluginRegistry } from "@spotlight/plugin-registry";
import logger from '@spotlight/logger';

// Re-export for direct access
export { pluginRegistry };

/**
 * Dynamic plugin discovery using Vite's import.meta.glob.
 * Automatically finds all plugin packages and imports their default exports.
 *
 * Each plugin package must export its plugin instance as `export default`
 * in addition to the named export (for backward compatibility).
 *
 * The glob pattern matches all index.ts files inside packages/*-plugin/src/
 */
const pluginModules = import.meta.glob<{ default: Plugin }>(
  '../packages/*-plugin/src/index.ts',
  { eager: true }
);

/**
 * Collect all plugin instances from discovered modules.
 * Filters out any modules that don't export a valid BasePlugin.
 */
const allPlugins: Plugin[] = [];

for (const [path, mod] of Object.entries(pluginModules)) {
  const plugin = mod.default;
  if (plugin && typeof plugin === 'object' && 'pluginId' in plugin && 'search' in plugin) {
    allPlugins.push(plugin as Plugin);
    logger.info(`[Plugins] Auto-discovered: ${plugin.pluginId}`);
  } else {
    logger.warn(`[Plugins] Module ${path} does not export a valid plugin`);
  }
}

/**
 * Get all panel routes from plugins with getPanelRoutes.
 * Used for static route registration to ensure routes are available on initial load.
 */
export function getPanelRoutes(): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  for (const plugin of allPlugins) {
    if (plugin.getPanelRoutes) {
      const pluginRoutes = plugin.getPanelRoutes();
      for (const route of pluginRoutes) {
        const path = route.name === 'main' || route.name === plugin.pluginId
          ? `/panel/${plugin.pluginId}`
          : `/panel/${plugin.pluginId}/${route.name}`;
        routes.push({
          path,
          name: `${plugin.pluginId}:${route.name}`,
          component: route.componentLoader,
        });
      }
    }
  }

  return routes;
}

/**
 * Registers all built-in plugins with the plugin registry.
 * This function should be called once during application initialization.
 */
export function registerAllPlugins(): void {
  for (const plugin of allPlugins) {
    pluginRegistry.register(plugin);
  }
}

/**
 * Get a specific plugin by its ID.
 * Returns undefined if not found.
 */
export function getPluginById(pluginId: string): Plugin | undefined {
  return allPlugins.find(p => p.pluginId === pluginId);
}

/**
 * Get all discovered plugin IDs (useful for debugging).
 */
export function getDiscoveredPluginIds(): string[] {
  return allPlugins.map(p => p.pluginId);
}
