/**
 * Safe Area Policy
 * 
 * Manages safe area insets for notched devices.
 * 
 * Do:
 * - Use this for all safe area handling
 * - Import from here rather than calculating safe areas directly
 * 
 * Don't:
 * - Calculate safe areas manually in views/features
 * - Duplicate safe area logic elsewhere
 */

import { ref, computed } from 'vue';
import { useNativeUi } from './nativeUiProfile';

export interface SafeAreaPolicy {
  insetTop: number;
  insetBottom: number;
  insetLeft: number;
  insetRight: number;
  safeAreaStyle: import('vue').ComputedRef<Record<string, string>>;
}

function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  // Use CSS env() if available
  const root = document.documentElement;
  const top = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-top')) || 0;
  const bottom = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom')) || 0;
  const left = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-left')) || 0;
  const right = parseFloat(getComputedStyle(root).getPropertyValue('--safe-area-inset-right')) || 0;

  return { top, bottom, left, right };
}

export function useSafeArea(): SafeAreaPolicy {
  const { isIOS, isAndroid, isPhone, isTablet } = useNativeUi();
  
  const insets = ref(getSafeAreaInsets());
  
  const insetTop = computed(() => insets.value.top);
  const insetBottom = computed(() => insets.value.bottom);
  const insetLeft = computed(() => insets.value.left);
  const insetRight = computed(() => insets.value.right);

  const safeAreaStyle = computed(() => ({
    paddingTop: `${insetTop.value}px`,
    paddingBottom: `${insetBottom.value}px`,
    paddingLeft: `${insetLeft.value}px`,
    paddingRight: `${insetRight.value}px`,
  }));

  return {
    insetTop,
    insetBottom,
    insetLeft,
    insetRight,
    safeAreaStyle,
  };
}

export default useSafeArea;
