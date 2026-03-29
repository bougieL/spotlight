import type { RouteRecordRaw } from 'vue-router';
import { pluginRegistry } from "@spotlight/plugin-registry";

// Re-export for direct access
export { pluginRegistry };
import { appSearchPlugin } from "@spotlight/app-search-plugin";
import { chromeBookmarksPlugin } from "@spotlight/chrome-bookmarks-plugin";
import { calculatorPlugin } from "@spotlight/calculator-plugin";
import { notesPlugin } from "@spotlight/notes-plugin";
import { calendarPlugin } from "@spotlight/calendar-plugin";
import { settingsPlugin } from "@spotlight/settings-plugin";
import { shortcutsPlugin } from "@spotlight/shortcuts-plugin";
import { clipboardPlugin } from "@spotlight/clipboard-plugin";
import { recentPlugin } from "@spotlight/recent-plugin";
import { qrcodePlugin } from "@spotlight/qrcode-plugin";
import { jsonPlugin } from "@spotlight/json-plugin";
import { aiChatPlugin } from "@spotlight/ai-chat-plugin";
import { colorPickerPlugin } from "@spotlight/color-picker-plugin";
import { colorPalettePlugin } from "@spotlight/color-palette-plugin";
import { screenshotPlugin } from "@spotlight/screenshot-plugin";
import { translationPlugin } from "@spotlight/translation-plugin";
import { fileSearchPlugin } from "@spotlight/file-search-plugin";

const allPlugins = [
  appSearchPlugin,
  chromeBookmarksPlugin,
  calculatorPlugin,
  notesPlugin,
  calendarPlugin,
  settingsPlugin,
  shortcutsPlugin,
  clipboardPlugin,
  recentPlugin,
  qrcodePlugin,
  jsonPlugin,
  aiChatPlugin,
  colorPickerPlugin,
  colorPalettePlugin,
  screenshotPlugin,
  translationPlugin,
  fileSearchPlugin,
];

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

// Re-export plugin instances for direct access
export { recentPlugin } from "@spotlight/recent-plugin";
