import { captureFullScreen, tauriApi } from '@spotlight/api';
import logger from '@spotlight/logger';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const selection = document.getElementById('selection') as HTMLElement;
const selectionDimensions = document.getElementById('selection-dimensions') as HTMLElement;
const buttonBar = document.getElementById('button-bar') as HTMLElement;
const btnConfirm = document.getElementById('btn-confirm') as HTMLButtonElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;
const hint = document.getElementById('hint') as HTMLElement;

let ctx: CanvasRenderingContext2D | null = null;
let screenshotImage: HTMLImageElement | null = null;
let imageLoaded = false;

// Selection state
let isSelecting = false;
let isResizing = false;
let resizeHandle = '';
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

// Initial selection bounds (for resize calculations)
let selectionBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

function getLocale(): string {
  const locale = navigator.language || 'en-US';
  return locale.startsWith('zh') ? 'zh-CN' : 'en-US';
}

function t(key: string): string {
  const locale = getLocale();
  const translations: Record<string, Record<string, string>> = {
    'en-US': {
      'confirm': 'Confirm',
      'cancel': 'Cancel',
      'selectRegion': 'Click and drag to select region',
      'resizeHint': 'Drag handles to resize, then click Confirm',
      'screenshotCopied': 'Screenshot copied to clipboard',
    },
    'zh-CN': {
      'confirm': '确定',
      'cancel': '取消',
      'selectRegion': '点击并拖动选择区域',
      'resizeHint': '拖动边框调整大小，点击确定',
      'screenshotCopied': '截图已复制到剪贴板',
    },
  };
  return translations[locale]?.[key] || key;
}

function showHint(text: string): void {
  hint.textContent = text;
  hint.style.display = 'block';
}

function hideHint(): void {
  hint.style.display = 'none';
}

async function closeScreenshot(): Promise<void> {
  try {
    await tauriApi.closeOverlayWindow('screenshot-overlay');
  } catch (err) {
    logger.error('Failed to close screenshot:', err);
  }
}

async function captureScreen(
  canvas: HTMLCanvasElement
): Promise<CanvasRenderingContext2D | null> {
  const startTotal = performance.now();
  try {
    const startCapture = performance.now();
    const capture = await captureFullScreen();
    logger.info(`[Performance] captureFullScreen: ${(performance.now() - startCapture).toFixed(1)} ms`);

    canvas.width = capture.width;
    canvas.height = capture.height;
    logger.info(`[Debug] Canvas size: ${canvas.width}x${canvas.height}, window: ${window.innerWidth}x${window.innerHeight}`);
    ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })!;

    const startLoad = performance.now();
    screenshotImage = new Image();
    await new Promise<void>((resolve, reject) => {
      screenshotImage!.onload = () => resolve();
      screenshotImage!.onerror = () => reject(new Error('Failed to load image'));
      screenshotImage!.src = capture.dataUrl;
    });
    logger.info(`[Performance] load image: ${(performance.now() - startLoad).toFixed(1)} ms`);

    const startDraw = performance.now();
    ctx.drawImage(screenshotImage, 0, 0);
    logger.info(`[Performance] drawImage: ${(performance.now() - startDraw).toFixed(1)} ms`);

    const centerX = Math.floor(canvas.width / 2);
    const centerY = Math.floor(canvas.height / 2);
    const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
    logger.info(`[Debug] Center pixel (${centerX}, ${centerY}): rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`);

    imageLoaded = true;
    logger.info(`[Performance] TOTAL captureScreen: ${(performance.now() - startTotal).toFixed(1)} ms`);

    return ctx;
  } catch (err) {
    logger.error('Failed to capture screen:', err);
    imageLoaded = false;
    return null;
  }
}

function getSelectionBounds(): { minX: number; minY: number; width: number; height: number } {
  const minX = Math.min(startX, currentX);
  const minY = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  return { minX, minY, width, height };
}

function redrawWithDim(minX: number, minY: number, width: number, height: number, cutOut = true): void {
  if (!ctx || !screenshotImage || !imageLoaded) return;

  // Redraw the screenshot first
  ctx.drawImage(screenshotImage, 0, 0);

  // Draw dim overlay using canvas coordinates
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // "Cut out" the selection area to reveal screenshot
  if (cutOut && width > 0 && height > 0) {
    const scaleX = canvas.width / window.innerWidth;
    const scaleY = canvas.height / window.innerHeight;
    const sx = minX * scaleX;
    const sy = minY * scaleY;
    const sw = width * scaleX;
    const sh = height * scaleY;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fillRect(sx, sy, sw, sh);
  }

  ctx.restore();
}

function updateSelection(): void {
  // Use selectionBounds if in resize mode, otherwise use getSelectionBounds
  let minX: number, minY: number, width: number, height: number;
  if (isResizing || selectionBounds.maxX > selectionBounds.minX) {
    minX = selectionBounds.minX;
    minY = selectionBounds.minY;
    width = selectionBounds.maxX - selectionBounds.minX;
    height = selectionBounds.maxY - selectionBounds.minY;
  } else {
    const bounds = getSelectionBounds();
    minX = bounds.minX;
    minY = bounds.minY;
    width = bounds.width;
    height = bounds.height;
  }

  selection.style.left = minX + 'px';
  selection.style.top = minY + 'px';
  selection.style.width = width + 'px';
  selection.style.height = height + 'px';
  selection.classList.add('show');

  selectionDimensions.textContent = `${width} x ${height}`;
  selectionDimensions.style.left = (minX + width + 10) + 'px';
  selectionDimensions.style.top = minY + 'px';
  selectionDimensions.classList.add('show');

  // Update button bar position
  buttonBar.style.left = (minX + width / 2 - 70) + 'px';
  buttonBar.style.top = (minY + height + 15) + 'px';
}

function showButtons(): void {
  buttonBar.classList.add('show');
  btnConfirm.textContent = t('confirm');
  btnCancel.textContent = t('cancel');
}

function hideButtons(): void {
  buttonBar.classList.remove('show');
}

function clearSelection(): void {
  selection.classList.remove('show');
  selection.classList.remove('resizing');
  selectionDimensions.classList.remove('show');
  hideButtons();
  selectionBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  isResizing = false;
  resizeHandle = '';
  // Reset coordinate state
  startX = 0;
  startY = 0;
  currentX = 0;
  currentY = 0;

  // Redraw with full dim (no cutout)
  if (ctx && screenshotImage && imageLoaded) {
    redrawWithDim(0, 0, 0, 0, false);
  }
}

function enterResizeMode(): void {
  const { minX, minY, width, height } = getSelectionBounds();
  selectionBounds = { minX, minY, maxX: minX + width, maxY: minY + height };
  isResizing = true;
  selection.classList.add('resizing');

  // Apply dim effect
  redrawWithDim(minX, minY, width, height);

  showButtons();
  showHint(t('resizeHint'));
}

async function copySelectionToClipboard(): Promise<void> {
  if (!ctx || !screenshotImage || !imageLoaded) return;

  const { minX, minY, width, height } = getSelectionBounds();

  if (width < 5 || height < 5) {
    logger.info('Selection too small, ignoring');
    return;
  }

  try {
    const scaleX = canvas.width / window.innerWidth;
    const scaleY = canvas.height / window.innerHeight;

    const sourceX = Math.floor(minX * scaleX);
    const sourceY = Math.floor(minY * scaleY);
    const sourceWidth = Math.floor(width * scaleX);
    const sourceHeight = Math.floor(height * scaleY);

    logger.info(`[Debug] Copy selection: ${sourceX},${sourceY} ${sourceWidth}x${sourceHeight}, original: ${width}x${height}`);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceWidth;
    tempCanvas.height = sourceHeight;
    const tempCtx = tempCanvas.getContext('2d', { alpha: false })!;
    // Draw from original screenshotImage, not from dimmed canvas
    tempCtx.drawImage(
      screenshotImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight
    );

    const testPixel = tempCtx.getImageData(Math.floor(sourceWidth/2), Math.floor(sourceHeight/2), 1, 1).data;
    logger.info(`[Debug] Temp canvas center pixel: rgba(${testPixel[0]}, ${testPixel[1]}, ${testPixel[2]}, ${testPixel[3]})`);

    const dataUrl = tempCanvas.toDataURL('image/png');
    logger.info(`[Debug] Data URL length: ${dataUrl.length}`);

    const blob = await new Promise<Blob>((resolve, reject) => {
      tempCanvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    });
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ]);
    logger.info('Screenshot copied to clipboard');
    showHint(t('screenshotCopied'));
  } catch (err) {
    logger.error('Failed to copy screenshot to clipboard:', err);
  }
}

function handleMouseDown(e: MouseEvent): void {
  if (!imageLoaded) return;
  // Prevent interfering with active resize operations
  if (isResizing) return;

  const target = e.target as HTMLElement;
  if (target.classList.contains('resize-handle') || target.classList.contains('btn')) {
    return;
  }

  // Check if clicking inside existing selection - if so, keep it for new drag
  if (selection.classList.contains('show')) {
    const rect = selection.getBoundingClientRect();
    const inSelection =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (inSelection) {
      // Clear and start fresh drag from current position
      clearSelection();
    }
  }

  isSelecting = true;
  isResizing = false;
  startX = e.clientX;
  startY = e.clientY;
  currentX = e.clientX;
  currentY = e.clientY;
  hideHint();
}

function handleMouseMove(e: MouseEvent): void {
  if (isResizing) {
    handleResize(e);
  } else if (isSelecting) {
    currentX = e.clientX;
    currentY = e.clientY;
    updateSelection();
    // Update dim during drag
    const { minX, minY, width, height } = getSelectionBounds();
    redrawWithDim(minX, minY, width, height, true);
  }
}

function handleResize(e: MouseEvent): void {
  // Guard: only resize when a handle is actively selected
  if (!resizeHandle) return;

  const dx = e.clientX - currentX;
  const dy = e.clientY - currentY;
  // Keep currentX/currentY as mouse position reference
  currentX = e.clientX;
  currentY = e.clientY;

  let { minX, minY, maxX, maxY } = selectionBounds;

  switch (resizeHandle) {
    case 'se':
      maxX += dx;
      maxY += dy;
      break;
    case 'sw':
      minX += dx;
      maxY += dy;
      break;
    case 'ne':
      maxX += dx;
      minY += dy;
      break;
    case 'nw':
      minX += dx;
      minY += dy;
      break;
    case 'n':
      minY += dy;
      break;
    case 's':
      maxY += dy;
      break;
    case 'e':
      maxX += dx;
      break;
    case 'w':
      minX += dx;
      break;
  }

  // Clamp to screen boundaries
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(window.innerWidth, maxX);
  maxY = Math.min(window.innerHeight, maxY);

  // Ensure minimum size
  if (maxX - minX >= 5 && maxY - minY >= 5) {
    // Update startX/startY only (currentX/currentY stay as mouse position)
    startX = minX;
    startY = minY;
    selectionBounds = { minX, minY, maxX, maxY };

    // Redraw with new dim
    const width = maxX - minX;
    const height = maxY - minY;
    redrawWithDim(minX, minY, width, height);
    updateSelection();
  }
}

function handleResizeStart(e: MouseEvent): void {
  // Re-enable resizing mode when clicking a handle
  isResizing = true;
  e.preventDefault();
  // Use stopImmediatePropagation to prevent handleMouseDown from executing
  e.stopImmediatePropagation();
  const target = e.target as HTMLElement;
  if (target.classList.contains('resize-handle')) {
    resizeHandle = target.dataset.handle || '';
    // Update reference point for resize calculations
    currentX = e.clientX;
    currentY = e.clientY;
  }
}

async function handleMouseUp(_e: MouseEvent): Promise<void> {
  if (isSelecting) {
    isSelecting = false;
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width > 5 && height > 5) {
      updateSelection();
      enterResizeMode();
    } else {
      clearSelection();
      showHint(t('selectRegion'));
    }
  } else if (isResizing) {
    // Stop current resize, but keep resize mode active
    // User can click a handle to start another resize
    isResizing = false;
    resizeHandle = '';
  }
}

async function handleConfirm(): Promise<void> {
  await copySelectionToClipboard();
  await closeScreenshot();
}

async function handleCancel(): Promise<void> {
  clearSelection();
  showHint(t('selectRegion'));
}

async function handleKeyDown(e: KeyboardEvent): Promise<void> {
  if (e.key === 'Escape') {
    await closeScreenshot();
  }
}

captureScreen(canvas).then((result) => {
  if (result) {
    ctx = result;
    // Apply dim to entire screen initially (no cutout)
    redrawWithDim(0, 0, 0, 0, false);
    showHint(t('selectRegion'));
  }
});

document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

selection.addEventListener('mousedown', handleResizeStart);
btnConfirm.addEventListener('click', handleConfirm);
btnCancel.addEventListener('click', handleCancel);
document.addEventListener('keydown', handleKeyDown);

window.focus();