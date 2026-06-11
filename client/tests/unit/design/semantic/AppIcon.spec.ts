/**
 * AppIcon Unit Tests
 * Tests for the semantic icon component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppIcon from '@/design/semantic/AppIcon.vue';

// Mock icon registry
vi.mock('@/design/icons/iconRegistry', () => ({
  iconRegistry: {
    'test-icon': {
      component: {
        template: '<svg class="test-icon"><path d="test"/></svg>',
      },
    },
    'platform-icon': {
      component: {
        template: '<svg class="platform-icon"><path d="platform"/></svg>',
      },
    },
  },
  platformIcons: {
    'platform-icon': {
      ios: 'platform-icon-ios',
      android: 'platform-icon-android',
      pwa: 'platform-icon',
    },
  },
  iconNames: ['test-icon', 'platform-icon'],
  isValidIcon: (name: string) => ['test-icon', 'platform-icon'].includes(name),
  getIcon: (name: string) => ({ component: { template: `<svg>${name}</svg>` } }),
}));

// Mock useNativeUi
vi.mock('@/platform/nativeUiProfile', () => ({
  useNativeUi: () => ({
    platform: { value: 'pwa' },
  }),
}));

describe('AppIcon', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppIcon, {
      props: { name: 'test-icon' },
    });
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('Rendering', () => {
    it('renders with valid icon name', () => {
      expect(wrapper.find('.test-icon').exists()).toBe(true);
    });

    it('renders with custom size', () => {
      const sizedWrapper = mount(AppIcon, {
        props: { name: 'test-icon', size: 24 },
      });
      expect(sizedWrapper.vm.iconStyle.value.width).toBe('24px');
      expect(sizedWrapper.vm.iconStyle.value.height).toBe('24px');
      sizedWrapper.unmount();
    });

    it('renders with custom color', () => {
      const coloredWrapper = mount(AppIcon, {
        props: { name: 'test-icon', color: 'red' },
      });
      expect(coloredWrapper.vm.iconStyle.value.color).toBe('red');
      coloredWrapper.unmount();
    });

    it('renders with custom class', () => {
      const classWrapper = mount(AppIcon, {
        props: { name: 'test-icon', class: 'custom-class' },
      });
      expect(classWrapper.find('.custom-class').exists()).toBe(true);
      classWrapper.unmount();
    });
  });

  describe('Icon Resolution', () => {
    it('resolves icon from registry', () => {
      expect(wrapper.vm.iconComponent.value).toBeDefined();
    });

    it('falls back to placeholder for unknown icon', () => {
      const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const unknownWrapper = mount(AppIcon, {
        props: { name: 'unknown-icon' },
      });
      expect(unknownWrapper.find('.app-icon-placeholder').exists()).toBe(true);
      expect(warningSpy).toHaveBeenCalledWith('Icon "unknown-icon" not found in registry');
      warningSpy.mockRestore();
      unknownWrapper.unmount();
    });
  });

  describe('Accessibility', () => {
    it('has aria-hidden by default', () => {
      expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true');
    });

    it('has app-icon class', () => {
      expect(wrapper.find('.app-icon').exists()).toBe(true);
    });

    it('renders placeholder with aria-hidden', () => {
      const unknownWrapper = mount(AppIcon, {
        props: { name: 'unknown-icon' },
      });
      expect(unknownWrapper.find('.app-icon-placeholder').attributes('aria-hidden')).toBe('true');
      unknownWrapper.unmount();
    });
  });

  describe('Props', () => {
    it('requires name prop', () => {
      // @ts-expect-error - Testing required prop
      expect(() => mount(AppIcon)).toThrow();
    });

    it('accepts size as number', () => {
      const numericSizeWrapper = mount(AppIcon, {
        props: { name: 'test-icon', size: 32 },
      });
      expect(numericSizeWrapper.vm.iconStyle.value.width).toBe('32px');
      numericSizeWrapper.unmount();
    });

    it('accepts size as string', () => {
      const stringSizeWrapper = mount(AppIcon, {
        props: { name: 'test-icon', size: '2em' },
      });
      expect(stringSizeWrapper.vm.iconStyle.value.width).toBe('2em');
      stringSizeWrapper.unmount();
    });

    it('accepts platform prop', () => {
      const platformWrapper = mount(AppIcon, {
        props: { name: 'test-icon', platform: 'android' },
      });
      expect(platformWrapper.vm.platform).toBe('android');
      platformWrapper.unmount();
    });

    it('defaults platform to auto', () => {
      expect(wrapper.vm.platform).toBe('auto');
    });
  });

  describe('Platform Detection', () => {
    it('detects current platform', () => {
      // Mock window global
      global.window = { Capacitor: undefined } as any;
      const detectWrapper = mount(AppIcon, {
        props: { name: 'test-icon' },
      });
      expect(detectWrapper.vm.detectPlatform()).toBe('pwa');
      delete global.window;
      detectWrapper.unmount();
    });

    it('handles SSR environment', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      // @ts-expect-error - Testing SSR
      global.window = undefined;
      const ssrWrapper = mount(AppIcon, {
        props: { name: 'test-icon' },
      });
      expect(ssrWrapper.vm.detectPlatform()).toBe('pwa');
      global.window = originalWindow;
      ssrWrapper.unmount();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing icon gracefully', () => {
      const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const missingWrapper = mount(AppIcon, {
        props: { name: 'nonexistent' },
      });
      expect(missingWrapper.find('.app-icon-placeholder').exists()).toBe(true);
      expect(warningSpy).toHaveBeenCalled();
      warningSpy.mockRestore();
      missingWrapper.unmount();
    });

    it('renders with all props', () => {
      const allPropsWrapper = mount(AppIcon, {
        props: {
          name: 'test-icon',
          size: 24,
          color: '#ff0000',
          class: 'test-class',
          platform: 'ios',
        },
      });
      expect(allPropsWrapper.find('.test-icon').exists()).toBe(true);
      allPropsWrapper.unmount();
    });

    it('passes through additional attributes', () => {
      const attrsWrapper = mount(AppIcon, {
        props: { name: 'test-icon' },
        attrs: {
          'data-testid': 'icon-test',
          id: 'test-icon-id',
        },
      });
      expect(attrsWrapper.find('[data-testid="icon-test"]').exists()).toBe(true);
      attrsWrapper.unmount();
    });
  });
});
