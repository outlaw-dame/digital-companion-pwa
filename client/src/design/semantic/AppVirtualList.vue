<!--
  AppVirtualList.vue - Virtual List Component
  
  Purpose: Efficient rendering of large lists with virtualization
  
  Semantic primitive: YES - Core performance component
  Replaces: Raw Framework7 <VirtualList> component
  
  Do:
  - Use for large, scrollable lists
  - Provide appropriate item height
  - Use with consistent item rendering
  
  Don't:
  - Use raw Framework7 <VirtualList>
  - Create custom virtual list implementations
  - Use for small lists
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VirtualList as Framework7VirtualList, ListItem as Framework7ListItem } from 'framework7-vue';
import AppListItem from './AppListItem.vue';

// Props
const props = withDefaults(
  defineProps<{
    items?: any[];
    itemHeight?: number;
    itemTemplate?: any;
    height?: string | number;
    virtualItems?: number;
    searchAll?: boolean;
    searchByItem?: (item: any, query: string) => boolean;
    filterAll?: boolean;
    filterByItem?: (item: any, query: string) => boolean;
    sortByItem?: (a: any, b: any) => number;
    sort?: boolean;
    indexes?: number[];
    beforeClear?: () => void;
    afterClear?: () => void;
    beforeSearch?: (query: string, items: any[]) => void;
    afterSearch?: (query: string, items: any[]) => void;
    scrollToItem?: number;
  }>(),
  {
    items: () => [],
    itemHeight: 44,
    itemTemplate: undefined,
    height: '100%',
    virtualItems: 50,
    searchAll: false,
    searchByItem: undefined,
    filterAll: false,
    filterByItem: undefined,
    sortByItem: undefined,
    sort: false,
    indexes: () => [],
    beforeClear: undefined,
    afterClear: undefined,
    beforeSearch: undefined,
    afterSearch: undefined,
    scrollToItem: undefined,
  }
);

// Emits
const emit = defineEmits<{
  (e: 'vscroll'): void;
  (e: 'vscroll:beforeclear'): void;
  (e: 'vscroll:afterclear'): void;
  (e: 'vscroll:beforesearch', query: string, items: any[]): void;
  (e: 'vscroll:aftersearch', query: string, items: any[]): void;
  (e: 'click', item: any, index: number): void;
  (e: 'scroll', position: number): void;
}>();

// Handle click
const handleClick = (item: any, index: number) => {
  emit('click', item, index);
};

// Handle scroll
const handleScroll = (position: number) => {
  emit('scroll', position);
};

// Handle virtual scroll events
const handleVscroll = () => {
  emit('vscroll');
};

const handleBeforeClear = () => {
  emit('vscroll:beforeclear');
  if (props.beforeClear) props.beforeClear();
};

const handleAfterClear = () => {
  emit('vscroll:afterclear');
  if (props.afterClear) props.afterClear();
};

const handleBeforeSearch = (query: string, items: any[]) => {
  emit('vscroll:beforesearch', query, items);
  if (props.beforeSearch) props.beforeSearch(query, items);
};

const handleAfterSearch = (query: string, items: any[]) => {
  emit('vscroll:aftersearch', query, items);
  if (props.afterSearch) props.afterSearch(query, items);
};

// Compute render items
const renderItems = computed(() => {
  return props.items;
});
</script>

<template>
  <Framework7VirtualList
    :items="items"
    :item-height="itemHeight"
    :item-template="itemTemplate"
    :height="height"
    :virtual-items="virtualItems"
    :search-all="searchAll"
    :search-by-item="searchByItem"
    :filter-all="filterAll"
    :filter-by-item="filterByItem"
    :sort-by-item="sortByItem"
    :sort="sort"
    :indexes="indexes"
    @vscroll="handleVscroll"
    @vscroll:beforeclear="handleBeforeClear"
    @vscroll:afterclear="handleAfterClear"
    @vscroll:beforesearch="handleBeforeSearch"
    @vscroll:aftersearch="handleAfterSearch"
    @scroll="handleScroll"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- Custom item template -->
    <template v-if="$slots.item" #item="{ index, item, key, style, html }">
      <slot name="item" v-bind="{ index, item, key, style, html }" />
    </template>

    <!-- Default item template using AppListItem -->
    <template v-else #item="{ index, item }">
      <AppListItem
        :key="index"
        v-bind="item"
        @click="() => handleClick(item, index)"
      >
        <slot name="default" v-bind="{ item, index }" />
      </AppListItem>
    </template>

    <!-- Before list slot -->
    <template v-if="$slots.before" #before>
      <slot name="before" />
    </template>

    <!-- After list slot -->
    <template v-if="$slots.after" #after>
      <slot name="after" />
    </template>
  </Framework7VirtualList>
</template>

<style scoped>
/* Virtual list container */
:deep(.virtual-list) {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Virtual list inner */
:deep(.virtual-list-inner) {
  position: relative;
}

/* Virtual list items */
:deep(.vl-item) {
  position: absolute;
  left: 0;
  right: 0;
  transition: none;
}

/* Performance optimizations */
:deep(.virtual-list) {
  will-change: transform;
}

/* Platform-specific scrollbar */
:deep(.ios .virtual-list::-webkit-scrollbar) {
  display: none;
}

:deep(.android .virtual-list) {
  scrollbar-width: thin;
}

/* Animation for items */
:deep(.vl-item) {
  animation: vl-item-fade-in 0.2s ease-out;
}

@keyframes vl-item-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vl-item) {
    animation: none !important;
  }
}
</style>
