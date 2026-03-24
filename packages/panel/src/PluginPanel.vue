<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { Component } from 'vue';

interface Props {
  component: Component;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));

onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div class="plugin-panel">
    <component :is="component" @close="emit('close')" />
  </div>
</template>

<style scoped>
.plugin-panel {
  background-color: var(--spotlight-bg);
  border-top: 1px solid var(--spotlight-border);
}
</style>
