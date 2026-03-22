<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from '@spotlight/i18n';
import logger from '@spotlight/logger';
import QRCode from 'qrcode';

interface Props {
  query: string;
  onReady?: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
const inputText = ref('');
const qrCodeDataUrl = ref('');
const copySuccess = ref(false);
const errorMessage = ref('');
const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (props.query && props.query.trim()) {
    inputText.value = props.query.trim();
    generateQRCode();
  }
  props.onReady?.();
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
  <div class="qrcode-panel" @keydown="handleKeydown">
    <div class="qrcode-input-section">
      <input
        v-model="inputText"
        type="text"
        class="qrcode-input"
        :placeholder="t('qrcode.placeholder')"
        autofocus
      />
    </div>

    <div v-if="errorMessage" class="qrcode-error">
      {{ errorMessage }}
    </div>

    <div v-if="qrCodeDataUrl" class="qrcode-preview">
      <img :src="qrCodeDataUrl" alt="QR Code" class="qrcode-image" />
      <button
        class="qrcode-copy-button"
        :class="{ 'copy-success': copySuccess }"
        @click="copyQRCodeToClipboard"
      >
        {{ copySuccess ? t('qrcode.copied') : t('qrcode.copy') }}
      </button>
    </div>

    <canvas ref="canvasRef" style="display: none" />
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
</style>
