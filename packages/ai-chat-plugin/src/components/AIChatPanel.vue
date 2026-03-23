<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MessageSquare, Settings, X } from 'lucide-vue-next';
import { BaseInput, BaseButton, BaseIconButton, BaseSelect } from '@spotlight/components';
import { aiChatPlugin, type AIChatSettings, type ChatMessage, type ChatSession } from '../index';
import { translations, getLocale } from '@spotlight/i18n';
import { storageService } from '../services/storageService';
import { ALL_MODELS, getModelsByProvider } from './models';
import SessionSidebar from './SessionSidebar.vue';
import ChatMessages from './ChatMessages.vue';
import ChatInput from './ChatInput.vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const t = translations[getLocale()];

const sessions = ref<ChatSession[]>([]);
const currentSessionId = ref<string | null>(null);
const messages = ref<ChatMessage[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const showSettings = ref(false);

const settings = ref<AIChatSettings>({
  apiUrl: '',
  apiKey: '',
  provider: 'openai',
  systemPrompt: '',
});

const providerOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'xai', label: 'xAI Grok' },
  { value: 'mistral', label: 'Mistral AI' },
];

const availableModels = computed(() => {
  return getModelsByProvider(settings.value.provider).map(m => ({
    value: m.id,
    label: `${m.name} (${m.contextWindow.toLocaleString()} ctx)`,
  }));
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  settings.value = await storageService.loadSettings();
  sessions.value = await storageService.loadSessions();
  const currentId = await storageService.getCurrentSessionId();

  if (currentId && sessions.value.find(s => s.id === currentId)) {
    selectSession(currentId);
  } else if (sessions.value.length > 0) {
    selectSession(sessions.value[0].id);
  }
}

function selectSession(id: string) {
  const session = sessions.value.find(s => s.id === id);
  if (session) {
    currentSessionId.value = id;
    messages.value = session.messages;
    storageService.setCurrentSessionId(id);

    // Update provider based on session's model
    const model = ALL_MODELS.find(m => m.id === session.modelId);
    if (model) {
      settings.value.provider = model.provider;
    }
  }
}

function createNewSession(): ChatSession {
  const defaultModelId = settings.value.provider === 'anthropic'
    ? 'claude-3.5-sonnet-20241022'
    : settings.value.provider === 'google'
    ? 'gemini-2.0-flash'
    : settings.value.provider === 'xai'
    ? 'grok-4.2'
    : settings.value.provider === 'mistral'
    ? 'mistral-small-4'
    : 'gpt-4o-mini';

  return {
    id: crypto.randomUUID(),
    title: t['newChat'] || 'New Chat',
    messages: [],
    modelId: defaultModelId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function startNewSession() {
  const session = createNewSession();
  sessions.value.unshift(session);
  currentSessionId.value = session.id;
  messages.value = [];
  await storageService.saveSessions(sessions.value);
  await storageService.setCurrentSessionId(session.id);
}

async function deleteSession(id: string, event: Event) {
  event.stopPropagation();
  sessions.value = sessions.value.filter(s => s.id !== id);
  await storageService.saveSessions(sessions.value);

  if (currentSessionId.value === id) {
    if (sessions.value.length > 0) {
      selectSession(sessions.value[0].id);
    } else {
      currentSessionId.value = null;
      messages.value = [];
    }
  }
}

async function handleSendMessage(content: string) {
  if (!content.trim() || isLoading.value) return;

  if (!settings.value.apiKey) {
    errorMessage.value = t['notConfigured'] || 'Please configure API settings first';
    showSettings.value = true;
    return;
  }

  // Create session if none exists
  if (!currentSessionId.value) {
    const session = createNewSession();
    sessions.value.unshift(session);
    currentSessionId.value = session.id;
    await storageService.saveSessions(sessions.value);
    await storageService.setCurrentSessionId(session.id);
  }

  const session = sessions.value.find(s => s.id === currentSessionId.value);
  const currentModelId = session?.modelId || settings.value.provider;
  const modelConfig = ALL_MODELS.find(m => m.id === currentModelId);
  const maxTokens = modelConfig?.defaultMaxTokens || 4096;

  errorMessage.value = '';
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    timestamp: Date.now(),
  };
  messages.value = [...messages.value, userMessage];
  isLoading.value = true;

  // Update session title from first user message
  if (session && session.messages.length === 0) {
    session.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
  }

  try {
    const assistantMessage = await aiChatPlugin.sendMessage(
      content,
      messages.value.slice(0, -1),
      settings.value,
      currentModelId,
      maxTokens
    );

    messages.value = [...messages.value, assistantMessage];

    // Update session
    if (session) {
      session.messages = messages.value;
      session.updatedAt = Date.now();
      await storageService.saveSessions(sessions.value);
    }
  } catch (err) {
    console.error('AI chat error:', err);
    errorMessage.value = String(err);
  } finally {
    isLoading.value = false;
  }
}

async function handleModelChange(modelId: string) {
  const session = sessions.value.find(s => s.id === currentSessionId.value);
  if (session) {
    session.modelId = modelId;
    const model = ALL_MODELS.find(m => m.id === modelId);
    if (model) {
      settings.value.provider = model.provider;
    }
    await storageService.saveSessions(sessions.value);
  }
}

async function saveSettingsHandler() {
  await storageService.saveSettings(settings.value);
  aiChatPlugin.saveSettings(settings.value);
  showSettings.value = false;
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
        <BaseIconButton size="small" @click="showSettings = !showSettings">
          <Settings :size="16" />
        </BaseIconButton>
        <BaseIconButton size="small" @click="$emit('close')">
          <X :size="16" />
        </BaseIconButton>
      </div>
    </div>

    <div v-if="showSettings" class="settings-section">
      <h3>{{ t['settings'] || 'Settings' }}</h3>

      <div class="form-group">
        <label>{{ t['endpointType'] || 'Provider' }}</label>
        <BaseSelect
          v-model="settings.provider"
          :options="providerOptions"
        />
      </div>

      <div class="form-group">
        <label>{{ t['apiKey'] || 'API Key' }}</label>
        <BaseInput
          v-model="settings.apiKey"
          type="password"
          placeholder="sk-... / Anthropic key / etc."
        />
      </div>

      <div class="form-group">
        <label>API URL ({{ t['optional'] || 'Optional' }})</label>
        <BaseInput
          v-model="settings.apiUrl"
          :placeholder="settings.provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : settings.provider === 'anthropic' ? 'https://api.anthropic.com/v1/messages' : 'Custom API URL'"
        />
      </div>

      <div class="form-group">
        <label>{{ t['systemPrompt'] || 'System Prompt' }}</label>
        <textarea
          v-model="settings.systemPrompt"
          class="textarea-input"
          rows="3"
          :placeholder="t['systemPrompt'] || 'System Prompt'"
        ></textarea>
      </div>

      <div class="settings-actions">
        <BaseButton variant="default" @click="showSettings = false">
          {{ t['cancel'] || 'Cancel' }}
        </BaseButton>
        <BaseButton variant="primary" @click="saveSettingsHandler">
          {{ t['save'] || 'Save' }}
        </BaseButton>
      </div>
    </div>

    <div v-else class="chat-content">
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="chat-layout">
        <!-- Session List Sidebar -->
        <SessionSidebar
          v-if="sessions.length > 0"
          :sessions="sessions"
          :current-session-id="currentSessionId"
          @select="selectSession"
          @delete="deleteSession"
          @new="startNewSession"
        />

        <!-- Chat Area -->
        <div class="chat-main">
          <!-- Model Selector -->
          <div v-if="currentSessionId" class="model-selector">
            <BaseSelect
              :model-value="sessions.find(s => s.id === currentSessionId)?.modelId || ''"
              :options="availableModels"
              @update:model-value="handleModelChange"
            />
          </div>

          <ChatMessages
            :messages="messages"
            :is-loading="isLoading"
          />

          <ChatInput
            :disabled="isLoading"
            @send="handleSendMessage"
          />
        </div>
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

.textarea-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 6px;
  background-color: var(--spotlight-input-bg, var(--spotlight-bg));
  color: var(--spotlight-text);
  outline: none;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  transition: border-color 0.15s;
}

.textarea-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
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

.chat-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.model-selector {
  padding: 8px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.model-selector :deep(.base-select) {
  max-width: 300px;
}
</style>
