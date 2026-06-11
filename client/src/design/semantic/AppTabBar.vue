<!--
  AppTabBar.vue - Bottom Tab Bar
  
  Purpose: Bottom tab bar navigation for primary app sections
  
  Semantic primitive: YES - Core navigation component
  Replaces: Raw Framework7 <Toolbar tabbar> component
  
  Do:
  - Use for main app navigation
  - Provide both icon and label for each tab
  - Use platform-appropriate tab count (max 5)
  
  Don't:
  - Use raw Framework7 tabbar
  - Create more than 5 tabs
  - Use icons only without labels (accessibility issue)
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Toolbar as Framework7Toolbar, Link as Framework7Link } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    labels?: boolean;
    icons?: boolean;
    scrollable?: boolean;
    position?: 'bottom' | 'top';
  }>(),
  {
    labels: true,
    icons: true,
    scrollable: false,
    position: 'bottom',
  }
);

// Tab definition type
interface Tab {
  path: string;
  icon: string;
  label: string;
  badge?: number | string;
  active?: boolean;
}

// Define tabs - these should be configured by the app
const tabs = defineModel<Tab[]>('tabs', { default: () => [] });

// Computed tabs with defaults
const computedTabs = computed(() => {
  return tabs.value.map(tab => ({
    icon: tab.icon,
    label: tab.label,
    badge: tab.badge,
    active: tab.active,
    path: tab.path,
  }));
});

// Handle tab click
const handleTabClick = (path: string) => {
  emit('tab-click', path);
};

// Emit events
const emit = defineEmits<{
  (e: 'tab-click', path: string): void;
}>();
</script>

<template>
  <Framework7Toolbar
    :position="position"
    tabbar
    :labels="labels"
    :icons="icons"
    :scrollable="scrollable"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <template v-for="(tab, index) in computedTabs" :key="tab.path">
      <Framework7Link
        :tab-link="tab.path"
        :tab-active="tab.active"
        :icon="tab.icon"
        :text="tab.label"
        :badge="tab.badge"
        @click="() => handleTabClick(tab.path)"
      />
    </template>
  </Framework7Toolbar>
</template>

<style scoped>
/* TabBar-specific styling */
.tabbar-icon {
  font-size: 1.25rem;
}

.tabbar-label {
  font-size: 0.75rem;
}

/* Maximum 5 tabs rule */
:deep(.tabbar > a:nth-child(n+6)) {
  display: none !important;
}
</style>
