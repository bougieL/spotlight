<template>
  <div class="json-editor">
    <div class="json-toolbar">
      <BaseButton size="small" @click="handleFormat">{{ t('json.format') }}</BaseButton>
      <BaseButton size="small" @click="handleMinify">{{ t('json.minify') }}</BaseButton>
      <div class="toolbar-separator"></div>
      <BaseButton size="small" @click="handleFoldAll">{{ t('json.foldAll') }}</BaseButton>
      <BaseButton size="small" @click="handleUnfoldAll">{{ t('json.unfoldAll') }}</BaseButton>
      <div class="toolbar-separator"></div>
      <BaseButton size="small" @click="handleCopy">{{ t('json.copy') }}</BaseButton>
      <BaseButton size="small" @click="handleClear">{{ t('json.clear') }}</BaseButton>
    </div>
    <div class="json-body">
      <div class="json-gutter">
        <div
          v-for="(line, index) in displayLines"
          :key="index"
          class="json-line-number"
          :class="{ 'json-foldable': line.foldable, 'json-folded': line.folded }"
          @click="line.foldable && toggleFold(index)"
        >
          <span v-if="line.foldable" class="json-fold-marker">{{ line.folded ? '▶' : '▼' }}</span>
          <span>{{ index + 1 }}</span>
        </div>
      </div>
      <div class="json-editor-area">
        <pre ref="highlightRef" class="json-highlight" aria-hidden="true"></pre>
        <textarea
          ref="textareaRef"
          v-model="content"
          class="json-textarea"
          spellcheck="false"
          @input="onInput"
          @scroll="syncScroll"
          @keydown="onKeydown"
        ></textarea>
      </div>
    </div>
    <div v-if="error" class="json-error">{{ t('json.invalidJson') }}: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from '@spotlight/i18n';
import { BaseButton } from '@spotlight/components';
import { parseJson } from '../utils/parseJson';

const { t } = useI18n();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const highlightRef = ref<HTMLPreElement | null>(null);
const content = ref('');
const error = ref<string | null>(null);
const foldedLines = ref<Set<number>>(new Set());

interface DisplayLine {
  text: string;
  foldable: boolean;
  folded: boolean;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface HighlightOptions {
  match: string;
  str?: string;
  colon?: string;
  num?: string;
  bool?: string;
  nil?: string;
}

function highlightJson(code: string): string {
  return code.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|\b(true|false)\b|\b(null)\b|[{}[,]:]/g,
    ({ match, str, colon, num, bool, nil }: HighlightOptions) => {
      if (str) {
        return colon
          ? `<span class="json-key">${escapeHtml(match)}</span>`
          : `<span class="json-string">${escapeHtml(match)}</span>`;
      }
      if (num) return `<span class="json-number">${escapeHtml(match)}</span>`;
      if (bool) return `<span class="json-boolean">${escapeHtml(match)}</span>`;
      if (nil) return `<span class="json-null">${escapeHtml(match)}</span>`;
      return escapeHtml(match);
    },
  );
}

function findFoldRanges(code: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const stack: number[] = [];
  const lines = code.split('\n');

  let charIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      if (ch === '{' || ch === '[') {
        stack.push(charIndex);
      } else if (ch === '}' || ch === ']') {
        const start = stack.pop();
        if (start !== undefined && charIndex - start > 2) {
          const startLine = code.substring(0, start).split('\n').length - 1;
          if (startLine === i - 1 || startLine === i) {
            // skip single-line
          } else {
            ranges.push({ start: startLine, end: i });
          }
        }
      }
      charIndex++;
    }
    charIndex++;
  }
  return ranges;
}

const foldRanges = computed(() => findFoldRanges(content.value));

const displayLines = computed<DisplayLine[]>(() => {
  const lines = content.value.split('\n');
  const result: DisplayLine[] = [];
  const skipUntil = -1;

  for (let i = 0; i < lines.length; i++) {
    const foldable = foldRanges.value.some((r) => r.start === i);
    const folded = foldedLines.value.has(i);
    const insideFolded = foldRanges.value.some(
      (r) => foldedLines.value.has(r.start) && i > r.start && i <= r.end,
    );

    if (insideFolded && i !== skipUntil) {
      continue;
    }

    result.push({
      text: lines[i],
      foldable,
      folded,
    });
  }
  return result;
});

function toggleFold(lineIndex: number) {
  if (foldedLines.value.has(lineIndex)) {
    foldedLines.value.delete(lineIndex);
  } else {
    foldedLines.value.add(lineIndex);
  }
  foldedLines.value = new Set(foldedLines.value);
  updateHighlight();
}

function getDisplayCode(): string {
  const lines = content.value.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const insideFolded = foldRanges.value.some(
      (r) => foldedLines.value.has(r.start) && i > r.start && i <= r.end,
    );
    if (insideFolded) continue;
    result.push(lines[i]);
  }
  return result.join('\n');
}

function updateHighlight() {
  if (!highlightRef.value) return;
  const displayCode = getDisplayCode();
  highlightRef.value.innerHTML = highlightJson(displayCode) + '\n';
}

function onInput() {
  validateJson();
  updateHighlight();
}

function syncScroll() {
  if (!highlightRef.value || !textareaRef.value) return;
  highlightRef.value.scrollTop = textareaRef.value.scrollTop;
  highlightRef.value.scrollLeft = textareaRef.value.scrollLeft;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const ta = textareaRef.value;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    content.value = content.value.substring(0, start) + '  ' + content.value.substring(end);
    nextTick(() => {
      ta.selectionStart = ta.selectionEnd = start + 2;
    });
  }
}

function validateJson() {
  const text = content.value.trim();
  if (!text) {
    error.value = null;
    return;
  }
  try {
    parseJson(text);
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleFormat() {
  const text = content.value.trim();
  if (!text) return;
  try {
    const parsed = parseJson(text);
    content.value = JSON.stringify(parsed, null, 2);
    foldedLines.value = new Set();
    error.value = null;
    updateHighlight();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleMinify() {
  const text = content.value.trim();
  if (!text) return;
  try {
    const parsed = parseJson(text);
    content.value = JSON.stringify(parsed);
    foldedLines.value = new Set();
    error.value = null;
    updateHighlight();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleFoldAll() {
  const newSet = new Set<number>();
  for (const range of foldRanges.value) {
    newSet.add(range.start);
  }
  foldedLines.value = newSet;
  updateHighlight();
}

function handleUnfoldAll() {
  foldedLines.value = new Set();
  updateHighlight();
}

function handleCopy() {
  navigator.clipboard.writeText(content.value);
}

function handleClear() {
  content.value = '';
  foldedLines.value = new Set();
  error.value = null;
  updateHighlight();
}

watch(content, () => {
  nextTick(updateHighlight);
});
</script>

<style scoped>
.json-editor {
  display: flex;
  flex-direction: column;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
  border-radius: 8px;
  overflow: hidden;
}

.json-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--spotlight-bg-secondary, var(--spotlight-bg));
  border-bottom: 1px solid var(--spotlight-border);
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background-color: var(--spotlight-border);
  margin: 0 4px;
}

.json-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.json-gutter {
  display: flex;
  flex-direction: column;
  padding: 0 4px;
  background-color: var(--spotlight-bg-secondary, var(--spotlight-bg));
  border-right: 1px solid var(--spotlight-border);
  user-select: none;
  overflow: hidden;
}

.json-line-number {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 21px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--spotlight-placeholder);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.json-foldable {
  cursor: pointer;
}

.json-foldable:hover {
  color: var(--spotlight-text);
}

.json-fold-marker {
  font-size: 10px;
  width: 12px;
}

.json-editor-area {
  position: relative;
  flex: 1;
  min-height: 400px;
  overflow: hidden;
}

.json-textarea,
.json-highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 12px;
  font-size: 13px;
  line-height: 21px;
  tab-size: 2;
  white-space: pre;
  overflow: auto;
  box-sizing: border-box;
}

.json-textarea {
  color: transparent;
  caret-color: var(--spotlight-text);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  z-index: 1;
}

.json-highlight {
  color: var(--spotlight-text);
  background-color: var(--spotlight-bg);
  pointer-events: none;
  z-index: 0;
}

.json-highlight :deep(.json-key) {
  color: var(--spotlight-json-key, #9c27b0);
}

.json-highlight :deep(.json-string) {
  color: var(--spotlight-json-string, #2e7d32);
}

.json-highlight :deep(.json-number) {
  color: var(--spotlight-json-number, #1565c0);
}

.json-highlight :deep(.json-boolean) {
  color: var(--spotlight-json-boolean, #e65100);
}

.json-highlight :deep(.json-null) {
  color: var(--spotlight-json-null, #757575);
}

.json-error {
  padding: 8px 12px;
  color: var(--spotlight-error, #e53935);
  background-color: var(--spotlight-error-bg, rgba(229, 57, 53, 0.1));
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}
</style>
