<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  title?: string;
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'medium',
  disabled: false,
  title: '',
});
</script>

<template>
  <button
    class="base-icon-button"
    :class="[`variant-${variant}`, `size-${size}`]"
    :disabled="disabled"
    :title="title"
  >
    <slot />
  </button>
</template>

<style scoped>
.base-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: transparent;
  color: var(--spotlight-text-secondary, var(--spotlight-placeholder));
  cursor: pointer;
  transition: all 0.15s ease;
}

.base-icon-button:hover:not(:disabled) {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.base-icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.size-small {
  width: var(--spotlight-control-height-sm, 24px);
  height: var(--spotlight-control-height-sm, 24px);
}

.size-medium {
  width: var(--spotlight-control-height, 32px);
  height: var(--spotlight-control-height, 32px);
}

.size-large {
  width: var(--spotlight-control-height-lg, 40px);
  height: var(--spotlight-control-height-lg, 40px);
}

/* Variants */
.variant-default:hover:not(:disabled) {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.variant-primary {
  background-color: var(--spotlight-tag-bg);
  border-color: var(--spotlight-tag-bg);
  color: var(--spotlight-tag-text);
}

.variant-primary:hover:not(:disabled) {
  opacity: 0.85;
}

.variant-danger:hover:not(:disabled) {
  background-color: var(--spotlight-danger, #dc3545);
  border-color: var(--spotlight-danger, #dc3545);
  color: white;
}
</style>
