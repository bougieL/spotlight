<script setup lang="ts">
import { ref } from "vue";

const query = ref("");
</script>

<template>
  <main class="spotlight-container">
    <div class="spotlight-input-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        v-model="query"
        type="text"
        class="spotlight-input"
        placeholder="Search..."
        autofocus
      />
    </div>
  </main>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background-color: #1e1e1e;
}
</style>

<style scoped>
.spotlight-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 30vh;
  min-height: 100vh;
  background-color: #1e1e1e;
}

.spotlight-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 600px;
  padding: 16px 24px;
  background-color: #3c3c3c;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.search-icon {
  width: 24px;
  height: 24px;
  color: #888;
  flex-shrink: 0;
  margin-right: 12px;
}

.spotlight-input {
  flex: 1;
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
