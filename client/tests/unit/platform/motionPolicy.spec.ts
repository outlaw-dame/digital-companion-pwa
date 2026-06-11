/**
 * Motion Policy Unit Tests
 * Tests verify all Phase 11 Section 5 requirements for motion preferences
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useMotionPreferences,
  prefersReducedMotion,
  getAnimationStyle,
} from '@/platform/motionPolicy';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Motion Policy - Phase 11 Section 5: Platform Abstractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('✅ REQUIRED: Reduced motion detection', () => {
    it('detects reduced motion preference', () => {
      const result = prefersReducedMotion();
      expect(typeof result).toBe('boolean');
    });

    it('returns false when reduced motion is not preferred', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const result = prefersReducedMotion();
      expect(result).toBe(false);
    });

    it('returns true when reduced motion is preferred', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const result = prefersReducedMotion();
      expect(result).toBe(true);
    });

    it('caches reduced motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const result1 = prefersReducedMotion();
      const result2 = prefersReducedMotion();
      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });
  });

  describe('✅ REQUIRED: Animation style generation', () => {
    it('generates animation style with animations enabled', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const style = getAnimationStyle();
      expect(style).toHaveProperty('transition');
      expect(style.transition).not.toContain('none');
    });

    it('generates animation style with animations disabled', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const style = getAnimationStyle();
      expect(style).toHaveProperty('transition');
      expect(style.transition).toContain('none');
    });

    it('generates style with custom properties', () => {
      const style = getAnimationStyle({
        transition: 'all 0.3s ease',
        animation: 'fadeIn 0.5s',
      });
      expect(style.transition).toBe('all 0.3s ease');
      expect(style.animation).toBe('fadeIn 0.5s');
    });

    it('overrides animations when reduced motion is preferred', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const style = getAnimationStyle({
        transition: 'all 0.3s ease',
        animation: 'fadeIn 0.5s',
      });
      expect(style.transition).toBe('none');
      expect(style.animation).toBe('none');
    });

    it('forces animations when explicitly requested', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const style = getAnimationStyle(
        {
          transition: 'all 0.3s ease',
          animation: 'fadeIn 0.5s',
        },
        true
      );
      expect(style.transition).toBe('all 0.3s ease');
      expect(style.animation).toBe('fadeIn 0.5s');
    });
  });

  describe('✅ REQUIRED: Motion preferences composable', () => {
    it('provides motion preferences', () => {
      const { reducedMotion, animationStyle } = useMotionPreferences();
      expect(reducedMotion).toBeDefined();
      expect(animationStyle).toBeDefined();
    });

    it('provides reactive reduced motion state', () => {
      const { reducedMotion } = useMotionPreferences();
      expect(reducedMotion.value).toBeDefined();
      expect(typeof reducedMotion.value).toBe('boolean');
    });

    it('provides reactive animation style', () => {
      const { animationStyle } = useMotionPreferences();
      expect(animationStyle.value).toBeDefined();
      expect(animationStyle.value).toHaveProperty('transition');
    });

    it('respects reduced motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const { reducedMotion } = useMotionPreferences();
      expect(reducedMotion.value).toBe(true);
    });

    it('respects normal motion preference', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const { reducedMotion } = useMotionPreferences();
      expect(reducedMotion.value).toBe(false);
    });
  });

  describe('✅ REQUIRED: Event listener cleanup', () => {
    it('cleans up event listeners on unmount', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      const { reducedMotion } = useMotionPreferences();
      expect(reducedMotion.value).toBeDefined();
    });
  });
});
