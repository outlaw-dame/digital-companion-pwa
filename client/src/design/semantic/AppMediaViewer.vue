<!--
  AppMediaViewer.vue - Media Viewer Component
  
  Purpose: Full-screen media viewer for images and videos
  
  Semantic primitive: YES - Core media component
  Replaces: Raw Framework7 <PhotoBrowser> component
  
  Do:
  - Use for viewing full-screen media
  - Support zoom and gesture navigation
  - Provide appropriate captions
  
  Don't:
  - Use raw Framework7 PhotoBrowser
  - Create custom media viewer implementations
  - Forget accessibility for media
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PhotoBrowser as Framework7PhotoBrowser } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';

// Props
const props = withDefaults(
  defineProps<{
    opened?: boolean;
    images?: Array<{
      url: string;
      caption?: string;
      width?: number;
      height?: number;
      alt?: string;
    }>;
    index?: number;
    theme?: 'light' | 'dark' | 'auto';
    type?: 'standalone' | 'page' | 'popover';
    navbar?: boolean;
    toolbar?: boolean;
    swipeToClose?: boolean;
    zoom?: boolean;
    lazyLoading?: boolean;
    backdrop?: boolean;
    closeByBackdropClick?: boolean;
    closeByEscape?: boolean;
  }>(),
  {
    opened: false,
    images: () => [],
    index: 0,
    theme: 'auto',
    type: 'standalone',
    navbar: true,
    toolbar: true,
    swipeToClose: true,
    zoom: true,
    lazyLoading: true,
    backdrop: true,
    closeByBackdropClick: true,
    closeByEscape: true,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:opened', value: boolean): void;
  (e: 'open'): void;
  (e: 'opened'): void;
  (e: 'close'): void;
  (e: 'closed'): void;
  (e: 'change', index: number): void;
}>();

// Internal opened state
const internalOpened = ref(props.opened);

// Internal index
const internalIndex = ref(props.index);

// Platform detection
const { isIOS } = useNativeUi();

// Handle open
const open = () => {
  internalOpened.value = true;
  emit('update:opened', true);
  emit('open');
};

// Handle close
const close = () => {
  internalOpened.value = false;
  emit('update:opened', false);
  emit('close');
};

// Handle opened
const handleOpened = () => {
  emit('opened');
};

// Handle closed
const handleClosed = () => {
  emit('closed');
};

// Handle change
const handleChange = (pb: any, index: number) => {
  internalIndex.value = index;
  emit('change', index);
};

// Watch for external opened changes
watch(
  () => props.opened,
  (newValue) => {
    if (newValue !== internalOpened.value) {
      internalOpened.value = newValue;
    }
  }
);

// Watch for external index changes
watch(
  () => props.index,
  (newValue) => {
    if (newValue !== internalIndex.value) {
      internalIndex.value = newValue;
    }
  }
);

// Expose methods
const openAt = (newIndex: number) => {
  internalIndex.value = newIndex;
  internalOpened.value = true;
  emit('update:opened', true);
  emit('open');
};

defineExpose({
  open,
  close,
  openAt,
});
</script>

<template>
  <Framework7PhotoBrowser
    :opened="internalOpened"
    @photobrowser:open="open"
    @photobrowser:opened="handleOpened"
    @photobrowser:close="handleClosed"
    @photobrowser:closed="handleClosed"
    @photobrowser:change="handleChange"
    :photos="images"
    :index="internalIndex"
    :theme="theme"
    :type="type"
    :navbar="navbar"
    :toolbar="toolbar"
    :swipe-to-close="swipeToClose"
    :zoom="zoom"
    :lazy-loading="lazyLoading"
    :backdrop="backdrop"
    :close-by-backdrop-click="closeByBackdropClick"
    :close-by-escape="closeByEscape"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- Custom navbar -->
    <template v-if="navbar && $slots.navbar" #navbar>
      <slot name="navbar" />
    </template>

    <!-- Custom toolbar -->
    <template v-if="toolbar && $slots.toolbar" #toolbar>
      <slot name="toolbar" />
    </template>

    <!-- Custom caption -->
    <template v-if="$slots.caption" #caption="{ caption, index }">
      <slot name="caption" v-bind="{ caption, index }" />
    </template>
  </Framework7PhotoBrowser>
</template>

<style scoped>
/* Media viewer styling */
:deep(.photo-browser) {
  background: rgba(0, 0, 0, 0.95);
}

/* Platform-specific navbar */
:deep(.ios .photo-browser-navbar) {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
  padding: 0.5rem;
}

:deep(.android .photo-browser-navbar) {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
  padding: 0.5rem;
}

/* Toolbar styling */
:deep(.photo-browser-toolbar) {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 0.5rem;
}

/* Caption styling */
:deep(.photo-browser-caption) {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  text-align: center;
}

/* Close button styling */
:deep(.photo-browser-close) {
  color: white;
  font-size: 1.5rem;
  opacity: 0.8;
}

:deep(.photo-browser-close:hover) {
  opacity: 1;
}

/* Image styling */
:deep(.photo-browser-slide) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.photo-browser-slide img) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Animation */
:deep(.photo-browser) {
  transition: opacity 0.3s ease-out;
}

:deep(.photo-browser-slide) {
  transition: transform 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.photo-browser) {
    transition: none !important;
  }
  
  :deep(.photo-browser-slide) {
    transition: none !important;
  }
}

/* Zoom cursor */
:deep(.photo-browser-zoom) {
  cursor: zoom-in;
}

:deep(.photo-browser-zoom.zoomed) {
  cursor: zoom-out;
}
</style>
