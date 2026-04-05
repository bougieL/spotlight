<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@spotlight/i18n';
import { aiChatPlugin, type Session, type ChatMessage, type ModelConfig } from '../index';
import SessionsSidebar from './SessionsSidebar.vue';
import ChatArea from './ChatArea.vue';

const router = useRouter();
const { t } = useI18n();

const emit = defineEmits<{ (_e: 'close'): void }>();

const sessions = ref<Session[]>([]);
const models = ref<ModelConfig[]>([]);
const activeSessionId = ref<string | null>(null);
const isStreaming = ref(false);
const streamedContent = ref('');
const inputText = ref('');
const showSystemPrompt = ref(false);
const isEditingSystemPrompt = ref(false);
const editingSystemPrompt = ref('');

const showEditModal = ref(false);
const editingSession = ref<Session | null>(null);
const editSessionTitle = ref('');
const editSessionSystemPrompt = ref('');

const contextMenuOpen = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuSession = ref<Session | null>(null);

onMounted(async () => {
  [sessions.value, models.value] = await Promise.all([
    aiChatPlugin.getSessions(),
    aiChatPlugin.getModels(),
  ]);

  if (sessions.value.length === 0) {
    const session = await aiChatPlugin.createSession(models.value[0]?.id || '');
    sessions.value.push(session);
    activeSessionId.value = session.id;
  } else {
    const settings = await aiChatPlugin.getSettings();
    activeSessionId.value = settings.selectedSessionId || sessions.value[0].id;
  }
});

const activeSession = computed(() => sessions.value.find(s => s.id === activeSessionId.value) || null);

function openContextMenu(event: MouseEvent, session: Session) {
  contextMenuOpen.value = false;
  contextMenuSession.value = session;
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuOpen.value = true;
}

function closeContextMenu() {
  contextMenuOpen.value = false;
  contextMenuSession.value = null;
}

async function createSession() {
  const session = await aiChatPlugin.createSession(models.value[0]?.id || '');
  sessions.value.push(session);
  activeSessionId.value = session.id;
  await aiChatPlugin.saveSettings({ selectedSessionId: session.id, temperature: 0.7, maxTokens: 4096 });
}

async function selectSession(session: Session) {
  activeSessionId.value = session.id;
  await aiChatPlugin.saveSettings({ selectedSessionId: session.id, temperature: 0.7, maxTokens: 4096 });
}

async function selectModel(modelId: string) {
  if (!activeSessionId.value) return;
  await aiChatPlugin.updateSession(activeSessionId.value, { modelId });
  const session = sessions.value.find(s => s.id === activeSessionId.value);
  if (session) session.modelId = modelId;
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

function handleContextMenuAction(action: string) {
  if (!contextMenuSession.value) return;
  switch (action) {
    case 'pin': togglePin(contextMenuSession.value); break;
    case 'edit': openEditModal(contextMenuSession.value); break;
    case 'delete': deleteSession(contextMenuSession.value); break;
  }
  closeContextMenu();
}

function startEditingSystemPrompt() {
  editingSystemPrompt.value = activeSession.value?.systemPrompt || '';
  isEditingSystemPrompt.value = true;
}

async function saveSystemPrompt() {
  if (!activeSessionId.value) return;
  await aiChatPlugin.updateSession(activeSessionId.value, { systemPrompt: editingSystemPrompt.value });
  const session = sessions.value.find(s => s.id === activeSessionId.value);
  if (session) session.systemPrompt = editingSystemPrompt.value;
  isEditingSystemPrompt.value = false;
}

function cancelEditingSystemPrompt() {
  isEditingSystemPrompt.value = false;
  editingSystemPrompt.value = '';
}

async function sendMessage() {
  if (!inputText.value.trim() || isStreaming.value || !activeSession.value || !models.value.length) return;
  isStreaming.value = true;

  const userMessage: ChatMessage = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
    role: 'user',
    content: inputText.value.trim(),
    timestamp: Date.now(),
  };

  activeSession.value.messages.push(userMessage);
  await aiChatPlugin.addMessage(activeSession.value.id, userMessage);
  inputText.value = '';

  await processStream();
}

async function processStream() {
  if (!activeSession.value) return;
  isStreaming.value = true;
  streamedContent.value = '';

  const allMessages: ChatMessage[] = [];
  if (activeSession.value.systemPrompt) {
    allMessages.push({ id: 'system', role: 'system', content: activeSession.value.systemPrompt, timestamp: Date.now() });
  }
  allMessages.push(...activeSession.value.messages);

  const model = models.value.find(m => m.id === activeSession.value!.modelId);
  if (!model) return;

  try {
    const { openaiAdapter, anthropicAdapter } = await import('../index');
    const adapter = model.endpointType === 'anthropic' ? anthropicAdapter : openaiAdapter;
    const generator = adapter.streamChat({
      messages: allMessages,
      config: model,
      options: { temperature: 0.7, maxTokens: 4096 },
    });

    let fullContent = '';
    const assistantMessageId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

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
    activeSession.value.messages.push(assistantMessage);
    await aiChatPlugin.addMessage(activeSession.value.id, assistantMessage);
  } catch (error) {
    const errorMessage: ChatMessage = {
      id: Date.now().toString(36),
      role: 'assistant',
      content: `${t('aiChat.error.requestFailed')}: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now(),
    };
    activeSession.value.messages.push(errorMessage);
    await aiChatPlugin.addMessage(activeSession.value.id, errorMessage);
  } finally {
    isStreaming.value = false;
    streamedContent.value = '';
  }
}

function openModels() {
  router.push({ name: 'ai-chat-plugin:models' });
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}
</script>

<template>
  <div
    class="main-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <SessionsSidebar
      :sessions="sessions"
      :active-session-id="activeSessionId"
      :models="models"
      :show-edit-modal="showEditModal"
      :editing-session="editingSession"
      :edit-session-title="editSessionTitle"
      :edit-session-system-prompt="editSessionSystemPrompt"
      :context-menu-open="contextMenuOpen"
      :context-menu-x="contextMenuX"
      :context-menu-y="contextMenuY"
      :context-menu-session="contextMenuSession"
      @create-session="createSession"
      @select-session="selectSession"
      @open-context-menu="openContextMenu"
      @close-context-menu="closeContextMenu"
      @context-menu-action="handleContextMenuAction"
      @open-models="openModels"
      @open-edit-modal="openEditModal"
      @close-edit-modal="closeEditModal"
      @save-session-edit="saveSessionEdit"
      @update:edit-session-title="editSessionTitle = $event"
      @update:edit-session-system-prompt="editSessionSystemPrompt = $event"
    />

    <ChatArea
      :active-session="activeSession"
      :models="models"
      :is-streaming="isStreaming"
      :streamed-content="streamedContent"
      :input-text="inputText"
      :show-system-prompt="showSystemPrompt"
      :is-editing-system-prompt="isEditingSystemPrompt"
      :editing-system-prompt="editingSystemPrompt"
      @send-message="sendMessage"
      @update:input-text="inputText = $event"
      @start-editing-system-prompt="startEditingSystemPrompt"
      @save-system-prompt="saveSystemPrompt"
      @cancel-editing-system-prompt="cancelEditingSystemPrompt"
      @update:editing-system-prompt="editingSystemPrompt = $event"
      @select-model="selectModel"
    />
  </div>
</template>

<style scoped>
.main-panel {
  display: flex;
  background-color: var(--spotlight-bg);
  outline: none;
}
</style>