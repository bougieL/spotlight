<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { RotateCcw } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';

const DEFAULT_HOTKEY = 'Alt+Space';

const props = defineProps<{
  modelValue: string;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();

const isRecording = ref(false);
const recordedKeys = ref<string[]>([]);

const isDefault = computed(() => props.modelValue === DEFAULT_HOTKEY);

function resetToDefault(): void {
  emit('update:modelValue', DEFAULT_HOTKEY);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!isRecording.value) return;

  // 阻止默认行为，包括 Alt+Space 的系统菜单
  event.preventDefault();
  event.stopPropagation();

  const key = event.key;

  // 跳过修饰键本身
  if (['Alt', 'Control', 'Ctrl', 'Shift', 'Meta'].includes(key)) {
    return;
  }

  // 获取修饰键状态
  const modifiers: string[] = [];
  if (event.altKey) modifiers.push('Alt');
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');

  // 获取主键名称
  let mainKey = key;
  if (key === ' ') mainKey = 'Space';
  else if (key.length === 1) mainKey = key.toUpperCase();
  else if (key.startsWith('Arrow')) mainKey = key.replace('Arrow', '');

  // 如果没有修饰键，不记录
  if (modifiers.length === 0) {
    return;
  }

  // 组装快捷键
  modifiers.push(mainKey);
  const shortcut = modifiers.join('+');

  // 重置状态
  isRecording.value = false;
  recordedKeys.value = [];

  // 发送快捷键
  emit('update:modelValue', shortcut);
}

function handleKeyUp(event: KeyboardEvent): void {
  if (!isRecording.value) return;
  event.preventDefault();
  event.stopPropagation();
}

function startRecording(event: MouseEvent): void {
  event.stopPropagation();
  event.preventDefault();
  isRecording.value = true;
  recordedKeys.value = [];

  // 添加文档级监听器
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
}

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('keyup', handleKeyUp, true);
});

function formatHotkey(hotkey: string): { keys: string[] } {
  return { keys: hotkey.split('+') };
}
</script>

<template>
  <div class="hotkey-picker">
    <button
      v-if="!isRecording"
      class="hotkey-button"
      @click="startRecording"
    >
      <template v-for="(key, index) in formatHotkey(props.modelValue).keys" :key="key">
        <kbd class="hotkey-key">{{ key }}</kbd>
        <span v-if="index < formatHotkey(props.modelValue).keys.length - 1" class="hotkey-plus">+</span>
      </template>
    </button>
    <button
      v-if="!isRecording && !isDefault"
      class="hotkey-reset"
      :title="t('settings.shortcut.reset')"
      @click="resetToDefault"
    >
      <RotateCcw :size="14" />
    </button>
    <div v-else class="hotkey-recording">
      <span class="recording-text">{{ t('settings.shortcut.recording') }}</span>
      <span v-if="recordedKeys.length > 0">
        <template v-for="(key, index) in recordedKeys" :key="key">
          <kbd class="hotkey-key recording">{{ key }}</kbd>
          <span v-if="index < recordedKeys.length - 1" class="hotkey-plus">+</span>
        </template>
      </span>
      <span v-else class="recording-hint">{{ t('settings.shortcut.pressKeys') }}</span>
    </div>
  </div>
</template>

<style scoped>
.hotkey-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hotkey-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--spotlight-shortcut-border);
  border-radius: 6px;
  background-color: var(--spotlight-item-hover);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hotkey-button:hover {
  border-color: var(--spotlight-icon);
}

.hotkey-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--spotlight-shortcut-border);
  border-radius: 6px;
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-placeholder);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hotkey-reset:hover {
  border-color: var(--spotlight-icon);
  color: var(--spotlight-text);
}

.hotkey-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  color: var(--spotlight-text);
  background-color: var(--spotlight-bg);
  border: 1px solid var(--spotlight-shortcut-border);
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.hotkey-key.recording {
  background-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
  border-color: var(--spotlight-tag-text);
}

.hotkey-plus {
  color: var(--spotlight-placeholder);
  font-size: 12px;
}

.hotkey-recording {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--spotlight-tag-text);
  border-radius: 6px;
  background-color: var(--spotlight-tag-bg);
}

.recording-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--spotlight-tag-text);
  margin-right: 4px;
}

.recording-hint {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  font-style: italic;
}
</style>
