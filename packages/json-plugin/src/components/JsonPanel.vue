<template>
  <div class="json-panel">
    <JsonEditor />
  </div>
</template>

<script setup lang="ts">
import JsonEditor from './JsonEditor.vue';
</script>

<style scoped>
.json-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
}
</style>
