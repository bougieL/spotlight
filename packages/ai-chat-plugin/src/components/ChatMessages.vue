<script setup lang="ts">
import { MessageSquare } from 'lucide-vue-next';
import type { ChatMessage } from '../index';
import { translations, getLocale } from '@spotlight/i18n';

const t = translations[getLocale()];

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
}

defineProps<Props>();

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="chat-messages">
    <div v-if="messages.length === 0" class="empty-state">
      <MessageSquare :size="48" />
      <p>{{ t['aiChat'] || 'AI Chat' }}</p>
    </div>

    <div
      v-for="msg in messages"
      :key="msg.id"
      :class="['message', msg.role]"
    >
      <div class="message-content">{{ msg.content }}</div>
      <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
    </div>

    <div v-if="isLoading" class="message assistant loading">
      <div class="message-content">
        <span class="typing-indicator">...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--spotlight-placeholder);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.message {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  position: relative;
}

.message.user {
  align-self: flex-end;
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
}

.message.assistant {
  align-self: flex-start;
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.08));
}

.message-content {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  margin-top: 4px;
}

.message.user .message-time {
  text-align: right;
}

.message.loading .message-content {
  color: var(--spotlight-placeholder);
}

.typing-indicator {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
