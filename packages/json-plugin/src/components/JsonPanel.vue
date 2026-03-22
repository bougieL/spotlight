<template>
  <div class="json-panel">
    <div class="panel-header">
      <span class="panel-title">{{ t('json.name') }}</span>
    </div>
    <JsonEditor />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@spotlight/i18n';
import JsonEditor from './JsonEditor.vue';

const { t } = useI18n();
</script>

<style scoped>
.json-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
}

.panel-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border);
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--spotlight-text);
}
</style>
