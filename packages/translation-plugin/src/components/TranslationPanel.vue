<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { translationPlugin } from '../index';
import { usePanelContext } from '@spotlight/core';
import { useI18n } from '@spotlight/i18n';
import { BaseIconButton, BaseSelect } from '@spotlight/components';
import { ArrowLeftRight, Copy, Check, AlertCircle, Loader2 } from 'lucide-vue-next';
import logger from '@spotlight/logger';

const { t } = useI18n();
const { query } = usePanelContext();

const TRANS_PREFIX_REGEX = /^(trans:|翻译:)\s*/i;

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

type TranslationStatus = 'idle' | 'loading' | 'success' | 'error';

const inputText = ref('');
const outputText = ref('');
const fromLang = ref('auto');
const toLang = ref('en');
const status = ref<TranslationStatus>('idle');
const errorMessage = ref('');
const isCopied = ref(false);
const models = ref<Array<{ id: string; name: string; provider: string }>>([]);
const selectedModelId = ref<string | null>(null);

const languages = translationPlugin.getLanguages();

const fromLanguageOptions = computed(() =>
  languages.map((lang) => ({ value: lang.code, label: t(lang.name) }))
);

const toLanguageOptions = computed(() =>
  languages.filter((lang) => lang.code !== 'auto').map((lang) => ({ value: lang.code, label: t(lang.name) }))
);

const modelOptions = computed(() =>
  models.value.map((model) => ({ value: model.id, label: `${model.name} (${model.provider})` }))
);

onMounted(async () => {
  const [lastLangs, availableModels, savedModelId] = await Promise.all([
    translationPlugin.getLastLanguages(),
    translationPlugin.getAvailableModels(),
    translationPlugin.getSelectedModelId(),
  ]);

  fromLang.value = lastLangs.from;
  toLang.value = lastLangs.to;
  models.value = availableModels;
  selectedModelId.value = savedModelId;

  if (query.value) {
    const textToTranslate = query.value.replace(TRANS_PREFIX_REGEX, '').trim();
    if (textToTranslate) {
      inputText.value = textToTranslate;
      await translate();
    }
  }
});

async function translate() {
  if (!inputText.value.trim()) {
    outputText.value = '';
    status.value = 'idle';
    return;
  }

  status.value = 'loading';
  errorMessage.value = '';
  outputText.value = '';

  try {
    const result = await translationPlugin.translate({ text: inputText.value, fromLang: fromLang.value, toLang: toLang.value });
    if (result) {
      outputText.value = result;
      status.value = 'success';
      await translationPlugin.saveLanguages(fromLang.value, toLang.value);
    } else {
      errorMessage.value = t('translation.error');
      status.value = 'error';
    }
  } catch {
    errorMessage.value = t('translation.error');
    status.value = 'error';
  }
}

async function swapLanguages() {
  if (fromLang.value === 'auto') {
    return;
  }

  const temp = fromLang.value;
  fromLang.value = toLang.value;
  toLang.value = temp;

  const tempText = inputText.value;
  inputText.value = outputText.value;
  outputText.value = tempText;

  if (inputText.value) {
    await translate();
  }
}

async function selectModel(modelId: string) {
  selectedModelId.value = modelId;
  await translationPlugin.setSelectedModelId(modelId);
}

async function copyToClipboard() {
  if (!outputText.value) return;

  try {
    await navigator.clipboard.writeText(outputText.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error) {
    logger.error('Failed to copy to clipboard:', error);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

async function handleInput() {
  await translate();
}
</script>

<template>
  <div
    class="translation-panel"
    @keydown="handleKeydown"
  >
    <div class="translation-container">
      <!-- Header Row -->
      <div class="header-row">
        <div class="language-row">
          <BaseSelect
            v-model="fromLang"
            :options="fromLanguageOptions"
            @update:model-value="handleInput"
          />
          <BaseIconButton
            :title="t('translation.swap')"
            @click="swapLanguages"
          >
            <ArrowLeftRight :size="16" />
          </BaseIconButton>
          <BaseSelect
            v-model="toLang"
            :options="toLanguageOptions"
            @update:model-value="handleInput"
          />
        </div>

        <BaseSelect
          v-model="selectedModelId!"
          :options="modelOptions"
          :placeholder="t('translation.selectModel')"
          @update:model-value="selectModel"
        />
      </div>

      <!-- Input Area -->
      <div class="translation-input-wrapper">
        <textarea
          v-model="inputText"
          class="translation-input"
          :placeholder="t('translation.placeholder')"
          :disabled="status === 'loading'"
          @input="handleInput"
        />
      </div>

      <!-- Output Area -->
      <div class="translation-output-wrapper">
        <!-- Loading State -->
        <div
          v-if="status === 'loading'"
          class="status-content"
        >
          <Loader2
            :size="20"
            class="spin"
          />
          <span>{{ t('translation.translating') }}</span>
        </div>

        <!-- Error State -->
        <div
          v-else-if="status === 'error'"
          class="status-content error"
        >
          <AlertCircle :size="20" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Success State -->
        <div
          v-else-if="status === 'success'"
          class="status-content success"
        >
          <div class="output-text">
            {{ outputText }}
          </div>
          <BaseIconButton
            :title="t('translation.copy')"
            @click="copyToClipboard"
          >
            <Check
              v-if="isCopied"
              :size="16"
              class="copied-icon"
            />
            <Copy
              v-else
              :size="16"
            />
          </BaseIconButton>
        </div>

        <!-- Idle State -->
        <div
          v-else
          class="status-content idle"
        >
          <span class="hint">{{ t('translation.hint') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.translation-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--spotlight-bg);
  outline: none;
}

.translation-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.language-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.translation-input-wrapper {
  flex: 1;
  min-height: 120px;
}

.translation-input {
  width: 100%;
  height: 100%;
  padding: 12px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  font-size: 16px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}

.translation-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.translation-input::placeholder {
  color: var(--spotlight-placeholder);
}

.translation-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.translation-output-wrapper {
  min-height: 80px;
  padding: 12px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-item-hover, rgba(0, 0, 0, 0.03));
}

.status-content {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  min-height: 56px;
}

.status-content.idle {
  color: var(--spotlight-placeholder);
}

.status-content.error {
  color: #dc3545;
}

.status-content.success {
  justify-content: space-between;
}

.status-content .hint {
  font-size: 14px;
  color: var(--spotlight-placeholder);
}

.status-content .output-text {
  flex: 1;
  font-size: 16px;
  color: var(--spotlight-text);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.copied-icon {
  color: #28a745;
}
</style>
