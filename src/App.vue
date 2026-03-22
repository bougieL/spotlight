<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { SearchInput } from "@spotlight/input";
import { SearchList, PluginPanel } from "@spotlight/panel";
import { pluginRegistry } from "@spotlight/plugin-registry";
import { provideI18n, setLocale } from "@spotlight/i18n";
import { appSearchPlugin } from "@spotlight/app-search-plugin";
import { calculatorPlugin } from "@spotlight/calculator-plugin";
import { notesPlugin } from "@spotlight/notes-plugin";
import { calendarPlugin } from "@spotlight/calendar-plugin";
import { settingsPlugin, applyTheme } from "@spotlight/settings-plugin";
import { clipboardPlugin } from "@spotlight/clipboard-plugin";
import { recentPlugin } from "@spotlight/recent-plugin";
import { tauriApi, on, type UnlistenFn } from "@spotlight/api";
import type { FileItem } from "@spotlight/input";
import type { SearchResultItem, SearchResultItemContext } from "@spotlight/core";
import type { Component } from 'vue';
import logger from '@spotlight/logger';

provideI18n();

pluginRegistry.register(appSearchPlugin);
pluginRegistry.register(calculatorPlugin);
pluginRegistry.register(notesPlugin);
pluginRegistry.register(calendarPlugin);
pluginRegistry.register(settingsPlugin);
pluginRegistry.register(clipboardPlugin);
pluginRegistry.register(recentPlugin);

const query = ref('');
const files = ref<FileItem[]>([]);
const searchResults = ref<SearchResultItem[]>([]);
const activePanelComponent = ref<Component | null>(null);
const activePluginNameKey = ref<string | null>(null);
const activePanelOnReady = ref<(() => void) | undefined>(undefined);
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null);

const handleSearch = async (searchQuery: string, searchFiles: FileItem[]) => {
  if (!searchQuery.trim()) {
    const results = await recentPlugin.search({ query: searchQuery, files: searchFiles });
    searchResults.value = results;
  } else {
    const results = await pluginRegistry.search({ query: searchQuery, files: searchFiles });
    searchResults.value = results;
  }
};

const handleSelect = async (item: SearchResultItem) => {
  logger.info(`[App] handleSelect called for: ${item.title}, sourcePlugin: ${item.sourcePlugin}, actionId: ${item.actionId}`);
  const ctx: SearchResultItemContext = {
    setPanel: (component: Component, pluginNameKey?: string) => {
      activePanelComponent.value = component;
      activePluginNameKey.value = pluginNameKey ?? null;
      activePanelOnReady.value = () => {
        query.value = '';
      };
    },
    clearQuery: () => {
      query.value = '';
    },
  };

  if (item.sourcePlugin && item.actionId !== undefined) {
    logger.info(`[App] Recording selection for recent: ${item.title}`);
    await recentPlugin.recordSelection({
      item: {
        title: item.title,
        desc: item.desc,
        iconUrl: item.iconUrl,
        iconComponentName: item.iconComponentName,
      },
      sourcePlugin: item.sourcePlugin,
      actionId: item.actionId,
      actionData: item.actionData,
    });
  }

  logger.info(`[App] Calling item.action for: ${item.title}`);
  await item.action(ctx);
  logger.info(`[App] item.action completed for: ${item.title}`);
};

const handleClosePanel = () => {
  activePanelComponent.value = null;
  activePluginNameKey.value = null;
  activePanelOnReady.value = undefined;
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

  // Register global hotkey on startup
  await settingsPlugin.registerHotkey();

  // Initial search with recent items
  const initialResults = await recentPlugin.search({ query: '', files: [] });
  searchResults.value = initialResults;

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

onUnmounted(() => {
  resizeObserver?.disconnect();
  if (resizeTimer) clearTimeout(resizeTimer);
  unlistenWindowFocus?.();
});
</script>

<template>
  <main class="spotlight-container">
    <SearchInput
      ref="searchInputRef"
      v-model="query"
      v-model:files="files"
      :is-panel-mode="!!activePanelComponent"
      :plugin-name-key="activePluginNameKey"
      @search="handleSearch"
      @back="handleClosePanel"
    />
    <SearchList
      v-if="!activePanelComponent"
      :query="query"
      :files="files"
      :search-results="searchResults"
      @select="handleSelect"
    />
    <PluginPanel
      v-else
      :component="activePanelComponent"
      :query="query"
      :on-ready="activePanelOnReady"
      @close="handleClosePanel"
    />
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
