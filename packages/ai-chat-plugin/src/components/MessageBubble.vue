<script setup lang="ts">
import { ref, computed } from 'vue';
import { Copy, Check } from 'lucide-vue-next';
import { marked } from 'marked';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton } from '@spotlight/components';
import type { ChatMessage } from '../index';

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
});

const { t } = useI18n();

const copiedId = ref<string | null>(null);

const renderedContent = computed(() => {
  if (props.isStreaming) {
    return props.message.content;
  }
  return marked.parse(props.message.content, { async: false }) as string;
});

const streamingContent = computed(() => {
  return props.message.content + '<span class="cursor">|</span>';
});

async function copyMessage() {
  await navigator.clipboard.writeText(props.message.content);
  copiedId.value = props.message.id;
  setTimeout(() => {
    copiedId.value = null;
  }, 2000);
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="message" :class="[message.role, { streaming: isStreaming }]">
    <div class="message-content">
      <div v-if="isStreaming" class="message-text" v-html="streamingContent"></div>
      <div v-else class="message-text" v-html="renderedContent"></div>
      <div class="message-meta">
        <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        <BaseIconButton
          v-if="message.role === 'assistant' && !isStreaming"
          @click="copyMessage"
          :title="t('aiChat.copy')"
          size="small"
        >
          <Check :size="12" v-if="copiedId === message.id" />
          <Copy :size="12" v-else />
        </BaseIconButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-content {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
}

.message.user .message-content {
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
  border-bottom-left-radius: 4px;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-text :deep(pre) {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  padding: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message.user .message-text :deep(pre) {
  background-color: rgba(255, 255, 255, 0.15);
}

.message-text :deep(code) {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.message-text :deep(p) {
  margin: 0 0 4px 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text :deep(a) {
  color: var(--spotlight-primary);
}

.message.user .message-text :deep(a) {
  color: #fff;
  text-decoration: underline;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
  color: var(--spotlight-icon, #666);
}

.message-time {
  font-size: 10px;
  color: var(--spotlight-placeholder);
}

.cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
</style>
