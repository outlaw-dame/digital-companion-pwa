<!--
  AppPullToRefresh.vue - Pull to Refresh Component
  
  Purpose: Pull-to-refresh wrapper for scrollable content
  
  Semantic primitive: YES - Core interaction component
  Replaces: Raw Framework7 <Ptr> component
  
  Do:
  - Use for refreshing content
  - Provide appropriate feedback during refresh
  - Use with scrollable containers
  
  Don't:
  - Use raw Framework7 <Ptr>
  - Create custom pull-to-refresh implementations
  - Use for non-scrollable content
-->

<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { Ptr as Framework7Ptr, PtrContent as Framework7PtrContent } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import type { AppMethods } from 'framework7';

// Props
const props = withDefaults(
  defineProps<{
    mousewheel?: boolean;
    touch?: boolean;
    desktop?: boolean;
    icon?: string;
    iconColor?: string;
    iconSize?: string | number;
    layer?: string;
    layerBg?: string;
    layerOpacity?: number;
    pullText?: string;
    releaseText?: string;
    refreshingText?: string;
    distance?: number;
    threshold?: number;
  }>(),
  {
    mousewheel: undefined,
    touch: true,
    desktop: undefined,
    icon: 'material-refresh',
    iconColor: '#999',
    iconSize: '28px',
    layer: 'red',
    layerBg: undefined,
    layerOpacity: 0.5,
    pullText: 'Pull to refresh',
    releaseText: 'Release to refresh',
    refreshingText: 'Loading...',
    distance: 50,
    threshold: 80,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'refresh', done: () => void): void;
  (e: 'ptr:pullstart'): void;
  (e: 'ptr:pullmove', progress: number): void;
  (e: 'ptr:pullend'): void;
  (e: 'ptr:refresh'): void;
  (e: 'ptr:done'): void;
}>();

// Framework7 instance
const f7 = inject<AppMethods | null>('f7');

// Platform detection
const { isIOS, isAndroid } = useNativeUi();

// Ref state
const refreshing = ref(false);

// Handle refresh
const handleRefresh = (done: () => void) => {
  refreshing.value = true;
  emit('refresh', done);
  emit('ptr:refresh');
};

// Handle done
const handleDone = () => {
  refreshing.value = false;
  emit('ptr:done');
};

// Handle pull events
const handlePullStart = () => {
  emit('ptr:pullstart');
};

const handlePullMove = (progress: number) => {
  emit('ptr:pullmove', progress);
};

const handlePullEnd = () => {
  emit('ptr:pullend');
};

// Computed mousewheel based on platform
const computedMousewheel = computed(() => {
  if (props.mousewheel !== undefined) return props.mousewheel;
  // Enable for desktop
  return isAndroid.value ? false : true;
});

// Computed desktop based on platform
const computedDesktop = computed(() => {
  if (props.desktop !== undefined) return props.desktop;
  return !isIOS.value && !isAndroid.value;
});
</script>

<template>
  <Framework7Ptr
    :mousewheel="computedMousewheel"
    :touch="touch"
    :desktop="computedDesktop"
    @ptr:refresh="handleRefresh"
    @ptr:pullstart="handlePullStart"
    @ptr:pullmove="handlePullMove"
    @ptr:pullend="handlePullEnd"
    @ptr:done="handleDone"
    :icon="icon"
    :icon-color="iconColor"
    :icon-size="iconSize"
    :layer="layer"
    :layer-bg="layerBg"
    :layer-opacity="layerOpacity"
    :pull-text="pullText"
    :release-text="releaseText"
    :refreshing-text="refreshingText"
    :distance="distance"
    :threshold="threshold"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <Framework7PtrContent :refreshing="refreshing">
      <!-- Custom icon slot -->
      <template v-if="$slots.icon" #icon>
        <slot name="icon" />
      </template>

      <!-- Custom layer slot -->
      <template v-if="$slots.layer" #layer>
        <slot name="layer" />
      </template>

      <!-- Default content -->
      <slot />
    </Framework7PtrContent>
  </Framework7Ptr>
</template>

<style scoped>
/* Pull to refresh styling */
:deep(.ptr-preloader) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

:deep(.ptr-preloader-icon) {
  animation: ptr-spin 1s linear infinite;
}

@keyframes ptr-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.ptr-preloader-icon) {
    animation: none !important;
  }
}

/* Layer styling */
:deep(.ptr-layer) {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

/* Text styling */
:deep(.ptr-text) {
  font-size: 0.875rem;
  color: var(--f7-block-secondary-text-color);
  margin-top: 0.5rem;
}

/* Platform-specific styling */
:deep(.ios .ptr) {
  padding-top: 0.5rem;
}

:deep(.android .ptr) {
  padding-top: 0.5rem;
}

/* Distance indicator */
:deep(.ptr-distance) {
  height: 4px;
  background: var(--f7-color-primary);
  border-radius: 2px;
  transition: width 0.2s ease-out;
}
</style>
