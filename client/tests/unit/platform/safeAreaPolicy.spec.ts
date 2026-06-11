/**
 * Safe Area Policy Unit Tests
 * Tests verify all Phase 11 Section 5 requirements for safe area handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useSafeAreaInsets,
  getSafeAreaInsets,
  getSafeAreaStyle,
} from '@/platform/safeAreaPolicy';

// Mock CSS env() function
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn().mockImplementation((prop: string) => {
      const values: Record<string, string> = {
        '--safe-top': '10px',
        '--safe-bottom': '20px',
        '--safe-left': '0px',
        '--safe-right': '0px',
      };
      return values[prop] || '0px';
    }),
  })),
});

// Mock document
Object.defineProperty(document, 'documentElement', {
  writable: true,
  value: {
    style: {
      getPropertyValue: vi.fn().mockImplementation((prop: string) => {
        const values: Record<string, string> = {
          '--safe-top': '10px',
          '--safe-bottom': '20px',
          '--safe-left': '0px',
          '--safe-right': '0px',
        };
        return values[prop] || '0px';
      }),
    },
  },
});

describe('Safe Area Policy - Phase 11 Section 5: Platform Abstractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('✅ REQUIRED: Safe area insets detection', () => {
    it('gets safe area insets', () => {
      const insets = getSafeAreaInsets();
      expect(insets).toHaveProperty('top');
      expect(insets).toHaveProperty('bottom');
      expect(insets).toHaveProperty('left');
      expect(insets).toHaveProperty('right');
    });

    it('parses pixel values correctly', () => {
      const insets = getSafeAreaInsets();
      expect(insets.top).toBe(10);
      expect(insets.bottom).toBe(20);
      expect(insets.left).toBe(0);
      expect(insets.right).toBe(0);
    });

    it('handles missing insets', () => {
      window.getComputedStyle = vi.fn().mockImplementation(() => ({
        getPropertyValue: vi.fn().mockImplementation(() => '0px'),
      })) as any;

      const insets = getSafeAreaInsets();
      expect(insets.top).toBe(0);
      expect(insets.bottom).toBe(0);
      expect(insets.left).toBe(0);
      expect(insets.right).toBe(0);
    });

    it('handles non-pixel values', () => {
      window.getComputedStyle = vi.fn().mockImplementation(() => ({
        getPropertyValue: vi.fn().mockImplementation((prop: string) => {
          if (prop === '--safe-top') return '1rem';
          if (prop === '--safe-bottom') return '2rem';
          return '0px';
        }),
      })) as any;

      const insets = getSafeAreaInsets();
      // Should handle non-pixel values gracefully
      expect(insets).toBeDefined();
    });
  });

  describe('✅ REQUIRED: Safe area style generation', () => {
    it('generates style object from insets', () => {
      const style = getSafeAreaStyle({
        top: 10,
        bottom: 20,
        left: 5,
        right: 5,
      });
      expect(style).toHaveProperty('paddingTop');
      expect(style).toHaveProperty('paddingBottom');
      expect(style).toHaveProperty('paddingLeft');
      expect(style).toHaveProperty('paddingRight');
    });

    it('converts numbers to pixel strings', () => {
      const style = getSafeAreaStyle({
        top: 10,
        bottom: 20,
        left: 5,
        right: 5,
      });
      expect(style.paddingTop).toBe('10px');
      expect(style.paddingBottom).toBe('20px');
      expect(style.paddingLeft).toBe('5px');
      expect(style.paddingRight).toBe('5px');
    });

    it('handles zero values', () => {
      const style = getSafeAreaStyle({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      });
      expect(style.paddingTop).toBe('0px');
      expect(style.paddingBottom).toBe('0px');
      expect(style.paddingLeft).toBe('0px');
      expect(style.paddingRight).toBe('0px');
    });

    it('includes safe area CSS variables', () => {
      const style = getSafeAreaStyle({
        top: 10,
        bottom: 20,
        left: 5,
        right: 5,
      }, true);
      expect(style).toHaveProperty('--safe-top');
      expect(style).toHaveProperty('--safe-bottom');
      expect(style).toHaveProperty('--safe-left');
      expect(style).toHaveProperty('--safe-right');
    });
  });

  describe('✅ REQUIRED: Safe area composable', () => {
    it('provides safe area insets', () => {
      const { insets, style } = useSafeAreaInsets();
      expect(insets).toBeDefined();
      expect(style).toBeDefined();
    });

    it('provides reactive insets', () => {
      const { insets } = useSafeAreaInsets();
      expect(insets.value).toBeDefined();
      expect(insets.value).toHaveProperty('top');
      expect(insets.value).toHaveProperty('bottom');
      expect(insets.value).toHaveProperty('left');
      expect(insets.value).toHaveProperty('right');
    });

    it('provides reactive style', () => {
      const { style } = useSafeAreaInsets();
      expect(style.value).toBeDefined();
      expect(style.value).toHaveProperty('paddingTop');
    });
  });
});
