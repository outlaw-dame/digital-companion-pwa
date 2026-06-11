/**
 * Motion Policy
 * 
 * Manages motion preferences and animations.
 * 
 * Do:
 * - Use this for all motion-related behavior
 * - Import from here rather than checking reduced motion directly
 * 
 * Don't:
 * - Check prefers-reduced-motion directly in views/features
 * - Duplicate motion logic elsewhere
 */

import { ref, computed, watch } from 'vue';

export interface MotionPolicy {
  prefersReducedMotion: boolean;
  ReducedMotion: boolean;
  canAnimate: boolean;
  animationStyle: import('vue').ComputedRef<Record<string, string>>;
}

function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useMotion(): MotionPolicy {
  const prefersReducedMotion = ref(detectReducedMotion());
  const ReducedMotion = computed(() => prefersReducedMotion.value);
  const canAnimate = computed(() => !prefersReducedMotion.value);

  const animationStyle = computed(() => {
    if (prefersReducedMotion.value) {
      return {
        transition: 'none !important',
        animation: 'none !important',
      };
    }
    return {};
  });

  // Watch for changes in media query
  if (typeof window !== 'undefined') {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    watch(
      () => query.matches,
      (matches) => {
        prefersReducedMotion.value = matches;
      }
    );
    
    // Also listen for changes
    query.addEventListener('change', (e) => {
      prefersReducedMotion.value = e.matches;
    });
  }

  return {
    prefersReducedMotion,
    ReducedMotion,
    canAnimate,
    animationStyle,
  };
}

export default useMotion;
