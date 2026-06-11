<!--
  AppSegmentedControl.vue - Segmented Control Component
  
  Purpose: Horizontal segmented control for switching between related options
  
  Semantic primitive: YES - Core form component
  Replaces: Raw Framework7 <Segmented> component
  
  Do:
  - Use for switching between related options
  - Provide clear labels for each segment
  - Ensure proper accessibility
  
  Don't:
  - Use raw Framework7 <Segmented>
  - Create custom segmented controls
  - Use for unrelated options (use tabs instead)
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Segmented as Framework7Segmented } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    value?: string | number;
    tags?: Array<string | { value: string | number; text: string }>;
    color?: string;
    outline?: boolean;
    rounded?: boolean;
    strong?: boolean;
    raised?: boolean;
    tag?: boolean;
    disabled?: boolean;
  }>(),
  {
    value: '',
    tags: () => [],
    color: 'primary',
    outline: false,
    rounded: false,
    strong: false,
    raised: false,
    tag: false,
    disabled: false,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'update:value', value: string | number): void;
  (e: 'change', value: string | number): void;
}>();

// Internal value
const internalValue = ref(props.value);

// Update value
const updateValue = (newValue: string | number) => {
  internalValue.value = newValue;
  emit('update:value', newValue);
  emit('change', newValue);
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

// Process tags to extract values and texts
const processedTags = computed(() => {
  return props.tags.map(tag => {
    if (typeof tag === 'string') {
      return { value: tag, text: tag };
    }
    return tag;
  });
});

// Accessibility: generate id for the segmented control
const segmentedId = computed(() => {
  return `segmented-${Math.random().toString(36).substring(2, 9)}`;
});
</script>

<template>
  <Framework7Segmented
    :value="internalValue"
    @segmented:change="(segmented, value) => updateValue(value)"
    :tags="processedTags.map(t => t.value)"
    :color="color"
    :outline="outline"
    :rounded="rounded"
    :strong="strong"
    :raised="raised"
    :tag="tag"
    :disabled="disabled"
    :id="segmentedId"
    :aria-label="$attrs['aria-label'] || 'Segmented control'"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- Buttons with proper labels -->
    <template v-for="(tag, index) in processedTags" :key="`seg-${index}`" #button="{ button, active, index, onClick, select }">
      <button
        type="button"
        :class="{
          'segmented-button': true,
          'segmented-button-active': button === internalValue,
          'segmented-button-disabled': disabled,
        }"
        :disabled="disabled"
        @click="() => !disabled && updateValue(tag.value)"
        :aria-pressed="button === internalValue"
        :aria-label="tag.text"
        role="radio"
        :name="segmentedId"
      >
        {{ tag.text }}
      </button>
    </template>
  </Framework7Segmented>
</template>

<style scoped>
/* Segmented control styling */
:deep(.segmented) {
  display: inline-flex;
  border-radius: 8px;
  overflow: hidden;
  background: var(--f7-block-strong-bg-color);
  border: 1px solid var(--f7-block-border-color);
}

:deep(.segmented:focus-within) {
  outline: 2px solid var(--f7-color-primary);
  outline-offset: -2px;
}

/* Segmented button */
.segmented-button {
  display: block;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--f7-block-text-color);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  text-align: center;
  white-space: nowrap;
}

.segmented-button:hover:not(.segmented-button-disabled):not(.segmented-button-active) {
  background: rgba(0, 0, 0, 0.05);
}

.segmented-button-active {
  background: var(--f7-color-primary);
  color: white;
}

.segmented-button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Outline variant */
:deep(.segmented-outline) {
  background: transparent;
  border: 1px solid var(--f7-block-border-color);
}

:deep(.segmented-outline .segmented-button-active) {
  background: var(--f7-color-primary);
  color: white;
  border-color: var(--f7-color-primary);
}

/* Rounded variant */
:deep(.segmented-rounded) {
  border-radius: 24px;
}

/* Tag variant */
:deep(.segmented-tag) {
  background: var(--f7-block-bg-color);
}

:deep(.segmented-tag .segmented-button-active) {
  background: var(--f7-color-primary);
  color: white;
}

/* Strong variant */
:deep(.segmented-strong) {
  background: var(--f7-block-bg-color);
}

:deep(.segmented-strong .segmented-button) {
  font-weight: 600;
}

/* Raised variant */
:deep(.segmented-raised) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .segmented-button {
    transition: none !important;
  }
}
</style>
