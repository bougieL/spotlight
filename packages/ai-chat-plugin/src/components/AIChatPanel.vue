<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { MessageSquare, Settings, Send, Trash2, X } from 'lucide-vue-next';
import { aiChatPlugin, type AIChatSettings, type ChatMessage } from '../index';
import { translations, getLocale } from '@spotlight/i18n';
import logger from '@spotlight/logger';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const t = translations[getLocale()];

const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const showSettings = ref(false);

const settings = ref<AIChatSettings>({
  apiUrl: '',
  apiKey: '',
  endpointType: 'openai',
  model: '',
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: '',
});

const endpointOptions = [
  { value: 'openai', label: t['openai'] || 'OpenAI' },
  { value: 'anthropic', label: t['anthropic'] || 'Anthropic' },
];

onMounted(async () => {
  try {
    settings.value = await aiChatPlugin.getSettings();
    messages.value = await aiChatPlugin.getMessages();
  } catch (err) {
    logger.error('Failed to load AI chat settings:', err);
  }
});

watch(messages, async (newMessages) => {
  await aiChatPlugin.saveMessages(newMessages);
}, { deep: true });

async function sendMessage() {
  if (!inputText.value.trim() || isLoading.value) return;

  if (!settings.value.apiUrl || !settings.value.apiKey) {
    errorMessage.value = t['notConfigured'] || 'Please configure API settings first';
    showSettings.value = true;
    return;
  }

  errorMessage.value = '';
  const userMessage = aiChatPlugin.addMessage('user', inputText.value);
  messages.value = [...messages.value, userMessage];
  inputText.value = '';
  isLoading.value = true;

  try {
    const response = await aiChatPlugin.sendMessage(userMessage.content, settings.value);
    const assistantMessage = aiChatPlugin.addMessage('assistant', response);
    messages.value = [...messages.value, assistantMessage];
    await scrollToBottom();
  } catch (err) {
    logger.error('AI chat error:', err);
    errorMessage.value = String(err);
  } finally {
    isLoading.value = false;
  }
}

async function scrollToBottom() {
  await nextTick();
  const container = document.querySelector('.chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

async function clearChat() {
  messages.value = [];
  await aiChatPlugin.clearMessages();
}

async function saveSettingsHandler() {
  await aiChatPlugin.saveSettings(settings.value);
  showSettings.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
  if (event.key === 'Escape') {
    emit('close');
  }
}

function getModelPlaceholder(): string {
  if (settings.value.endpointType === 'openai') {
    return 'gpt-4o-mini, gpt-4o, etc.';
  }
  return 'claude-3-5-haiku-20241022, claude-3-opus-20240229, etc.';
}
</script>

<template>
  <div class="ai-chat-panel">
    <div class="chat-header">
      <div class="header-left">
        <MessageSquare :size="20" />
        <span>{{ t['aiChat'] || 'AI Chat' }}</span>
      </div>
      <div class="header-actions">
        <button class="icon-button" @click="clearChat" :title="t['newChat'] || 'New Chat'">
          <Trash2 :size="18" />
        </button>
        <button class="icon-button" @click="showSettings = !showSettings" :title="t['settings'] || 'Settings'">
          <Settings :size="18" />
        </button>
        <button class="icon-button" @click="$emit('close')">
          <X :size="18" />
        </button>
      </div>
    </div>

    <div v-if="showSettings" class="settings-section">
      <h3>{{ t['settings'] || 'Settings' }}</h3>

      <div class="form-group">
        <label>{{ t['endpointType'] || 'Endpoint Type' }}</label>
        <select v-model="settings.endpointType" class="select-input">
          <option v-for="opt in endpointOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>{{ t['apiUrl'] || 'API URL' }}</label>
        <input
          v-model="settings.apiUrl"
          type="text"
          class="text-input"
          :placeholder="settings.endpointType === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.anthropic.com/v1/messages'"
        />
      </div>

      <div class="form-group">
        <label>{{ t['apiKey'] || 'API Key' }}</label>
        <input
          v-model="settings.apiKey"
          type="password"
          class="text-input"
          placeholder="sk-..."
        />
      </div>

      <div class="form-group">
        <label>{{ t['model'] || 'Model' }}</label>
        <input
          v-model="settings.model"
          type="text"
          class="text-input"
          :placeholder="getModelPlaceholder()"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>{{ t['temperature'] || 'Temperature' }}</label>
          <input
            v-model.number="settings.temperature"
            type="number"
            class="text-input"
            min="0"
            max="2"
            step="0.1"
          />
        </div>

        <div class="form-group">
          <label>{{ t['maxTokens'] || 'Max Tokens' }}</label>
          <input
            v-model.number="settings.maxTokens"
            type="number"
            class="text-input"
            min="1"
            max="4096"
          />
        </div>
      </div>

      <div class="form-group">
        <label>{{ t['systemPrompt'] || 'System Prompt' }}</label>
        <textarea
          v-model="settings.systemPrompt"
          class="textarea-input"
          rows="3"
          placeholder="You are a helpful assistant..."
        ></textarea>
      </div>

      <div class="settings-actions">
        <button class="btn btn-secondary" @click="showSettings = false">
          {{ t['cancel'] || 'Cancel' }}
        </button>
        <button class="btn btn-primary" @click="saveSettingsHandler">
          {{ t['save'] || 'Save' }}
        </button>
      </div>
    </div>

    <div v-else class="chat-content">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

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
        </div>

        <div v-if="isLoading" class="message assistant loading">
          <div class="message-content">
            <span class="typing-indicator">...</span>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <textarea
          v-model="inputText"
          class="input-field"
          :placeholder="t['placeholder'] || 'Type your message...'"
          rows="1"
          @keydown="handleKeydown"
        ></textarea>
        <button
          class="send-button"
          @click="sendMessage"
          :disabled="!inputText.trim() || isLoading"
        >
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--spotlight-text-secondary, var(--spotlight-text));
  cursor: pointer;
  transition: background-color 0.15s;
}

.icon-button:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.08));
}

.settings-section {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.settings-section h3 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 500;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--spotlight-text-secondary, var(--spotlight-text));
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.text-input,
.select-input,
.textarea-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 6px;
  background-color: var(--spotlight-input-bg, var(--spotlight-bg));
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus,
.select-input:focus,
.textarea-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.textarea-input {
  resize: vertical;
  min-height: 60px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary {
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
}

.btn-secondary {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.08));
  color: var(--spotlight-text);
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.error-message {
  padding: 8px 16px;
  font-size: 13px;
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
}

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
  word-wrap: break-word;
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

.send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
  cursor: pointer;
  transition: opacity 0.15s;
}

.send-button:hover:not(:disabled) {
  opacity: 0.9;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
