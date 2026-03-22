<script setup lang="ts">
interface Props {
  value: string;
  label: string;
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'change', value: string): void;
}>();
</script>

<template>
  <label class="base-radio" :class="{ disabled }">
    <input
      type="radio"
      :value="value"
      :disabled="disabled"
      @change="emit('change', value)"
    />
    <span class="radio-indicator"></span>
    <span class="radio-label">{{ label }}</span>
  </label>
</template>

<style scoped>
.base-radio {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.base-radio.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-radio input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-indicator {
  position: relative;
  width: 16px;
  height: 16px;
  border: 2px solid var(--spotlight-border, rgba(0, 0, 0, 0.2));
  border-radius: 50%;
  transition: all 0.15s ease;
}

.base-radio input:checked + .radio-indicator {
  border-color: var(--spotlight-primary, var(--spotlight-tag-text, #3b5998));
}

.base-radio input:checked + .radio-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background-color: var(--spotlight-primary, var(--spotlight-tag-text, #3b5998));
  border-radius: 50%;
}

.base-radio input:focus + .radio-indicator {
  outline: 2px solid var(--spotlight-primary, var(--spotlight-tag-text, #3b5998));
  outline-offset: 2px;
}

.radio-label {
  font-size: 13px;
  color: var(--spotlight-text);
}

.base-radio.disabled .radio-label {
  color: var(--spotlight-placeholder);
}
</style>
