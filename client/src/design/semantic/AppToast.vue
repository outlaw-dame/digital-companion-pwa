<!--
  AppToast.vue - Toast/Notification Component
  
  Purpose: Brief, non-modal notifications
  
  Semantic primitive: YES - Core feedback component
  Replaces: Raw Framework7 toast/snackbar
  
  Do:
  - Use for brief notifications
  - Set appropriate duration
  - Use for success/error/info messages
  
  Don't:
  - Use raw Framework7 toast
  - Create custom toast implementations
  - Use for long messages (use dialog instead)
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Toast as Framework7Toast } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    opened?: boolean;
    text?: string;
    icon?: string;
    title?: string;
    subtitle?: string;
    closeButton?: boolean;
    closeTimeout?: number;
    destroyOnClose?: boolean;
    position?: 'top' | 'center' | 'bottom';
    horizontalPosition?: 'left' | 'center' | 'right';
    type?: 'default' | 'success' | 'error' | 'warning' | 'info';
    customClass?: string;
  }>(),
  {
    opened: false,
    text: '',
    icon: undefined,
    title: undefined,
    subtitle: undefined,
    closeButton: false,
    closeTimeout: 3000,
    destroyOnClose: false,
    position: 'bottom',
    horizontalPosition: 'center',
    type: 'default',
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

// Watch for external opened changes
watch(
  () => props.opened,
  (newValue) => {
    if (newValue !== internalOpened.value) {
      internalOpened.value = newValue;
    }
  }
);

// Toast type styling
const toastClass = computed(() => {
  const classes = [customClass];
  
  switch (props.type) {
    case 'success':
      classes.push('toast-success');
      break;
    case 'error':
      classes.push('toast-error');
      break;
    case 'warning':
      classes.push('toast-warning');
      break;
    case 'info':
      classes.push('toast-info');
      break;
  }
  
  return classes.filter(Boolean).join(' ');
});
</script>

<template>
  <Framework7Toast
    :opened="internalOpened"
    @toast:open="open"
    @toast:opened="handleOpened"
    @toast:close="handleClosed"
    @toast:closed="handleClosed"
    :text="text"
    :icon="icon"
    :title="title"
    :subtitle="subtitle"
    :close-button="closeButton"
    :close-timeout="closeTimeout"
    :destroy-on-close="destroyOnClose"
    :position="position"
    :horizontal-position="horizontalPosition"
    :class="[toastClass, $attrs.class]"
    :style="$attrs.style"
  />
</template>

<style scoped>
/* Toast styling */
:deep(.toast) {
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  max-width: 400px;
  margin: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Toast types */
:deep(.toast-success) {
  background: var(--f7-color-green);
  color: white;
}

:deep(.toast-error) {
  background: var(--f7-color-red);
  color: white;
}

:deep(.toast-warning) {
  background: var(--f7-color-orange);
  color: white;
}

:deep(.toast-info) {
  background: var(--f7-color-blue);
  color: white;
}

/* Toast icon */
:deep(.toast-icon) {
  font-size: 1.25rem;
  flex-shrink: 0;
}

/* Toast text */
:deep(.toast-text) {
  flex: 1;
}

/* Toast close button */
:deep(.toast-close-button) {
  flex-shrink: 0;
  opacity: 0.7;
  padding: 0 0.25rem;
}

:deep(.toast-close-button:hover) {
  opacity: 1;
}

/* Position variants */
:deep(.toast-position-top) {
  top: 0;
}

:deep(.toast-position-center) {
  top: 50%;
  transform: translateY(-50%);
}

:deep(.toast-position-bottom) {
  bottom: 0;
}

/* Animation */
:deep(.toast) {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.toast) {
    transition: none !important;
  }
}
</style>
