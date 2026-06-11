<!--
  AppGroupedList.vue - Grouped List Component
  
  Purpose: List with grouped sections, typically for contacts or sorted data
  
  Semantic primitive: YES - Core list component
  Replaces: Raw Framework7 grouped lists with manual sections
  
  Do:
  - Use for alphabetically or categorically grouped content
  - Provide group titles for each section
  - Use with AppListItem for consistency
  
  Don't:
  - Use raw Framework7 list groups
  - Create custom grouped list implementations
  - Forget accessible group labels
-->

<script setup lang="ts">
import { computed } from 'vue';
import { List as Framework7List, ListGroup as Framework7ListGroup } from 'framework7-vue';
import AppList from './AppList.vue';
import AppListItem from './AppListItem.vue';

// Props
const props = withDefaults(
  defineProps<{
    groups?: Array<{
      title: string;
      items: Array<any>;
      key?: string;
    }>;
    inset?: boolean;
    mediaList?: boolean;
    simpleList?: boolean;
  }>(),
  {
    groups: () => [],
    inset: undefined,
    mediaList: false,
    simpleList: false,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'group-click', groupIndex: number): void;
  (e: 'item-click', groupIndex: number, itemIndex: number): void;
}>();

// Handle group click
const handleGroupClick = (index: number) => {
  emit('group-click', index);
};

// Handle item click
const handleItemClick = (groupIndex: number, itemIndex: number) => {
  emit('item-click', groupIndex, itemIndex);
};
</script>

<template>
  <AppList
    :inset="inset"
    :media-list="mediaList"
    :simple-list="simpleList"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <template v-for="(group, groupIndex) in groups" :key="group.key || group.title">
      <!-- Group title -->
      <Framework7ListGroup :title="group.title" @click="() => handleGroupClick(groupIndex)" />
      
      <!-- Group items -->
      <AppListItem
        v-for="(item, itemIndex) in group.items"
        :key="`${groupIndex}-${itemIndex}`"
        v-bind="item"
        @click="() => handleItemClick(groupIndex, itemIndex)"
      >
        <!-- Pass slots through -->
        <slot name="item" v-bind="{ group, item, groupIndex, itemIndex }" />
      </AppListItem>
    </template>

    <!-- Default slot for custom content -->
    <slot />
  </AppList>
</template>

<style scoped>
/* Grouped list styling */
:deep(.list-group-title) {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--f7-block-secondary-text-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1rem 0.25rem;
  background: var(--f7-block-bg-color);
}

/* iOS-specific group styling */
:deep(.ios .list-group-title) {
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Android-specific group styling */
:deep(.android .list-group-title) {
  padding-left: 1rem;
  padding-right: 1rem;
  background: var(--f7-block-strong-bg-color);
}

/* Accessibility: ensure group titles are announced */
:deep(.list-group-title) {
  display: block;
}
</style>
