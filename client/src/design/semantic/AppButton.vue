<!--
  AppButton.vue - Button Component
  
  Purpose: Primary action button with consistent styling across platforms
  
  Semantic primitive: YES - Core form component
  Replaces: Raw Framework7 <Button> component
  
  Do:
  - Use for all primary actions
  - Choose appropriate fill and size
  - Provide accessible label when using icon-only
  
  Don't:
  - Use raw Framework7 <Button>
  - Create custom button implementations
  - Use icon-only without accessible label
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Button as Framework7Button } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    text?: string;
    icon?: string;
    iconPosition?: 'left' | 'right';
    size?: 'small' | 'medium' | 'large';
    fill?: 'solid' | 'outline' | 'clear';
    color?: string;
    disabled?: boolean;
    loading?: boolean;
    round?: boolean;
    raised?: boolean;
    large?: boolean;
    small?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    text: undefined,
    icon: undefined,
    iconPosition: 'left',
    size: 'medium',
    fill: 'solid',
    color: undefined,
    disabled: false,
    loading: false,
    round: false,
    raised: false,
    large: false,
    small: false,
    type: 'button',
  }
);

// Emits
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

// Handle click
const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};

// Accessibility: generate aria-label for icon-only buttons
const ariaLabel = computed(() => {
  if (props.text) {
    return undefined;
  }
  if (props.icon) {
    return props.icon;
  }
  return 'Button';
});

// Icon slot name based on position
const iconSlot = computed(() => {
  if (props.iconPosition === 'right') {
    return 'after';
  }
  return 'before';
});
</script>

<template>
  <Framework7Button
    :text="text"
    :large="large || size === 'large'"
    :small="small || size === 'small'"
    :fill="fill"
    :color="color"
    :disabled="disabled"
    :loading="loading"
    :round="round"
    :raised="raised"
    :type="type"
    :aria-label="ariaLabel"
    @click="handleClick"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- Icon before text (if icon exists and position is left or default) -->
    <slot v-if="icon && iconPosition !== 'right'" name="before">
      <AppIcon :name="icon" />
    </slot>
    
    <!-- Default slot for text or custom content -->
    <slot>{{ text }}</slot>
    
    <!-- Icon after text (if icon exists and position is right) -->
    <slot v-if="icon && iconPosition === 'right'" name="after">
      <AppIcon :name="icon" />
    </slot>
  </Framework7Button>
</template>

<style scoped>
/* Button-specific styling */
:deep(.button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Ensure touch target size */
:deep(.button) {
  min-height: 44px;
  min-width: 44px;
  padding: 0 1rem;
}

/* Icon-only buttons */
:deep(.button:has(> :only-child)) {
  padding: 0;
}

/* Loading state */
:deep(.button.loading) {
  pointer-events: none;
  opacity: 0.7;
}

/* Disabled state */
:deep(.button.disabled) {
  pointer-events: none;
  opacity: 0.5;
}
</style>
