<script setup lang="ts">
interface Props {
  modelValue: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'search';
  placeholder?: string;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  placeholder: '',
});

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'update:modelValue', value: string): void;
}>();

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}
</script>

<template>
  <input
    class="base-input"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="handleInput"
  >
</template>

<style scoped>
.base-input {
  width: 100%;
  height: var(--spotlight-control-height, 32px);
  padding: 0 12px;
  font-size: 13px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s ease;
}

.base-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.base-input::placeholder {
  color: var(--spotlight-placeholder);
}

.base-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
