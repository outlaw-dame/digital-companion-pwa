/**
 * Haptic Policy
 * 
 * Manages haptic feedback across platforms.
 * 
 * Do:
 * - Use this for all haptic feedback
 * - Import from here rather than using haptics directly
 * 
 * Don't:
 * - Use haptics directly in views/features
 * - Duplicate haptics logic elsewhere
 */

import { ref, computed } from 'vue';
import { useNativeUi } from './nativeUiProfile';

export interface HapticPolicy {
  impactLight: () => Promise<void>;
  impactMedium: () => Promise<void>;
  impactHeavy: () => Promise<void>;
  notifySuccess: () => Promise<void>;
  notifyError: () => Promise<void>;
  notifyWarning: () => Promise<void>;
  selectionStart: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  selectionEnd: () => Promise<void>;
}

function impactLight() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.impact({ style: 'light' });
  }
  // PWA: Use Navigation API if available
  if ('vibrate' in navigator) {
    navigator.vibrate(20);
  }
  return Promise.resolve();
}

function impactMedium() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.impact({ style: 'medium' });
  }
  if ('vibrate' in navigator) {
    navigator.vibrate(40);
  }
  return Promise.resolve();
}

function impactHeavy() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.impact({ style: 'heavy' });
  }
  if ('vibrate' in navigator) {
    navigator.vibrate(60);
  }
  return Promise.resolve();
}

function notifySuccess() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.notification({ type: 'success' });
  }
  if ('vibrate' in navigator) {
    navigator.vibrate([30, 50, 30]);
  }
  return Promise.resolve();
}

function notifyError() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.notification({ type: 'error' });
  }
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
  return Promise.resolve();
}

function notifyWarning() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.notification({ type: 'warning' });
  }
  if ('vibrate' in navigator) {
    navigator.vibrate([50, 50, 50]);
  }
  return Promise.resolve();
}

function selectionStart() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.selectionStart();
  }
  return Promise.resolve();
}

function selectionChanged() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.selectionChanged();
  }
  return Promise.resolve();
}

function selectionEnd() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Capacitor?.Plugins?.Haptics) {
    return window.Capacitor.Plugins.Haptics.selectionEnd();
  }
  return Promise.resolve();
}

export function useHaptics(): HapticPolicy {
  const { isIOS, isAndroid, prefersReducedMotion } = useNativeUi();

  // Disable haptics if reduced motion is preferred
  const isHapticsEnabled = computed(() => !prefersReducedMotion.value);

  const hapticFunctions = {
    impactLight,
    impactMedium,
    impactHeavy,
    notifySuccess,
    notifyError,
    notifyWarning,
    selectionStart,
    selectionChanged,
    selectionEnd,
  };

  // Wrap all functions to respect reduced motion
  const wrappedFunctions: HapticPolicy = {} as any;
  for (const [key, fn] of Object.entries(hapticFunctions)) {
    wrappedFunctions[key] = async () => {
      if (isHapticsEnabled.value) {
        return fn();
      }
      return Promise.resolve();
    };
  }

  return wrappedFunctions;
}

export default useHaptics;
