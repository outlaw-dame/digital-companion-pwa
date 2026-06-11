<!--
  AppListItem.vue - List Item Component
  
  Purpose: Individual list item with consistent styling and platform behavior
  
  Semantic primitive: YES - Core list component
  Replaces: Raw Framework7 <ListItem> component
  
  Do:
  - Use for all list items
  - Provide accessible labels
  - Use appropriate chevron/arrow indicators
  
  Don't:
  - Use raw Framework7 <ListItem>
  - Create custom list item implementations
  - Forget accessible labels for icon-only items
-->

<script setup lang="ts">
import { computed } from 'vue';
import { ListItem as Framework7ListItem } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import AppIcon from './AppIcon.vue';

// Props
const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    text?: string;
    media?: string;
    link?: string | boolean;
    chevron?: boolean;
    divider?: boolean;
    groupTitle?: boolean;
    selected?: boolean;
    disabled?: boolean;
    checkbox?: boolean;
    checked?: boolean;
    radio?: boolean;
    radioName?: string;
    smartSelect?: boolean;
    after?: string;
    before?: string;
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    text: undefined,
    media: undefined,
    link: undefined,
    chevron: undefined,
    divider: undefined,
    groupTitle: false,
    selected: false,
    disabled: false,
    checkbox: false,
    checked: false,
    radio: false,
    radioName: undefined,
    smartSelect: false,
    after: undefined,
    before: undefined,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
  (e: 'change', value: any): void;
}>();

// Platform detection
const { isIOS, isAndroid } = useNativeUi();

// Computed chevron visibility
const showChevron = computed(() => {
  if (props.chevron !== undefined) return props.chevron;
  // Show chevron for links by default on iOS
  if (props.link && isIOS.value) return true;
  return false;
});

// Handle click
const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};

// Handle change for checkbox/radio
const handleChange = (value: any) => {
  emit('change', value);
};
</script>

<template>
  <Framework7ListItem
    :title="title"
    :subtitle="subtitle"
    :text="text"
    :media="media"
    :link="link"
    :chevron="showChevron"
    :divider="divider"
    :group-title="groupTitle"
    :selected="selected"
    :disabled="disabled"
    :checkbox="checkbox"
    :checked="checked"
    :radio="radio"
    :radio-name="radioName"
    :smart-select="smartSelect"
    @click="handleClick"
    @change="handleChange"
    :class="[$attrs.class, { 'list-item-disabled': disabled }]"
    :style="$attrs.style"
  >
    <!-- Before slot for icons/content -->
    <template v-if="before || $slots.before" #before>
      <slot name="before">
        <AppIcon v-if="before" :name="before" />
      </slot>
    </template>

    <!-- After slot for icons/content -->
    <template v-if="after || $slots.after" #after>
      <slot name="after">
        <AppIcon v-if="after" :name="after" />
      </slot>
    </template>

    <!-- Default title rendering -->
    <template v-if="!$slots.default && title" #default>
      <div class="list-item-title">{{ title }}</div>
      <div v-if="subtitle" class="list-item-subtitle">{{ subtitle }}</div>
      <div v-if="text" class="list-item-text">{{ text }}</div>
    </template>

    <!-- Custom content -->
    <slot />
  </Framework7ListItem>
</template>

<style scoped>
/* List item styling */
:deep(.item-content) {
  min-height: 44px;
}

/* Accessibility: disabled state */
:deep(.list-item-disabled) {
  opacity: 0.5;
  pointer-events: none;
}

/* Platform-specific styling */
:deep(.ios .item-content) {
  padding: 0.75rem 1rem;
}

:deep(.android .item-content) {
  padding: 0.875rem 1rem;
}

/* Title styling */
.list-item-title {
  font-weight: 500;
  color: var(--f7-block-text-color);
}

/* Subtitle styling */
.list-item-subtitle {
  font-size: 0.875rem;
  color: var(--f7-block-secondary-text-color);
  margin-top: 0.25rem;
}

/* Text styling */
.list-item-text {
  font-size: 0.875rem;
  color: var(--f7-block-secondary-text-color);
  margin-top: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.item-content) {
    transition: none !important;
  }
}
</style>
