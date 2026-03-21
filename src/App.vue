<script setup lang="ts">
import SearchInput from "./components/SearchInput.vue";
</script>

<template>
  <main class="spotlight-container">
    <SearchInput />
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
  width: 600px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: transparent;
}

body {
  background-color: transparent;
}
</style>

<style scoped>
#app {
  width: 100%;
  height: 100%;
}

.spotlight-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 600px;
  margin: 0 auto;
  padding: 0;
  border: none;
  background-color: transparent;
}
</style>
