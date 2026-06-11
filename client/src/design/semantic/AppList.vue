<!--
  AppList.vue - List Container
  
  Purpose: Container for list items with consistent styling
  
  Semantic primitive: YES - Core list component
  Replaces: Raw Framework7 <List> component
  
  Do:
  - Use for all list containers
  - Choose appropriate style for content
  - Use with AppListItem children
  
  Don't:
  - Use raw Framework7 <List>
  - Use dividers on media lists (platform convention)
  - Create custom list containers
-->

<script setup lang="ts">
import { computed } from 'vue';
import { List as Framework7List } from 'framework7-vue';
import { useNativeUi } from '@/platform/nativeUiProfile';

// Props
const props = withDefaults(
  defineProps<{
    dividers?: boolean;
    inset?: boolean;
    mediaList?: boolean;
    simpleList?: boolean;
    contactsList?: boolean;
    form?: boolean;
  }>(),
  {
    dividers: true,
    inset: false,
    mediaList: false,
    simpleList: false,
    contactsList: false,
    form: false,
  }
);

// Platform detection for default styles
const { isIOS, isAndroid } = useNativeUi();

// Computed dividers based on platform and list type
const showDividers = computed(() => {
  // Don't show dividers on media lists
  if (props.mediaList) {
    return false;
  }
  
  // For iOS, show dividers by default
  if (isIOS.value) {
    return props.dividers;
  }
  
  // For Android, dividers are typically inset
  if (isAndroid.value) {
    return props.dividers;
  }
  
  return props.dividers;
});

// Computed inset based on platform
const isInset = computed(() => {
  if (props.mediaList) {
    return false;
  }
  
  if (props.inset) {
    return true;
  }
  
  // Android typically uses inset lists
  if (isAndroid.value && !props.mediaList) {
    return true;
  }
  
  return props.inset;
});
</script>

<template>
  <Framework7List
    :dividers="showDividers"
    :inset="isInset"
    :media-list="mediaList"
    :simple-list="simpleList"
    :contacts-list="contactsList"
    :form="form"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- List header slot -->
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    
    <!-- Default slot for list items -->
    <slot />
    
    <!-- List footer slot -->
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Framework7List>
</template>

<style scoped>
/* List-specific styling */
:deep(.list) {
  background: transparent;
}

/* Platform-specific list styling */
:deep(.ios .list) {
  margin: 0;
}

:deep(.android .list) {
  margin: 0;
}

/* Media list styling */
:deep(.media-list) {
  padding: 0;
}

/* Simple list styling */
:deep(.simple-list) {
  background: transparent;
}

/* Accessibility: Ensure list has proper role */
:deep(.list) {
  display: block;
}
</style>
