<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseSwitch } from '@spotlight/components';
import { pluginRegistry } from '@spotlight/plugin-registry';
import { settingsPlugin, type ThemeMode } from '../index';
import HotkeyPicker from './HotkeyPicker.vue';
import type { Locale } from '@spotlight/i18n';

interface Props {
  query: string;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t, setLocale } = useI18n();

const currentTheme = ref<ThemeMode>('system');
const currentLanguage = ref<Locale>('en-US');
const currentHotkey = ref('Alt+Space');
const hotkeyError = ref<string | null>(null);
const disabledPlugins = ref<Set<string>>(new Set());
const autostartEnabled = ref(false);
const hideOnBlurEnabled = ref(true);

const allPlugins = computed(() => pluginRegistry.getPlugins());

const pluginList = computed(() => {
  return allPlugins.value
    .filter((plugin) => plugin.pluginId !== 'settings-plugin')
    .map((plugin) => ({
      plugin,
      isDisabled: disabledPlugins.value.has(plugin.pluginId),
    }));
});

async function togglePlugin(pluginId: string, disabled: boolean): Promise<void> {
  await settingsPlugin.setPluginDisabled(pluginId, disabled);
  const newDisabledList = await settingsPlugin.getDisabledPlugins();
  await pluginRegistry.setDisabledPlugins(newDisabledList);
  disabledPlugins.value = new Set(newDisabledList);
}

async function toggleAutostart(enabled: boolean): Promise<void> {
  await settingsPlugin.setAutostartEnabled(enabled);
  autostartEnabled.value = enabled;
}

async function toggleHideOnBlur(enabled: boolean): Promise<void> {
  await settingsPlugin.setHideOnBlur(enabled);
  hideOnBlurEnabled.value = enabled;
}

const themeOptions: { value: ThemeMode; icon: typeof Sun; labelKey: string }[] = [
  { value: 'light', icon: Sun, labelKey: 'settings.theme.light' },
  { value: 'dark', icon: Moon, labelKey: 'settings.theme.dark' },
  { value: 'system', icon: Monitor, labelKey: 'settings.theme.system' },
];

const languageOptions: { value: Locale; labelKey: string }[] = [
  { value: 'en-US', labelKey: 'settings.language.en' },
  { value: 'zh-CN', labelKey: 'settings.language.zh' },
];

async function selectTheme(mode: ThemeMode): Promise<void> {
  currentTheme.value = mode;
  await settingsPlugin.updateTheme(mode);
}

async function selectLanguage(language: Locale): Promise<void> {
  currentLanguage.value = language;
  await settingsPlugin.updateLanguage(language);
  setLocale(language);
}

async function updateHotkey(hotkey: string): Promise<void> {
  hotkeyError.value = null;
  try {
    await settingsPlugin.updateHotkey(hotkey);
  } catch (error) {
    hotkeyError.value = error instanceof Error ? error.message : String(error);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(async () => {
  // Load saved settings
  currentTheme.value = await settingsPlugin.getThemeMode();
  currentLanguage.value = await settingsPlugin.getLanguage();
  await settingsPlugin.updateTheme(currentTheme.value);
  setLocale(currentLanguage.value);

  // Load and register hotkey
  currentHotkey.value = await settingsPlugin.getHotkey();
  try {
    await settingsPlugin.registerHotkey(currentHotkey.value);
  } catch (error) {
    hotkeyError.value = error instanceof Error ? error.message : String(error);
  }

  // Load disabled plugins
  const disabled = await settingsPlugin.getDisabledPlugins();
  disabledPlugins.value = new Set(disabled);

  // Load autostart setting
  autostartEnabled.value = await settingsPlugin.getAutostartEnabled();

  // Load hide on blur setting
  hideOnBlurEnabled.value = await settingsPlugin.getHideOnBlur();
});
</script>

<template>
  <div class="settings-panel" tabindex="0" @keydown="handleKeydown">
    <section class="settings-section">
      <h3 class="section-title">{{ t('settings.theme') }}</h3>
      <div class="option-group">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          class="option-button"
          :class="{ 'is-active': currentTheme === option.value }"
          @click="selectTheme(option.value)"
        >
          <component :is="option.icon" class="option-icon" :size="20" />
          <span class="option-label">{{ t(option.labelKey) }}</span>
        </button>
      </div>
    </section>

    <section class="settings-section">
      <h3 class="section-title">{{ t('settings.language') }}</h3>
      <div class="option-group">
        <button
          v-for="option in languageOptions"
          :key="option.value"
          class="option-button"
          :class="{ 'is-active': currentLanguage === option.value }"
          @click="selectLanguage(option.value)"
        >
          <span class="option-label">{{ t(option.labelKey) }}</span>
        </button>
      </div>
    </section>

    <section class="settings-section">
      <div class="section-header">
        <h3 class="section-title">{{ t('settings.shortcut') }}</h3>
        <p v-if="hotkeyError" class="shortcut-error">{{ hotkeyError }}</p>
        <p v-else class="shortcut-hint">{{ t('settings.shortcut.hint') }}</p>
      </div>
      <HotkeyPicker v-model="currentHotkey" :error="hotkeyError" @update:model-value="updateHotkey" />
    </section>

    <section class="settings-section">
      <h3 class="section-title">{{ t('settings.autostart') }}</h3>
      <div class="autostart-item">
        <div class="autostart-info">
          <span class="autostart-name">{{ t('settings.autostart.enable') }}</span>
        </div>
        <BaseSwitch
          :model-value="autostartEnabled"
          @update:model-value="toggleAutostart($event as boolean)"
        />
      </div>
    </section>

    <section class="settings-section">
      <h3 class="section-title">{{ t('settings.hideOnBlur') }}</h3>
      <div class="autostart-item">
        <div class="autostart-info">
          <span class="autostart-name">{{ t('settings.hideOnBlur.enable') }}</span>
        </div>
        <BaseSwitch
          :model-value="hideOnBlurEnabled"
          @update:model-value="toggleHideOnBlur($event as boolean)"
        />
      </div>
    </section>

    <section class="settings-section">
      <div class="section-header">
        <h3 class="section-title">{{ t('settings.plugins') }}</h3>
        <p class="section-description">{{ t('settings.plugins.description') }}</p>
      </div>
      <div class="plugin-list">
        <div
          v-for="{ plugin, isDisabled } in pluginList"
          :key="plugin.pluginId"
          class="plugin-item"
        >
          <div class="plugin-info">
            <span class="plugin-name">{{ plugin.name }}</span>
            <span v-if="plugin.description" class="plugin-description">{{ plugin.description }}</span>
          </div>
          <BaseSwitch
            :model-value="!isDisabled"
            @update:model-value="togglePlugin(plugin.pluginId, !($event as boolean))"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
  background-color: var(--spotlight-bg);
  outline: none;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--spotlight-text);
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-header .section-title {
  margin-bottom: 0;
}

.option-group {
  display: flex;
  gap: 8px;
}

.option-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid var(--spotlight-shortcut-border);
  border-radius: 8px;
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.option-button:hover {
  background-color: var(--spotlight-item-hover);
  border-color: var(--spotlight-icon);
}

.option-button.is-active {
  background-color: var(--spotlight-tag-bg);
  border-color: var(--spotlight-tag-text);
  color: var(--spotlight-tag-text);
}

.option-icon {
  flex-shrink: 0;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
}

.shortcut-hint {
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.shortcut-error {
  font-size: 12px;
  color: var(--spotlight-tag-text);
}

.section-description {
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plugin-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--spotlight-border);
  border-radius: 8px;
  background-color: var(--spotlight-item-hover);
}

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plugin-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.plugin-description {
  font-size: 12px;
  color: var(--spotlight-placeholder);
}

.autostart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--spotlight-border);
  border-radius: 8px;
  background-color: var(--spotlight-item-hover);
}

.autostart-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.autostart-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
}
</style>
