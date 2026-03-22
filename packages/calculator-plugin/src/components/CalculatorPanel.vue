<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

interface Props {
  query: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const STORAGE_KEY = 'calculator_expressions';

const expressions = ref<string[]>(['', '', '']);

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length === 3) {
        expressions.value = parsed;
      }
    } catch {
      // Invalid JSON, use defaults
    }
  }
});

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expressions.value));
}

watch(
  () => expressions.value,
  () => {
    saveToStorage();
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
</script>

<template>
  <div class="calculator-panel">
    <div class="calculator-inputs">
      <div v-for="(_, index) in expressions" :key="index" class="input-row">
        <input
          v-model="expressions[index]"
          type="text"
          class="calculator-input"
          :placeholder="`${index + 1}:`"
          @input="handleInput(index)"
          @keydown="handleKeydown(index, $event)"
        />
        <button class="clear-button" @click="clearInput(index)" :title="'Clear'">
          ×
        </button>
      </div>
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
  gap: 12px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calculator-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 18px;
  font-family: monospace;
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.15));
  border-radius: 8px;
  background-color: var(--spotlight-calc-display-bg, var(--spotlight-bg));
  color: var(--spotlight-text);
  outline: none;
  transition: border-color 0.15s;
}

.calculator-input:focus {
  border-color: var(--spotlight-primary, var(--spotlight-icon, #666));
}

.calculator-input::placeholder {
  color: var(--spotlight-placeholder);
}

.clear-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  background-color: var(--spotlight-calc-button-bg, var(--spotlight-item-hover, rgba(0, 0, 0, 0.05)));
  color: var(--spotlight-text);
  transition: background-color 0.15s;
}

.clear-button:hover {
  background-color: var(--spotlight-calc-button-hover, rgba(0, 0, 0, 0.1));
}

.clear-button:active {
  background-color: var(--spotlight-calc-button-active, rgba(0, 0, 0, 0.15));
}
</style>
