<script setup lang="ts">
interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string;
  options: Option[];
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

function handleChange(value: string) {
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="base-radio-group" :class="{ disabled }">
    <BaseRadio
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :label="option.label"
      :disabled="option.disabled || disabled"
      :modelValue="modelValue"
      @change="handleChange"
    />
  </div>
</template>

<script lang="ts">
import BaseRadio from './BaseRadio.vue';
export default {
  components: { BaseRadio },
};
</script>

<style scoped>
.base-radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.base-radio-group.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
