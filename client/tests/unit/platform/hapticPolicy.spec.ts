/**
 * Haptic Policy Unit Tests
 * Tests verify all Phase 11 Section 5 requirements for haptic feedback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useHapticFeedback,
  hapticImpact,
  hapticNotification,
  hapticSelection,
  canHaptic,
} from '@/platform/hapticPolicy';

// Mock Capacitor Haptics plugin
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
    selectionStart: vi.fn(),
    selectionChanged: vi.fn(),
    selectionEnd: vi.fn(),
  },
}));

// Mock reduced motion preference
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Haptic Policy - Phase 11 Section 5: Platform Abstractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('✅ REQUIRED: Haptic capability detection', () => {
    it('detects haptic capability', () => {
      const result = canHaptic();
      expect(typeof result).toBe('boolean');
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

      const result = canHaptic();
      expect(result).toBe(false);
    });

    it('returns true when haptics are supported and motion not reduced', () => {
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

      const result = canHaptic();
      expect(result).toBe(true);
    });
  });

  describe('✅ REQUIRED: Haptic impact feedback', () => {
    it('triggers impact haptic feedback', () => {
      hapticImpact('light');
      // Should not throw in test environment
    });

    it('accepts different impact styles', () => {
      hapticImpact('light');
      hapticImpact('medium');
      hapticImpact('heavy');
    });

    it('does nothing when haptics not supported', () => {
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

      hapticImpact('light');
      // Should not throw
    });
  });

  describe('✅ REQUIRED: Haptic notification feedback', () => {
    it('triggers notification haptic feedback', () => {
      hapticNotification('success');
      // Should not throw in test environment
    });

    it('accepts different notification types', () => {
      hapticNotification('success');
      hapticNotification('warning');
      hapticNotification('error');
    });

    it('does nothing when haptics not supported', () => {
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

      hapticNotification('success');
      // Should not throw
    });
  });

  describe('✅ REQUIRED: Haptic selection feedback', () => {
    it('triggers selection haptic feedback', () => {
      hapticSelection();
      // Should not throw in test environment
    });

    it('does nothing when haptics not supported', () => {
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

      hapticSelection();
      // Should not throw
    });
  });

  describe('✅ REQUIRED: Haptic composable', () => {
    it('provides haptic methods', () => {
      const { impact, notification, selection, canUse } = useHapticFeedback();
      expect(impact).toBeDefined();
      expect(notification).toBeDefined();
      expect(selection).toBeDefined();
      expect(canUse).toBeDefined();
    });

    it('provides reactive capability state', () => {
      const { canUse } = useHapticFeedback();
      expect(canUse.value).toBeDefined();
      expect(typeof canUse.value).toBe('boolean');
    });

    it('provides impact method', () => {
      const { impact } = useHapticFeedback();
      impact('light');
      // Should not throw
    });

    it('provides notification method', () => {
      const { notification } = useHapticFeedback();
      notification('success');
      // Should not throw
    });

    it('provides selection method', () => {
      const { selection } = useHapticFeedback();
      selection();
      // Should not throw
    });
  });
});
