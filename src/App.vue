<script setup lang="ts">
import { ref, provide, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { SearchInput } from "@spotlight/input";
import { registerAllPlugins, pluginRegistry } from "./plugins";
import recentPlugin from "@spotlight/recent-plugin";
import { provideI18n, setLocale } from "@spotlight/i18n";
import { applyTheme } from "@spotlight/settings-plugin";
import settingsPlugin from "@spotlight/settings-plugin";
import { tauriApi } from "@spotlight/api";
import type { FileItem } from "@spotlight/input";
import type { SearchResultItem, PanelContext } from "@spotlight/core";
import { panelContext, ROUTE_NAMES } from "@spotlight/core";
import { useWindowResize, useWindowFocus, usePlugins, useTray } from "./composables";

const { locale } = provideI18n();
const router = useRouter();
const route = useRoute();

registerAllPlugins();

const urlParams = new URLSearchParams(window.location.search);

const isDetached = computed(() => urlParams.get('detached') === 'true');
const isPanelMode = computed(() => route.path.startsWith('/panel'));
const pluginId = computed(() => route.path.match(/^\/panel\/([^/]+)/)?.[1]);
const activePluginName = computed(() => pluginId.value ? pluginRegistry.getPlugin(pluginId.value)?.name : undefined);
const activePluginIcon = computed(() => pluginId.value ? pluginRegistry.getPlugin(pluginId.value)?.iconUrl : undefined);

const query = ref('');
const files = ref<FileItem[]>([]);
const searchInputRef = ref<InstanceType<typeof SearchInput> | null>(null);
const mainRef = ref<HTMLElement | null>(null);

useWindowResize(mainRef);
useTray(isDetached, locale); // handles tray init and locale watch internally

useWindowFocus(searchInputRef, isDetached);
usePlugins(isDetached);

provide(panelContext, {
  query,
  files,
  clearQuery: () => { query.value = ''; },
  isDetached,
} as PanelContext);

const handleSelect = async (item: SearchResultItem) => {
  if (!item.pluginId || item.actionId === undefined) return;

  if (item.pluginId === '__quick_command__') {
    const allCommands = pluginRegistry.getQuickCommands();
    const cmd = allCommands.find((c) => c.trigger === item.actionId);
    if (cmd) {
      const title = item.title as string;
      const spaceIndex = title.indexOf(' ');
      const keyword = spaceIndex === -1 ? '' : title.slice(spaceIndex + 1);
      await recentPlugin.recordQuickCommand({
        trigger: cmd.trigger,
        description: cmd.description,
        iconUrl: cmd.iconUrl,
        keyword: keyword || undefined,
      });
      query.value = '';
      await cmd.execute(keyword);
    }
    return;
  }

  await recentPlugin.recordSelection({
    item: { title: item.title, desc: item.desc, iconUrl: item.iconUrl },
    pluginId: item.pluginId,
    actionId: item.actionId,
    actionData: item.actionData,
  });
  await pluginRegistry.executeAction({
    pluginId: item.pluginId,
    actionId: item.actionId,
    data: item.actionData,
  });
};

const handleFillQuery = (newQuery: string) => {
  query.value = newQuery;
  searchInputRef.value?.focus();
};

const handleInputEnter = async (q: string) => {
  if (!q.startsWith('/')) {
    return;
  }
  const afterSlash = q.slice(1).trim();
  const spaceIndex = afterSlash.indexOf(' ');
  const trigger = spaceIndex === -1 ? afterSlash : afterSlash.slice(0, spaceIndex);
  const commandArg = spaceIndex === -1 ? '' : afterSlash.slice(spaceIndex + 1);
  const allCommands = pluginRegistry.getQuickCommands();
  const cmd = allCommands.find((c) => c.trigger === trigger);
  if (cmd) {
    await recentPlugin.recordQuickCommand({
      trigger: cmd.trigger,
      description: cmd.description,
      iconUrl: cmd.iconUrl,
      keyword: commandArg || undefined,
    });
    query.value = '';
    await cmd.execute(commandArg);
  }
};

const handleClosePanel = () => {
  window.history.length > 1 ? router.back() : router.push({ name: ROUTE_NAMES.SEARCH });
};

const handleOpenSettings = () => router.push({ name: 'settings-plugin:main' });

const handleDetach = async (searchParams: string) => {
  const panelPath = route.path;
  if (!panelPath.startsWith('/panel')) return;
  const params = new URLSearchParams(searchParams);
  params.set('detached', 'true');
  const url = `${window.location.origin}${panelPath}?${params.toString()}`;
  await tauriApi.detachWindow({ url, label: `panel-${Date.now()}`, title: activePluginName.value || 'Spotlight' });
};

onMounted(async () => {
  applyTheme(await settingsPlugin.getThemeMode());
  setLocale(await settingsPlugin.getLanguage());

  // Apply always on top setting
  await settingsPlugin.applyAlwaysOnTop();
});
</script>

<template>
  <main
    ref="mainRef"
    class="spotlight-container"
    :class="{ detached: isDetached }"
  >
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
      @enter="handleInputEnter"
    />
    <RouterView
      v-slot="{ Component }"
      class="router-view-container"
      :class="{ detached: isDetached }"
    >
      <component
        :is="Component"
        @select="handleSelect"
        @fill-query="handleFillQuery"
      />
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
