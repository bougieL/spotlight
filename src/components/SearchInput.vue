<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { ref } from "vue";

const query = ref("");

defineExpose({ query });
</script>

<template>
  <div class="spotlight-input-wrapper">
    <Search class="search-icon" :size="24" />
    <input
      v-model="query"
      type="text"
      class="spotlight-input"
      placeholder="Search..."
      autofocus
    />
  </div>
</template>

<style scoped>
.spotlight-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 600px;
  height: 64px;
  margin: 0;
  padding: 0 24px;
  border: none;
  background-color: rgba(60, 60, 60, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.search-icon {
  color: #888;
  flex-shrink: 0;
  margin-right: 12px;
}

.spotlight-input {
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  font-size: 18px;
  color: #fff;
}

.spotlight-input::placeholder {
  color: #888;
}
</style>
