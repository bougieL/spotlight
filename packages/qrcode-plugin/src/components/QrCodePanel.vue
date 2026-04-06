<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from '@spotlight/i18n';
import logger from '@spotlight/logger';
import QRCode from 'qrcode';
import { usePanelContext } from '@spotlight/core';

const STORAGE_KEY = 'qrcode-history';
const MAX_HISTORY = 50;

const { query, placeholder } = usePanelContext();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const { t } = useI18n();
const inputText = ref('');
const qrCodeDataUrl = ref('');
const copySuccess = ref(false);
const errorMessage = ref('');
const history = ref<string[]>([]);

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value));
  } catch {
    // ignore
  }
}

function addToHistory(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  history.value = history.value.filter((item) => item !== trimmed);
  history.value.unshift(trimmed);
  if (history.value.length > MAX_HISTORY) {
    history.value = history.value.slice(0, MAX_HISTORY);
  }
  saveHistory();
}

function removeFromHistory(index: number) {
  history.value.splice(index, 1);
  saveHistory();
}

function selectHistory(text: string) {
  inputText.value = text;
  generateQRCode();
}

onMounted(() => {
  placeholder.value = t('qrcode.placeholder');
  history.value = loadHistory();
  if (query.value && query.value.trim()) {
    inputText.value = query.value.trim();
    generateQRCode();
  }
});

onBeforeUnmount(() => {
  placeholder.value = '';
});

watch(inputText, (newValue) => {
  if (newValue.trim()) {
    generateQRCode();
  } else {
    qrCodeDataUrl.value = '';
    errorMessage.value = '';
  }
});

async function generateQRCode() {
  if (!inputText.value.trim()) {
    qrCodeDataUrl.value = '';
    errorMessage.value = '';
    return;
  }

  try {
    const dataUrl = await QRCode.toDataURL(inputText.value, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    qrCodeDataUrl.value = dataUrl;
    errorMessage.value = '';
    addToHistory(inputText.value);
    logger.info('QR code generated successfully');
  } catch (error) {
    logger.error('Failed to generate QR code:', error);
    errorMessage.value = t('qrcode.error');
    qrCodeDataUrl.value = '';
  }
}

async function copyQRCodeToClipboard() {
  if (!qrCodeDataUrl.value) {
    return;
  }

  try {
    const response = await fetch(qrCodeDataUrl.value);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    copySuccess.value = true;
    addToHistory(inputText.value);
    logger.info('QR code copied to clipboard');
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } catch (error) {
    logger.error('Failed to copy QR code to clipboard:', error);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <div
    class="qrcode-panel"
    @keydown="handleKeydown"
  >
    <div class="qrcode-input-section">
      <input
        v-model="inputText"
        type="text"
        class="qrcode-input"
        :placeholder="t('qrcode.placeholder')"
        autofocus
      >
    </div>

    <div
      v-if="errorMessage"
      class="qrcode-error"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="qrCodeDataUrl"
      class="qrcode-preview"
    >
      <img
        :src="qrCodeDataUrl"
        alt="QR Code"
        class="qrcode-image"
      >
      <button
        class="qrcode-copy-button"
        :class="{ 'copy-success': copySuccess }"
        @click="copyQRCodeToClipboard"
      >
        {{ copySuccess ? t('qrcode.copied') : t('qrcode.copy') }}
      </button>
    </div>

    <div
      v-if="history.length > 0"
      class="qrcode-history"
    >
      <div class="qrcode-history-header">
        {{ t('qrcode.history') }}
      </div>
      <div class="qrcode-history-list">
        <div
          v-for="(item, index) in history"
          :key="item + index"
          class="qrcode-history-item"
          @click="selectHistory(item)"
        >
          <span class="qrcode-history-text">{{ item }}</span>
          <button
            class="qrcode-history-delete"
            @click.stop="removeFromHistory(index)"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qrcode-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.qrcode-input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.qrcode-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  font-size: 16px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s;
}

.qrcode-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.qrcode-input::placeholder {
  color: var(--spotlight-placeholder);
}

.qrcode-error {
  margin-top: 12px;
  padding: 8px 12px;
  font-size: 14px;
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
  border-radius: 6px;
}

.qrcode-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 24px;
  gap: 16px;
}

.qrcode-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.qrcode-copy-button {
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: #fff;
  transition: background-color 0.15s, opacity 0.15s;
}

.qrcode-copy-button:hover {
  opacity: 0.9;
}

.qrcode-copy-button.copy-success {
  background-color: #16a34a;
}

.qrcode-history {
  margin-top: 16px;
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  padding-top: 12px;
}

.qrcode-history-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--spotlight-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.qrcode-history-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}

.qrcode-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.qrcode-history-item:hover {
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
}

.qrcode-history-text {
  flex: 1;
  font-size: 13px;
  color: var(--spotlight-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qrcode-history-delete {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--spotlight-placeholder);
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.1s, background-color 0.1s;
}

.qrcode-history-item:hover .qrcode-history-delete {
  opacity: 1;
}

.qrcode-history-delete:hover {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}
</style>
