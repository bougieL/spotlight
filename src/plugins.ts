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

/**
 * Registers all built-in plugins with the plugin registry.
 * This function should be called once during application initialization.
 */
export function registerAllPlugins(): void {
  pluginRegistry.register(appSearchPlugin);
  pluginRegistry.register(chromeBookmarksPlugin);
  pluginRegistry.register(calculatorPlugin);
  pluginRegistry.register(notesPlugin);
  pluginRegistry.register(calendarPlugin);
  pluginRegistry.register(settingsPlugin);
  pluginRegistry.register(shortcutsPlugin);
  pluginRegistry.register(clipboardPlugin);
  pluginRegistry.register(recentPlugin);
  pluginRegistry.register(qrcodePlugin);
  pluginRegistry.register(jsonPlugin);
  pluginRegistry.register(aiChatPlugin);
  pluginRegistry.register(colorPickerPlugin);
  pluginRegistry.register(colorPalettePlugin);
}

// Re-export plugin instances for direct access
export { recentPlugin } from "@spotlight/recent-plugin";
