<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { SearchInput } from "@spotlight/input";
import { pluginRegistry, registerAllPlugins, recentPlugin } from "./plugins";
import { provideI18n, setLocale } from "@spotlight/i18n";
import { settingsPlugin, applyTheme } from "@spotlight/settings-plugin";
import { tauriApi, on, type UnlistenFn } from "@spotlight/api";
import type { FileItem } from "@spotlight/input";
import type { SearchResultItem, PanelContext } from "@spotlight/core";
import { panelContext, ROUTE_NAMES } from "@spotlight/core";
import logger from '@spotlight/logger';

provideI18n();

const router = useRouter();
const route = useRoute();

registerAllPlugins();

const query = ref('');
const files = ref<FileItem[]>([]);
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null);

const isPanelMode = computed(() => route.path.startsWith('/panel'));
const activePluginName = computed(() => {
  const match = route.path.match(/^\/panel\/(.+)$/);
  if (!match) return undefined;
  const plugin = pluginRegistry.getPlugin(match[1]);
  return plugin?.name;
});

const clearQuery = () => {
  query.value = '';
};

provide(panelContext, {
  query,
  files,
  clearQuery,
} as PanelContext);

const handleSelect = async (item: SearchResultItem) => {
  logger.info(`[App] handleSelect called for: ${item.title}, pluginId: ${item.pluginId}, actionId: ${item.actionId}`);

  if (item.pluginId && item.actionId !== undefined) {
    logger.info(`[App] Recording selection for recent: ${item.title}`);
    await recentPlugin.recordSelection({
      item: {
        title: item.title,
        desc: item.desc,
        iconUrl: item.iconUrl,
      },
      pluginId: item.pluginId,
      actionId: item.actionId,
      actionData: item.actionData,
    });

    logger.info(`[App] Calling executeAction for: ${item.title}`);
    await pluginRegistry.executeAction({
      pluginId: item.pluginId,
      actionId: item.actionId,
      data: item.actionData,
    });
    logger.info(`[App] executeAction completed for: ${item.title}`);
  }
};

const handleClosePanel = () => {
  router.push({ name: ROUTE_NAMES.SEARCH });
};

const handleOpenSettings = () => {
  router.push({ name: 'settings-plugin' });
};

let resizeObserver: ResizeObserver | null = null;
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeight: number | null = null;
let unlistenWindowFocus: UnlistenFn | null = null;

const performResize = () => {
  const height = document.documentElement.offsetHeight;
  if (lastHeight === height) return;
  lastHeight = height;
  tauriApi.resizeWindow(height).catch(() => {
    lastHeight = null;
  });
};

onMounted(async () => {
  // Apply saved settings
  const savedTheme = await settingsPlugin.getThemeMode();
  const savedLanguage = await settingsPlugin.getLanguage();
  applyTheme(savedTheme);
  setLocale(savedLanguage);

  // Load disabled plugins (skip lifecycle events during init, will be handled by mount below)
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

  resizeObserver = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(performResize, 16);
  });
  resizeObserver.observe(document.documentElement);
  performResize();

  // Focus input when window is shown
  unlistenWindowFocus = await on.windowFocus(() => {
    searchInputRef.value?.focus();
  });
});

onUnmounted(async () => {
  resizeObserver?.disconnect();
  if (resizeTimer) clearTimeout(resizeTimer);
  unlistenWindowFocus?.();

  // Unmount all plugins (stop background tasks)
  const plugins = pluginRegistry.getPlugins();
  await Promise.all(plugins.map((plugin) => plugin.onUnmount?.()));
});
</script>

<template>
  <main class="spotlight-container">
    <SearchInput
      ref="searchInputRef"
      v-model="query"
      v-model:files="files"
      :is-panel-mode="isPanelMode"
      :plugin-name="activePluginName"
      @back="handleClosePanel"
      @open-settings="handleOpenSettings"
    />
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" @select="handleSelect" />
      </KeepAlive>
    </RouterView>
  </main>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 800px;
  height: fit-content;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: transparent;
}

body {
  background-color: transparent;
}
</style>

<style scoped>
#app {
  width: 100%;
  height: fit-content;
}

.spotlight-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 800px;
  margin: 0 auto;
  padding: 0;
  border: none;
  background-color: transparent;
}
</style>
