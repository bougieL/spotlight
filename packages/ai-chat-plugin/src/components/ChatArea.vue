<script setup lang="ts">
import { computed } from 'vue';
import { MessageSquare, Settings, Send } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton, BaseButton, BaseSelect } from '@spotlight/components';
import MessageList from './MessageList.vue';
import type { Session, ModelConfig } from '../index';

const props = defineProps<{
  activeSession: Session | null;
  models: ModelConfig[];
  isStreaming: boolean;
  streamedContent: string;
  inputText: string;
  showSystemPrompt: boolean;
  isEditingSystemPrompt: boolean;
  editingSystemPrompt: string;
}>();

const emit = defineEmits<{
  (e: 'sendMessage'): void;
  (e: 'update:inputText', value: string): void;
  (e: 'startEditingSystemPrompt'): void;
  (e: 'saveSystemPrompt'): void;
  (e: 'cancelEditingSystemPrompt'): void;
  (e: 'update:editingSystemPrompt', value: string): void;
  (e: 'selectModel', modelId: string): void;
}>();

const { t } = useI18n();

const messages = computed(() => props.activeSession?.messages || []);

const modelOptions = computed(() => {
  return props.models.map(m => ({
    value: m.id,
    label: `${m.provider}/${m.name || m.id}`,
  }));
});

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('sendMessage');
  }
}
</script>

<template>
  <div class="chat-area">
    <div
      v-if="showSystemPrompt && activeSession"
      class="system-prompt-bar"
    >
      <div v-if="!isEditingSystemPrompt" class="system-prompt-view">
        <span class="system-prompt-text">{{ activeSession.systemPrompt || t('aiChat.systemPromptPlaceholder') }}</span>
        <BaseIconButton :title="t('aiChat.editModel')" @click="emit('startEditingSystemPrompt')">
          <Settings :size="14" />
        </BaseIconButton>
      </div>
      <div v-else class="system-prompt-edit">
        <textarea
          :value="editingSystemPrompt"
          class="system-prompt-input"
          :placeholder="t('aiChat.systemPromptPlaceholder')"
          rows="3"
          @input="emit('update:editingSystemPrompt', ($event.target as HTMLTextAreaElement).value)"
        />
        <div class="edit-actions">
          <BaseButton variant="primary" size="small" @click="emit('saveSystemPrompt')">
            {{ t('aiChat.save') }}
          </BaseButton>
          <BaseButton variant="default" size="small" @click="emit('cancelEditingSystemPrompt')">
            {{ t('aiChat.cancel') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <MessageList
      v-if="activeSession"
      :messages="messages"
      :is-streaming="isStreaming"
      :streamed-content="streamedContent"
    />

    <div v-if="!activeSession" class="empty-chat">
      <MessageSquare :size="48" class="empty-icon" />
      <p>{{ t('aiChat.selectModel') }}</p>
    </div>

    <div v-if="activeSession" class="input-container">
      <textarea
        :value="inputText"
        class="message-input"
        :placeholder="t('aiChat.placeholder')"
        :disabled="isStreaming"
        rows="1"
        @keydown="handleKeydown"
        @input="emit('update:inputText', ($event.target as HTMLTextAreaElement).value)"
      />
      <BaseIconButton
        :disabled="!inputText.trim() || isStreaming"
        :title="t('aiChat.send')"
        size="large"
        @click="emit('sendMessage')"
      >
        <Send :size="16" />
      </BaseIconButton>
    </div>

    <div v-if="activeSession && models.length > 0" class="chat-toolbar">
      <BaseSelect
        :model-value="activeSession.modelId"
        :options="modelOptions"
        @update:model-value="emit('selectModel', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.system-prompt-bar {
  padding: 8px 16px;
  background-color: var(--spotlight-item-hover);
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.system-prompt-view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.system-prompt-text {
  font-size: 12px;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.system-prompt-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.system-prompt-input {
  width: 100%;
  padding: 8px;
  font-size: 12px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 4px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  resize: none;
  font-family: inherit;
  outline: none;
}

.system-prompt-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--spotlight-placeholder);
  font-size: 14px;
}

.empty-icon {
  opacity: 0.5;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 8px 4px 8px;
  margin: 0;
  background-color: var(--spotlight-bg);
}

.message-input {
  flex: 1;
  padding: 8px 14px;
  font-size: 14px;
  line-height: 1.4;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  resize: none;
  outline: none;
  font-family: inherit;
  height: 40px;
  max-height: 100px;
  overflow-y: auto;
  box-sizing: border-box;
}

.message-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.message-input::placeholder {
  color: var(--spotlight-placeholder);
}

.message-input:disabled {
  opacity: 0.5;
}
</style>