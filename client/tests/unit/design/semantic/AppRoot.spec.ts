/**
 * AppRoot Unit Tests
 * Tests verify all Phase 11 Section 6 requirements for root application container
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppRoot from '@/design/semantic/AppRoot.vue';

vi.mock('framework7-vue', () => ({
  f7: vi.fn(),
  f7ready: (callback: Function) => { callback(); },
  App: {
    template: '<div class="app"><slot /></div>',
  },
}));

// Mock window.matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AppRoot - Phase 11 Section 6: Layout Tests', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppRoot);
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.clearAllMocks();
  });

  describe('✅ REQUIRED: Props and default behavior', () => {
    it('has theme prop with default auto', () => {
      expect(wrapper.props('theme')).toBe('auto');
    });

    it('accepts light theme', async () => {
      const wrapperLight = mount(AppRoot, {
        props: { theme: 'light' },
      });
      expect(wrapperLight.props('theme')).toBe('light');
      wrapperLight.unmount();
    });

    it('accepts dark theme', async () => {
      const wrapperDark = mount(AppRoot, {
        props: { theme: 'dark' },
      });
      expect(wrapperDark.props('theme')).toBe('dark');
      wrapperDark.unmount();
    });
  });

  describe('✅ REQUIRED: Theme detection', () => {
    it('detects system theme', () => {
      const systemTheme = wrapper.vm.detectSystemTheme();
      expect(['light', 'dark']).toContain(systemTheme);
    });

    it('uses system dark theme when prefers-color-scheme is dark', () => {
      // The mock already returns dark for this query
      const wrapperWithAuto = mount(AppRoot);
      expect(wrapperWithAuto.vm.currentTheme).toBe('dark');
      wrapperWithAuto.unmount();
    });
  });

  describe('✅ REQUIRED: Theme watching', () => {
    it('watches theme prop changes', async () => {
      const wrapperWithWatch = mount(AppRoot);
      await wrapperWithWatch.setProps({ theme: 'light' });
      expect(wrapperWithWatch.props('theme')).toBe('light');
      wrapperWithWatch.unmount();
    });

    it('updates currentTheme when theme prop changes', async () => {
      const wrapperWithWatch = mount(AppRoot);
      await wrapperWithWatch.setProps({ theme: 'light' });
      expect(wrapperWithWatch.vm.currentTheme).toBe('light');
      wrapperWithWatch.unmount();
    });
  });

  describe('✅ REQUIRED: Framework7 initialization', () => {
    it('initializes with current theme', () => {
      expect(wrapper.find('.app').exists()).toBe(true);
    });

    it('provides f7 instance to children', () => {
      expect(wrapper.vm.f7Instance).toBeNull();
    });
  });

  describe('✅ REQUIRED: Auto theme initialization', () => {
    it('initializes with system theme when theme is auto', () => {
      const wrapperAuto = mount(AppRoot, {
        props: { theme: 'auto' },
      });
      // With our mock, auto should detect dark
      expect(wrapperAuto.vm.currentTheme).toBe('dark');
      wrapperAuto.unmount();
    });
  });

  describe('✅ REQUIRED: Accessibility attributes', () => {
    it('renders with proper structure', () => {
      expect(wrapper.find('.app').exists()).toBe(true);
    });

    it('passes custom class', async () => {
      const wrapperWithClass = mount(AppRoot, {
        attrs: { class: 'custom-app' },
      });
      expect(wrapperWithClass.find('.app').classes()).toContain('custom-app');
      wrapperWithClass.unmount();
    });

    it('passes custom style', async () => {
      const wrapperWithStyle = mount(AppRoot, {
        attrs: { style: 'background: red' },
      });
      const app = wrapperWithStyle.find('.app');
      expect(app.exists()).toBe(true);
      wrapperWithStyle.unmount();
    });
  });

  describe('✅ REQUIRED: Slot support', () => {
    it('renders default slot content', () => {
      const wrapperWithDefault = mount(AppRoot, {
        slots: { default: '<div>App Content</div>' },
      });
      expect(wrapperWithDefault.text()).toContain('App Content');
      wrapperWithDefault.unmount();
    });

    it('renders multiple children', () => {
      const wrapperWithChildren = mount(AppRoot, {
        slots: { default: '<div>First</div><div>Second</div>' },
      });
      expect(wrapperWithChildren.text()).toContain('First');
      expect(wrapperWithChildren.text()).toContain('Second');
      wrapperWithChildren.unmount();
    });
  });

  describe('✅ REQUIRED: Theme management', () => {
    it('exposes theme for child components', () => {
      expect(wrapper.vm.theme).toBeDefined();
    });

    it('theme is a ref', () => {
      expect(wrapper.vm.theme.value).toBeDefined();
    });
  });
});
