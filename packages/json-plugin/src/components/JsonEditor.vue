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
    <div ref="editorContainer" class="json-content"></div>
    <div v-if="error" class="json-error">{{ t('json.invalidJson') }}: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from '@spotlight/i18n';
import { BaseButton } from '@spotlight/components';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view';
import { json } from '@codemirror/lang-json';
import { foldGutter, foldAll, unfoldAll, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

const { t } = useI18n();

const editorContainer = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
let editorView: EditorView | null = null;

function createEditorExtensions(): Extension {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightSpecialChars(),
    foldGutter(),
    json(),
    syntaxHighlighting(defaultHighlightStyle),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        validateJson(update.state.doc.toString());
      }
    }),
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '13px',
      },
      '.cm-scroller': {
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
        overflow: 'auto',
      },
      '.cm-content': {
        caretColor: 'var(--spotlight-text)',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: 'var(--spotlight-text)',
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--spotlight-item-hover)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--spotlight-bg)',
        color: 'var(--spotlight-placeholder)',
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--spotlight-item-hover)',
      },
      '.cm-foldGutter': {
        width: '14px',
      },
    }),
  ];
}

function validateJson(content: string) {
  if (!content.trim()) {
    error.value = null;
    return;
  }
  try {
    JSON.parse(content);
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function initEditor() {
  if (!editorContainer.value) return;

  const state = EditorState.create({
    doc: '',
    extensions: createEditorExtensions(),
  });

  editorView = new EditorView({
    state,
    parent: editorContainer.value,
  });
}

function handleFormat() {
  if (!editorView) return;
  const content = editorView.state.doc.toString();
  if (!content.trim()) return;
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: formatted },
    });
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleMinify() {
  if (!editorView) return;
  const content = editorView.state.doc.toString();
  if (!content.trim()) return;
  try {
    const parsed = JSON.parse(content);
    const minified = JSON.stringify(parsed);
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: minified },
    });
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleFoldAll() {
  if (!editorView) return;
  foldAll(editorView);
}

function handleUnfoldAll() {
  if (!editorView) return;
  unfoldAll(editorView);
}

function handleCopy() {
  if (!editorView) return;
  navigator.clipboard.writeText(editorView.state.doc.toString());
}

function handleClear() {
  if (!editorView) return;
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: '' },
  });
  error.value = null;
}

onMounted(() => {
  initEditor();
});

onUnmounted(() => {
  editorView?.destroy();
});
</script>

<style scoped>
.json-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.json-content {
  flex: 1;
  overflow: hidden;
}

.json-content :deep(.cm-editor) {
  height: 100%;
}

.json-error {
  padding: 8px 12px;
  color: var(--spotlight-error, #e53935);
  background-color: var(--spotlight-error-bg, rgba(229, 57, 53, 0.1));
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}
</style>
