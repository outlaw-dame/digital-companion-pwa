<!--
  AppTextArea.vue - Multi-line Text Input
  
  Purpose: Multi-line text input with consistent styling and native-like behavior
  
  Semantic primitive: YES - Core form component
  Replaces: Raw Framework7 <Textarea> component
  
  Do:
  - Use for multi-line text input
  - Provide appropriate placeholder and label
  - Set appropriate resize behavior
  
  Don't:
  - Use raw Framework7 <Textarea>
  - Create custom textarea implementations
  - Forget accessible labels
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Textarea as Framework7Textarea } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    value?: string;
    label?: string;
    disabled?: boolean;
    readonly?: boolean;
    resize?: 'none' | 'both' | 'horizontal' | 'vertical' | 'auto';
    error?: string;
    required?: boolean;
    autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
    enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
    spellcheck?: boolean;
    rows?: number;
    maxLength?: number;
  }>(),
  {
    placeholder: undefined,
    value: '',
    label: undefined,
    disabled: false,
    readonly: false,
    resize: 'vertical',
    error: undefined,
    required: false,
    autocapitalize: 'sentences',
    enterkeyhint: 'done',
    spellcheck: true,
    rows: 3,
    maxLength: undefined,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'focus', event: Event): void;
  (e: 'blur', event: Event): void;
  (e: 'input', event: Event): void;
  (e: 'change', event: Event): void;
}>();

// Internal value
const internalValue = ref(props.value);

// Update value
const updateValue = (newValue: string) => {
  internalValue.value = newValue;
  emit('update:value', newValue);
};

// Handle input
const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  updateValue(target.value);
  emit('input', event);
};

// Handle change
const handleChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  updateValue(target.value);
  emit('change', event);
};

// Handle focus/blur
const handleFocus = (event: Event) => {
  emit('focus', event);
};

const handleBlur = (event: Event) => {
  emit('blur', event);
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

// Accessibility: generate id for label association
const inputId = computed(() => {
  return `textarea-${Math.random().toString(36).substring(2, 9)}`;
});
</script>

<template>
  <div class="textarea-wrapper" :class="{ 'has-error': error }">
    <!-- Label -->
    <label 
      v-if="label"
      :for="inputId"
      class="textarea-label"
    >
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>
    
    <!-- Textarea -->
    <Framework7Textarea
      :id="inputId"
      :placeholder="placeholder"
      :value="internalValue"
      @input="handleInput"
      @change="handleChange"
      :disabled="disabled"
      :readonly="readonly"
      :resize="resize"
      :rows="rows"
      :maxlength="maxLength"
      @focus="handleFocus"
      @blur="handleBlur"
      :autocapitalize="autocapitalize"
      :enterkeyhint="enterkeyhint"
      :spellcheck="spellcheck"
      :aria-label="label || placeholder"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :aria-required="required"
      :aria-invalid="!!error"
      :class="$attrs.class"
      :style="$attrs.style"
    >
      <slot />
    </Framework7Textarea>
    
    <!-- Error message -->
    <div 
      v-if="error"
      :id="`${inputId}-error`"
      class="textarea-error"
      role="alert"
    >
      {{ error }}
    </div>
    
    <!-- Character counter -->
    <div v-if="maxLength" class="textarea-counter">
      {{ internalValue.length }} / {{ maxLength }}
    </div>
  </div>
</template>

<style scoped>
/* Textarea wrapper */
.textarea-wrapper {
  margin-bottom: 1rem;
}

.textarea-wrapper.has-error :deep(.textarea-input) {
  border-color: var(--f7-color-red);
}

/* Label */
.textarea-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--f7-block-text-color);
}

.required-indicator {
  color: var(--f7-color-red);
  margin-left: 0.25rem;
}

/* Error message */
.textarea-error {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--f7-color-red);
  line-height: 1.2;
}

/* Character counter */
.textarea-counter {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--f7-block-secondary-text-color);
  text-align: right;
}

/* Accessibility: Ensure minimum touch target */
:deep(.textarea-input) {
  min-height: 44px;
  padding: 0.75rem;
}

/* Native-like styling */
:deep(.textarea-input) {
  border-radius: 8px;
  border: 1px solid var(--f7-block-border-color);
  background: var(--f7-block-bg-color);
  color: var(--f7-block-text-color);
  font-family: inherit;
  font-size: inherit;
}

:deep(.textarea-input:focus) {
  outline: 2px solid var(--f7-color-primary);
  outline-offset: -2px;
  border-color: var(--f7-color-primary);
}

:deep(.textarea-input.disabled) {
  opacity: 0.5;
  pointer-events: none;
}

/* Resize styling */
:deep(.textarea-input[resize="none"]) {
  resize: none;
}

:deep(.textarea-input[resize="both"]) {
  resize: both;
}

:deep(.textarea-input[resize="horizontal"]) {
  resize: horizontal;
}

:deep(.textarea-input[resize="vertical"]) {
  resize: vertical;
}

:deep(.textarea-input[resize="auto"]) {
  resize: auto;
}
</style>
