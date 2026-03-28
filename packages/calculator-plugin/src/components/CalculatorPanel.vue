<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { calculatorPlugin } from '../index';
import { usePanelContext } from '@spotlight/core';
import { useI18n } from '@spotlight/i18n';

const { t } = useI18n();
const { query } = usePanelContext();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const expressions = ref<string[]>(['', '', '']);

onMounted(async () => {
  let loadedExpressions = await calculatorPlugin.getExpressions();

  // If query is a math expression, prepend it as a new expression at the top
  if (query.value && isMathExpression(query.value)) {
    const queryExpr = query.value.startsWith('=') ? query.value.slice(1).trim() : query.value.trim();
    // Only prepend if the expression is not already in the list
    if (queryExpr && !loadedExpressions.includes(queryExpr)) {
      loadedExpressions = [queryExpr, ...loadedExpressions];
    }
  }

  expressions.value = loadedExpressions;
});

function isMathExpression(query: string): boolean {
  const mathPattern = /^[\d+\-*/().%\s^sqrtabsincostanlogexppi,]+$/i;
  const trimmed = query.trim();
  return mathPattern.test(trimmed) || trimmed.startsWith('=');
}

watch(
  () => expressions.value,
  async () => {
    await calculatorPlugin.saveExpressions(expressions.value);
  },
  { deep: true }
);

function evaluateExpression(expr: string): number | null {
  const cleanExpr = expr.startsWith('=') ? expr.slice(1) : expr;
  const trimmed = cleanExpr.trim();

  if (!trimmed) {
    return null;
  }

  const safePattern = /^[\d+\-*/().%\s^sqrtabsincontaolrllexppi\d,]+$/i;
  if (!safePattern.test(trimmed)) {
    return null;
  }

  let jsExpr = trimmed
    .replace(/\^/g, '**')
    .replace(/sqrt/gi, 'Math.sqrt')
    .replace(/abs/gi, 'Math.abs')
    .replace(/sin/gi, 'Math.sin')
    .replace(/cos/gi, 'Math.cos')
    .replace(/tan/gi, 'Math.tan')
    .replace(/log/gi, 'Math.log')
    .replace(/exp/gi, 'Math.exp')
    .replace(/pi/gi, String(Math.PI))
    .replace(/ln\s/g, 'Math.log(')
    .replace(/,\s*/g, ', ');

  jsExpr = jsExpr.replace(/(\d)\(/g, '$1*(');
  jsExpr = jsExpr.replace(/\)(\d)/g, ')*$1');
  jsExpr = jsExpr.replace(/(\d+)%/g, '($1/100)');

  try {
    const result = eval(jsExpr);
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

function formatResult(value: number): string {
  const formatted = Number(value.toPrecision(12));
  if (Number.isInteger(formatted)) {
    return formatted.toString();
  }
  return formatted.toString();
}

function handleInput(index: number) {
  const expr = expressions.value[index];
  if (expr.endsWith('=')) {
    const result = evaluateExpression(expr);
    if (result !== null) {
      expressions.value[index] = formatResult(result);
    }
  }
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const result = evaluateExpression(expressions.value[index]);
    if (result !== null) {
      const formatted = formatResult(result);
      expressions.value[index] = formatted;
      copyToClipboard(formatted);
    }
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

function clearInput(index: number) {
  expressions.value[index] = '';
}

function getResult(expr: string): string {
  if (!expr.trim()) {
    return '';
  }
  const result = evaluateExpression(expr);
  if (result !== null) {
    return formatResult(result);
  }
  return '';
}

function addExpression() {
  expressions.value.push('');
}

function removeExpression(index: number) {
  if (expressions.value.length > 1) {
    expressions.value.splice(index, 1);
  }
}
</script>

<template>
  <div class="calculator-panel">
    <div class="calculator-inputs">
      <div v-for="(expr, index) in expressions" :key="index" class="input-row">
        <div class="input-wrapper">
          <input
            v-model="expressions[index]"
            type="text"
            class="calculator-input"
            :placeholder="t('calculator.placeholder')"
            @input="handleInput(index)"
            @keydown="handleKeydown(index, $event)"
          />
          <div v-if="getResult(expr)" class="calculator-result">
            = {{ getResult(expr) }}
          </div>
        </div>
        <button class="clear-button" @click="clearInput(index)" title="Clear">
          ×
        </button>
        <button
          v-if="expressions.length > 1"
          class="remove-button"
          @click="removeExpression(index)"
          title="Remove"
        >
          -
        </button>
      </div>
      <button class="add-button" @click="addExpression" title="Add expression">
        +
      </button>
    </div>
  </div>
</template>

<style scoped>
.calculator-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.calculator-inputs {
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.input-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  font-size: 18px;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-calc-display-bg, var(--spotlight-bg));
  transition: border-color 0.15s;
}

.input-wrapper:focus-within {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.calculator-input {
  width: 100%;
  height: 32px;
  padding: 0;
  font-size: 18px;
  border: none;
  background: transparent;
  color: var(--spotlight-text);
  outline: none;
}

.calculator-input::placeholder {
  color: var(--spotlight-placeholder);
}

.calculator-result {
  align-self: flex-end;
  padding: 4px 0 0;
  font-size: 16px;
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.clear-button,
.remove-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 56px;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  background-color: var(--spotlight-calc-button-bg, var(--spotlight-item-hover, rgba(0, 0, 0, 0.05)));
  color: var(--spotlight-text);
  transition: background-color 0.15s;
}

.clear-button:hover,
.remove-button:hover {
  background-color: var(--spotlight-calc-button-hover, rgba(0, 0, 0, 0.1));
}

.clear-button:active,
.remove-button:active {
  background-color: var(--spotlight-calc-button-active, rgba(0, 0, 0, 0.15));
}

.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  border: 1px dashed var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  font-size: 24px;
  font-weight: 300;
  cursor: pointer;
  background-color: transparent;
  color: var(--spotlight-placeholder);
  transition: all 0.15s;
}

.add-button:hover {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
  color: var(--spotlight-primary, var(--spotlight-icon, #666));
}
</style>
