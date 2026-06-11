<!--
  App.vue - Main Application Component
  
  Purpose: Root component that orchestrates the application shell
  
  Architecture:
  - Uses semantic components only
  - No direct Framework7 imports
  - No direct Capacitor imports
  - No direct Iconoir imports
  
  Route structure:
  / - Home/Feed
  /welcome - Welcome screen
  /signin - Sign in
  /explore - Explore
  /thread/:id - Thread view
  /story/:id - Story view
  /messages - Messages list
  /messages/:conversationId - Conversation view
  /notifications - Notifications
  /profile/:username - Profile
  /settings - Settings
  /media/:id - Media viewer
  /404 - Not found
  /error - Error
-->

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppRoot from '@/design/semantic/AppRoot.vue';
import AppTabBar from '@/design/semantic/AppTabBar.vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import { useAuthStore } from '@/stores/useAuthStore';

// Stores
const authStore = useAuthStore();

// Router
const route = useRoute();
const router = useRouter();

// Platform detection
const { isIOS, isAndroid, isPhone, isTablet } = useNativeUi();

// Navigation tabs
const tabs = computed(() => [
  { path: '/', icon: 'home', label: 'Home', active: route.path === '/' },
  { path: '/explore', icon: 'explore', label: 'Explore', active: route.path.startsWith('/explore') },
  { path: '/messages', icon: 'messages', label: 'Messages', active: route.path.startsWith('/messages') },
  { path: '/profile', icon: 'profile', label: 'Profile', active: route.path.startsWith('/profile') },
]);

// Check auth state
const isAuthenticated = computed(() => authStore.isAuthenticated);

// App-ready state
const isAppReady = ref(false);

// Initialize app
onMounted(() => {
  // Initialize stores
  authStore.init();
  
  // App is ready
  isAppReady.value = true;
  
  // Handle deep links if needed
  handleDeepLink();
});

// Handle deep links
const handleDeepLink = () => {
  // Check if we should hide auth shell
  if (isAuthenticated.value) {
    // Already authenticated, go to home
    if (route.path === '/welcome' || route.path === '/signin') {
      router.replace('/');
    }
  } else {
    // Not authenticated, check if we need to redirect
    if (!['/welcome', '/signin'].includes(route.path as string)) {
      router.replace('/welcome');
    }
  }
};

// Watch for auth changes
watch(isAuthenticated, (authenticated) => {
  if (authenticated && ['/welcome', '/signin'].includes(route.path as string)) {
    router.replace('/');
  }
});

// Safe area padding
const safeAreaStyle = computed(() => ({
  paddingTop: isIOS.value ? 'env(safe-area-inset-top)' : '0',
  paddingBottom: isPhone.value ? 'env(safe-area-inset-bottom)' : '0',
  paddingLeft: 'env(safe-area-inset-left)',
  paddingRight: 'env(safe-area-inset-right)',
}));
</script>

<template>
  <AppRoot theme="auto">
    <!-- Main view -->
    <main 
      :style="safeAreaStyle"
      style="min-height: 100dvh; display: flex; flex-direction: column;"
    >
      <!-- Router view - this is where route components are rendered -->
      <RouterView />
      
      <!-- Tab bar for main navigation (only for authenticated users) -->
      <AppTabBar 
        v-if="isAuthenticated && isPhone"
        :tabs="tabs"
        position="bottom"
        @tab-click="(path) => router.push(path)"
      />
    </main>
  </AppRoot>
</template>

<style scoped>
/* App-level styling */
main {
  background: var(--f7-block-bg-color);
  color: var(--f7-block-text-color);
}

/* Smooth transitions */
@media (prefers-reduced-motion: no-preference) {
  main {
    transition: background-color 0.3s ease, color 0.3s ease;
  }
}

/* Disable transitions for reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
</style>
