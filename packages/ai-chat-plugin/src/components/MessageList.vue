<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue';
import { useI18n } from '@spotlight/i18n';
import MessageBubble from './MessageBubble.vue';
import type { ChatMessage } from '../index';

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamedContent: string;
}

const props = defineProps<Props>();

const { t } = useI18n();

const messagesContainer = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(
  () => [props.messages.length, props.streamedContent],
  () => {
    scrollToBottom();
  }
);

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div
    ref="messagesContainer"
    class="messages-container"
  >
    <div
      v-if="messages.length === 0 && !isStreaming"
      class="empty-chat"
    >
      <p>{{ t('aiChat.placeholder') }}</p>
    </div>

    <MessageBubble
      v-for="message in messages"
      :key="message.id"
      :message="message"
    />

    <MessageBubble
      v-if="isStreaming"
      :message="{ id: 'streaming', role: 'assistant', content: streamedContent, timestamp: Date.now() }"
      :is-streaming="true"
    />

    <div
      v-if="isStreaming"
      class="thinking-indicator"
    >
      {{ t('aiChat.thinking') }}
    </div>
  </div>
</template>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.thinking-indicator {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  font-style: italic;
  padding-left: 14px;
}
</style>
