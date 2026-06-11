<!--
  AppNavbar.vue - Navigation Bar
  
  Purpose: Navigation bar for pages with title, back button, and actions
  
  Semantic primitive: YES - Core shell component
  Replaces: Raw Framework7 <Navbar> component
  
  Do:
  - Use for all page navigation bars
  - Provide backLink for navigable pages
  - Use sliding prop for pages that slide in/out
  
  Don't:
  - Use raw Framework7 <Navbar>
  - Create custom header components
  - Add interactive elements outside AppNavbar actions slot
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Navbar as Framework7Navbar, Link as Framework7Link } from 'framework7-vue';

// Props
const props = withDefaults(
  defineProps<{
    title?: string;
    backLink?: string | boolean;
    sliding?: boolean;
    hidden?: boolean;
    large?: boolean;
    transparent?: boolean;
  }>(),
  {
    title: undefined,
    backLink: undefined,
    sliding: false,
    hidden: false,
    large: false,
    transparent: false,
  }
);

// Computed back link
const backLinkText = computed(() => {
  if (props.backLink === true || props.backLink === undefined) {
    return 'Back';
  }
  return props.backLink || false;
});

// Handle back navigation
const handleBack = () => {
  emit('back');
};

// Emit events
const emit = defineEmits<{
  (e: 'back'): void;
}>();
</script>

<template>
  <Framework7Navbar
    :title="title"
    :back-link="backLinkText"
    :sliding="sliding"
    :hidden="hidden"
    :large="large"
    :transparent="transparent"
    @navbar:back="handleBack"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <!-- Left slot for back button or custom left content -->
    <template #left>
      <slot name="left" />
    </template>

    <!-- Title slot for custom title -->
    <template #title>
      <slot name="title" />
    </template>

    <!-- Right slot for actions -->
    <template #right>
      <slot name="right" />
    </template>

    <!-- Default title rendering if no slot -->
    <template v-if="!$slots.title && title" #title>
      {{ title }}
    </template>
  </Framework7Navbar>
</template>

<style scoped>
/* Navbar-specific styling */
.navbar-large-title {
  font-size: 1.75rem;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .navbar-large-title {
    transition: none !important;
  }
}
</style>
