<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { webpagePlugin, type WebpageItem } from '../index';
import { usePanelContext } from '@spotlight/core';
import { useI18n } from '@spotlight/i18n';

const { t } = useI18n();
const { query } = usePanelContext();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const webpages = ref<WebpageItem[]>([]);
const isAdding = ref(false);
const isEditing = ref<string | null>(null);
const editingName = ref('');
const editingUrl = ref('');
const activeWebpage = ref<WebpageItem | null>(null);
const iframeLoaded = ref(false);

const isEmpty = computed(() => webpages.value.length === 0 && !isAdding.value);

onMounted(async () => {
  webpages.value = await webpagePlugin.getWebpages();

  if (query.value) {
    const target = webpages.value.find(
      (w) => w.name.toLowerCase().includes(query.value.toLowerCase()) || w.url.toLowerCase().includes(query.value.toLowerCase())
    );
    if (target) {
      activeWebpage.value = target;
    }
  }
});

function startAdd() {
  isAdding.value = true;
  editingName.value = '';
  editingUrl.value = '';
}

function startEdit(item: WebpageItem) {
  isEditing.value = item.id;
  editingName.value = item.name;
  editingUrl.value = item.url;
}

function cancelEdit() {
  isAdding.value = false;
  isEditing.value = null;
  editingName.value = '';
  editingUrl.value = '';
}

async function saveEdit() {
  if (!editingName.value.trim() || !editingUrl.value.trim()) {
    return;
  }

  if (isAdding.value) {
    const newItem = await webpagePlugin.addWebpage(editingName.value, editingUrl.value);
    webpages.value.push(newItem);
  } else if (isEditing.value) {
    await webpagePlugin.updateWebpage(isEditing.value, { name: editingName.value, url: editingUrl.value });
    const index = webpages.value.findIndex((w) => w.id === isEditing.value);
    if (index !== -1) {
      webpages.value[index] = { ...webpages.value[index], name: editingName.value.trim(), url: editingUrl.value.trim() };
    }
  }

  cancelEdit();
}

async function deleteWebpage(id: string) {
  await webpagePlugin.deleteWebpage(id);
  webpages.value = webpages.value.filter((w) => w.id !== id);
  if (activeWebpage.value?.id === id) {
    activeWebpage.value = null;
  }
}

function openWebpage(item: WebpageItem) {
  activeWebpage.value = item;
  iframeLoaded.value = false;
}

function closeIframe() {
  activeWebpage.value = null;
}

function handleIframeLoad() {
  iframeLoaded.value = true;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (activeWebpage.value) {
      closeIframe();
    } else {
      emit('close');
    }
  }
}
</script>

<template>
  <div
    class="webpage-panel"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <!-- Iframe View -->
    <div
      v-if="activeWebpage"
      class="iframe-container"
    >
      <div class="iframe-header">
        <span class="iframe-title">{{ activeWebpage.name }}</span>
        <div class="iframe-actions">
          <a
            :href="activeWebpage.url"
            target="_blank"
            rel="noopener noreferrer"
            class="open-external"
            :title="t('webpage.open')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line
                x1="10"
                y1="14"
                x2="21"
                y2="3"
              />
            </svg>
          </a>
          <button
            class="close-iframe"
            :title="t('webpage.cancel')"
            @click="closeIframe"
          >
            ×
          </button>
        </div>
      </div>
      <div class="iframe-wrapper">
        <div
          v-if="!iframeLoaded"
          class="iframe-loading"
        >
          <span>Loading...</span>
        </div>
        <iframe
          :src="activeWebpage.url"
          :class="{ loaded: iframeLoaded }"
          frameborder="0"
          @load="handleIframeLoad"
        />
      </div>
    </div>

    <!-- List View -->
    <div
      v-else
      class="webpage-list"
    >
      <div
        v-if="isEmpty && !isAdding"
        class="empty-state"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <line
            x1="2"
            y1="12"
            x2="22"
            y2="12"
          />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <p>{{ t('webpage.empty') }}</p>
        <span>{{ t('webpage.empty.hint') }}</span>
      </div>

      <!-- Add/Edit Form -->
      <div
        v-if="isAdding || isEditing"
        class="webpage-form"
      >
        <input
          v-model="editingName"
          type="text"
          class="form-input"
          :placeholder="t('webpage.name.placeholder')"
          @keydown.enter="saveEdit"
          @keydown.escape="cancelEdit"
        >
        <input
          v-model="editingUrl"
          type="text"
          class="form-input"
          :placeholder="t('webpage.url.placeholder')"
          @keydown.enter="saveEdit"
          @keydown.escape="cancelEdit"
        >
        <div class="form-actions">
          <button
            class="btn btn-secondary"
            @click="cancelEdit"
          >
            {{ t('webpage.cancel') }}
          </button>
          <button
            class="btn btn-primary"
            :disabled="!editingName.trim() || !editingUrl.trim()"
            @click="saveEdit"
          >
            {{ t('webpage.save') }}
          </button>
        </div>
      </div>

      <!-- Webpage List Items -->
      <div class="list-items">
        <div
          v-for="item in webpages"
          :key="item.id"
          class="webpage-item"
        >
          <div
            v-if="isEditing === item.id"
            class="webpage-form inline"
          >
            <input
              v-model="editingName"
              type="text"
              class="form-input"
              :placeholder="t('webpage.name.placeholder')"
              @keydown.enter="saveEdit"
              @keydown.escape="cancelEdit"
            >
            <input
              v-model="editingUrl"
              type="text"
              class="form-input"
              :placeholder="t('webpage.url.placeholder')"
              @keydown.enter="saveEdit"
              @keydown.escape="cancelEdit"
            >
            <div class="form-actions">
              <button
                class="btn btn-secondary"
                @click="cancelEdit"
              >
                {{ t('webpage.cancel') }}
              </button>
              <button
                class="btn btn-primary"
                :disabled="!editingName.trim() || !editingUrl.trim()"
                @click="saveEdit"
              >
                {{ t('webpage.save') }}
              </button>
            </div>
          </div>
          <template v-else>
            <div
              class="item-content"
              @click="openWebpage(item)"
            >
              <div class="item-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <line
                    x1="2"
                    y1="12"
                    x2="22"
                    y2="12"
                  />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-url">{{ item.url }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button
                class="action-btn"
                :title="t('webpage.edit')"
                @click.stop="startEdit(item)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                class="action-btn delete"
                :title="t('webpage.delete')"
                @click.stop="deleteWebpage(item.id)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Add Button -->
      <button
        v-if="!isAdding && !isEditing"
        class="add-button"
        @click="startAdd"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line
            x1="12"
            y1="5"
            x2="12"
            y2="19"
          />
          <line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
          />
        </svg>
        {{ t('webpage.add') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.webpage-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--spotlight-bg);
  outline: none;
}

.webpage-list {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
  height: 100%;
}

.iframe-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.iframe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  background-color: var(--spotlight-bg);
}

.iframe-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.iframe-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.open-external,
.close-iframe {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--spotlight-text-secondary, var(--spotlight-icon, #666));
  background-color: transparent;
  transition: background-color 0.15s;
}

.open-external:hover,
.close-iframe:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.close-iframe {
  font-size: 18px;
  font-weight: 300;
}

.iframe-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.iframe-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--spotlight-placeholder);
}

.iframe-wrapper iframe {
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.2s;
}

.iframe-wrapper iframe.loaded {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;
  color: var(--spotlight-placeholder);
  text-align: center;
}

.empty-state svg {
  opacity: 0.5;
  margin-bottom: 8px;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: var(--spotlight-text-secondary);
}

.empty-state span {
  font-size: 12px;
}

.webpage-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-bg-secondary, var(--spotlight-bg));
}

.webpage-form.inline {
  width: 100%;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 6px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
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

.list-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.webpage-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.webpage-item .webpage-form.inline {
  flex: 1;
  border: none;
  padding: 0;
  gap: 8px;
}

.item-content {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  background-color: var(--spotlight-item-bg, transparent);
  transition: background-color 0.15s;
}

.item-content:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
  color: var(--spotlight-icon, #666);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-url {
  font-size: 12px;
  color: var(--spotlight-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.webpage-item:hover .item-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--spotlight-text-secondary, var(--spotlight-icon, #666));
  background-color: transparent;
  transition: background-color 0.15s;
}

.action-btn:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.1));
}

.action-btn.delete:hover {
  color: #dc3545;
}

.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background-color: transparent;
  color: var(--spotlight-placeholder);
  transition: all 0.15s;
  margin-top: auto;
}

.add-button:hover {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.1));
  color: var(--spotlight-text);
}

.btn-secondary:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.15));
}
</style>
