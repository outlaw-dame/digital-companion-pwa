<!--
  AppTextField.vue - Text Input Field
  
  Purpose: Single-line text input with consistent styling and native-like behavior
  
  Semantic primitive: YES - Core form component
  Replaces: Raw Framework7 <Input> component
  
  Do:
  - Use for all single-line text inputs
  - Provide appropriate type and autocomplete
  - Use clear button for search-like fields
  
  Don't:
  - Use raw Framework7 <Input>
  - Create custom text inputs
  - Forget accessible labels
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Input as Framework7Input } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    type?: 'text' | 'password' | 'email' | 'tel' | 'url' | 'number' | 'search';
    placeholder?: string;
    value?: string;
    label?: string;
    disabled?: boolean;
    readonly?: boolean;
    clear?: boolean;
    error?: string;
    required?: boolean;
    autocomplete?: string;
    autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters';
    inputmode?: 'text' | 'search' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal';
    enterkeyhint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';
    spellcheck?: boolean;
  }>(),
  {
    type: 'text',
    placeholder: undefined,
    value: '',
    label: undefined,
    disabled: false,
    readonly: false,
    clear: false,
    error: undefined,
    required: false,
    autocomplete: undefined,
    autocapitalize: undefined,
    inputmode: undefined,
    enterkeyhint: undefined,
    spellcheck: true,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'focus', event: Event): void;
  (e: 'blur', event: Event): void;
  (e: 'clear'): void;
  (e: 'keydown', event: KeyboardEvent): void;
  (e: 'input', event: Event): void;
}>();

// Internal value
const internalValue = ref(props.value);

// Update value
const updateValue = (newValue: string) => {
  internalValue.value = newValue;
  emit('update:value', newValue);
};

// Handle clear
const handleClear = () => {
  updateValue('');
  emit('clear');
};

// Handle input
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  updateValue(target.value);
  emit('input', event);
};

// Handle focus/blur
const handleFocus = (event: Event) => {
  emit('focus', event);
};

const handleBlur = (event: Event) => {
  emit('blur', event);
};

// Handle keydown
const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event);
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

// Compute appropriate inputmode based on type
const computedInputmode = computed(() => {
  return props.inputmode || getInputmodeFromType(props.type);
});

// Compute appropriate enterkeyhint based on type
const computedEnterkeyhint = computed(() => {
  return props.enterkeyhint || getEnterkeyhintFromType(props.type);
});

// Compute appropriate autocapitalize based on type
const computedAutocapitalize = computed(() => {
  return props.autocapitalize || getAutocapitalizeFromType(props.type);
});

// Compute appropriate autocomplete
const computedAutocomplete = computed(() => {
  return props.autocomplete || getAutocompleteFromType(props.type);
});

// Compute appropriate spellcheck
const computedSpellcheck = computed(() => {
  return props.spellcheck;
});

// Helper functions for input attributes
function getInputmodeFromType(type: string): string | undefined {
  const inputmodeMap: Record<string, string> = {
    text: 'text',
    password: 'text',
    email: 'email',
    tel: 'tel',
    url: 'url',
    number: 'numeric',
    search: 'search',
  };
  return inputmodeMap[type] || undefined;
}

function getEnterkeyhintFromType(type: string): string | undefined {
  const enterkeyhintMap: Record<string, string> = {
    text: 'done',
    password: 'done',
    email: 'done',
    tel: 'done',
    url: 'go',
    number: 'done',
    search: 'search',
  };
  return enterkeyhintMap[type] || undefined;
}

function getAutocapitalizeFromType(type: string): string | undefined {
  const autocapitalizeMap: Record<string, string> = {
    text: 'sentences',
    password: 'off',
    email: 'off',
    tel: 'off',
    url: 'off',
    number: 'off',
    search: 'none',
  };
  return autocapitalizeMap[type] || undefined;
}

function getAutocompleteFromType(type: string): string | undefined {
  const autocompleteMap: Record<string, string> = {
    text: 'off',
    password: 'current-password',
    email: 'email',
    tel: 'tel',
    url: 'url',
    number: 'off',
    search: 'off',
  };
  return autocompleteMap[type] || undefined;
}

// Accessibility: generate id for label association
const inputId = computed(() => {
  return `textfield-${Math.random().toString(36).substring(2, 9)}`;
});

// Accessibility: has label
const hasLabel = computed(() => {
  return !!(props.label || props.placeholder);
});
</script>

<template>
  <div class="textfield-wrapper" :class="{ 'has-error': error }">
    <!-- Label -->
    <label 
      v-if="label"
      :for="inputId"
      class="textfield-label"
    >
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>
    
    <!-- Input -->
    <Framework7Input
      :id="inputId"
      :type="type"
      :placeholder="placeholder"
      :value="internalValue"
      @input="handleInput"
      @update:value="updateValue"
      :disabled="disabled"
      :readonly="readonly"
      :clear-button="clear"
      @input:clear="handleClear"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeydown"
      :inputmode="computedInputmode"
      :enterkeyhint="computedEnterkeyhint"
      :autocapitalize="computedAutocapitalize"
      :autocomplete="computedAutocomplete"
      :spellcheck="computedSpellcheck"
      :aria-label="label || placeholder"
      :aria-describedby="error ? `${inputId}-error` : undefined"
      :aria-required="required"
      :aria-invalid="!!error"
      :class="$attrs.class"
      :style="$attrs.style"
    />
    
    <!-- Error message -->
    <div 
      v-if="error"
      :id="`${inputId}-error`"
      class="textfield-error"
      role="alert"
    >
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
/* TextField wrapper */
.textfield-wrapper {
  margin-bottom: 1rem;
}

.textfield-wrapper.has-error :deep(.item-input) {
  border-color: var(--f7-color-red);
}

/* Label */
.textfield-label {
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
.textfield-error {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--f7-color-red);
  line-height: 1.2;
}

/* Accessibility: Ensure minimum touch target */
:deep(.item-input) {
  min-height: 44px;
}

/* Native-like styling */
:deep(.item-input) {
  border-radius: 8px;
  border: 1px solid var(--f7-block-border-color);
  background: var(--f7-block-bg-color);
  color: var(--f7-block-text-color);
}

:deep(.item-input:focus) {
  outline: 2px solid var(--f7-color-primary);
  outline-offset: -2px;
  border-color: var(--f7-color-primary);
}

:deep(.item-input.disabled) {
  opacity: 0.5;
  pointer-events: none;
}

/* Clear button styling */
:deep(.input-clear-button) {
  opacity: 0.5;
}

:deep(.input-clear-button:hover) {
  opacity: 0.8;
}
</style>
