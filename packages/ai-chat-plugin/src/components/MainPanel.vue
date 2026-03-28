<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { MessageSquare, Plus, Settings, Send, ArrowLeft, Pin, Trash2, Edit2 } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseButton, BaseIconButton, BaseModal, BaseContextMenu, BaseSelect } from '@spotlight/components';
import { aiChatPlugin, openaiAdapter, anthropicAdapter, type Session, type ChatMessage, type ModelConfig } from '../index';
import ModelsEditor from './ModelsEditor.vue';
import MessageList from './MessageList.vue';

type ViewType = 'chat' | 'models';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();

const sessions = ref<Session[]>([]);
const models = ref<ModelConfig[]>([]);
const activeSessionId = ref<string | null>(null);
const isStreaming = ref(false);
const streamedContent = ref('');
const inputText = ref('');
const showSystemPrompt = ref(false);
const currentView = ref<ViewType>('chat');
const isEditingSystemPrompt = ref(false);
const editingSystemPrompt = ref('');

// Edit session modal state
const showEditModal = ref(false);
const editingSession = ref<Session | null>(null);
const editSessionTitle = ref('');
const editSessionSystemPrompt = ref('');

// Context menu state
const contextMenuOpen = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuSession = ref<Session | null>(null);

function openContextMenu(event: MouseEvent, session: Session) {
  contextMenuOpen.value = false;
  contextMenuSession.value = session;
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuOpen.value = true;
  event.preventDefault();
}

function closeContextMenu() {
  contextMenuOpen.value = false;
  contextMenuX.value = 0;
  contextMenuY.value = 0;
  contextMenuSession.value = null;
}

function handleContextMenuAction(action: string) {
  if (!contextMenuSession.value) return;

  switch (action) {
    case 'pin':
      togglePin(contextMenuSession.value);
      break;
    case 'edit':
      openEditModal(contextMenuSession.value);
      break;
    case 'delete':
      deleteSession(contextMenuSession.value);
      break;
  }
  closeContextMenu();
}

onMounted(async () => {
  [sessions.value, models.value] = await Promise.all([
    aiChatPlugin.getSessions(),
    aiChatPlugin.getModels(),
  ]);

  // Create default session if none exists
  if (sessions.value.length === 0) {
    const modelId = models.value[0]?.id || '';
    const session = await aiChatPlugin.createSession(modelId);
    sessions.value.push(session);
    activeSessionId.value = session.id;
  } else {
    const settings = await aiChatPlugin.getSettings();
    if (settings.selectedSessionId) {
      activeSessionId.value = settings.selectedSessionId;
    } else {
      activeSessionId.value = sessions.value[0].id;
    }
  }
});

const sortedSessions = computed(() => {
  return [...sessions.value].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return b.updatedAt - a.updatedAt;
  });
});

const contextMenuItems = computed(() => {
  if (!contextMenuSession.value) return [];
  const session = contextMenuSession.value;
  return [
    {
      label: session.isPinned ? t('aiChat.unpin') : t('aiChat.pin'),
      icon: Pin,
      click: () => handleContextMenuAction('pin'),
    },
    {
      label: t('aiChat.editSession'),
      icon: Edit2,
      click: () => handleContextMenuAction('edit'),
    },
    {
      label: t('aiChat.deleteSession'),
      icon: Trash2,
      click: () => handleContextMenuAction('delete'),
    },
  ];
});

const activeSession = computed(() => {
  if (!activeSessionId.value) return null;
  return sessions.value.find(s => s.id === activeSessionId.value) || null;
});

const activeModel = computed(() => {
  if (!activeSession.value) return null;
  return models.value.find(m => m.id === activeSession.value!.modelId) || null;
});

const modelOptions = computed(() => {
  return models.value.map(m => ({
    value: m.id,
    label: `${m.provider}/${m.name || m.id}`,
  }));
});

const messages = computed(() => {
  return activeSession.value?.messages || [];
});

async function createSession() {
  const modelId = models.value[0]?.id || '';
  const session = await aiChatPlugin.createSession(modelId);
  sessions.value.push(session);
  activeSessionId.value = session.id;
  await aiChatPlugin.saveSettings({
    selectedSessionId: session.id,
    temperature: 0.7,
    maxTokens: 4096,
  });
}

async function selectSession(session: Session) {
  activeSessionId.value = session.id;
  await aiChatPlugin.saveSettings({
    selectedSessionId: session.id,
    temperature: 0.7,
    maxTokens: 4096,
  });
}

async function selectModel(modelId: string) {
  if (!activeSessionId.value) return;
  await aiChatPlugin.updateSession(activeSessionId.value, { modelId });
  const session = sessions.value.find(s => s.id === activeSessionId.value);
  if (session) {
    session.modelId = modelId;
  }
}

async function deleteSession(session: Session) {
  if (confirm(t('aiChat.confirmDeleteSession'))) {
    await aiChatPlugin.deleteSession(session.id);
    sessions.value = sessions.value.filter(s => s.id !== session.id);
    if (activeSessionId.value === session.id) {
      activeSessionId.value = sessions.value[0]?.id || null;
    }
  }
}

async function togglePin(session: Session) {
  const newPinned = !session.isPinned;
  await aiChatPlugin.updateSession(session.id, { isPinned: newPinned });
  session.isPinned = newPinned;
}

function openEditModal(session: Session) {
  editingSession.value = session;
  editSessionTitle.value = session.title;
  editSessionSystemPrompt.value = session.systemPrompt;
  showEditModal.value = true;
}

function closeEditModal() {
  showEditModal.value = false;
  editingSession.value = null;
  editSessionTitle.value = '';
  editSessionSystemPrompt.value = '';
}

async function saveSessionEdit() {
  if (!editingSession.value) return;

  await aiChatPlugin.updateSession(editingSession.value.id, {
    title: editSessionTitle.value,
    systemPrompt: editSessionSystemPrompt.value,
  });

  editingSession.value.title = editSessionTitle.value;
  editingSession.value.systemPrompt = editSessionSystemPrompt.value;

  closeEditModal();
}

function startEditingSystemPrompt(session: Session) {
  editingSystemPrompt.value = session.systemPrompt;
  isEditingSystemPrompt.value = true;
}

async function saveSystemPrompt() {
  if (!activeSessionId.value) return;
  await aiChatPlugin.updateSession(activeSessionId.value, { systemPrompt: editingSystemPrompt.value });
  const session = sessions.value.find(s => s.id === activeSessionId.value);
  if (session) {
    session.systemPrompt = editingSystemPrompt.value;
  }
  isEditingSystemPrompt.value = false;
}

function cancelEditingSystemPrompt() {
  isEditingSystemPrompt.value = false;
  editingSystemPrompt.value = '';
}

async function sendMessage() {
  if (!inputText.value.trim() || isStreaming.value || !activeSession.value || !activeModel.value) return;

  // Set streaming state immediately to prevent double-send during async operations
  isStreaming.value = true;

  const userMessage: ChatMessage = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
    role: 'user',
    content: inputText.value.trim(),
    timestamp: Date.now(),
  };

  messages.value.push(userMessage);
  await aiChatPlugin.addMessage(activeSession.value.id, userMessage);
  inputText.value = '';

  await processStream();
}

async function processStream() {
  if (!activeSession.value || !activeModel.value) return;

  isStreaming.value = true;
  streamedContent.value = '';

  const assistantMessageId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  let fullContent = '';

  const allMessages: ChatMessage[] = [];
  if (activeSession.value.systemPrompt) {
    allMessages.push({
      id: 'system',
      role: 'system',
      content: activeSession.value.systemPrompt,
      timestamp: Date.now(),
    });
  }
  allMessages.push(...messages.value);

  const adapter = activeModel.value.endpointType === 'anthropic' ? anthropicAdapter : openaiAdapter;

  try {
    const generator = adapter.streamChat(allMessages, activeModel.value, {
      temperature: 0.7,
      maxTokens: 4096,
    });

    for await (const chunk of generator) {
      if (chunk.done) break;
      fullContent += chunk.content;
      streamedContent.value = fullContent;
    }

    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: fullContent,
      timestamp: Date.now(),
    };

    messages.value.push(assistantMessage);
    await aiChatPlugin.addMessage(activeSession.value.id, assistantMessage);
  } catch (error) {
    const errorMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: `${t('aiChat.error.requestFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now(),
    };
    messages.value.push(errorMessage);
    await aiChatPlugin.addMessage(activeSession.value.id, errorMessage);
  } finally {
    isStreaming.value = false;
    streamedContent.value = '';
  }
}

async function saveModels(newModels: ModelConfig[]) {
  models.value = newModels;
  await aiChatPlugin.saveModels(models.value);
}

function openModelsView() {
  currentView.value = 'models';
}

function openChatView() {
  currentView.value = 'chat';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <div class="main-panel" tabindex="0" @keydown="handleKeydown">
    <!-- Models Full Panel -->
    <div class="full-panel" v-if="currentView === 'models'">
      <div class="panel-header">
        <div class="header-left">
          <BaseIconButton @click="openChatView" :title="t('aiChat.back')">
            <ArrowLeft :size="16" />
          </BaseIconButton>
          <h2 class="panel-title">{{ t('aiChat.models') }}</h2>
        </div>
      </div>
      <ModelsEditor :models="models" @save="saveModels" @close="openChatView" />
    </div>

    <!-- Chat View with Sidebar -->
    <template v-else>
      <!-- Sessions Sidebar -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">{{ t('aiChat.sessions') }}</h2>
          <div class="sidebar-actions">
            <BaseIconButton @click="openModelsView" :title="t('aiChat.models')">
              <Settings :size="16" />
            </BaseIconButton>
            <BaseIconButton @click="createSession" :title="t('aiChat.newSession')">
              <Plus :size="16" />
            </BaseIconButton>
          </div>
        </div>

        <div class="sessions-list">
          <div
            v-for="session in sortedSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: activeSessionId === session.id }"
            @click="selectSession(session)"
            @contextmenu.prevent="openContextMenu($event, session)"
          >
            <div class="session-info">
              <MessageSquare :size="14" class="session-icon" />
              <div class="session-details">
                <span class="session-title">{{ session.title || t('aiChat.newSession') }}</span>
                <span class="session-date">{{ formatDate(session.updatedAt) }}</span>
              </div>
            </div>
            <Pin v-if="session.isPinned" :size="14" class="pin-icon-right" />
          </div>

          <div v-if="sortedSessions.length === 0" class="empty-sessions">
            <p>{{ t('aiChat.noSessions') }}</p>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="chat-area">
        <div class="system-prompt-bar" v-if="showSystemPrompt && activeSession">
          <div v-if="!isEditingSystemPrompt" class="system-prompt-view">
            <span class="system-prompt-text">{{ activeSession.systemPrompt || t('aiChat.systemPromptPlaceholder') }}</span>
            <BaseIconButton @click="startEditingSystemPrompt(activeSession)" :title="t('aiChat.editModel')">
              <Settings :size="14" />
            </BaseIconButton>
          </div>
          <div v-else class="system-prompt-edit">
            <textarea
              v-model="editingSystemPrompt"
              class="system-prompt-input"
              :placeholder="t('aiChat.systemPromptPlaceholder')"
              rows="3"
            ></textarea>
            <div class="edit-actions">
              <BaseButton variant="primary" size="small" @click="saveSystemPrompt">
                {{ t('aiChat.save') }}
              </BaseButton>
              <BaseButton variant="default" size="small" @click="cancelEditingSystemPrompt">
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

        <div class="input-container" v-if="activeSession">
          <textarea
            v-model="inputText"
            class="message-input"
            :placeholder="t('aiChat.placeholder')"
            :disabled="isStreaming"
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <BaseIconButton
            @click="sendMessage"
            :disabled="!inputText.trim() || isStreaming"
            :title="t('aiChat.send')"
            size="large"
          >
            <Send :size="16" />
          </BaseIconButton>
        </div>

        <div class="chat-toolbar" v-if="activeSession && models.length > 0">
          <BaseSelect
            :model-value="activeSession.modelId"
            :options="modelOptions"
            @update:model-value="selectModel"
          />
        </div>
      </div>

      <!-- Edit Session Modal -->
      <BaseModal :show="showEditModal" :title="t('aiChat.editSession')" @close="closeEditModal">
        <div class="edit-form">
          <div class="form-group">
            <label class="form-label">{{ t('aiChat.sessionName') }}</label>
            <BaseInput
              v-model="editSessionTitle"
              :placeholder="t('aiChat.sessionNamePlaceholder')"
            />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('aiChat.systemPrompt') }}</label>
            <textarea
              v-model="editSessionSystemPrompt"
              class="form-textarea"
              :placeholder="t('aiChat.systemPromptPlaceholder')"
              rows="4"
            ></textarea>
          </div>
        </div>
        <template #footer>
          <BaseButton variant="default" @click="closeEditModal">{{ t('aiChat.cancel') }}</BaseButton>
          <BaseButton variant="primary" @click="saveSessionEdit">{{ t('aiChat.save') }}</BaseButton>
        </template>
      </BaseModal>

      <!-- Context Menu -->
      <BaseContextMenu
        :items="contextMenuItems"
        :visible="contextMenuOpen"
        :x="contextMenuX"
        :y="contextMenuY"
        @close="closeContextMenu"
      />
    </template>
  </div>
</template>

<style scoped>
.main-panel {
  display: flex;
  background-color: var(--spotlight-bg);
  outline: none;
}

/* Full Panel (Models) */
.full-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
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

/* Sidebar */
.sidebar {
  width: 220px;
  border-right: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 12px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--spotlight-text);
  margin: 0;
}

.sidebar-actions {
  display: flex;
  gap: 4px;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.05));
}

.session-item:hover {
  background-color: var(--spotlight-item-hover);
}

.session-item {
  border-left: 3px solid transparent;
}

.session-item.active {
  background-color: var(--spotlight-primary-light, rgba(100, 100, 100, 0.15));
  border-left: 3px solid var(--spotlight-primary, var(--spotlight-icon, #666));
}

.session-item.active .session-icon {
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.session-item.active .session-title {
  font-weight: 600;
}

.pin-icon-right {
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
  flex-shrink: 0;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.session-icon {
  color: var(--spotlight-icon, #666);
  flex-shrink: 0;
}

.session-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.session-title {
  font-size: 13px;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  font-size: 11px;
  color: var(--spotlight-placeholder);
}

.empty-sessions {
  padding: 20px;
  text-align: center;
  color: var(--spotlight-placeholder);
  font-size: 12px;
}

/* Chat Area */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.system-prompt-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--spotlight-placeholder);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.system-prompt-btn:hover {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
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
}

.system-prompt-input:focus {
  outline: none;
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

/* Edit Form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.form-textarea {
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  resize: none;
  font-family: inherit;
  outline: none;
}

.form-textarea:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.form-textarea::placeholder {
  color: var(--spotlight-placeholder);
}
</style>
