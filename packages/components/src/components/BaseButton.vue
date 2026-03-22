<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'medium',
  disabled: false,
});
</script>

<template>
  <button
    class="base-button"
    :class="[`variant-${variant}`, `size-${size}`]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: transparent;
  color: var(--spotlight-text);
  cursor: pointer;
  transition: all 0.15s ease;
  height: var(--spotlight-control-height, 32px);
}

.base-button:hover:not(:disabled) {
  background-color: var(--spotlight-item-hover);
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.size-small {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}

.size-medium {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
}

.size-large {
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
}

/* Variants */
.variant-default:hover:not(:disabled) {
  background-color: var(--spotlight-item-hover);
}

.variant-primary {
  background-color: var(--spotlight-tag-bg);
  border-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
}

.variant-primary:hover:not(:disabled) {
  opacity: 0.85;
}

.variant-danger {
  background-color: var(--spotlight-danger, #dc3545);
  border-color: var(--spotlight-danger, #dc3545);
  color: white;
}

.variant-danger:hover:not(:disabled) {
  opacity: 0.85;
}
</style>
