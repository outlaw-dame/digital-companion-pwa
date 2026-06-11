<!--
  AppPage.vue - Page Container
  
  Purpose: Page-level container for each route/view
  
  Semantic primitive: YES - Core shell component
  Replaces: Raw Framework7 <Page> component
  
  Do:
  - Use as wrapper for each route view component
  - Use name prop for Framework7 navigation integration
  - Enable ptr for pull-to-refresh capable pages
  
  Don't:
  - Nest AppPage within AppPage
  - Use raw Framework7 <Page> component
  - Create custom page containers
-->

<script setup lang="ts">
import { computed, inject } from 'vue';
import { Page as Framework7Page } from 'framework7-vue';
import type { AppMethods } from 'framework7';

// Props
const props = withDefaults(
  defineProps<{
    name?: string;
    ptr?: boolean;
    infinite?: boolean;
    ptrMouseWheel?: boolean;
  }>(),
  {
    name: undefined,
    ptr: false,
    infinite: false,
    ptrMouseWheel: false,
  }
);

// Framework7 instance
const f7 = inject<AppMethods | null>('f7');

// Computed ptr setting - enable mouse wheel for desktop PWA
const ptrConfig = computed(() => ({
  enabled: props.ptr,
  mousewheel: props.ptrMouseWheel,
}));

// Handle pull-to-refresh
const handleRefresh = (done: () => void) => {
  // Emit refresh event
  emit('refresh', done);
};

// Emit events
const emit = defineEmits<{
  (e: 'refresh', done: () => void): void;
}>();
</script>

<template>
  <Framework7Page
    :name="name"
    :ptr="ptrConfig"
    @ptr:refresh="handleRefresh"
    :infinite="infinite"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <slot />
  </Framework7Page>
</template>

<style scoped>
/* Page-specific styling */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none !important;
  }
}
</style>
