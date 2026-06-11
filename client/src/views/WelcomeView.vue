<!--
  WelcomeView.vue - Welcome Screen
  
  Purpose: Initial welcome screen for the application
  
  Architecture:
  - Uses semantic components only
  - No direct Framework7 imports
  - No direct Capacitor imports
  - No direct Iconoir imports
  - All icons use AppIcon
  
  Route: /welcome
  Feature: src/features/auth/
  Stores: useAuthStore
  
  Do:
  - Use semantic components from design/semantic/
  - Use platform abstractions from platform/
  - Use AppIcon for all icons
  
  Don't:
  - Import Framework7 directly
  - Import Capacitor directly
  - Import Iconoir directly
-->

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppPage from '@/design/semantic/AppPage.vue';
import AppNavbar from '@/design/semantic/AppNavbar.vue';
import AppButton from '@/design/semantic/AppButton.vue';
import AppIcon from '@/design/semantic/AppIcon.vue';
import { useNativeUi } from '@/platform/nativeUiProfile';
import { useAuthStore } from '@/stores/useAuthStore';
import { logger } from '@/utils/logging';

// Router
const router = useRouter();

// Stores
const authStore = useAuthStore();

// Platform detection
const { isIOS, isAndroid, isPWA, isInstalled } = useNativeUi();

// Component state
const isLoading = ref(false);

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Platform-specific text
const welcomeText = computed(() => {
  if (isIOS.value) {
    return 'Welcome to ANE on iOS';
  }
  if (isAndroid.value) {
    return 'Welcome to ANE on Android';
  }
  return 'Welcome to ANE';
});

// Platform-specific subtitle
const subtitleText = computed(() => {
  if (isInstalled.value) {
    return 'Your local-first digital companion';
  }
  return 'Install to get the full experience';
});

// Handle sign in
const handleSignIn = async () => {
  logger.info('WelcomeView: Sign in clicked');
  isLoading.value = true;
  
  try {
    await router.push('/signin');
  } catch (error) {
    logger.error('WelcomeView: Failed to navigate to signin', { error });
  } finally {
    isLoading.value = false;
  }
};

// Handle get started
const handleGetStarted = async () => {
  logger.info('WelcomeView: Get started clicked');
  isLoading.value = true;
  
  try {
    await router.push('/signin');
  } catch (error) {
    logger.error('WelcomeView: Failed to navigate to signin', { error });
  } finally {
    isLoading.value = false;
  }
};

// Initialize
onMounted(() => {
  logger.info('WelcomeView: Component mounted');
  
  // Redirect if already authenticated
  if (isAuthenticated.value) {
    router.replace('/');
  }
});
</script>

<template>
  <AppPage name="welcome" :ptr="false">
    <!-- Navigation bar -->
    <AppNavbar :hidden="true" />
    
    <!-- Main content -->
    <div class="welcome-content">
      <!-- Logo -->
      <div class="welcome-logo">
        <AppIcon name="home" :size="48" />
      </div>
      
      <!-- Title -->
      <h1 class="welcome-title">{{ welcomeText }}</h1>
      
      <!-- Subtitle -->
      <p class="welcome-subtitle">{{ subtitleText }}</p>
      
      <!-- Action buttons -->
      <div class="welcome-actions">
        <AppButton 
          fill="solid"
          size="large"
          :loading="isLoading"
          @click="handleGetStarted"
        >
          Get Started
        </AppButton>
        
        <AppButton 
          fill="outline"
          size="large"
          :loading="isLoading"
          @click="handleSignIn"
        >
          <AppIcon name="lock" slot="before" :size="20" />
          Sign In
        </AppButton>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="welcome-footer">
      <p>ANE v{{ import.meta.env.VITE_APP_VERSION || '1.0.0' }}</p>
      <p class="welcome-platform">{{ isPWA ? 'PWA' : isIOS ? 'iOS' : isAndroid ? 'Android' : 'Web' }}</p>
    </div>
  </AppPage>
</template>

<style scoped>
/* Welcome view styling */
.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 2rem;
  text-align: center;
  flex: 1;
}

.welcome-logo {
  margin-bottom: 1.5rem;
}

.welcome-logo :deep(.app-icon) {
  width: 64px;
  height: 64px;
}

.welcome-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--f7-block-text-color);
}

.welcome-subtitle {
  font-size: 1rem;
  color: var(--f7-block-text-color-secondary);
  margin-bottom: 2rem;
  max-width: 300px;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 280px;
}

.welcome-actions :deep(.app-button) {
  width: 100%;
}

.welcome-footer {
  padding: 1rem;
  text-align: center;
  color: var(--f7-block-text-color-secondary);
  font-size: 0.875rem;
}

.welcome-platform {
  margin-top: 0.25rem;
  font-size: 0.75rem;
}

/* Platform-specific adjustments */
@media (min-width: 768px) {
  .welcome-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .welcome-actions :deep(.app-button) {
    width: auto;
    min-width: 120px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .welcome-content {
    transition: none !important;
  }
}
</style>
