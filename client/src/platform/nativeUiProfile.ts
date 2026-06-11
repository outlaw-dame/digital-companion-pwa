/**
 * Native UI Profile
 * 
 * Detects and provides platform-specific UI dialect information.
 * This is the ONLY place that should contain platform detection logic.
 * 
 * Do:
 * - Use this for all platform detection
 * - Import from here rather than using navigator.userAgent directly
 * 
 * Don't:
 * - Use navigator.userAgent or Platform.is() outside this file
 * - Duplicate platform detection logic elsewhere
 */

import { ref, computed } from 'vue';
import { Platform } from '@capacitor/core';

// Platform type
export type PlatformType = 'ios' | 'android' | 'pwa' | 'desktop';

// UI dialect type
export type UIDialect = 'ios' | 'android' | 'material' | 'aurora';

// Device type
export type DeviceType = 'phone' | 'tablet' | 'desktop';

// Interface for the native UI profile
export interface NativeUIProfile {
  platform: PlatformType;
  dialect: UIDialect;
  device: DeviceType;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  isDesktop: boolean;
  isTablet: boolean;
  isPhone: boolean;
  isInstalled: boolean;
  safeAreaInsetTop: number;
  safeAreaInsetBottom: number;
  safeAreaInsetLeft: number;
  safeAreaInsetRight: number;
}

// Detect platform using feature detection and user agent
function detectPlatform(): PlatformType {
  // Check if running in Capacitor (native app)
  if (typeof window !== 'undefined' && window.Capacitor) {
    if (Platform.is('ios')) {
      return 'ios';
    }
    if (Platform.is('android')) {
      return 'android';
    }
  }

  // PWA or browser detection
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // iPadOS with desktop-like UA
  // iPadOS 13+ reports as Macintosh with touch support
  const isIpadOS = userAgent.includes('iPad') || 
    (userAgent.includes('Macintosh') && typeof window !== 'undefined' && 'ontouchend' in document);
  
  if (isIpadOS) {
    return 'ios';
  }
  
  // iPhone
  if (userAgent.includes('iPhone')) {
    return 'ios';
  }
  
  // Android
  if (userAgent.includes('Android')) {
    return 'android';
  }
  
  // Desktop
  return 'desktop';
}

// Detect UI dialect
function detectDialect(platform: PlatformType): UIDialect {
  switch (platform) {
    case 'ios':
      return 'ios';
    case 'android':
      return 'material';
    case 'pwa':
      // PWA running on iOS should use iOS dialect
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (userAgent.includes('iPhone') || userAgent.includes('iPad') || 
          (userAgent.includes('Macintosh') && typeof window !== 'undefined' && 'ontouchend' in document)) {
        return 'ios';
      }
      return 'material';
    case 'desktop':
      // Desktop PWA can use platform-specific dialect
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (userAgent.includes('Macintosh')) {
        return 'aurora';
      }
      return 'material';
    default:
      return 'material';
  }
}

// Detect device type
function detectDeviceType(platform: PlatformType): DeviceType {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  
  // Tablet detection
  const isTabletUA = userAgent.includes('iPad') || 
    (userAgent.includes('Android') && !userAgent.includes('Mobile')) ||
    (userAgent.includes('Macintosh') && typeof window !== 'undefined' && 'ontouchend' in document);
  
  const isTabletWidth = width >= 768;
  
  // Phone detection
  const isPhoneUA = userAgent.includes('iPhone') || 
    (userAgent.includes('Android') && userAgent.includes('Mobile'));
  
  const isPhoneWidth = width < 768;
  
  if (isTabletUA || (isTabletWidth && platform === 'ios')) {
    return 'tablet';
  }
  
  if (isPhoneUA || (isPhoneWidth && (platform === 'ios' || platform === 'android'))) {
    return 'phone';
  }
  
  return 'desktop';
}

// Detect if app is installed (PWA)
function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Standalone mode (PWA installed)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Capacitor native app
  if (window.Capacitor) {
    return true;
  }
  
  return false;
}

// Get safe area insets
function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  // Check for CSS env() support
  const envSupported = 'env' in window && typeof window.env === 'object';
  
  let top = 0;
  let bottom = 0;
  let left = 0;
  let right = 0;
  
  if (envSupported) {
    // Try to get safe area insets from CSS env
    // These are strings like "10px" or "env(safe-area-inset-top)"
    // We can't actually read CSS env in JS, so we use a different approach
  }
  
  // Use window.innerWidth/Height as fallback
  // This is a simplified approach - actual safe area detection requires more work
  const platform = detectPlatform();
  
  // iOS with notch (iPhone X and later)
  if (platform === 'ios') {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      // Estimate safe area for iOS
      bottom = 34; // Home indicator
      top = 44; // Notch
    }
  }
  
  // Android with gesture navigation
  if (platform === 'android') {
    bottom = 24; // Gesture navigation bar
  }
  
  return { top, bottom, left, right };
}

// Create the native UI profile as a composable
export function useNativeUi() {
  const platform = ref<PlatformType>(detectPlatform());
  const dialect = computed(() => detectDialect(platform.value));
  const device = computed(() => detectDeviceType(platform.value));
  const isInstalled = ref(detectInstalled());
  
  const safeAreaInsets = ref(getSafeAreaInsets());
  
  // Computed properties
  const isIOS = computed(() => platform.value === 'ios');
  const isAndroid = computed(() => platform.value === 'android');
  const isPWA = computed(() => platform.value === 'pwa');
  const isDesktop = computed(() => platform.value === 'desktop');
  const isTablet = computed(() => device.value === 'tablet');
  const isPhone = computed(() => device.value === 'phone');
  
  // Safe area insets as individual refs
  const safeAreaInsetTop = computed(() => safeAreaInsets.value.top);
  const safeAreaInsetBottom = computed(() => safeAreaInsets.value.bottom);
  const safeAreaInsetLeft = computed(() => safeAreaInsets.value.left);
  const safeAreaInsetRight = computed(() => safeAreaInsets.value.right);
  
  // Build profile object
  const profile = computed<NativeUIProfile>(() => ({
    platform: platform.value,
    dialect: dialect.value,
    device: device.value,
    isIOS: isIOS.value,
    isAndroid: isAndroid.value,
    isPWA: isPWA.value,
    isDesktop: isDesktop.value,
    isTablet: isTablet.value,
    isPhone: isPhone.value,
    isInstalled: isInstalled.value,
    safeAreaInsetTop: safeAreaInsetTop.value,
    safeAreaInsetBottom: safeAreaInsetBottom.value,
    safeAreaInsetLeft: safeAreaInsetLeft.value,
    safeAreaInsetRight: safeAreaInsetRight.value,
  }));
  
  // Refresh function for testing
  const refresh = () => {
    platform.value = detectPlatform();
    isInstalled.value = detectInstalled();
    safeAreaInsets.value = getSafeAreaInsets();
  };
  
  return {
    platform,
    dialect,
    device,
    isIOS,
    isAndroid,
    isPWA,
    isDesktop,
    isTablet,
    isPhone,
    isInstalled,
    safeAreaInsetTop,
    safeAreaInsetBottom,
    safeAreaInsetLeft,
    safeAreaInsetRight,
    profile,
    refresh,
  };
}

// Export for direct use
export const nativeUi = useNativeUi();

export default useNativeUi;
