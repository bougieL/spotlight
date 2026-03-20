<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { ref } from "vue";

const editableRef = ref<HTMLDivElement | null>(null);

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  const items = event.clipboardData?.items;
  if (!items) return;

  const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));

  if (imageItems.length > 0) {
    let imageIndex = 0;
    const reader = new FileReader();

    const readNextImage = () => {
      if (imageIndex >= imageItems.length) return;

      const item = imageItems[imageIndex];
      const file = item.getAsFile();
      if (!file) {
        imageIndex++;
        readNextImage();
        return;
      }

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = file.name || "pasted-image";
        img.className = "pasted-image";
        img.dataset.id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.setStartAfter(img);
          range.collapse(true);
        } else {
          editableRef.value?.appendChild(img);
        }

        imageIndex++;
        readNextImage();
      };

      reader.readAsDataURL(file);
    };

    readNextImage();
  } else {
    const text = event.clipboardData?.getData("text/plain") || "";
    document.execCommand("insertText", false, text);
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    return;
  }

  if (event.key === "Backspace") {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = editableRef.value;

    if (!container) return;

    const isAtStart = range.startOffset === 0 &&
      range.startContainer === container &&
      container.childNodes.length === 0;

    if (isAtStart || (range.collapsed && range.startContainer === container && range.startOffset === 0)) {
      event.preventDefault();
      if (container.childNodes.length > 0) {
        container.removeChild(container.lastChild!);
      }
    }
  }
};

defineExpose({});
</script>

<template>
  <div class="spotlight-input-wrapper">
    <Search class="search-icon" :size="24" />
    <div
      ref="editableRef"
      contenteditable="true"
      class="spotlight-contenteditable"
      data-placeholder="Search..."
      @paste="handlePaste"
      @keydown="handleKeydown"
    ></div>
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
  background-color: var(--spotlight-bg);
  transition: background-color 0.2s;
}

.search-icon {
  color: var(--spotlight-icon);
  flex-shrink: 0;
  margin-right: 12px;
}

.spotlight-contenteditable {
  flex: 1;
  height: 64px;
  line-height: 64px;
  display: flex;
  align-items: center;
  background: transparent;
  border: none;
  outline: none;
  font-size: 18px;
  color: var(--spotlight-text);
  caret-color: var(--spotlight-text);
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.spotlight-contenteditable::-webkit-scrollbar {
  display: none;
}

.spotlight-contenteditable:empty::before {
  content: attr(data-placeholder);
  color: var(--spotlight-placeholder);
  pointer-events: none;
}

:deep(.pasted-image) {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  margin-right: 8px;
  background-color: var(--spotlight-image-bg);
}
</style>
