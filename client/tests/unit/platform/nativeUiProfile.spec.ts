/**
 * Platform Profile Tests
 * 
 * Tests for nativeUiProfile.ts - platform detection and UI dialect selection
 * 
 * Test cases cover:
 * - iPhone Safari
 * - iPadOS Safari with desktop-like UA
 * - Android Chrome
 * - Capacitor iOS
 * - Capacitor Android
 * - Desktop Safari
 * - Desktop Chrome
 * - Installed PWA display mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNativeUi, type PlatformType, type UIDialect, type DeviceType } from '@/platform/nativeUiProfile';

// Mock window and navigator
const mockWindow = {
  innerWidth: 375,
  innerHeight: 812,
  matchMedia: vi.fn(),
  Capacitor: undefined as any,
  visualViewport: {
    width: 375,
    height: 812,
  },
} as unknown as Window & typeof globalThis;

const mockNavigator = {
  userAgent: '',
  maxTouchPoints: 0,
} as Navigator;

// Helper to create a mock environment
function setupMockEnvironment(userAgent: string, touchSupport = false, capacitorPlatform?: string) {
  mockNavigator.userAgent = userAgent;
  mockNavigator.maxTouchPoints = touchSupport ? 5 : 0;
  
  // Mock ontouchend
  if (touchSupport) {
    mockWindow.ontouchend = () => {};
  } else {
    delete (mockWindow as any).ontouchend;
  }
  
  // Mock Capacitor
  if (capacitorPlatform) {
    mockWindow.Capacitor = {
      Platform: {
        is: vi.fn((platform: string) => platform.toLowerCase() === capacitorPlatform.toLowerCase()),
      },
    };
  } else {
    mockWindow.Capacitor = undefined;
  }
  
  // Reset matchMedia
  mockWindow.matchMedia = vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('nativeUiProfile', () => {
  beforeEach(() => {
    global.window = mockWindow as any;
    global.navigator = mockNavigator;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('detects iOS from iPhone user agent', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('ios');
    });

    it('detects iOS from iPad user agent', () => {
      setupMockEnvironment('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('ios');
    });

    it('detects iOS from iPadOS with desktop-like UA', () => {
      // iPadOS 13+ reports as Macintosh
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', true);
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('ios');
    });

    it('detects Android from user agent', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('android');
    });

    it('detects Android from Android tablet user agent', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Tablet) AppleWebKit/537.36');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('android');
    });

    it('detects Capacitor iOS', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)', false, 'ios');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('ios');
    });

    it('detects Capacitor Android', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10)', false, 'android');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('android');
    });

    it('detects desktop Safari', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('desktop');
    });

    it('detects desktop Chrome', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('desktop');
    });

    it('detects installed PWA', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      // Mock display-mode: standalone
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));
      
      const { isInstalled } = useNativeUi();
      expect(isInstalled.value).toBe(true);
    });
  });

  describe('UI Dialect Selection', () => {
    it('uses iOS dialect for iOS platform', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { dialect } = useNativeUi();
      expect(dialect.value).toBe('ios');
    });

    it('uses Material dialect for Android platform', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Mobile)');
      
      const { dialect } = useNativeUi();
      expect(dialect.value).toBe('material');
    });

    it('uses iOS dialect for PWA on iOS device', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      // PWA detection
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
      }));
      
      const { dialect } = useNativeUi();
      expect(dialect.value).toBe('ios');
    });

    it('uses Aurora dialect for desktop Mac', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15');
      
      const { dialect } = useNativeUi();
      expect(dialect.value).toBe('aurora');
    });

    it('uses Material dialect for desktop non-Mac', () => {
      setupMockEnvironment('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const { dialect } = useNativeUi();
      expect(dialect.value).toBe('material');
    });
  });

  describe('Device Type Detection', () => {
    it('detects phone for iPhone', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      mockWindow.innerWidth = 375;
      
      const { device } = useNativeUi();
      expect(device.value).toBe('phone');
    });

    it('detects tablet for iPad', () => {
      setupMockEnvironment('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)');
      mockWindow.innerWidth = 768;
      
      const { device } = useNativeUi();
      expect(device.value).toBe('tablet');
    });

    it('detects tablet for iPadOS with desktop-like UA', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', true);
      mockWindow.innerWidth = 1024;
      
      const { device } = useNativeUi();
      expect(device.value).toBe('tablet');
    });

    it('detects phone for Android Mobile', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Mobile)');
      mockWindow.innerWidth = 412;
      
      const { device } = useNativeUi();
      expect(device.value).toBe('phone');
    });

    it('detects tablet for Android Tablet', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Tablet)');
      mockWindow.innerWidth = 1200;
      
      const { device } = useNativeUi();
      expect(device.value).toBe('tablet');
    });

    it('detects desktop for wide viewport', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
      mockWindow.innerWidth = 1440;
      
      const { device } = useNativeUi();
      expect(device.value).toBe('desktop');
    });

    it('detects desktop for narrow desktop viewport', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
      mockWindow.innerWidth = 600;
      
      const { device } = useNativeUi();
      // Narrow desktop is still desktop, not phone
      expect(device.value).toBe('desktop');
    });
  });

  describe('Computed Properties', () => {
    it('computes isIOS correctly', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { isIOS } = useNativeUi();
      expect(isIOS.value).toBe(true);
    });

    it('computes isAndroid correctly', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Mobile)');
      
      const { isAndroid } = useNativeUi();
      expect(isAndroid.value).toBe(true);
    });

    it('computes isPWA correctly', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      }));
      
      const { isPWA } = useNativeUi();
      expect(isPWA.value).toBe(true);
    });

    it('computes isDesktop correctly', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
      
      const { isDesktop } = useNativeUi();
      expect(isDesktop.value).toBe(true);
    });

    it('computes isTablet correctly', () => {
      setupMockEnvironment('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)');
      mockWindow.innerWidth = 768;
      
      const { isTablet } = useNativeUi();
      expect(isTablet.value).toBe(true);
    });

    it('computes isPhone correctly', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { isPhone } = useNativeUi();
      expect(isPhone.value).toBe(true);
    });
  });

  describe('Safe Area Insets', () => {
    it('returns default insets for desktop', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)');
      
      const { safeAreaInsetTop, safeAreaInsetBottom } = useNativeUi();
      expect(safeAreaInsetTop.value).toBe(0);
      expect(safeAreaInsetBottom.value).toBe(0);
    });

    it('returns iOS insets for iPhone', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { safeAreaInsetTop, safeAreaInsetBottom } = useNativeUi();
      // iOS has notch and home indicator
      expect(safeAreaInsetTop.value).toBeGreaterThan(0);
      expect(safeAreaInsetBottom.value).toBeGreaterThan(0);
    });

    it('returns Android insets for Android', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Mobile)');
      
      const { safeAreaInsetBottom } = useNativeUi();
      // Android has bottom navigation bar
      expect(safeAreaInsetBottom.value).toBeGreaterThan(0);
    });
  });

  describe('Profile Object', () => {
    it('builds complete profile', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { profile } = useNativeUi();
      
      expect(profile.value).toHaveProperty('platform');
      expect(profile.value).toHaveProperty('dialect');
      expect(profile.value).toHaveProperty('device');
      expect(profile.value).toHaveProperty('isIOS');
      expect(profile.value).toHaveProperty('isAndroid');
      expect(profile.value).toHaveProperty('isPWA');
      expect(profile.value).toHaveProperty('isDesktop');
      expect(profile.value).toHaveProperty('isTablet');
      expect(profile.value).toHaveProperty('isPhone');
      expect(profile.value).toHaveProperty('isInstalled');
      expect(profile.value).toHaveProperty('safeAreaInsetTop');
      expect(profile.value).toHaveProperty('safeAreaInsetBottom');
      expect(profile.value).toHaveProperty('safeAreaInsetLeft');
      expect(profile.value).toHaveProperty('safeAreaInsetRight');
    });

    it('profile values are consistent with individual properties', () => {
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)');
      
      const { 
        profile, 
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
      } = useNativeUi();
      
      expect(profile.value.platform).toBe(platform.value);
      expect(profile.value.dialect).toBe(dialect.value);
      expect(profile.value.device).toBe(device.value);
      expect(profile.value.isIOS).toBe(isIOS.value);
      expect(profile.value.isAndroid).toBe(isAndroid.value);
      expect(profile.value.isPWA).toBe(isPWA.value);
      expect(profile.value.isDesktop).toBe(isDesktop.value);
      expect(profile.value.isTablet).toBe(isTablet.value);
      expect(profile.value.isPhone).toBe(isPhone.value);
      expect(profile.value.isInstalled).toBe(isInstalled.value);
      expect(profile.value.safeAreaInsetTop).toBe(safeAreaInsetTop.value);
      expect(profile.value.safeAreaInsetBottom).toBe(safeAreaInsetBottom.value);
      expect(profile.value.safeAreaInsetLeft).toBe(safeAreaInsetLeft.value);
      expect(profile.value.safeAreaInsetRight).toBe(safeAreaInsetRight.value);
    });
  });

  describe('iPadOS Special Cases', () => {
    it('correctly identifies iPadOS with desktop-like UA as iOS', () => {
      // This is the tricky case: iPadOS 13+ reports as Macintosh
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', true);
      
      const { platform, isIOS } = useNativeUi();
      expect(platform.value).toBe('ios');
      expect(isIOS.value).toBe(true);
    });

    it('correctly identifies iPadOS with desktop-like UA as tablet', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', true);
      mockWindow.innerWidth = 1024;
      
      const { device, isTablet } = useNativeUi();
      expect(device.value).toBe('tablet');
      expect(isTablet.value).toBe(true);
    });

    it('does not misclassify Mac desktop as iOS', () => {
      // Real Mac without touch support
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', false);
      mockWindow.innerWidth = 1440;
      
      const { platform, device } = useNativeUi();
      expect(platform.value).toBe('desktop');
      expect(device.value).toBe('desktop');
    });
  });

  describe('Feature Detection', () => {
    it('prioritizes Capacitor platform detection over user agent', () => {
      // User agent says iPhone, but Capacitor says Android (unlikely but test the priority)
      setupMockEnvironment('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)', false, 'android');
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('android');
    });

    it('prioritizes iPadOS detection over Mac detection', () => {
      setupMockEnvironment('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15', true);
      
      const { platform } = useNativeUi();
      expect(platform.value).toBe('ios');
    });

    it('correctly classifies Android tablet without Mobile in UA', () => {
      setupMockEnvironment('Mozilla/5.0 (Linux; Android 10; Tablet) AppleWebKit/537.36');
      mockWindow.innerWidth = 1200;
      
      const { platform, device } = useNativeUi();
      expect(platform.value).toBe('android');
      expect(device.value).toBe('tablet');
    });
  });
});
