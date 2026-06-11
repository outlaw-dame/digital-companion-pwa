<!--
  AppToolbar.vue - Toolbar Component
  
  Purpose: Top or bottom toolbar with consistent styling
  
  Semantic primitive: YES - Core shell component
  Replaces: Raw Framework7 <Toolbar> component
  
  Do:
  - Use for top or bottom toolbars
  - Provide appropriate spacing
  - Use for navigation and actions
  
  Don't:
  - Use raw Framework7 <Toolbar>
  - Create custom toolbar implementations
  - Use AppToolbar within AppTabBar (use AppTabBar slots instead)
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Toolbar as Framework7Toolbar } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';

// Props
const props = withDefaults(
  defineProps<{
    position?: 'top' | 'bottom';
    inset?: boolean;
    hidden?: boolean;
    noShadow?: boolean;
    noBorder?: boolean;
    tabbar?: boolean;
    labels?: boolean;
    icons?: boolean;
    scrollable?: boolean;
    noHairline?: boolean;
    inner?: boolean;
    outer?: boolean;
  }>(),
  {
    position: 'bottom',
    inset: false,
    hidden: false,
    noShadow: false,
    noBorder: false,
    tabbar: false,
    labels: true,
    icons: true,
    scrollable: false,
    noHairline: false,
    inner: false,
    outer: false,
  }
);

// Platform detection
const { isIOS, isAndroid } = useNativeUi();

// Computed classes
const toolbarClass = computed(() => {
  const classes: string[] = [];
  
  if (props.tabbar) {
    classes.push('toolbar-tabbar');
  }
  
  if (props.noShadow) {
    classes.push('no-shadow');
  }
  
  if (props.noBorder) {
    classes.push('no-border');
  }
  
  return classes;
});
</script>

<template>
  <Framework7Toolbar
    :position="position"
    :inset="inset"
    :hidden="hidden"
    :no-shadow="noShadow"
    :no-border="noBorder"
    :tabbar="tabbar"
    :labels="labels"
    :icons="icons"
    :scrollable="scrollable"
    :no-hairline="noHairline"
    :inner="inner"
    :outer="outer"
    :class="[toolbarClass, $attrs.class]"
    :style="$attrs.style"
  >
    <!-- Left slot -->
    <template v-if="$slots.left" #left>
      <slot name="left" />
    </template>

    <!-- Default slot for main content -->
    <slot />

    <!-- Right slot -->
    <template v-if="$slots.right" #right>
      <slot name="right" />
    </template>
  </Framework7Toolbar>
</template>

<style scoped>
/* Toolbar styling */
:deep(.toolbar) {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;
}

:deep(.toolbar-inner) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

/* Position variants */
:deep(.toolbar-position-top) {
  top: 0;
}

:deep(.toolbar-position-bottom) {
  bottom: 0;
}

/* Inset toolbar */
:deep(.toolbar-inset) {
  left: 0;
  right: 0;
}

/* No shadow */
:deep(.no-shadow) {
  box-shadow: none !important;
}

/* No border */
:deep(.no-border) {
  border: none !important;
}

/* Tabbar styling */
:deep(.toolbar-tabbar) {
  justify-content: space-around;
}

/* Platform-specific styling */
:deep(.ios .toolbar) {
  background: var(--f7-bars-bg-color);
  border-color: var(--f7-bars-border-color);
}

:deep(.android .toolbar) {
  background: var(--f7-bars-bg-color);
  border-color: var(--f7-bars-border-color);
}

/* Inner/outer variants */
:deep(.toolbar-inner) {
  padding: 0;
}

:deep(.toolbar-outer) {
  position: relative;
}

/* Animation */
:deep(.toolbar) {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.toolbar) {
    transition: none !important;
  }
}

/* Safe area insets for notched devices */
:deep(.ios .toolbar-position-bottom) {
  padding-bottom: env(safe-area-inset-bottom);
}

:deep(.ios .toolbar-position-top) {
  padding-top: env(safe-area-inset-top);
}
</style>
