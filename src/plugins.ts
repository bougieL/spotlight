import type { RouteRecordRaw } from 'vue-router';
import { pluginRegistry } from "@spotlight/plugin-registry";
import { getPanelRouteName } from '@spotlight/core';

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
import { webpagePlugin } from "@spotlight/webpage-plugin";

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
  webpagePlugin,
];

/**
 * Get all panel routes from plugins with getPanelComponentLoader.
 * Used for static route registration to ensure routes are available on initial load.
 */
export function getPanelRoutes(): RouteRecordRaw[] {
  const routes: RouteRecordRaw[] = [];

  for (const plugin of allPlugins) {
    if (plugin.getPanelComponentLoader) {
      const loader = plugin.getPanelComponentLoader();
      if (loader) {
        routes.push({
          path: `/panel/${plugin.pluginId}`,
          name: getPanelRouteName(plugin.pluginId),
          component: loader,
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
