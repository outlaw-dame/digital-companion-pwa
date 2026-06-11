<!--
  AppRoot.vue - Root Application Container
  
  Purpose: Root application container that provides Framework7 context and global styling
  
  Semantic primitive: YES - Core shell component
  Replaces: Raw Framework7 <App> component
  
  Do:
  - Use as the single root component in main.ts
  - Pass theme prop to enable system theme detection
  - Wrap entire application content
  
  Don't:
  - Create multiple AppRoot instances
  - Use raw Framework7 <App> component
  - Add custom styling directly to AppRoot
-->

<script setup lang="ts">
import { ref, watch, provide } from 'vue';
import { f7, f7ready, App as Framework7App } from 'framework7-vue';
import type { AppMethods, AppParams } from 'framework7';

// Props
const props = withDefaults(
  defineProps<{
    theme?: 'light' | 'dark' | 'auto';
  }>(),
  {
    theme: 'auto',
  }
);

// Theme management
const currentTheme = ref(props.theme);

// Detect system theme
const detectSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Watch for theme changes
watch(
  () => props.theme,
  (newTheme) => {
    currentTheme.value = newTheme === 'auto' ? detectSystemTheme() : newTheme;
  }
);

// Initialize with system theme if auto
if (props.theme === 'auto') {
  currentTheme.value = detectSystemTheme();
}

// Framework7 app instance
let f7Instance: AppMethods | null = null;

// Initialize Framework7
f7ready(() => {
  const params: AppParams = {
    theme: currentTheme.value,
    // Additional Framework7 configuration
  };
  f7Instance = f7(params);
});

// Provide Framework7 instance to children
provide('f7', f7Instance);

// Expose theme for child components
const theme = currentTheme;
</script>

<template>
  <Framework7App :theme="currentTheme">
    <slot />
  </Framework7App>
</template>

<style scoped>
/* Root-level styling */
:root {
  --f7-theme-color: var(--f7-color-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    transition: none !important;
  }
}
</style>
