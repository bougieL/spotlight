<script setup lang="ts">
import { computed } from 'vue';
import { MessageSquare, Plus, Settings, Pin, Trash2, Edit2 } from 'lucide-vue-next';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton, BaseModal, BaseInput, BaseButton, BaseContextMenu } from '@spotlight/components';
import type { Session, ModelConfig } from '../index';

const props = defineProps<{
  sessions: Session[];
  activeSessionId: string | null;
  models: ModelConfig[];
  showEditModal: boolean;
  editingSession: Session | null;
  editSessionTitle: string;
  editSessionSystemPrompt: string;
  contextMenuOpen: boolean;
  contextMenuX: number;
  contextMenuY: number;
  contextMenuSession: Session | null;
}>();

const emit = defineEmits<{
  (_e: 'createSession'): void;
  (_e: 'selectSession', _session: Session): void;
  (_e: 'openContextMenu', _event: MouseEvent, _session: Session): void;
  (_e: 'closeContextMenu'): void;
  (_e: 'contextMenuAction', _action: string): void;
  (_e: 'openModels'): void;
  (_e: 'openEditModal', _session: Session): void;
  (_e: 'closeEditModal'): void;
  (_e: 'saveSessionEdit'): void;
  (_e: 'update:editSessionTitle', _value: string): void;
  (_e: 'update:editSessionSystemPrompt', _value: string): void;
}>();

const { t } = useI18n();

const sortedSessions = computed(() => {
  return [...props.sessions].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
});

const contextMenuItems = computed(() => {
  if (!props.contextMenuSession) return [];
  const session = props.contextMenuSession;
  return [
    { label: session.isPinned ? t('aiChat.unpin') : t('aiChat.pin'), icon: Pin, click: () => emit('contextMenuAction', 'pin') },
    { label: t('aiChat.editSession'), icon: Edit2, click: () => emit('contextMenuAction', 'edit') },
    { label: t('aiChat.deleteSession'), icon: Trash2, click: () => emit('contextMenuAction', 'delete') },
  ];
});

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-title">
        {{ t('aiChat.sessions') }}
      </h2>
      <div class="sidebar-actions">
        <BaseIconButton
          :title="t('aiChat.models')"
          @click="emit('openModels')"
        >
          <Settings :size="16" />
        </BaseIconButton>
        <BaseIconButton
          :title="t('aiChat.newSession')"
          @click="emit('createSession')"
        >
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
        @click="emit('selectSession', session)"
        @contextmenu.prevent="emit('openContextMenu', $event, session)"
      >
        <div class="session-info">
          <MessageSquare
            :size="14"
            class="session-icon"
          />
          <div class="session-details">
            <span class="session-title">{{ session.title || t('aiChat.newSession') }}</span>
            <span class="session-date">{{ formatDate(session.updatedAt) }}</span>
          </div>
        </div>
        <Pin
          v-if="session.isPinned"
          :size="14"
          class="pin-icon"
        />
      </div>
      <div
        v-if="sortedSessions.length === 0"
        class="empty-sessions"
      >
        <p>{{ t('aiChat.noSessions') }}</p>
      </div>
    </div>

    <!-- Edit Session Modal -->
    <BaseModal
      :show="showEditModal"
      :title="t('aiChat.editSession')"
      @close="emit('closeEditModal')"
    >
      <div class="edit-form">
        <div class="form-group">
          <label class="form-label">{{ t('aiChat.sessionName') }}</label>
          <BaseInput
            :model-value="editSessionTitle"
            :placeholder="t('aiChat.sessionNamePlaceholder')"
            @update:model-value="emit('update:editSessionTitle', $event)"
          />
        </div>
        <div class="form-group">
          <label class="form-label">{{ t('aiChat.systemPrompt') }}</label>
          <textarea
            :model-value="editSessionSystemPrompt"
            class="form-textarea"
            :placeholder="t('aiChat.systemPromptPlaceholder')"
            rows="4"
            @update:model-value="emit('update:editSessionSystemPrompt', $event)"
          />
        </div>
      </div>
      <template #footer>
        <BaseButton
          variant="default"
          @click="emit('closeEditModal')"
        >
          {{ t('aiChat.cancel') }}
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="emit('saveSessionEdit')"
        >
          {{ t('aiChat.save') }}
        </BaseButton>
      </template>
    </BaseModal>

    <BaseContextMenu
      :items="contextMenuItems"
      :visible="contextMenuOpen"
      :x="contextMenuX"
      :y="contextMenuY"
      @close="emit('closeContextMenu')"
    />
  </div>
</template>

<style scoped>
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

.session-item.active {
  background-color: var(--spotlight-primary-light, rgba(100, 100, 100, 0.15));
  border-left: 3px solid var(--spotlight-primary, var(--spotlight-icon, #666));
}

.session-item.active .session-icon {
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.pin-icon {
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