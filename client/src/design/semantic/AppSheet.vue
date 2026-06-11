<!--
  AppSheet.vue - Bottom Sheet Component
  
  Purpose: Bottom sheet modal with consistent styling and platform behavior
  
  Semantic primitive: YES - Core overlay component
  Replaces: Raw Framework7 <Sheet> component
  
  Do:
  - Use for bottom sheets that slide up from bottom
  - Provide appropriate backdrop behavior
  - Ensure proper accessibility
  
  Don't:
  - Use raw Framework7 <Sheet>
  - Create custom bottom sheet implementations
  - Forget to handle backdrop clicks
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Sheet as Framework7Sheet } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';

// Props
const props = withDefaults(
  defineProps<{
    opened?: boolean;
    backdrop?: boolean;
    closeByBackdropClick?: boolean;
    closeByEscape?: boolean;
    swipeToClose?: boolean;
    swipeToStep?: boolean;
    push?: boolean;
    height?: string | number;
    initialHeight?: string | number;
    maxHeight?: string | number;
    customClass?: string;
  }>(),
  {
    opened: false,
    backdrop: true,
    closeByBackdropClick: true,
    closeByEscape: true,
    swipeToClose: true,
    swipeToStep: false,
    push: false,
    height: 'auto',
    initialHeight: undefined,
    maxHeight: '100%',
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
  (e: 'backdrop-click'): void;
}>();

// Internal opened state
const internalOpened = ref(props.opened);

// Platform detection
const { isIOS } = useNativeUi();

// Computed height with platform defaults
const computedHeight = computed(() => {
  if (props.height !== 'auto') return props.height;
  // iOS typically uses auto height
  if (isIOS.value) return 'auto';
  // Android might want a specific height
  return '50%';
});

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

// Handle backdrop click
const handleBackdropClick = () => {
  if (props.closeByBackdropClick) {
    close();
  }
  emit('backdrop-click');
};

// Handle opened event
const handleOpened = () => {
  emit('opened');
};

// Handle closed event
const handleClosed = () => {
  emit('closed');
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
  <Framework7Sheet
    :opened="internalOpened"
    @sheet:open="open"
    @sheet:opened="handleOpened"
    @sheet:close="handleClosed"
    @sheet:closed="handleClosed"
    @sheet:backdrop-click="handleBackdropClick"
    :backdrop="backdrop"
    :close-by-backdrop-click="closeByBackdropClick"
    :close-by-escape="closeByEscape"
    :swipe-to-close="swipeToClose"
    :swipe-to-step="swipeToStep"
    :push="push"
    :height="computedHeight"
    :initial-height="initialHeight"
    :max-height="maxHeight"
    :class="[customClass, $attrs.class]"
    :style="$attrs.style"
  >
    <!-- Header slot -->
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <!-- Default content -->
    <div class="sheet-content" :class="{ 'sheet-content-ios': isIOS }">
      <slot />
    </div>

    <!-- Footer slot -->
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Framework7Sheet>
</template>

<style scoped>
/* Sheet content */
.sheet-content {
  padding: 1rem;
  overflow-y: auto;
  max-height: 100%;
}

.sheet-content-ios {
  padding-top: 0;
}

/* Accessibility: ensure focus is visible */
:deep(.sheet-backdrop) {
  cursor: pointer;
}

/* Platform-specific styling */
:deep(.ios .sheet) {
  border-radius: 12px 12px 0 0;
}

:deep(.android .sheet) {
  border-radius: 8px 8px 0 0;
}

/* Animation */
:deep(.sheet) {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.sheet) {
    transition: none !important;
  }
}
</style>
