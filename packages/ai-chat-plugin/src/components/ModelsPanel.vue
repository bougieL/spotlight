<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton } from '@spotlight/components';
import ModelsEditor from './ModelsEditor.vue';

const router = useRouter();
const { t } = useI18n();

function goBack() {
  router.back();
}
</script>

<template>
  <div class="models-panel">
    <div class="panel-header">
      <div class="header-left">
        <BaseIconButton
          :title="t('aiChat.back')"
          @click="goBack"
        >
          <ArrowLeft :size="16" />
        </BaseIconButton>
        <h2 class="panel-title">
          {{ t('aiChat.models') }}
        </h2>
      </div>
    </div>
    <ModelsEditor
      @close="goBack"
    />
  </div>
</template>

<style scoped>
.models-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--spotlight-text);
  margin: 0;
}
</style>
