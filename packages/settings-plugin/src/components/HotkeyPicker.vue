<script setup lang="ts">
const HOTKEY_OPTIONS = [
  { value: 'Alt+Space', label: 'Alt + Space' },
  { value: 'Ctrl+Space', label: 'Ctrl + Space' },
];

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const selectHotkey = (value: string) => {
  emit('update:modelValue', value);
};
</script>

<template>
  <div class="option-group">
    <button
      v-for="option in HOTKEY_OPTIONS"
      :key="option.value"
      class="option-button"
      :class="{ 'is-active': props.modelValue === option.value }"
      @click="selectHotkey(option.value)"
    >
      <span class="option-label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
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

.option-label {
  font-size: 14px;
  font-weight: 500;
}
</style>
