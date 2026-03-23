<script setup lang="ts">
import { Send } from 'lucide-vue-next';
import { BaseButton } from '@spotlight/components';
import { translations, getLocale } from '@spotlight/i18n';

const t = translations[getLocale()];

interface Props {
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'send', value: string): void;
}>();

const inputText = defineModel<string>({ default: '' });

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (inputText.value.trim()) {
      emit('send', inputText.value);
      inputText.value = '';
    }
  }
}

function handleSend() {
  if (inputText.value.trim()) {
    emit('send', inputText.value);
    inputText.value = '';
  }
}
</script>

<template>
  <div class="chat-input">
    <textarea
      v-model="inputText"
      class="input-field"
      :placeholder="t['placeholder'] || 'Type your message...'"
      rows="1"
      :disabled="disabled"
      @keydown="handleKeydown"
    ></textarea>
    <BaseButton
      variant="primary"
      size="medium"
      :disabled="!inputText.trim() || disabled"
      @click="handleSend"
    >
      <Send :size="16" />
      {{ t['send'] || 'Send' }}
    </BaseButton>
  </div>
</template>

<style scoped>
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
}

.input-field {
  flex: 1;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 12px;
  background-color: var(--spotlight-input-bg, var(--spotlight-bg));
  color: var(--spotlight-text);
  outline: none;
  resize: none;
  max-height: 120px;
  transition: border-color 0.15s;
}

.input-field:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.input-field::placeholder {
  color: var(--spotlight-placeholder);
}

.input-field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
