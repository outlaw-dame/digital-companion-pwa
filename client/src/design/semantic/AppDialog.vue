<!--
  AppDialog.vue - Dialog/Modal Component
  
  Purpose: Centered dialog modal with consistent styling and platform behavior
  
  Semantic primitive: YES - Core overlay component
  Replaces: Raw Framework7 <Dialog> component
  
  Do:
  - Use for important prompts and confirmations
  - Provide clear title and actions
  - Ensure proper accessibility
  
  Don't:
  - Use raw Framework7 <Dialog>
  - Create custom dialog implementations
  - Use for bottom sheets (use AppSheet instead)
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Dialog as Framework7Dialog } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import AppButton from './AppButton.vue';

// Props
const props = withDefaults(
  defineProps<{
    opened?: boolean;
    title?: string;
    content?: string;
    buttons?: Array<{
      text: string;
      color?: string;
      fill?: 'solid' | 'outline' | 'clear';
      disabled?: boolean;
      value?: any;
      close?: boolean;
    }>;
    closeByBackdropClick?: boolean;
    closeByEscape?: boolean;
    backdrop?: boolean;
    push?: boolean;
    rendered?: boolean;
    size?: 'small' | 'medium' | 'large' | 'full';
  }>(),
  {
    opened: false,
    title: undefined,
    content: undefined,
    buttons: () => [],
    closeByBackdropClick: false,
    closeByEscape: true,
    backdrop: true,
    push: false,
    rendered: true,
    size: 'medium',
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:opened', value: boolean): void;
  (e: 'open'): void;
  (e: 'opened'): void;
  (e: 'close'): void;
  (e: 'closed'): void;
  (e: 'click', value: any, index: number): void;
}>();

// Internal opened state
const internalOpened = ref(props.opened);

// Platform detection
const { isIOS } = useNativeUi();

// Handle button click
const handleButtonClick = (value: any, index: number, closeDialog: boolean = true) => {
  if (closeDialog) {
    close();
  }
  emit('click', value, index);
};

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

// Compute dialog size
const dialogSize = computed(() => {
  return props.size;
});
</script>

<template>
  <Framework7Dialog
    :opened="internalOpened"
    @dialog:open="open"
    @dialog:opened="handleOpened"
    @dialog:close="handleClosed"
    @dialog:closed="handleClosed"
    :close-by-backdrop-click="closeByBackdropClick"
    :close-by-escape="closeByEscape"
    :backdrop="backdrop"
    :push="push"
    :rendered="rendered"
    :size="dialogSize"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- Title -->
    <template v-if="title || $slots.title" #title>
      <slot name="title">{{ title }}</slot>
    </template>

    <!-- Content -->
    <template v-if="content || $slots.default" #content>
      <div class="dialog-content">
        <slot>{{ content }}</slot>
      </div>
    </template>

    <!-- Footer with buttons -->
    <template v-if="buttons.length > 0 || $slots.footer" #footer>
      <div class="dialog-footer" :class="{ 'dialog-footer-ios': isIOS }">
        <slot name="footer">
          <div class="dialog-buttons">
            <AppButton
              v-for="(button, index) in buttons"
              :key="index"
              :text="button.text"
              :fill="button.fill || 'solid'"
              :color="button.color"
              :disabled="button.disabled"
              @click="() => handleButtonClick(button.value, index, button.close !== false)"
              class="dialog-button"
            />
          </div>
        </slot>
      </div>
    </template>
  </Framework7Dialog>
</template>

<style scoped>
/* Dialog content */
.dialog-content {
  padding: 1rem;
}

/* Dialog footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid var(--f7-block-border-color);
}

.dialog-footer-ios {
  justify-content: space-between;
}

.dialog-buttons {
  display: flex;
  gap: 0.75rem;
}

.dialog-button {
  min-width: 80px;
}

/* Platform-specific styling */
:deep(.ios .dialog) {
  border-radius: 12px;
}

:deep(.android .dialog) {
  border-radius: 8px;
}

/* Animation */
:deep(.dialog) {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.dialog) {
    transition: none !important;
  }
}

/* Size variants */
:deep(.dialog-small) {
  max-width: 300px;
}

:deep(.dialog-medium) {
  max-width: 400px;
}

:deep(.dialog-large) {
  max-width: 500px;
}

:deep(.dialog-full) {
  max-width: 90vw;
  width: 90vw;
}
</style>
