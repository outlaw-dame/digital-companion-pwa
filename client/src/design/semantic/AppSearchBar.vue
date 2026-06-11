<!--
  AppSearchBar.vue - Search Input Field
  
  Purpose: Search input field with native-like behavior
  
  Semantic primitive: YES - Core form component
  Replaces: Raw Framework7 <Searchbar> component
  
  Do:
  - Use for all search inputs
  - Provide accessible label
  - Handle enter key appropriately
  - Use clear prop for search field clearing
  
  Don't:
  - Use raw Framework7 <Searchbar>
  - Create custom search inputs
  - Use contenteditable for search
  - Suppress native keyboard behavior
-->

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import { Searchbar as Framework7Searchbar } from 'framework7-vue';
import { useNativeUi } from '../../platform/nativeUiProfile';

// Props
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    readonly?: boolean;
    clear?: boolean;
    customSearch?: boolean;
    debounce?: number;
  }>(),
  {
    placeholder: 'Search',
    value: '',
    disabled: false,
    readonly: false,
    clear: true,
    customSearch: false,
    debounce: 300,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'search', value: string): void;
  (e: 'clear'): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
  (e: 'keydown', event: KeyboardEvent): void;
}>();

// Internal value
const internalValue = ref(props.value);

// Debounced value for search
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Update value
const updateValue = (newValue: string) => {
  internalValue.value = newValue;
  emit('update:value', newValue);
  
  // Trigger search with debounce
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  if (newValue && !props.customSearch) {
    debounceTimer = setTimeout(() => {
      emit('search', newValue);
    }, props.debounce);
  }
};

// Handle search submission
const handleSearch = (event: Event) => {
  event.preventDefault();
  if (internalValue.value.trim()) {
    emit('search', internalValue.value);
  }
};

// Handle clear
const handleClear = () => {
  updateValue('');
  emit('clear');
};

// Handle focus/blur
const handleFocus = (event: Event) => {
  emit('focus');
};

const handleBlur = (event: Event) => {
  emit('blur');
};

// Handle keydown
const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event);
  
  // Handle Enter key
  if (event.key === 'Enter') {
    handleSearch(event);
  }
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

// Platform-specific behavior
const { isIOS, isAndroid } = useNativeUi();

// Accessibility label
const searchLabel = computed(() => {
  return props.placeholder || 'Search';
});
</script>

<template>
  <form @submit="handleSearch" role="search" aria-label="Search form">
    <Framework7Searchbar
      :placeholder="placeholder"
      :value="internalValue"
      @update:value="updateValue"
      :disabled="disabled"
      :readonly="readonly"
      :clear-button="clear"
      @searchbar:clear="handleClear"
      @searchbar:focus="handleFocus"
      @searchbar:blur="handleBlur"
      @searchbar:keydown="handleKeydown"
      :custom-search="customSearch"
      type="search"
      inputmode="search"
      enterkeyhint="search"
      autocapitalize="none"
      :spellcheck="false"
      :aria-label="searchLabel"
      :class="$attrs.class"
      :style="$attrs.style"
    />
  </form>
</template>

<style scoped>
/* SearchBar-specific styling */
:deep(.searchbar) {
  --f7-searchbar-bg-color: transparent;
  --f7-searchbar-input-bg-color: var(--f7-block-bg-color);
  --f7-searchbar-input-border-color: var(--f7-block-border-color);
}

/* Native-like search field styling */
:deep(.searchbar-input) {
  border-radius: 8px;
}

/* iOS-specific styling */
:deep(.ios .searchbar-input) {
  background: rgba(0, 0, 0, 0.1);
}

/* Focus state */
:deep(.searchbar-input:focus) {
  outline: 2px solid var(--f7-color-primary);
  outline-offset: -2px;
}

/* Disable spellcheck */
:deep(.searchbar-input) {
  spellcheck: false;
}
</style>
