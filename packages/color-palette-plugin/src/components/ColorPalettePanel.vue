<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '@spotlight/i18n';
import logger from '@spotlight/logger';
import { hslToHex, hslToRgbString, hexToHsl } from '../utils/colorUtils';

const STORAGE_KEY = 'color-palette-favorites';

interface Props {
  query: string;
  onReady?: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  // eslint-disable-next-line no-unused-vars
  (e: 'close'): void;
}>();

const { t } = useI18n();
const favorites = ref<string[]>([]);
const copiedColor = ref<string | null>(null);

const WHEEL_SIZE = 180;
const INDICATOR_SIZE = 16;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - INDICATOR_SIZE / 2;

// Mouse position relative to canvas center
const mouseX = ref(CENTER);
const mouseY = ref(CENTER - RADIUS);

// Calculate hue from angle (0-360, top = 0)
const hue = computed(() => {
  const dx = mouseX.value - CENTER;
  const dy = mouseY.value - CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  return Math.round(angle) % 360;
});

// Calculate saturation from distance (0-100)
const saturation = computed(() => {
  const dx = mouseX.value - CENTER;
  const dy = mouseY.value - CENTER;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.min(100, Math.round((distance / RADIUS) * 100));
});

// Current color based on hue and saturation
const selectedColor = computed(() => {
  return hslToHex({ h: hue.value, s: saturation.value, l: 50 });
});

// Indicator position
const indicatorStyle = computed(() => {
  const x = mouseX.value - INDICATOR_SIZE / 2;
  const y = mouseY.value - INDICATOR_SIZE / 2;
  return {
    backgroundColor: selectedColor.value,
    left: `${x}px`,
    top: `${y}px`,
  };
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isDragging = ref(false);

function loadFavorites(): string[] {
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

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value));
  } catch {
    // ignore
  }
}

function isFavorite(color: string): boolean {
  return favorites.value.includes(color);
}

function toggleFavorite(color: string) {
  const index = favorites.value.indexOf(color);
  if (index === -1) {
    favorites.value.push(color);
    logger.info(`Added color to favorites: ${color}`);
  } else {
    favorites.value.splice(index, 1);
    logger.info(`Removed color from favorites: ${color}`);
  }
  saveFavorites();
}

async function copyToClipboard(text: string, colorKey: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedColor.value = colorKey;
    logger.info(`Copied color value: ${text}`);
    setTimeout(() => {
      if (copiedColor.value === colorKey) {
        copiedColor.value = null;
      }
    }, 1500);
  } catch (error) {
    logger.error('Failed to copy color to clipboard:', error);
  }
}

function drawColorWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 2;

  for (let angle = 0; angle < 360; angle++) {
    const startAngle = ((angle - 1) * Math.PI) / 180;
    const endAngle = ((angle + 1) * Math.PI) / 180;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function getPositionFromEvent(canvas: HTMLCanvasElement, event: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  let clientX: number, clientY: number;
  if (event instanceof TouchEvent) {
    clientX = event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? 0;
    clientY = event.touches[0]?.clientY ?? event.changedTouches[0]?.clientY ?? 0;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  // Clamp to circle
  const dx = x - CENTER;
  const dy = y - CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > RADIUS) {
    const angle = Math.atan2(dy, dx);
    return {
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  }

  return { x, y };
}

function setColorFromHex(hex: string) {
  const hsl = hexToHsl(hex);
  if (!hsl) return;

  const angle = ((hsl.h - 90) * Math.PI) / 180;
  const dist = (hsl.s / 100) * RADIUS;
  mouseX.value = CENTER + dist * Math.cos(angle);
  mouseY.value = CENTER + dist * Math.sin(angle);
}

function handlePointerDown(event: MouseEvent | TouchEvent) {
  if (!canvasRef.value) return;
  isDragging.value = true;
  const pos = getPositionFromEvent(canvasRef.value, event);
  mouseX.value = pos.x;
  mouseY.value = pos.y;
}

function handlePointerMove(event: MouseEvent | TouchEvent) {
  if (!isDragging.value || !canvasRef.value) return;
  const pos = getPositionFromEvent(canvasRef.value, event);
  mouseX.value = pos.x;
  mouseY.value = pos.y;
}

function handlePointerUp() {
  isDragging.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  favorites.value = loadFavorites();
  if (canvasRef.value) {
    drawColorWheel(canvasRef.value);
  }

  // Set initial color from query
  if (props.query && /^#[a-f\d]{6}$/i.test(props.query.trim())) {
    setColorFromHex(props.query.trim());
  } else {
    // Initialize mouse position to top of wheel
    mouseX.value = CENTER;
    mouseY.value = CENTER - RADIUS;
  }

  props.onReady?.();

  document.addEventListener('mouseup', handlePointerUp);
  document.addEventListener('touchend', handlePointerUp);
});

defineExpose({
  destroy() {
    document.removeEventListener('mouseup', handlePointerUp);
    document.removeEventListener('touchend', handlePointerUp);
  },
});
</script>

<template>
  <div
    class="color-palette-panel"
    @keydown="handleKeydown"
  >
    <div class="picker-container">
      <div class="color-wheel-wrapper">
        <canvas
          ref="canvasRef"
          class="color-wheel"
          width="180"
          height="180"
          @mousedown="handlePointerDown"
          @touchstart.prevent="handlePointerDown"
          @mousemove="handlePointerMove"
          @touchmove.prevent="handlePointerMove"
        />
        <div
          class="color-indicator"
          :style="indicatorStyle"
        />
      </div>
      <div class="picker-info">
        <div
          class="color-preview"
          :style="{ backgroundColor: selectedColor }"
        />
        <div class="color-values">
          <div
            class="color-value-item"
            @click="copyToClipboard(selectedColor, 'hex')"
          >
            <span class="value-label">HEX</span>
            <span class="value-text">{{ selectedColor }}</span>
          </div>
          <div
            class="color-value-item"
            @click="copyToClipboard(hslToRgbString({ h: hue, s: saturation, l: 50 }), 'rgb')"
          >
            <span class="value-label">RGB</span>
            <span class="value-text">{{ hslToRgbString({ h: hue, s: saturation, l: 50 }) }}</span>
          </div>
        </div>
        <div class="picker-actions">
          <button
            class="action-btn favorite-btn"
            :class="{ favorited: isFavorite(selectedColor) }"
            @click="toggleFavorite(selectedColor)"
          >
            {{ isFavorite(selectedColor) ? '★' : '☆' }}
          </button>
          <button
            class="action-btn copy-btn"
            :class="{ success: copiedColor === 'hex' || copiedColor === 'rgb' || copiedColor === 'copy' }"
            @click="copyToClipboard(selectedColor, 'copy')"
          >
            {{ copiedColor ? t('colorPalette.copied') : t('colorPalette.copyHex') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="favorites.length > 0"
      class="favorites-section"
    >
      <div class="favorites-list">
        <div
          v-for="color in favorites"
          :key="color"
          class="favorite-item"
          :class="{ active: copiedColor === color }"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="copyToClipboard(color, color)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-palette-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background-color: var(--spotlight-bg);
  outline: none;
}

.picker-container {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.color-wheel-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
  flex-shrink: 0;
}

.color-wheel {
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-indicator {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.picker-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.color-preview {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
}

.color-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-value-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--spotlight-item-hover, rgba(0, 0, 0, 0.05));
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.color-value-item:hover {
  background: var(--spotlight-item-hover, rgba(0, 0, 0, 0.1));
}

.value-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--spotlight-placeholder);
  text-transform: uppercase;
  width: 32px;
}

.value-text {
  font-size: 13px;
  color: var(--spotlight-text);
  font-family: monospace;
}

.picker-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: var(--spotlight-item-hover, rgba(0, 0, 0, 0.08));
  color: var(--spotlight-text);
  transition: background-color 0.15s, opacity 0.15s;
}

.action-btn:hover {
  opacity: 0.9;
}

.favorite-btn {
  width: 36px;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.favorite-btn.favorited {
  background: rgba(22, 163, 74, 0.15);
  color: #16a34a;
}

.copy-btn.success {
  background: #16a34a;
  color: #fff;
}

.favorites-section {
  border-top: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  padding-top: 12px;
}

.favorites-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.favorite-item {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 2px solid transparent;
}

.favorite-item:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.favorite-item.active {
  border-color: var(--spotlight-primary, #666);
  transform: scale(1.1);
}
</style>
