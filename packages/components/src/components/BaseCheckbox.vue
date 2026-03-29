<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
});

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
  <label
    class="base-checkbox"
    :class="{ disabled }"
  >
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
    <span class="checkbox-box">
      <svg
        viewBox="0 0 12 12"
        class="checkbox-check"
      >
        <path d="M2 6l3 3 5-5" />
      </svg>
    </span>
    <span
      v-if="label"
      class="checkbox-label"
    >{{ label }}</span>
  </label>
</template>

<style scoped>
.base-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.base-checkbox.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--spotlight-border, rgba(0, 0, 0, 0.3));
  border-radius: 4px;
  background-color: var(--spotlight-bg);
  transition: all 0.15s ease;
}

.checkbox-check {
  width: 12px;
  height: 12px;
  stroke: white;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.15s ease;
}

.base-checkbox input:checked + .checkbox-box {
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.base-checkbox input:checked + .checkbox-box .checkbox-check {
  opacity: 1;
  transform: scale(1);
}

.base-checkbox input:focus + .checkbox-box {
  outline: 2px solid var(--spotlight-primary, var(--spotlight-icon, #666));
  outline-offset: 2px;
}

.checkbox-label {
  font-size: 13px;
  color: var(--spotlight-text);
  user-select: none;
}
</style>
