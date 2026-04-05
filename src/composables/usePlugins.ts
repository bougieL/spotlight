import { onMounted, onUnmounted, type Ref } from 'vue';
import { pluginRegistry } from '../plugins';
import settingsPlugin from '@spotlight/settings-plugin';
import logger from '@spotlight/logger';

export function usePlugins(isDetached: Ref<boolean>) {
  onMounted(async () => {
    if (isDetached.value) return;

    // Load disabled plugins
    const disabledPlugins = await settingsPlugin.getDisabledPlugins();
    await pluginRegistry.setDisabledPlugins(disabledPlugins, true);

    // Register global hotkey on startup (non-blocking)
    try {
      await settingsPlugin.registerHotkey();
    } catch (error) {
      logger.warn('Failed to register global shortcut:', error);
    }

    // Mount all enabled plugins (start background tasks)
    const plugins = pluginRegistry.getPlugins();
    const enabledPlugins = plugins.filter((p) => !disabledPlugins.includes(p.pluginId));
    await Promise.all(enabledPlugins.map((plugin) => plugin.onMount?.()));
  });

  onUnmounted(async () => {
    if (isDetached.value) return;

    // Unmount all plugins (stop background tasks)
    const plugins = pluginRegistry.getPlugins();
    await Promise.all(plugins.map((plugin) => plugin.onUnmount?.()));
  });
}
