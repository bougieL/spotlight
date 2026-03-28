<script setup lang="ts">
import { ref, provide, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { SearchInput } from "@spotlight/input";
import { registerAllPlugins, recentPlugin, pluginRegistry } from "./plugins";
import { provideI18n, setLocale } from "@spotlight/i18n";
import { settingsPlugin, applyTheme } from "@spotlight/settings-plugin";
import { tauriApi } from "@spotlight/api";
import type { FileItem } from "@spotlight/input";
import type { SearchResultItem, PanelContext } from "@spotlight/core";
import { panelContext, ROUTE_NAMES } from "@spotlight/core";
import { useWindowResize, useWindowFocus, usePlugins, useTray } from "./composables";

const { locale } = provideI18n();

const router = useRouter();
const route = useRoute();

registerAllPlugins();

const { refreshTray } = useTray();

const query = ref('');
const files = ref<FileItem[]>([]);
const searchInputRef = ref<{ focus: () => void } | null>(null);
const mainRef = ref<HTMLElement | null>(null);

useWindowFocus(searchInputRef);
useWindowResize(mainRef);
usePlugins();

const isPanelMode = computed(() => route.path.startsWith('/panel'));
const isDetached = computed(() => route.query.detached === 'true');
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
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: ROUTE_NAMES.SEARCH });
  }
};

const handleOpenSettings = () => {
  router.push({ name: 'settings-plugin' });
};

const handleDetach = async () => {
  const panelPath = route.path;
  if (panelPath.startsWith('/panel')) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}${panelPath}?detached=true`;
    const label = `panel-${Date.now()}`;
    await tauriApi.detachWindow(url, label);
  }
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
  <main ref="mainRef" class="spotlight-container" :class="{ detached: isDetached }">
    <SearchInput
      v-if="!isDetached"
      ref="searchInputRef"
      v-model="query"
      v-model:files="files"
      :is-panel-mode="isPanelMode"
      :plugin-name="activePluginName"
      :plugin-icon="activePluginIcon"
      @back="handleClosePanel"
      @open-settings="handleOpenSettings"
      @detach="handleDetach"
    />
    <RouterView
      v-slot="{ Component }"
      class="router-view-container"
      :class="{ detached: isDetached }"
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
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: transparent;
}

body {
  background-color: transparent;
}
</style>

<style>
#app {
  width: 100%;
  height: 100%;
}

.spotlight-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  border: none;
  background-color: transparent;
}

.spotlight-container.detached {
  height: 100%;
}

.router-view-container {
  max-height: 600px;
  overflow-y: auto;
}

.router-view-container.detached {
  height: 100%;
  max-height: none;
  overflow-y: visible;
}

</style>
