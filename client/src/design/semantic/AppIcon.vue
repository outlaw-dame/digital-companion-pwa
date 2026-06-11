<!--
  AppIcon.vue - Icon Wrapper
  
  Purpose: Icon wrapper that manages icon registry and platform-specific icons
  
  Semantic primitive: YES - Core icon component
  Replaces: All direct icon library imports
  
  Do:
  - Use for ALL icons in the application
  - Use icon names from registry
  - Specify platform-specific variants when needed
  
  Don't:
  - Import Iconoir or any other icon library directly
  - Create inline SVG icons
  - Use emoji as icons
-->

<script setup lang="ts">
import { computed, h, resolveComponent, shallowRef } from 'vue';
import { iconRegistry, platformIcons } from '../icons/iconRegistry';
import type { IconRegistry } from '../icons/iconRegistry';

// Props
const props = withDefaults(
  defineProps<{
    name: string;
    size?: number | string;
    color?: string;
    class?: string;
    platform?: 'ios' | 'android' | 'pwa' | 'auto';
  }>(),
  {
    size: undefined,
    color: undefined,
    class: undefined,
    platform: 'auto',
  }
);

// Detect current platform
const detectPlatform = (): 'ios' | 'android' | 'pwa' => {
  if (typeof window === 'undefined') return 'pwa';
  
  // Import here to avoid circular dependency
  const { useNativeUi } = require('../platform/nativeUiProfile');
  const { platform } = useNativeUi();
  return platform.value;
};

// Get the icon component based on name and platform
const getIconComponent = (name: string, platform: 'ios' | 'android' | 'pwa'): any => {
  // Check if this icon has platform-specific variants
  const platformIcon = platformIcons[name];
  
  if (platformIcon) {
    // Use platform-specific variant
    const platformVariant = platform === 'auto' ? detectPlatform() : platform;
    const iconName = platformIcon[platformVariant] || platformIcon.pwa;
    return iconRegistry[iconName]?.component;
  }
  
  // Use the icon directly from registry
  const iconDef = iconRegistry[name];
  if (iconDef) {
    return iconDef.component;
  }
  
  // Fallback: try to find the icon
  if (iconRegistry[name]) {
    return iconRegistry[name].component;
  }
  
  // Last resort: return a placeholder
  console.warn(`Icon "${name}" not found in registry`);
  return null;
};

// Computed icon component
const iconComponent = computed(() => {
  return getIconComponent(props.name, props.platform);
});

// Style based on props
const iconStyle = computed(() => {
  const style: Record<string, string | number> = {};
  
  if (props.size) {
    const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size;
    style.width = sizeValue;
    style.height = sizeValue;
  }
  
  if (props.color) {
    style.color = props.color;
  }
  
  return style;
});

// Accessibility: icon-only elements should have aria-hidden
const ariaHidden = computed(() => {
  // If this icon is used as a standalone decorative element, hide from screen readers
  // If it's part of a button with text, the button itself should handle accessibility
  return true;
});
</script>

<template>
  <component
    :is="iconComponent"
    v-if="iconComponent"
    :style="iconStyle"
    :class="[$attrs.class, 'app-icon']"
    :aria-hidden="ariaHidden"
    v-bind="$attrs"
  />
  
  <!-- Fallback for missing icons -->
  <span
    v-else
    class="app-icon-placeholder"
    :style="iconStyle"
    :class="[$attrs.class, 'app-icon']"
    aria-hidden="true"
  >
    ?
  </span>
</template>

<style scoped>
/* Icon styling */
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.app-icon-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--f7-color-gray);
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.1);
  color: var(--f7-color-red);
  font-family: monospace;
  font-weight: bold;
}

/* Touch target size minimum */
:deep(.app-icon) {
  min-width: 44px;
  min-height: 44px;
}
</style>
