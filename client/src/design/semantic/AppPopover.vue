<!--
  AppPopover.vue - Popover Component
  
  Purpose: Small overlay that appears near the triggering element
  
  Semantic primitive: YES - Core overlay component
  Replaces: Raw Framework7 <Popover> component
  
  Do:
  - Use for contextual menus and tips
  - Position relative to trigger element
  - Ensure proper accessibility
  
  Don't:
  - Use raw Framework7 <Popover>
  - Create custom popover implementations
  - Use for large content (use AppSheet or AppDialog)
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Popover as Framework7Popover } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    opened?: boolean;
    target?: string | HTMLElement;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
    backdrop?: boolean;
    closeByBackdropClick?: boolean;
    closeByEscape?: boolean;
    closeOnClick?: boolean;
    size?: 'small' | 'medium' | 'large' | 'auto';
    customClass?: string;
  }>(),
  {
    opened: false,
    target: undefined,
    position: 'auto',
    backdrop: false,
    closeByBackdropClick: true,
    closeByEscape: true,
    closeOnClick: false,
    size: 'auto',
    customClass: undefined,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:opened', value: boolean): void;
  (e: 'open'): void;
  (e: 'opened'): void;
  (e: 'close'): void;
  (e: 'closed'): void;
}>();

// Internal opened state
const internalOpened = ref(props.opened);

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

// Handle backdrop click
const handleBackdropClick = () => {
  if (props.closeByBackdropClick) {
    close();
  }
};

// Handle click inside popover
const handlePopoverClick = () => {
  if (props.closeOnClick) {
    close();
  }
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
</script>

<template>
  <Framework7Popover
    :opened="internalOpened"
    @popover:open="open"
    @popover:opened="handleOpened"
    @popover:close="handleClosed"
    @popover:closed="handleClosed"
    @popover:backdrop-click="handleBackdropClick"
    :target="target"
    :position="position"
    :backdrop="backdrop"
    :close-by-backdrop-click="closeByBackdropClick"
    :close-by-escape="closeByEscape"
    :size="size"
    :class="[customClass, $attrs.class]"
    :style="$attrs.style"
    @click="handlePopoverClick"
  >
    <div class="popover-content">
      <slot />
    </div>
  </Framework7Popover>
</template>

<style scoped>
/* Popover content */
.popover-content {
  padding: 0.75rem;
}

/* Platform-specific styling */
:deep(.ios .popover) {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.android .popover) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Size variants */
:deep(.popover-small) {
  max-width: 200px;
}

:deep(.popover-medium) {
  max-width: 300px;
}

:deep(.popover-large) {
  max-width: 400px;
}

/* Animation */
:deep(.popover) {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.popover) {
    transition: none !important;
  }
}
</style>
