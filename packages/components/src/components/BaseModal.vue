<script setup lang="ts">
import { X } from 'lucide-vue-next';
import BaseIconButton from './BaseIconButton.vue';

interface Props {
  title?: string;
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: '',
  show: false,
});

defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <BaseIconButton size="small" @click="$emit('close')">
            <X :size="16" />
          </BaseIconButton>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background-color: var(--spotlight-bg);
  border-radius: 8px;
  box-shadow: 0 4px 20px var(--spotlight-shadow);
  min-width: 320px;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
}

.modal-title {
  font-weight: 500;
  font-size: 15px;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
}
</style>
