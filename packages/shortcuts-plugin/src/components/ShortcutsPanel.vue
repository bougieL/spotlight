<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import shortcutsPlugin from '../index';
import type { ShortcutItem } from '../types';
import { useI18n } from '@spotlight/i18n';

const { t } = useI18n();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const shortcuts = ref<ShortcutItem[]>([]);
const isAdding = ref(false);
const isEditing = ref(false);
const editingShortcut = ref<ShortcutItem | null>(null);
const formName = ref('');
const formCommand = ref('');
const formDescription = ref('');
const searchQuery = ref('');
const executingId = ref<string | null>(null);

onMounted(async () => {
  const data = await shortcutsPlugin.getShortcuts();
  shortcuts.value = data.items;
});

const filteredShortcuts = computed(() => {
  if (!searchQuery.value.trim()) {
    return shortcuts.value;
  }
  const terms = searchQuery.value.toLowerCase().split(/\s+/);
  return shortcuts.value.filter(item =>
    terms.some(term =>
      item.name.toLowerCase().includes(term) ||
      item.command.toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term)
    )
  );
});

function startAdd() {
  isAdding.value = true;
  isEditing.value = false;
  editingShortcut.value = null;
  formName.value = '';
  formCommand.value = '';
  formDescription.value = '';
}

function startEdit(item: ShortcutItem) {
  isEditing.value = true;
  isAdding.value = false;
  editingShortcut.value = item;
  formName.value = item.name;
  formCommand.value = item.command;
  formDescription.value = item.description || '';
}

function cancelEdit() {
  isAdding.value = false;
  isEditing.value = false;
  editingShortcut.value = null;
  formName.value = '';
  formCommand.value = '';
  formDescription.value = '';
}

async function saveShortcut() {
  if (!formName.value.trim() || !formCommand.value.trim()) {
    return;
  }

  if (isEditing.value && editingShortcut.value) {
    await shortcutsPlugin.updateShortcut(editingShortcut.value.id, {
      name: formName.value.trim(),
      command: formCommand.value.trim(),
      description: formDescription.value.trim() || undefined,
    });
    const index = shortcuts.value.findIndex(s => s.id === editingShortcut.value?.id);
    if (index !== -1) {
      shortcuts.value[index] = {
        ...shortcuts.value[index],
        name: formName.value.trim(),
        command: formCommand.value.trim(),
        description: formDescription.value.trim() || undefined,
      };
    }
  } else if (isAdding.value) {
    const newShortcut = await shortcutsPlugin.addShortcut({
      name: formName.value.trim(),
      command: formCommand.value.trim(),
      description: formDescription.value.trim() || undefined,
    });
    shortcuts.value.push(newShortcut);
  }

  cancelEdit();
}

async function deleteShortcut(item: ShortcutItem) {
  await shortcutsPlugin.deleteShortcut(item.id);
  shortcuts.value = shortcuts.value.filter(s => s.id !== item.id);
}

async function executeShortcut(item: ShortcutItem) {
  executingId.value = item.id;
  try {
    await shortcutsPlugin.executeCommand(item.command);
  } finally {
    setTimeout(() => {
      executingId.value = null;
    }, 500);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (isAdding.value || isEditing.value) {
      cancelEdit();
    } else {
      emit('close');
    }
  }
}
</script>

<template>
  <div
    class="shortcuts-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <div
      v-if="!isAdding && !isEditing"
      class="shortcuts-content"
    >
      <div class="shortcuts-header">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="t('shortcuts.placeholder')"
        >
        <button
          class="add-btn"
          @click="startAdd"
        >
          + {{ t('shortcuts.add') }}
        </button>
      </div>

      <div
        v-if="filteredShortcuts.length === 0"
        class="empty-state"
      >
        <p>{{ t('shortcuts.empty') }}</p>
      </div>

      <div
        v-else
        class="shortcuts-list"
      >
        <div
          v-for="item in filteredShortcuts"
          :key="item.id"
          class="shortcut-item"
        >
          <div
            class="shortcut-info"
            @click="executeShortcut(item)"
          >
            <div class="shortcut-name">
              {{ item.name }}
            </div>
            <div class="shortcut-command">
              {{ item.command }}
            </div>
            <div
              v-if="item.description"
              class="shortcut-desc"
            >
              {{ item.description }}
            </div>
          </div>
          <div class="shortcut-actions">
            <span
              v-if="executingId === item.id"
              class="executing"
            >
              {{ t('shortcuts.running') }}
            </span>
            <button
              class="action-btn"
              :title="t('shortcuts.edit')"
              @click.stop="startEdit(item)"
            >
              {{ t('shortcuts.edit') }}
            </button>
            <button
              class="action-btn delete"
              :title="t('shortcuts.delete')"
              @click.stop="deleteShortcut(item)"
            >
              {{ t('shortcuts.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="shortcuts-form"
    >
      <h3>{{ isEditing ? t('shortcuts.edit') : t('shortcuts.add') }}</h3>

      <div class="form-group">
        <label>{{ t('shortcuts.nameLabel') }}</label>
        <input
          v-model="formName"
          type="text"
          class="form-input"
          :placeholder="t('shortcuts.namePlaceholder')"
        >
      </div>

      <div class="form-group">
        <label>{{ t('shortcuts.command') }}</label>
        <input
          v-model="formCommand"
          type="text"
          class="form-input"
          :placeholder="t('shortcuts.commandPlaceholder')"
        >
      </div>

      <div class="form-group">
        <label>{{ t('shortcuts.descLabel') }}</label>
        <input
          v-model="formDescription"
          type="text"
          class="form-input"
          :placeholder="t('shortcuts.descriptionPlaceholder')"
        >
      </div>

      <div class="form-actions">
        <button
          class="btn cancel"
          @click="cancelEdit"
        >
          {{ t('shortcuts.cancel') }}
        </button>
        <button
          class="btn save"
          @click="saveShortcut"
        >
          {{ t('shortcuts.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shortcuts-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
  max-height: 400px;
  overflow-y: auto;
}

.shortcuts-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shortcuts-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  height: var(--spotlight-control-height);
  padding: 0 12px;
  border: 1px solid var(--spotlight-border);
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.search-input::placeholder {
  color: var(--spotlight-placeholder);
}

.add-btn {
  height: var(--spotlight-control-height);
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-btn:hover {
  opacity: 0.9;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: var(--spotlight-placeholder);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--spotlight-border);
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  transition: background-color 0.15s;
}

.shortcut-item:hover {
  background-color: var(--spotlight-item-hover);
}

.shortcut-info {
  flex: 1;
  cursor: pointer;
}

.shortcut-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.shortcut-command {
  font-size: 12px;
  color: var(--spotlight-text-secondary);
  font-family: monospace;
  margin-top: 4px;
}

.shortcut-desc {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  margin-top: 4px;
}

.shortcut-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.executing {
  font-size: 12px;
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--spotlight-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.action-btn:hover {
  background-color: var(--spotlight-item-hover);
}

.action-btn.delete {
  color: #e53935;
}

.action-btn.delete:hover {
  background-color: rgba(229, 57, 53, 0.1);
}

.shortcuts-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shortcuts-form h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--spotlight-text);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--spotlight-text-secondary);
}

.form-input {
  height: var(--spotlight-control-height);
  padding: 0 12px;
  border: 1px solid var(--spotlight-border);
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.form-input::placeholder {
  color: var(--spotlight-placeholder);
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  height: var(--spotlight-control-height);
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:hover {
  opacity: 0.9;
}

.btn.cancel {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.btn.save {
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
}
</style>
