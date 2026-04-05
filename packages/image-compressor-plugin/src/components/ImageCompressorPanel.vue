<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CompressedImage } from '../types';
import { useI18n } from '@spotlight/i18n';
import { open } from '@tauri-apps/plugin-dialog';
import { tauriApi, compressPngLossless, globImageFiles } from '@spotlight/api';
import logger from '@spotlight/logger';
import { Upload, Download, X, Image as ImageIcon } from 'lucide-vue-next';

const { t } = useI18n();

const images = ref<CompressedImage[]>([]);
const quality = ref(80);
const outputFormat = ref<'jpeg' | 'png' | 'webp'>('png');
const isCompressing = ref(false);
const isDragging = ref(false);

const hasImages = computed(() => images.value.length > 0);

function getPreviewUrl(img: CompressedImage): string {
  return img.compressedUrl || URL.createObjectURL(img.originalFile);
}

const totalOriginalSize = computed(() =>
  images.value.reduce((sum, img) => sum + img.originalSize, 0)
);

const totalCompressedSize = computed(() =>
  images.value.reduce((sum, img) => sum + (img.compressedSize || img.originalSize), 0)
);

const totalRatio = computed(() => {
  if (totalOriginalSize.value === 0) return 0;
  return Math.round((1 - totalCompressedSize.value / totalOriginalSize.value) * 100);
});

async function selectImages() {
  try {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'],
        },
      ],
    });

    if (!selected) return;

    const files = Array.isArray(selected) ? selected : [selected];
    for (const filePath of files) {
      try {
        const response = await fetch(`file://${filePath}`);
        const blob = await response.blob();
        const fileName = filePath.split(/[\\/]/).pop() || 'image';
        const originalFile = new File([blob], fileName, { type: blob.type });
        const img: CompressedImage = {
          id: crypto.randomUUID(),
          originalFile,
          originalSize: blob.size,
          compressedBlob: null,
          compressedSize: 0,
          compressedUrl: null,
          quality: quality.value,
          format: outputFormat.value,
          isLossless: false,
        };
        images.value.push(img);
        await compressImage(img);
      } catch (err) {
        logger.error('Failed to load image:', err);
      }
    }
  } catch (err) {
    logger.error('Failed to select images:', err);
  }
}

async function compressImage(img: CompressedImage) {
  img.quality = quality.value;
  img.format = outputFormat.value;

  // Use lossless compression for PNG output
  if (outputFormat.value === 'png') {
    try {
      // Convert blob to data URL first
      const dataUrl = await blobToDataUrl(img.originalFile);
      const tempFilePath = await tauriApi.saveTempImage(dataUrl);

      // Use Rust backend for lossless PNG compression
      const compressedBytes = await compressPngLossless(tempFilePath);

      // Convert byte array to Blob
      const blob = new Blob([new Uint8Array(compressedBytes)], { type: 'image/png' });

      if (img.compressedUrl) {
        URL.revokeObjectURL(img.compressedUrl);
      }
      img.compressedBlob = blob;
      img.compressedSize = blob.size;
      img.compressedUrl = URL.createObjectURL(blob);
      img.isLossless = true;
    } catch (err) {
      logger.error('Lossless compression failed, falling back to canvas:', err);
      await compressWithCanvas(img);
    }
  } else {
    await compressWithCanvas(img);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressWithCanvas(img: CompressedImage) {
  return new Promise<void>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgEl = new window.Image();
      imgEl.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.width;
        canvas.height = imgEl.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imgEl, 0, 0);

        const mimeType = outputFormat.value === 'png' ? 'image/png' :
                        outputFormat.value === 'webp' ? 'image/webp' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (blob) {
              if (img.compressedUrl) {
                URL.revokeObjectURL(img.compressedUrl);
              }
              img.compressedBlob = blob;
              img.compressedSize = blob.size;
              img.compressedUrl = URL.createObjectURL(blob);
              img.isLossless = false;
            }
            resolve();
          },
          mimeType,
          quality.value / 100
        );
      };
      imgEl.src = e.target?.result as string;
    };
    reader.readAsDataURL(img.originalFile);
  });
}

async function compressAll() {
  isCompressing.value = true;
  for (const img of images.value) {
    img.quality = quality.value;
    img.format = outputFormat.value;
    await compressImage(img);
  }
  isCompressing.value = false;
}

async function removeImage(id: string) {
  const img = images.value.find((i) => i.id === id);
  if (img?.compressedUrl) {
    URL.revokeObjectURL(img.compressedUrl);
  }
  images.value = images.value.filter((i) => i.id !== id);
}

async function saveImage(img: CompressedImage) {
  if (!img.compressedBlob) return;

  const { save } = await import('@tauri-apps/plugin-dialog');
  const filePath = await save({
    defaultPath: img.originalFile.name.replace(/\.[^.]+$/, `.${outputFormat.value}`),
    filters: [
      {
        name: 'Image',
        extensions: [outputFormat.value],
      },
    ],
  });

  if (filePath) {
    try {
      const reader = new FileReader();
      await new Promise<void>((resolve, reject) => {
        reader.onload = async () => {
          try {
            await tauriApi.saveImageFile(filePath, reader.result as string);
            logger.info('Image saved:', filePath);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(img.compressedBlob!);
      });
    } catch (err) {
      logger.error('Failed to save image', err);
    }
  }
}

async function saveAll() {
  for (const img of images.value) {
    await saveImage(img);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;

  const items = e.dataTransfer?.items;
  if (!items) return;

  const filePaths: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        // For Tauri, we need to use the webkitRelativePath or path property
        // In Tauri v2, File objects have a path property
        const filePath = (file as File & { path?: string }).path;
        if (filePath) {
          filePaths.push(filePath);
        }
      }
    }
  }

  if (filePaths.length === 0) return;

  // Check if any path is a directory
  const allFilePaths: string[] = [];
  for (const filePath of filePaths) {
    try {
      // Try to glob image files from the path
      const globbedFiles = await globImageFiles(filePath);
      if (globbedFiles.length > 0) {
        allFilePaths.push(...globbedFiles);
      } else {
        // Not a directory or no images found, treat as single file
        allFilePaths.push(filePath);
      }
    } catch {
      // If glob fails, treat as a single file
      allFilePaths.push(filePath);
    }
  }

  await loadImagesFromPaths([...new Set(allFilePaths)]);
}

async function loadImagesFromPaths(filePaths: string[]) {
  for (const filePath of filePaths) {
    try {
      const response = await fetch(`file://${filePath}`);
      const blob = await response.blob();
      const fileName = filePath.split(/[\\/]/).pop() || 'image';
      const originalFile = new File([blob], fileName, { type: blob.type });
      const img: CompressedImage = {
        id: crypto.randomUUID(),
        originalFile,
        originalSize: blob.size,
        compressedBlob: null,
        compressedSize: 0,
        compressedUrl: null,
        quality: quality.value,
        format: outputFormat.value,
        isLossless: false,
      };
      images.value.push(img);
      await compressImage(img);
    } catch (err) {
      logger.error('Failed to load image:', err);
    }
  }
}
</script>

<template>
  <div
    class="image-compressor-panel"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div
      v-if="isDragging"
      class="drop-overlay"
    >
      <ImageIcon :size="48" />
      <p>{{ t('dragDropHint') }}</p>
    </div>

    <div class="header">
      <div class="controls">
        <div class="control-group">
          <label>{{ t('quality') }}</label>
          <input
            v-model.number="quality"
            type="range"
            min="1"
            max="100"
            class="slider"
          >
          <span class="value">{{ quality }}%</span>
        </div>
        <div class="control-group">
          <label>{{ t('format') }}</label>
          <select
            v-model="outputFormat"
            class="select"
          >
            <option value="png">
              PNG ({{ t('lossless') }})
            </option>
            <option value="webp">
              WebP
            </option>
            <option value="jpeg">
              JPEG
            </option>
          </select>
        </div>
        <div class="actions">
          <button
            class="btn primary"
            @click="selectImages"
          >
            <Upload :size="16" />
            {{ t('selectImages') }}
          </button>
          <button
            v-if="hasImages"
            class="btn secondary"
            :disabled="isCompressing"
            @click="compressAll"
          >
            {{ isCompressing ? t('compressing') : t('recompress') }}
          </button>
          <button
            v-if="hasImages"
            class="btn primary"
            @click="saveAll"
          >
            <Download :size="16" />
            {{ t('saveAll') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!hasImages"
      class="empty-state"
    >
      <ImageIcon :size="48" />
      <p>{{ t('noImages') }}</p>
    </div>

    <div
      v-else
      class="image-list"
    >
      <div
        v-for="img in images"
        :key="img.id"
        class="image-item"
      >
        <div class="preview">
          <img
            :src="getPreviewUrl(img)"
            alt=""
          >
        </div>
        <div class="info">
          <div class="filename">
            {{ img.originalFile.name }}
          </div>
          <div class="sizes">
            <span class="original">{{ t('original') }}: {{ formatSize(img.originalSize) }}</span>
            <span class="compressed">{{ t('compressed') }}: {{ formatSize(img.compressedSize || img.originalSize) }}</span>
            <span class="ratio">{{ t('ratio') }}: {{ Math.round((1 - (img.compressedSize || img.originalSize) / img.originalSize) * 100) }}%</span>
          </div>
        </div>
        <div class="item-actions">
          <button
            class="btn-icon"
            @click="saveImage(img)"
          >
            <Download :size="16" />
          </button>
          <button
            class="btn-icon danger"
            @click="removeImage(img.id)"
          >
            <X :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="hasImages"
      class="footer"
    >
      <span>{{ t('original') }}: {{ formatSize(totalOriginalSize) }}</span>
      <span>{{ t('compressed') }}: {{ formatSize(totalCompressedSize) }}</span>
      <span class="total-ratio">{{ t('ratio') }}: {{ totalRatio }}%</span>
    </div>
  </div>
</template>

<style scoped>
.image-compressor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: var(--spotlight-bg);
  outline: none;
  position: relative;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--spotlight-primary);
  opacity: 0.9;
  color: white;
  font-size: 16px;
  z-index: 100;
}

.header {
  margin-bottom: 16px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group label {
  font-size: 14px;
  color: var(--spotlight-text);
}

.slider {
  width: 100px;
}

.select {
  padding: 4px 8px;
  border: 1px solid var(--spotlight-border);
  border-radius: 4px;
  background-color: var(--spotlight-bg);
  color: var(--spotlight-text);
}

.actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn.primary {
  background-color: var(--spotlight-primary);
  color: white;
}

.btn.primary:hover {
  background-color: var(--spotlight-primary-hover);
}

.btn.secondary {
  background-color: var(--spotlight-item-hover);
  color: var(--spotlight-text);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--spotlight-placeholder);
  gap: 8px;
}

.image-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--spotlight-border);
  border-radius: 8px;
  background-color: var(--spotlight-bg);
}

.preview {
  width: 64px;
  height: 64px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
}

.filename {
  font-size: 14px;
  font-weight: 500;
  color: var(--spotlight-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sizes {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--spotlight-placeholder);
  margin-top: 4px;
}

.ratio {
  color: var(--spotlight-primary);
}

.item-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: var(--spotlight-icon);
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-icon:hover {
  background-color: var(--spotlight-item-hover);
}

.btn-icon.danger:hover {
  background-color: var(--spotlight-error-bg);
  color: var(--spotlight-error);
}

.footer {
  display: flex;
  gap: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--spotlight-border);
  font-size: 14px;
  color: var(--spotlight-placeholder);
  margin-top: 16px;
}

.total-ratio {
  color: var(--spotlight-primary);
  font-weight: 500;
}
</style>
