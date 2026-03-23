<script setup lang="ts">
interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <select
    class="base-select"
    :value="modelValue"
    :disabled="disabled"
    @change="handleChange"
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>
.base-select {
  height: var(--spotlight-control-height, 32px);
  padding: 0 12px;
  font-size: 13px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s ease;
  min-width: 120px;
  margin-top: 2px;
  margin-bottom: 6px;
}

.base-select:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.base-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
