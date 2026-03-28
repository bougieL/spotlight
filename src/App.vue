<script setup lang="ts">
import { ref, provide, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { SearchInput } from "@spotlight/input";
import { registerAllPlugins, recentPlugin, pluginRegistry } from "./plugins";
import { provideI18n, setLocale, useI18n } from "@spotlight/i18n";
import { settingsPlugin, applyTheme } from "@spotlight/settings-plugin";
import type { FileItem } from "@spotlight/input";
import type { SearchResultItem, PanelContext } from "@spotlight/core";
import { panelContext, ROUTE_NAMES } from "@spotlight/core";
import { useWindowResize, useWindowFocus, usePlugins, useTray } from "./composables";

provideI18n();
const { locale } = useI18n();

const router = useRouter();
const route = useRoute();

registerAllPlugins();

const { refreshTray } = useTray();

const query = ref('');
const files = ref<FileItem[]>([]);
const searchInputRef = ref<{ focus: () => void } | null>(null);

useWindowFocus(searchInputRef);
useWindowResize();
usePlugins();

const isPanelMode = computed(() => route.path.startsWith('/panel'));
const activePluginName = computed(() => {
  const match = route.path.match(/^\/panel\/(.+)$/);
  if (!match) return undefined;
  const plugin = pluginRegistry.getPlugin(match[1]);
  return plugin?.name;
});
const activePluginIcon = computed(() => {
  const match = route.path.match(/^\/panel\/(.+)$/);
  if (!match) return undefined;
  const plugin = pluginRegistry.getPlugin(match[1]);
  return plugin?.iconUrl;
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
  if (item.pluginId && item.actionId !== undefined) {
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

    await pluginRegistry.executeAction({
      pluginId: item.pluginId,
      actionId: item.actionId,
      data: item.actionData,
    });
  }
};

const handleClosePanel = () => {
  router.push({ name: ROUTE_NAMES.SEARCH });
};

const handleOpenSettings = () => {
  router.push({ name: 'settings-plugin' });
};

onMounted(async () => {
  const savedTheme = await settingsPlugin.getThemeMode();
  const savedLanguage = await settingsPlugin.getLanguage();
  applyTheme(savedTheme);
  setLocale(savedLanguage);

  // Initialize tray after locale is set
  await refreshTray();
});

// Only refresh tray when locale changes to a different value (not initial set)
let previousLocale = '';
watch(locale, async (newLocale) => {
  if (newLocale !== previousLocale && previousLocale !== '') {
    await refreshTray();
  }
  previousLocale = newLocale;
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
      :plugin-icon="activePluginIcon"
      @back="handleClosePanel"
      @open-settings="handleOpenSettings"
    />
    <RouterView
      v-slot="{ Component }"
      class="router-view-container"
    >
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

.router-view-container {
  max-height: 600px;
  overflow-y: auto;
}

</style>
