<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { settingsPlugin, type ThemeMode } from '../index';
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
      <h3 class="section-title">{{ t('settings.shortcut') }}</h3>
      <div class="shortcut-display">
        <kbd class="shortcut-key">Alt</kbd>
        <span class="shortcut-plus">+</span>
        <kbd class="shortcut-key">Space</kbd>
      </div>
      <p class="shortcut-hint">{{ t('settings.shortcut.hint') }}</p>
    </section>
  </div>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
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

.shortcut-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: var(--spotlight-text);
  background-color: var(--spotlight-item-hover);
  border: 1px solid var(--spotlight-shortcut-border);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-plus {
  color: var(--spotlight-placeholder);
  font-size: 14px;
}

.shortcut-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--spotlight-placeholder);
}
</style>
