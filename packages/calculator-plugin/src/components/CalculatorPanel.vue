<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  query: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const expression = ref(props.query.replace(/^=/, ''));
const displayExpression = ref(props.query.replace(/^=/, ''));

const buttons = [
  { label: 'C', action: 'clear' },
  { label: '(', action: 'parenthesis' },
  { label: ')', action: 'parenthesis' },
  { label: '/', action: 'operator' },
  { label: '7', action: 'number' },
  { label: '8', action: 'number' },
  { label: '9', action: 'number' },
  { label: '*', action: 'operator' },
  { label: '4', action: 'number' },
  { label: '5', action: 'number' },
  { label: '6', action: 'number' },
  { label: '-', action: 'operator' },
  { label: '1', action: 'number' },
  { label: '2', action: 'number' },
  { label: '3', action: 'number' },
  { label: '+', action: 'operator' },
  { label: '0', action: 'number' },
  { label: '.', action: 'decimal' },
  { label: '=', action: 'equals' },
  { label: '⌫', action: 'backspace' },
];

const result = computed(() => {
  if (!expression.value.trim()) return '';
  const evalResult = evaluateExpression(expression.value);
  if (evalResult === null) return 'Error';
  return formatResult(evalResult);
});

function evaluateExpression(expr: string): number | null {
  const cleanExpr = expr.trim();
  if (!cleanExpr) return null;

  const safePattern = /^[\d+\-*/().%\s^sqrtabsincontaolrllexppi\d,]+$/i;
  if (!safePattern.test(cleanExpr)) return null;

  let jsExpr = cleanExpr
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
    const evalResult = eval(jsExpr);
    if (typeof evalResult === 'number' && isFinite(evalResult)) {
      return evalResult;
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

function handleButtonClick(button: { label: string; action: string }) {
  switch (button.action) {
    case 'clear':
      expression.value = '';
      displayExpression.value = '';
      break;
    case 'number':
    case 'operator':
    case 'decimal':
    case 'parenthesis':
      expression.value += button.label;
      displayExpression.value += button.label;
      break;
    case 'backspace':
      if (expression.value.length > 0) {
        expression.value = expression.value.slice(0, -1);
        displayExpression.value = displayExpression.value.slice(0, -1);
      }
      break;
    case 'equals':
      const evalResult = evaluateExpression(expression.value);
      if (evalResult !== null) {
        const formatted = formatResult(evalResult);
        displayExpression.value = formatted;
        expression.value = formatted;
        copyToClipboard(formatted);
      }
      break;
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
    return;
  }

  const key = event.key;
  if (/^[0-9]$/.test(key)) {
    expression.value += key;
    displayExpression.value += key;
  } else if (key === '.') {
    expression.value += '.';
    displayExpression.value += '.';
  } else if (key === '+' || key === '-' || key === '*' || key === '/') {
    expression.value += key;
    displayExpression.value += key;
  } else if (key === 'Enter' || key === '=') {
    handleButtonClick({ label: '=', action: 'equals' });
  } else if (key === 'Backspace') {
    handleButtonClick({ label: '⌫', action: 'backspace' });
  } else if (key === '(' || key === ')') {
    expression.value += key;
    displayExpression.value += key;
  }
}
</script>

<template>
  <div class="calculator-panel" tabindex="0" @keydown="handleKeydown">
    <div class="calculator-display">
      <div class="calculator-expression">{{ displayExpression || '0' }}</div>
      <div class="calculator-result">{{ result ? '=' + result : '' }}</div>
    </div>
    <div class="calculator-keypad">
      <button
        v-for="button in buttons"
        :key="button.label"
        class="calculator-button"
        :class="{
          'is-operator': ['/', '*', '-', '+'].includes(button.label),
          'is-equals': button.label === '=',
          'is-clear': button.label === 'C'
        }"
        @click="handleButtonClick(button)"
      >
        {{ button.label }}
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

.calculator-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px;
  margin-bottom: 12px;
  min-height: 80px;
  background-color: var(--spotlight-calc-display-bg);
  border-radius: 8px;
}

.calculator-expression {
  font-size: 24px;
  font-weight: 500;
  color: var(--spotlight-text);
  word-break: break-all;
  text-align: right;
}

.calculator-result {
  font-size: 16px;
  color: var(--spotlight-placeholder);
  margin-top: 4px;
}

.calculator-keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.calculator-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  background-color: var(--spotlight-calc-button-bg);
  color: var(--spotlight-text);
  transition: background-color 0.15s;
}

.calculator-button:hover {
  background-color: var(--spotlight-calc-button-hover);
}

.calculator-button:active {
  background-color: var(--spotlight-calc-button-active);
}

.calculator-button.is-operator {
  background-color: var(--spotlight-calc-operator-bg);
}

.calculator-button.is-operator:hover {
  background-color: var(--spotlight-calc-operator-hover);
}

.calculator-button.is-equals {
  background-color: var(--spotlight-calc-equals-bg);
  color: var(--spotlight-calc-equals-text);
}

.calculator-button.is-equals:hover {
  background-color: var(--spotlight-calc-equals-hover);
}

.calculator-button.is-clear {
  background-color: var(--spotlight-calc-clear-bg);
  color: var(--spotlight-calc-clear-text);
}

.calculator-button.is-clear:hover {
  background-color: var(--spotlight-calc-clear-hover);
}
</style>
