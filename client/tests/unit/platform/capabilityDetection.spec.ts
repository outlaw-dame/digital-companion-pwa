/**
 * Capability Detection Unit Tests
 * Tests verify all Phase 11 Section 5 requirements for feature detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  canUseTouch,
  canUsePassiveEvents,
  canUseIntersectionObserver,
  canUseResizeObserver,
  canUseWebShare,
  canUseFileSystem,
  canUseClipboard,
  canUseWebAuthn,
  canUseWebRTC,
  canUseGeolocation,
  canUseNotifications,
  canUseServiceWorker,
  canUseCamera,
  canUseMicrophone,
  prefersReducedMotion,
  prefersColorScheme,
  isInstalledPWA,
  getCapabilityProfile,
} from '@/platform/capabilityDetection';

// Mock window and navigator objects
globalThis.window = {
  matchMedia: vi.fn(),
  IntersectionObserver: undefined,
  ResizeObserver: undefined,
  navigator: {
    share: undefined,
    clipboard: undefined,
    credentials: undefined,
    geolocation: undefined,
    permissions: undefined,
    mediaDevices: undefined,
    serviceWorker: undefined,
  },
  innerWidth: 1024,
  innerHeight: 768,
  screen: { width: 1024, height: 768 },
} as unknown as Window & typeof globalThis;

globalThis.navigator = globalThis.window.navigator;

describe('Capability Detection - Phase 11 Section 5: Platform Abstractions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('✅ REQUIRED: Touch Support Detection', () => {
    it('detects touch support', () => {
      globalThis.window = {
        ...globalThis.window,
        ontouchstart: null,
        DocumentTouch: undefined,
      } as unknown as Window & typeof globalThis;

      // Mock document
      globalThis.document = {
        createElement: () => ({
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          style: {},
        }),
      } as unknown as Document;

      const result = canUseTouch();
      expect(typeof result).toBe('boolean');
    });

    it('returns false when touch is not supported', () => {
      globalThis.window = {
        ...globalThis.window,
        ontouchstart: undefined,
        DocumentTouch: undefined,
      } as unknown as Window & typeof globalThis;

      globalThis.document = {
        createElement: () => ({
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          style: {},
        }),
      } as unknown as Document;

      const result = canUseTouch();
      expect(result).toBe(false);
    });
  });

  describe('✅ REQUIRED: Passive Events Detection', () => {
    it('detects passive event listener support', () => {
      const result = canUsePassiveEvents();
      expect(typeof result).toBe('boolean');
    });

    it('handles errors gracefully', () => {
      globalThis.window = {
        ...globalThis.window,
        addEventListener: vi.fn(() => {
          throw new Error('Test error');
        }),
      } as unknown as Window & typeof globalThis;

      const result = canUsePassiveEvents();
      expect(result).toBe(false);
    });
  });

  describe('✅ REQUIRED: Observer API Detection', () => {
    it('detects IntersectionObserver support', () => {
      globalThis.window = {
        ...globalThis.window,
        IntersectionObserver: class IntersectionObserver {},
      } as unknown as Window & typeof globalThis;

      const result = canUseIntersectionObserver();
      expect(result).toBe(true);
    });

    it('detects ResizeObserver support', () => {
      globalThis.window = {
        ...globalThis.window,
        ResizeObserver: class ResizeObserver {},
      } as unknown as Window & typeof globalThis;

      const result = canUseResizeObserver();
      expect(result).toBe(true);
    });

    it('returns false when observer is not supported', () => {
      globalThis.window = {
        ...globalThis.window,
        IntersectionObserver: undefined,
        ResizeObserver: undefined,
      } as unknown as Window & typeof globalThis;

      expect(canUseIntersectionObserver()).toBe(false);
      expect(canUseResizeObserver()).toBe(false);
    });
  });

  describe('✅ REQUIRED: Web APIs Detection', () => {
    it('detects Web Share API support', () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        share: vi.fn(),
      } as unknown as Navigator;

      const result = canUseWebShare();
      expect(result).toBe(true);
    });

    it('detects Clipboard API support', () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        clipboard: {
          writeText: vi.fn(),
          readText: vi.fn(),
        },
      } as unknown as Navigator;

      const result = canUseClipboard();
      expect(result).toBe(true);
    });

    it('detects Web Authentication support', () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        credentials: {
          create: vi.fn(),
          get: vi.fn(),
        },
      } as unknown as Navigator;

      const result = canUseWebAuthn();
      expect(result).toBe(true);
    });

    it('detects WebRTC support', () => {
      globalThis.window = {
        ...globalThis.window,
        RTCPeerConnection: class RTCPeerConnection {},
        webkitRTCPeerConnection: undefined,
        mozRTCPeerConnection: undefined,
      } as unknown as Window & typeof globalThis;

      const result = canUseWebRTC();
      expect(result).toBe(true);
    });

    it('detects Geolocation support', () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        geolocation: {
          getCurrentPosition: vi.fn(),
          watchPosition: vi.fn(),
        },
      } as unknown as Navigator;

      const result = canUseGeolocation();
      expect(result).toBe(true);
    });

    it('detects Notifications support', () => {
      globalThis.window = {
        ...globalThis.window,
        Notification: class Notification {},
      } as unknown as Window & typeof globalThis;

      globalThis.navigator = {
        ...globalThis.navigator,
        permissions: {
          query: vi.fn().mockResolvedValue({ state: 'granted' }),
        },
      } as unknown as Navigator;

      const result = canUseNotifications();
      expect(result).toBe(true);
    });

    it('detects Service Worker support', () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        serviceWorker: {
          register: vi.fn(),
          getRegistrations: vi.fn(),
        },
      } as unknown as Navigator;

      const result = canUseServiceWorker();
      expect(result).toBe(true);
    });

    it('detects Camera access support', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({}),
        },
      } as unknown as Navigator;

      const result = await canUseCamera();
      expect(result).toBe(true);
    });

    it('detects Microphone access support', async () => {
      globalThis.navigator = {
        ...globalThis.navigator,
        mediaDevices: {
          getUserMedia: vi.fn().mockResolvedValue({}),
        },
      } as unknown as Navigator;

      const result = await canUseMicrophone();
      expect(result).toBe(true);
    });

    it('detects File System Access API support', () => {
      globalThis.window = {
        ...globalThis.window,
        showSaveFilePicker: vi.fn(),
        showOpenFilePicker: vi.fn(),
      } as unknown as Window & typeof globalThis;

      const result = canUseFileSystem();
      expect(result).toBe(true);
    });
  });

  describe('✅ REQUIRED: User Preferences Detection', () => {
    it('detects reduced motion preference', () => {
      globalThis.window = {
        ...globalThis.window,
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      } as unknown as Window & typeof globalThis;

      const result = prefersReducedMotion();
      expect(result).toBe(true);
    });

    it('detects color scheme preference', () => {
      globalThis.window = {
        ...globalThis.window,
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      } as unknown as Window & typeof globalThis;

      const result = prefersColorScheme();
      expect(result).toBe('dark');
    });
  });

  describe('✅ REQUIRED: PWA Installation Detection', () => {
    it('detects if app is installed as PWA', () => {
      globalThis.window = {
        ...globalThis.window,
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      } as unknown as Window & typeof globalThis;

      globalThis.navigator = {
        ...globalThis.navigator,
        standalone: true,
      } as unknown as Navigator;

      const result = isInstalledPWA();
      expect(result).toBe(true);
    });

    it('returns false when not installed as PWA', () => {
      globalThis.window = {
        ...globalThis.window,
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      } as unknown as Window & typeof globalThis;

      globalThis.navigator = {
        ...globalThis.navigator,
        standalone: false,
      } as unknown as Navigator;

      const result = isInstalledPWA();
      expect(result).toBe(false);
    });
  });

  describe('✅ REQUIRED: Capability Profile', () => {
    it('generates capability profile', () => {
      globalThis.window = {
        ...globalThis.window,
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        IntersectionObserver: class IntersectionObserver {},
        ResizeObserver: class ResizeObserver {},
        Notification: class Notification {},
        RTCPeerConnection: class RTCPeerConnection {},
        showSaveFilePicker: vi.fn(),
        ontouchstart: null,
      } as unknown as Window & typeof globalThis;

      globalThis.navigator = {
        share: vi.fn(),
        clipboard: { writeText: vi.fn(), readText: vi.fn() },
        credentials: { create: vi.fn(), get: vi.fn() },
        geolocation: { getCurrentPosition: vi.fn(), watchPosition: vi.fn() },
        permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
        mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({}) },
        serviceWorker: { register: vi.fn(), getRegistrations: vi.fn() },
        standalone: false,
      } as unknown as Navigator;

      globalThis.document = {
        createElement: () => ({
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          style: {},
        }),
      } as unknown as Document;

      const profile = getCapabilityProfile();
      expect(profile).toHaveProperty('touch');
      expect(profile).toHaveProperty('observers');
      expect(profile).toHaveProperty('media');
      expect(profile).toHaveProperty('applications');
      expect(profile).toHaveProperty('hardware');
      expect(profile).toHaveProperty('preferences');
      expect(profile).toHaveProperty('pwa');
    });

    it('caches capability profile', () => {
      globalThis.window = {
        ...globalThis.window,
        IntersectionObserver: class IntersectionObserver {},
      } as unknown as Window & typeof globalThis;

      globalThis.navigator = {
        share: vi.fn(),
        clipboard: { writeText: vi.fn(), readText: vi.fn() },
        credentials: { create: vi.fn(), get: vi.fn() },
        geolocation: { getCurrentPosition: vi.fn(), watchPosition: vi.fn() },
        permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
        mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({}) },
        serviceWorker: { register: vi.fn(), getRegistrations: vi.fn() },
        standalone: false,
      } as unknown as Navigator;

      globalThis.document = {
        createElement: () => ({
          appendChild: vi.fn(),
          removeChild: vi.fn(),
          style: {},
        }),
      } as unknown as Document;

      const profile1 = getCapabilityProfile();
      const profile2 = getCapabilityProfile();
      expect(profile1).toBe(profile2);
    });
  });
});
