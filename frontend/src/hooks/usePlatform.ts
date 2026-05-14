/**
 * usePlatform — Device & Platform Detection
 *
 * Detects platform at runtime and exposes:
 *   - platform: 'ios' | 'android' | 'desktop'
 *   - isStandalone: true if running as installed PWA
 *   - safeAreas: top/bottom insets (handles Dynamic Island, notch, home bar)
 *   - prefersReducedMotion: for accessibility
 *   - theme: 'ios' | 'material' for Konsta UI
 */

import { useState, useEffect } from 'react';

export type Platform = 'ios' | 'android' | 'desktop';
export type KonstaTheme = 'ios' | 'material';

export interface PlatformInfo {
  platform: Platform;
  isStandalone: boolean;
  isTouch: boolean;
  theme: KonstaTheme;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'dark' | 'light';
  safeAreas: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function getCSSEnvValue(property: string): number {
  // Read CSS env() values (safe-area-inset-*)
  const el = document.createElement('div');
  el.style.cssText = `position: fixed; ${property}: env(${property}, 0px);`;
  document.body.appendChild(el);
  const value = parseFloat(getComputedStyle(el).getPropertyValue(property.split('-').pop() ?? '0') || '0');
  document.body.removeChild(el);
  return value || 0;
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(() => {
    const platform = detectPlatform();
    return {
      platform,
      isStandalone:
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true,
      isTouch: 'ontouchstart' in window,
      theme: platform === 'android' ? 'material' : 'ios',
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      safeAreas: { top: 0, bottom: 0, left: 0, right: 0 },
    };
  });

  useEffect(() => {
    // Re-read safe areas after mount (CSS env() needs paint to resolve)
    const readSafeAreas = () => {
      const style = getComputedStyle(document.documentElement);
      const get = (v: string) =>
        parseFloat(style.getPropertyValue(v).replace('px', '')) || 0;

      setInfo((prev) => ({
        ...prev,
        safeAreas: {
          top:    get('--safe-top'),
          bottom: get('--safe-bottom'),
          left:   get('--safe-left'),
          right:  get('--safe-right'),
        },
      }));
    };

    // Slight delay to ensure CSS env() values are resolved
    const t = setTimeout(readSafeAreas, 100);

    // Listen for orientation changes (safe areas change on rotation)
    window.addEventListener('orientationchange', readSafeAreas);
    return () => {
      clearTimeout(t);
      window.removeEventListener('orientationchange', readSafeAreas);
    };
  }, []);

  return info;
}
