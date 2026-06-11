<!--
  AppActionSheet.vue - Action Sheet Component
  
  Purpose: Action sheet with consistent styling and platform behavior
  
  Semantic primitive: YES - Core overlay component
  Replaces: Raw Framework7 action sheets
  
  Do:
  - Use for contextual actions
  - Provide clear action labels
  - Group related actions
  
  Don't:
  - Use raw Framework7 action sheets
  - Create custom action sheet implementations
  - Forget cancel buttons on iOS
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Actions as Framework7Actions } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import AppIcon from './AppIcon.vue';

// Props
const props = withDefaults(
  defineProps<{
    opened?: boolean;
    buttons?: Array<{
      text: string;
      icon?: string;
      color?: string;
      bold?: boolean;
      disabled?: boolean;
      value?: any;
    }>;
    groups?: Array<{
      label?: string;
      buttons: Array<{
        text: string;
        icon?: string;
        color?: string;
        bold?: boolean;
        disabled?: boolean;
        value?: any;
      }>;
    }>;
    cancelButton?: boolean | {
      text?: string;
      color?: string;
      bold?: boolean;
    };
    closeOnClick?: boolean;
    backdrop?: boolean;
    closeByBackdropClick?: boolean;
    closeByEscape?: boolean;
  }>(),
  {
    opened: false,
    buttons: () => [],
    groups: () => [],
    cancelButton: true,
    closeOnClick: true,
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
  (e: 'click', value: any, index: number): void;
  (e: 'group-click', groupIndex: number, buttonIndex: number, value: any): void;
  (e: 'cancel'): void;
}>();

// Internal opened state
const internalOpened = ref(props.opened);

// Platform detection
const { isIOS } = useNativeUi();

// Default cancel button text based on platform
const cancelButtonText = computed(() => {
  if (typeof props.cancelButton === 'object' && props.cancelButton.text) {
    return props.cancelButton.text;
  }
  return isIOS.value ? 'Cancel' : 'Close';
});

// Handle button click
const handleButtonClick = (value: any, index: number) => {
  if (props.closeOnClick) {
    close();
  }
  emit('click', value, index);
};

// Handle group button click
const handleGroupClick = (groupIndex: number, buttonIndex: number, value: any) => {
  if (props.closeOnClick) {
    close();
  }
  emit('group-click', groupIndex, buttonIndex, value);
};

// Handle cancel
const handleCancel = () => {
  close();
  emit('cancel');
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

// Build actions structure for Framework7
const actionsStructure = computed(() => {
  const structure: Array<{
    label?: string;
    buttons: Array<{
      text: string;
      icon?: any;
      color?: string;
      bold?: boolean;
      disabled?: boolean;
    }>;
  }> = [];

  // Add groups first
  if (props.groups.length > 0) {
    for (const group of props.groups) {
      structure.push({
        label: group.label,
        buttons: group.buttons.map(btn => ({
          text: btn.text,
          icon: btn.icon ? <AppIcon name={btn.icon} /> : undefined,
          color: btn.color,
          bold: btn.bold,
          disabled: btn.disabled,
        })),
      });
    }
  }

  // Add single buttons as a group
  if (props.buttons.length > 0) {
    structure.push({
      buttons: props.buttons.map(btn => ({
        text: btn.text,
        icon: btn.icon ? <AppIcon name={btn.icon} /> : undefined,
        color: btn.color,
        bold: btn.bold,
        disabled: btn.disabled,
      })),
    });
  }

  // Add cancel button
  if (props.cancelButton) {
    const cancelColor = typeof props.cancelButton === 'object' 
      ? props.cancelButton.color 
      : undefined;
    const cancelBold = typeof props.cancelButton === 'object' 
      ? props.cancelButton.bold 
      : isIOS.value;
    
    structure.push({
      buttons: [{
        text: cancelButtonText.value,
        color: cancelColor || (isIOS.value ? 'gray' : undefined),
        bold: cancelBold,
      }],
    });
  }

  return structure;
});
</script>

<template>
  <Framework7Actions
    :opened="internalOpened"
    @actions:open="open"
    @actions:opened="handleOpened"
    @actions:close="handleClosed"
    @actions:closed="handleClosed"
    @actions:clicked="(button, index) => handleButtonClick(props.buttons[index]?.value, index)"
    @actions:group-clicked="(groupIndex, buttonIndex) => {
      const group = props.groups[groupIndex];
      handleGroupClick(groupIndex, buttonIndex, group?.buttons[buttonIndex]?.value);
    }"
    :close-on-click="closeOnClick"
    :backdrop="backdrop"
    :close-by-backdrop-click="closeByBackdropClick"
    :close-by-escape="closeByEscape"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <template v-for="(group, groupIndex) in actionsStructure" :key="`group-${groupIndex}`">
      <!-- Group label -->
      <template v-if="group.label" #group-label="{ groupIndex }">
        {{ group.label }}
      </template>

      <!-- Buttons -->
      <template v-for="(button, buttonIndex) in group.buttons" :key="`btn-${groupIndex}-${buttonIndex}`">
        <template #button="{ index, onClick }">
          <div 
            class="action-sheet-button" 
            :class="{
              'action-sheet-button-bold': button.bold,
              'action-sheet-button-disabled': button.disabled,
            }"
            :style="{ color: button.color ? `var(--f7-color-${button.color})` : undefined }"
            @click="() => {
              const groupButtons = actionsStructure[groupIndex].buttons;
              const flatIndex = groupIndex === 0 ? buttonIndex : 
                (props.buttons.length > 0 ? props.buttons.length + buttonIndex + 1 : buttonIndex + 1);
              if (!button.disabled) {
                if (groupIndex < props.groups.length) {
                  handleGroupClick(groupIndex, buttonIndex, props.groups[groupIndex]?.buttons[buttonIndex]?.value);
                } else if (props.buttons.length > 0) {
                  handleButtonClick(props.buttons[buttonIndex]?.value, buttonIndex);
                } else {
                  handleCancel();
                }
              }
            }"
          >
            <AppIcon v-if="button.icon" :name="button.icon.props?.name" class="action-sheet-icon" />
            {{ button.text }}
          </div>
        </template>
      </template>
    </template>
  </Framework7Actions>
</template>

<style scoped>
/* Action sheet styling */
:deep(.actions-modal) {
  max-width: 400px;
}

/* Action sheet button */
.action-sheet-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.action-sheet-button:hover:not(.action-sheet-button-disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.action-sheet-button-bold {
  font-weight: 600;
}

.action-sheet-button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.action-sheet-icon {
  font-size: 1.25rem;
}

/* Platform-specific styling */
:deep(.ios .actions-modal) {
  border-radius: 12px;
}

:deep(.android .actions-modal) {
  border-radius: 8px;
}

/* Cancel button styling */
:deep(.actions-group-last) {
  margin-top: 0.5rem;
}

:deep(.ios .actions-group-last) {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--f7-block-border-color);
}

@media (prefers-reduced-motion: reduce) {
  :deep(.actions-modal) {
    transition: none !important;
  }
}
</style>
