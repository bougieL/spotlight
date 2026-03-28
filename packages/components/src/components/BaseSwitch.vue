<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'update:modelValue', value: boolean): void;
}>();

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
}
</script>

<template>
  <label class="base-switch" :class="{ disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    />
    <span class="switch-track">
      <span class="switch-thumb"></span>
    </span>
  </label>
</template>

<style scoped>
.base-switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.base-switch.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-track {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: var(--spotlight-border, rgba(0, 0, 0, 0.2));
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.base-switch input:checked + .switch-track {
  background-color: var(--spotlight-tag-text, #3b5998);
}

.base-switch input:focus + .switch-track {
  outline: 2px solid var(--spotlight-tag-text, #3b5998);
  outline-offset: 2px;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.base-switch input:checked + .switch-track .switch-thumb {
  transform: translateX(16px);
}
</style>
