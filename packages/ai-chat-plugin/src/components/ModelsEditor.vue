<script setup lang="ts">
import { ref } from 'vue';
import { Settings, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseButton, BaseIconButton, BaseInput, BaseSelect } from '@spotlight/components';
import type { ModelConfig, EndpointType } from '@spotlight/ai-core';
import { openaiAdapter, anthropicAdapter } from '@spotlight/ai-core';

interface Props {
  models: ModelConfig[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'save', models: ModelConfig[]): void;
  (e: 'close'): void;
}>();

const { t } = useI18n();

const localModels = ref<ModelConfig[]>([...props.models]);
const isEditing = ref(false);
const editingModel = ref<Partial<ModelConfig> | null>(null);
const testingModelId = ref<string | null>(null);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const endpointTypeOptions = [
  { value: 'openai', label: t('aiChat.openai') },
  { value: 'anthropic', label: t('aiChat.anthropic') },
  { value: 'openai-compatible', label: t('aiChat.openaiCompatible') },
];

function startAddModel() {
  editingModel.value = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
    name: '',
    provider: '',
    endpointType: 'openai-compatible',
    apiUrl: '',
    apiKey: '',
    maxContext: 4096,
  };
  isEditing.value = true;
}

function startEditModel(model: ModelConfig) {
  editingModel.value = { ...model };
  isEditing.value = true;
}

function cancelEdit() {
  editingModel.value = null;
  isEditing.value = false;
}

function saveModel() {
  if (!editingModel.value) return;

  const existingIndex = localModels.value.findIndex(m => m.id === editingModel.value!.id);
  if (existingIndex !== -1) {
    localModels.value[existingIndex] = editingModel.value as ModelConfig;
  } else {
    localModels.value.push(editingModel.value as ModelConfig);
  }

  emit('save', localModels.value);
  isEditing.value = false;
  editingModel.value = null;
}

function deleteModel(model: ModelConfig) {
  if (confirm(t('aiChat.confirmDeleteModel'))) {
    localModels.value = localModels.value.filter(m => m.id !== model.id);
    emit('save', localModels.value);
  }
}

async function testConnection(model: ModelConfig) {
  testingModelId.value = model.id;
  testResult.value = null;

  try {
    const adapter = model.endpointType === 'anthropic' ? anthropicAdapter : openaiAdapter;
    const testMessages = [
      { id: '1', role: 'user' as const, content: 'Hi', timestamp: Date.now() }
    ];

    const generator = adapter.streamChat(testMessages, model, {
      temperature: 0.7,
      maxTokens: 10,
    });

    await generator.next();
    testResult.value = { success: true, message: t('aiChat.connectionSuccess') };
  } catch (error) {
    testResult.value = {
      success: false,
      message: `${t('aiChat.connectionFailed')}: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    testingModelId.value = null;
  }
}

function getMaxContextString(): string {
  if (!editingModel.value || editingModel.value.maxContext === undefined) return '4096';
  return String(editingModel.value.maxContext);
}

function setMaxContextFromString(value: string) {
  if (editingModel.value) {
    editingModel.value.maxContext = parseInt(value, 10) || 4096;
  }
}
</script>

<template>
  <div class="models-editor">
    <div class="models-list" v-if="!isEditing && localModels.length > 0">
      <div v-for="model in localModels" :key="model.id" class="model-item">
        <div class="model-info">
          <div class="model-header">
            <span class="model-name">{{ model.name }}</span>
            <span class="model-provider">{{ model.provider }}</span>
          </div>
          <div class="model-details">
            <span class="model-endpoint">{{ model.endpointType }}</span>
            <span class="model-context">Max: {{ model.maxContext }}</span>
          </div>
        </div>
        <div class="model-actions">
          <BaseIconButton
            @click="testConnection(model)"
            :disabled="testingModelId === model.id"
            :title="t('aiChat.testConnection')"
          >
            <CheckCircle :size="14" v-if="testResult?.success && testingModelId === null" />
            <XCircle :size="14" v-else-if="testResult?.success === false && testingModelId === null" />
            <Settings :size="14" v-else />
          </BaseIconButton>
          <BaseIconButton @click="startEditModel(model)" :title="t('aiChat.editModel')">
            <Edit2 :size="14" />
          </BaseIconButton>
          <BaseIconButton @click="deleteModel(model)" :title="t('aiChat.deleteModel')">
            <Trash2 :size="14" />
          </BaseIconButton>
        </div>
      </div>
    </div>

    <div class="model-form" v-if="isEditing && editingModel">
      <div class="form-group">
        <label class="form-label">{{ t('aiChat.name') }}</label>
        <BaseInput v-model="editingModel.name!" :placeholder="t('aiChat.model')" />
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('aiChat.provider') }}</label>
        <BaseInput v-model="editingModel.provider!" :placeholder="t('aiChat.provider')" />
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('aiChat.endpointType') }}</label>
        <BaseSelect v-model="(editingModel.endpointType as EndpointType)" :options="endpointTypeOptions" />
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('aiChat.apiUrl') }}</label>
        <BaseInput v-model="editingModel.apiUrl!" :placeholder="t('aiChat.apiUrlPlaceholder')" />
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('aiChat.apiKey') }}</label>
        <BaseInput v-model="editingModel.apiKey!" type="password" :placeholder="t('aiChat.apiKeyPlaceholder')" />
      </div>

      <div class="form-group">
        <label class="form-label">{{ t('aiChat.maxContext') }}</label>
        <BaseInput
          :modelValue="getMaxContextString()"
          type="number"
          :placeholder="t('aiChat.maxContextPlaceholder')"
          @update:modelValue="setMaxContextFromString"
        />
      </div>

      <div class="form-actions">
        <BaseButton variant="primary" @click="saveModel">{{ t('aiChat.save') }}</BaseButton>
        <BaseButton variant="default" @click="cancelEdit">{{ t('aiChat.cancel') }}</BaseButton>
      </div>
    </div>

    <div class="empty-state" v-if="!isEditing && localModels.length === 0">
      <Settings :size="32" class="empty-icon" />
      <p class="empty-text">{{ t('aiChat.noModels') }}</p>
      <BaseButton variant="primary" @click="startAddModel">{{ t('aiChat.addModel') }}</BaseButton>
    </div>

    <div class="add-model-btn" v-if="!isEditing && localModels.length > 0">
      <BaseButton variant="primary" @click="startAddModel">{{ t('aiChat.addModel') }}</BaseButton>
    </div>

    <div class="test-result" v-if="testResult" :class="{ success: testResult.success, error: !testResult.success }">
      {{ testResult.message }}
    </div>
  </div>
</template>

<style scoped>
.models-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.models-list {
  flex: 1;
  overflow-y: auto;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.model-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.model-provider {
  font-size: 11px;
  color: var(--spotlight-placeholder);
}

.model-details {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--spotlight-placeholder);
}

.model-actions {
  display: flex;
  gap: 2px;
}

.model-form {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 12px;
}

.form-label {
  display: block;
  font-size: 12px;
  color: var(--spotlight-text);
  margin-bottom: 4px;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--spotlight-placeholder);
  font-size: 12px;
  padding: 20px;
}

.empty-icon {
  opacity: 0.5;
}

.empty-text {
  margin: 0;
}

.add-model-btn {
  padding: 12px;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.add-model-btn :deep(button) {
  width: 100%;
}

.test-result {
  padding: 8px 12px;
  font-size: 12px;
  text-align: center;
}

.test-result.success {
  color: #22c55e;
  background-color: rgba(34, 197, 94, 0.1);
}

.test-result.error {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
