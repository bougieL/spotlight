<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    router.push({ name: 'search' });
  }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));

onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<style scoped>
.plugin-panel {
  background-color: var(--spotlight-bg);
  border-top: 1px solid var(--spotlight-border);
}
</style>
