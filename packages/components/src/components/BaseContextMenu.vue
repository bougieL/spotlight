<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface ContextMenuItem {
  label: string;
  icon?: object;
  divided?: boolean;
  disabled?: boolean;
  click?: () => void;
}

interface Props {
  items: ContextMenuItem[];
  x: number;
  y: number;
  visible: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', item: ContextMenuItem): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);

const adjustedPosition = computed(() => {
  if (!menuRef.value) return { x: props.x, y: props.y };

  const menuWidth = menuRef.value.offsetWidth || 180;
  const menuHeight = menuRef.value.offsetHeight || 200;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = props.x;
  let y = props.y;

  if (x + menuWidth > viewportWidth - 10) {
    x = viewportWidth - menuWidth - 10;
  }
  if (y + menuHeight > viewportHeight - 10) {
    y = viewportHeight - menuHeight - 10;
  }

  return { x, y };
});

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

function handleItemClick(item: ContextMenuItem) {
  if (item.disabled) return;
  item.click?.();
  emit('select', item);
  emit('close');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }"
    >
      <template v-for="(item, index) in items" :key="index">
        <div
          v-if="item.divided && index > 0"
          class="context-menu-divider"
        />
        <div
          class="context-menu-item"
          :class="{ disabled: item.disabled }"
          @click="handleItemClick(item)"
        >
          <component
            v-if="item.icon"
            :is="item.icon"
            :size="14"
            class="context-menu-icon"
          />
          <span class="context-menu-label">{{ item.label }}</span>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  background-color: var(--spotlight-bg);
  border: 1px solid var(--spotlight-border, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 160px;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--spotlight-text);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.context-menu-item:hover {
  background-color: var(--spotlight-item-hover);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background-color: transparent;
}

.context-menu-icon {
  width: 14px;
  height: 14px;
  color: var(--spotlight-icon, #666);
  flex-shrink: 0;
}

.context-menu-item:hover .context-menu-icon {
  color: var(--spotlight-text);
}

.context-menu-label {
  flex: 1;
}

.context-menu-divider {
  height: 1px;
  background-color: var(--spotlight-border, rgba(0, 0, 0, 0.1));
  margin: 4px 0;
}
</style>
