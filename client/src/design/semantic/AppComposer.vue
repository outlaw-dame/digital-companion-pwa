<!--
  AppComposer.vue - Message/Content Composer
  
  Purpose: Rich text input for message composition with native-like behavior
  
  Semantic primitive: YES - Core form component
  Replaces: Custom message input implementations
  
  Do:
  - Use for message composition
  - Support emoji and unicode content
  - Provide appropriate keyboard hints
  - Enable spellcheck
  
  Don't:
  - Block paste
  - Suppress emoji/unicode
  - Forget to disable send when invalid
  - Use for single-line inputs
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import AppTextArea from './AppTextArea.vue';
import AppButton from './AppButton.vue';

// Props
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    maxLength?: number;
    rows?: number;
    showCounter?: boolean;
    sendLabel?: string;
    sendIcon?: string;
  }>(),
  {
    placeholder: 'Type a message...',
    value: '',
    disabled: false,
    maxLength: 5000,
    rows: 3,
    showCounter: true,
    sendLabel: 'Send',
    sendIcon: 'send',
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'send', value: string): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
}>();

// Internal value
const internalValue = ref(props.value);

// Update value
const updateValue = (newValue: string) => {
  internalValue.value = newValue;
  emit('update:value', newValue);
};

// Handle send
const handleSend = () => {
  if (canSend.value && internalValue.value.trim()) {
    emit('send', internalValue.value);
  }
};

// Handle focus/blur
const handleFocus = () => {
  emit('focus');
};

const handleBlur = () => {
  emit('blur');
};

// Watch for external value changes
watch(
  () => props.value,
  (newValue) => {
    if (newValue !== internalValue.value) {
      internalValue.value = newValue;
    }
  }
);

// Compute if send is allowed
const canSend = computed(() => {
  return !props.disabled && internalValue.value.trim().length > 0;
});

// Remaining characters
const remainingChars = computed(() => {
  return props.maxLength - internalValue.value.length;
});

// Platform detection for keyboard behavior
const { isIOS } = useNativeUi();

// Keyboard hint for composer
const keyboardHint = computed(() => {
  return isIOS.value ? 'done' : 'send';
});
</script>

<template>
  <div class="composer-wrapper">
    <!-- Text area for composition -->
    <AppTextArea
      :value="internalValue"
      @update:value="updateValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :max-length="maxLength"
      :spellcheck="true"
      :autocapitalize="'sentences'"
      :enterkeyhint="keyboardHint"
      inputmode="text"
      @focus="handleFocus"
      @blur="handleBlur"
      class="composer-textarea"
    />

    <!-- Composer footer with send button -->
    <div class="composer-footer">
      <div class="composer-actions">
        <!-- Left actions slot -->
        <slot name="left-actions" />
      </div>

      <div class="composer-send">
        <!-- Character counter -->
        <div 
          v-if="showCounter && remainingChars < 100"
          class="composer-counter"
          :class="{ 'counter-warning': remainingChars < 20 }"
        >
          {{ remainingChars }}
        </div>

        <!-- Send button -->
        <AppButton
          :text="sendLabel"
          :icon="sendIcon"
          :disabled="!canSend"
          fill="solid"
          @click="handleSend"
          class="composer-send-button"
        />
      </div>

      <div class="composer-actions">
        <!-- Right actions slot -->
        <slot name="right-actions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Composer wrapper */
.composer-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--f7-block-bg-color);
  border-top: 1px solid var(--f7-block-border-color);
}

/* Composer textarea */
.composer-textarea :deep(.textarea-input) {
  min-height: 100px;
  max-height: 300px;
  resize: vertical;
  padding: 0.75rem;
}

/* Composer footer */
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.composer-actions {
  display: flex;
  gap: 0.25rem;
}

.composer-send {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Character counter */
.composer-counter {
  font-size: 0.75rem;
  color: var(--f7-block-secondary-text-color);
  min-width: 24px;
  text-align: center;
}

.composer-counter.counter-warning {
  color: var(--f7-color-red);
  font-weight: 600;
}

/* Send button */
.composer-send-button {
  min-width: 44px;
}

/* Disabled state */
.composer-wrapper :deep(.textarea-input.disabled) {
  opacity: 0.5;
}

/* Focus state */
.composer-wrapper :deep(.textarea-input:focus) {
  outline: 2px solid var(--f7-color-primary);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .composer-wrapper :deep(.textarea-input) {
    transition: none !important;
  }
}
</style>
