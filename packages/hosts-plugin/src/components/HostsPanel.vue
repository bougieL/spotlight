<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePanelContext } from '@spotlight/core';
import { useI18n } from '@spotlight/i18n';
import { BaseInput, BaseCheckbox, BaseButton, BaseIconButton } from '@spotlight/components';
import type { HostsEntry } from '../types';
import { readHostsFile, writeHostsFile, openHostsFileLocation } from '../api';
import { Trash2, Plus, Save, RotateCcw, FolderOpen, Edit2, X, Check, AlertTriangle } from 'lucide-vue-next';

const { t } = useI18n();
const { placeholder } = usePanelContext();

const emit = defineEmits<{
  (_e: 'close'): void;
}>();

const entries = ref<HostsEntry[]>([]);
const rawContent = ref('');
const filePath = ref('');
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const editingEntry = ref<HostsEntry | null>(null);
const isAddingNew = ref(false);
const newEntry = ref<HostsEntry>({ ip: '', domain: '', comment: '', enabled: true, lineNumber: -1 });
const originalEntries = ref<HostsEntry[]>([]);

const hasChanges = computed(() => {
  return JSON.stringify(entries.value) !== JSON.stringify(originalEntries.value);
});

const disabledEntriesCount = computed(() => {
  return entries.value.filter(e => !e.enabled).length;
});

onMounted(async () => {
  placeholder.value = t('hosts.panel.title');
  await loadHostsFile();
});

async function loadHostsFile() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const result = await readHostsFile();
    entries.value = result.entries;
    rawContent.value = result.raw;
    filePath.value = result.filePath;
    originalEntries.value = JSON.parse(JSON.stringify(result.entries));
  } catch (error) {
    errorMessage.value = String(error);
    if (String(error).includes('Administrator') || String(error).includes('admin') || String(error).includes('denied')) {
      errorMessage.value = t('hosts.panel.adminRequired');
    }
  } finally {
    isLoading.value = false;
  }
}

async function saveHostsFile() {
  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await writeHostsFile(entries.value);
    successMessage.value = t('hosts.panel.saveSuccess');
    originalEntries.value = JSON.parse(JSON.stringify(entries.value));
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (error) {
    errorMessage.value = t('hosts.panel.saveError') + ': ' + String(error);
  } finally {
    isSaving.value = false;
  }
}

function startEdit(entry: HostsEntry) {
  editingEntry.value = { ...entry };
  isAddingNew.value = false;
}

function startAdd() {
  newEntry.value = { ip: '127.0.0.1', domain: '', comment: '', enabled: true, lineNumber: -1 };
  isAddingNew.value = true;
  editingEntry.value = null;
}

function cancelEdit() {
  editingEntry.value = null;
  isAddingNew.value = false;
}

function confirmEdit() {
  if (!editingEntry.value) return;

  if (!isValidIp(editingEntry.value.ip)) {
    errorMessage.value = t('hosts.panel.invalidIp');
    return;
  }
  if (!isValidDomain(editingEntry.value.domain)) {
    errorMessage.value = t('hosts.panel.invalidDomain');
    return;
  }

  const exists = entries.value.some(
    e => e.ip === editingEntry.value!.ip &&
         e.domain === editingEntry.value!.domain &&
         e.lineNumber !== editingEntry.value!.lineNumber
  );
  if (exists) {
    errorMessage.value = t('hosts.panel.duplicateEntry');
    return;
  }

  if (isAddingNew.value) {
    entries.value.push(editingEntry.value);
  } else {
    const index = entries.value.findIndex(e => e.lineNumber === editingEntry.value!.lineNumber);
    if (index !== -1) {
      entries.value[index] = editingEntry.value;
    }
  }

  editingEntry.value = null;
  isAddingNew.value = false;
  errorMessage.value = '';
}

function deleteEntry(entry: HostsEntry) {
  const index = entries.value.findIndex(e => e.lineNumber === entry.lineNumber);
  if (index !== -1) {
    entries.value.splice(index, 1);
  }
}

function toggleEntry(entry: HostsEntry) {
  entry.enabled = !entry.enabled;
}

function deleteAllDisabled() {
  entries.value = entries.value.filter(e => e.enabled);
}

async function openFileLocation() {
  try {
    await openHostsFileLocation();
  } catch (error) {
    errorMessage.value = String(error);
  }
}

function isValidIp(ip: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Pattern.test(ip);
}

function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return domainPattern.test(domain);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (editingEntry.value || isAddingNew.value) {
      cancelEdit();
    } else {
      emit('close');
    }
  }
}
</script>

<template>
  <div
    class="hosts-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <!-- Header -->
    <div class="panel-header">
      <div class="header-title">
        <h2>{{ t('hosts.panel.title') }}</h2>
        <span class="file-path">{{ filePath }}</span>
      </div>
      <div class="header-actions">
        <BaseIconButton
          :title="t('hosts.panel.refresh')"
          @click="loadHostsFile"
        >
          <RotateCcw :size="16" />
        </BaseIconButton>
        <BaseIconButton
          :title="t('hosts.panel.openFile')"
          @click="openFileLocation"
        >
          <FolderOpen :size="16" />
        </BaseIconButton>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="errorMessage" class="message error">
      <AlertTriangle :size="16" />
      <span>{{ errorMessage }}</span>
      <button
        class="message-close"
        @click="errorMessage = ''"
      >
        <X :size="14" />
      </button>
    </div>
    <div v-if="successMessage" class="message success">
      <Check :size="16" />
      <span>{{ successMessage }}</span>
      <button
        class="message-close"
        @click="successMessage = ''"
      >
        <X :size="14" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner" />
    </div>

    <!-- Content -->
    <div v-else class="panel-content">
      <!-- Table Header -->
      <div class="table-header">
        <div class="col-status">{{ t('hosts.panel.enabled') }}</div>
        <div class="col-ip">{{ t('hosts.panel.ipAddress') }}</div>
        <div class="col-domain">{{ t('hosts.panel.domainName') }}</div>
        <div class="col-comment">{{ t('hosts.panel.comment') }}</div>
        <div class="col-actions">{{ t('hosts.panel.actions') }}</div>
      </div>

      <!-- Entries List -->
      <div class="entries-list">
        <div
          v-for="entry in entries"
          :key="entry.lineNumber"
          class="entry-row"
          :class="{ disabled: !entry.enabled }"
        >
          <!-- View Mode -->
          <template v-if="editingEntry?.lineNumber === entry.lineNumber">
            <div class="col-status">
              <BaseCheckbox v-model="editingEntry.enabled" />
            </div>
            <div class="col-ip">
              <BaseInput v-model="editingEntry.ip" size="small" />
            </div>
            <div class="col-domain">
              <BaseInput v-model="editingEntry.domain" size="small" />
            </div>
            <div class="col-comment">
              <BaseInput
                :model-value="editingEntry.comment ?? ''"
                size="small"
                @update:model-value="editingEntry.comment = $event || undefined"
              />
            </div>
            <div class="col-actions">
              <BaseIconButton
                :title="t('hosts.panel.save')"
                @click="confirmEdit"
              >
                <Check :size="14" />
              </BaseIconButton>
              <BaseIconButton
                :title="t('hosts.panel.cancel')"
                @click="cancelEdit"
              >
                <X :size="14" />
              </BaseIconButton>
            </div>
          </template>

          <!-- Display Mode -->
          <template v-else>
            <div class="col-status">
              <button
                class="toggle-btn"
                :class="{ active: entry.enabled }"
                :title="entry.enabled ? t('hosts.panel.enabled') : t('hosts.panel.disabled')"
                @click="toggleEntry(entry)"
              >
                <Check v-if="entry.enabled" :size="14" />
              </button>
            </div>
            <div class="col-ip">{{ entry.ip }}</div>
            <div class="col-domain">{{ entry.domain }}</div>
            <div class="col-comment">{{ entry.comment || '-' }}</div>
            <div class="col-actions">
              <BaseIconButton
                :title="t('hosts.panel.editEntry')"
                @click="startEdit(entry)"
              >
                <Edit2 :size="14" />
              </BaseIconButton>
              <BaseIconButton
                :title="t('hosts.panel.deleteEntry')"
                @click="deleteEntry(entry)"
              >
                <Trash2 :size="14" />
              </BaseIconButton>
            </div>
          </template>
        </div>

        <!-- Add New Entry -->
        <div v-if="isAddingNew" class="entry-row add-new-row">
          <div class="col-status">
            <BaseCheckbox v-model="newEntry.enabled" />
          </div>
          <div class="col-ip">
            <BaseInput
              v-model="newEntry.ip"
              size="small"
              placeholder="127.0.0.1"
            />
          </div>
          <div class="col-domain">
            <BaseInput
              v-model="newEntry.domain"
              size="small"
              placeholder="example.com"
            />
          </div>
          <div class="col-comment">
            <BaseInput
              :model-value="newEntry.comment ?? ''"
              size="small"
              placeholder="# comment"
              @update:model-value="newEntry.comment = $event || undefined"
            />
          </div>
          <div class="col-actions">
            <BaseIconButton
              :title="t('hosts.panel.save')"
              @click="confirmEdit"
            >
              <Check :size="14" />
            </BaseIconButton>
            <BaseIconButton
              :title="t('hosts.panel.cancel')"
              @click="cancelEdit"
            >
              <X :size="14" />
            </BaseIconButton>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="entries.length === 0 && !isAddingNew" class="empty-state">
          <p>{{ t('hosts.panel.noEntries') }}</p>
          <p class="empty-hint">{{ t('hosts.panel.addFirst') }}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="panel-footer">
      <div class="footer-left">
        <BaseButton
          v-if="disabledEntriesCount > 0"
          variant="danger"
          size="small"
          @click="deleteAllDisabled"
        >
          <Trash2 :size="14" />
          {{ t('hosts.panel.deleteAllDisabled') }} ({{ disabledEntriesCount }})
        </BaseButton>
      </div>
      <div class="footer-right">
        <BaseButton
          variant="default"
          size="small"
          @click="startAdd"
        >
          <Plus :size="14" />
          {{ t('hosts.panel.addEntry') }}
        </BaseButton>
        <BaseButton
          variant="primary"
          size="small"
          :disabled="!hasChanges || isSaving"
          @click="saveHostsFile"
        >
          <Save :size="14" />
          {{ isSaving ? '...' : t('hosts.panel.save') }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hosts-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
  outline: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.header-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--spotlight-text);
}

.file-path {
  font-size: 11px;
  color: var(--spotlight-placeholder);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 16px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.message.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.message.success {
  background-color: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.message-close {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  opacity: 0.7;
}

.message-close:hover {
  opacity: 1;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-top-color: var(--spotlight-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
}

.table-header {
  display: flex;
  padding: 8px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--spotlight-placeholder);
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.02));
}

.entries-list {
  padding: 8px 0;
}

.entry-row {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.05));
  transition: background-color 0.15s;
}

.entry-row:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.03));
}

.entry-row.disabled {
  opacity: 0.5;
}

.add-new-row {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.col-status {
  width: 60px;
  flex-shrink: 0;
}

.col-ip {
  width: 140px;
  flex-shrink: 0;
  font-size: 13px;
}

.col-domain {
  flex: 1;
  font-size: 13px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-comment {
  width: 200px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--spotlight-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-actions {
  width: 100px;
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.empty-state {
  padding: 48px 16px;
  text-align: center;
  color: var(--spotlight-placeholder);
}

.empty-hint {
  font-size: 13px;
  margin-top: 4px;
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.02));
}

.footer-left,
.footer-right {
  display: flex;
  gap: 8px;
}
</style>
