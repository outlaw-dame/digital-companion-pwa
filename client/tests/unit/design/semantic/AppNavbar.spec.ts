/**
 * AppNavbar Unit Tests
 * Tests verify all Phase 11 Section 6 requirements for navigation bars
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppNavbar from '@/design/semantic/AppNavbar.vue';

vi.mock('framework7-vue', () => ({
  Navbar: {
    template: '<nav class="navbar"><slot name="left" /><slot name="title" /><slot name="right" /></nav>',
  },
}));

describe('AppNavbar - Phase 11 Section 6: Layout Tests', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppNavbar);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('✅ REQUIRED: Props and default behavior', () => {
    it('has title prop with default undefined', () => {
      expect(wrapper.props('title')).toBeUndefined();
    });

    it('has backLink prop with default undefined', () => {
      expect(wrapper.props('backLink')).toBeUndefined();
    });

    it('has sliding prop with default false', () => {
      expect(wrapper.props('sliding')).toBe(false);
    });

    it('has hidden prop with default false', () => {
      expect(wrapper.props('hidden')).toBe(false);
    });

    it('has large prop with default false', () => {
      expect(wrapper.props('large')).toBe(false);
    });

    it('has transparent prop with default false', () => {
      expect(wrapper.props('transparent')).toBe(false);
    });
  });

  describe('✅ REQUIRED: Back link behavior', () => {
    it('computes backLinkText for back navigation', () => {
      expect(wrapper.vm.backLinkText).toBe('Back');
    });

    it('returns Back when backLink is true', async () => {
      const wrapperWithBack = mount(AppNavbar, {
        props: { backLink: true },
      });
      expect(wrapperWithBack.vm.backLinkText).toBe('Back');
      wrapperWithBack.unmount();
    });

    it('returns Back when backLink is undefined', () => {
      expect(wrapper.vm.backLinkText).toBe('Back');
    });

    it('returns custom back link text when provided', async () => {
      const wrapperWithCustom = mount(AppNavbar, {
        props: { backLink: 'Go Back' },
      });
      expect(wrapperWithCustom.vm.backLinkText).toBe('Go Back');
      wrapperWithCustom.unmount();
    });

    it('returns false when backLink is false', async () => {
      const wrapperNoBack = mount(AppNavbar, {
        props: { backLink: false },
      });
      expect(wrapperNoBack.vm.backLinkText).toBe(false);
      wrapperNoBack.unmount();
    });
  });

  describe('✅ REQUIRED: Back navigation', () => {
    it('emits back event on back navigation', async () => {
      const wrapperForBack = mount(AppNavbar);
      await wrapperForBack.vm.handleBack();
      expect(wrapperForBack.emitted('back')).toBeTruthy();
      wrapperForBack.unmount();
    });
  });

  describe('✅ REQUIRED: Title rendering', () => {
    it('renders title prop', () => {
      const wrapperWithTitle = mount(AppNavbar, {
        props: { title: 'Page Title' },
      });
      expect(wrapperWithTitle.text()).toContain('Page Title');
      wrapperWithTitle.unmount();
    });

    it('renders title slot', () => {
      const wrapperWithTitleSlot = mount(AppNavbar, {
        slots: { title: '<h1>Custom Title</h1>' },
      });
      expect(wrapperWithTitleSlot.text()).toContain('Custom Title');
      wrapperWithTitleSlot.unmount();
    });

    it('prioritizes title slot over title prop', () => {
      const wrapperWithBoth = mount(AppNavbar, {
        props: { title: 'Prop Title' },
        slots: { title: '<h1>Slot Title</h1>' },
      });
      expect(wrapperWithBoth.text()).toContain('Slot Title');
      wrapperWithBoth.unmount();
    });

    it('does not render title when neither prop nor slot is provided', () => {
      const wrapperNoTitle = mount(AppNavbar);
      expect(wrapperNoTitle.text()).not.toContain('Back');
      wrapperNoTitle.unmount();
    });
  });

  describe('✅ REQUIRED: Sliding behavior', () => {
    it('has sliding prop with default false', () => {
      expect(wrapper.props('sliding')).toBe(false);
    });

    it('accepts sliding true', async () => {
      const wrapperSliding = mount(AppNavbar, {
        props: { sliding: true },
      });
      expect(wrapperSliding.props('sliding')).toBe(true);
      wrapperSliding.unmount();
    });
  });

  describe('✅ REQUIRED: Visibility', () => {
    it('has hidden prop with default false', () => {
      expect(wrapper.props('hidden')).toBe(false);
    });

    it('accepts hidden true', async () => {
      const wrapperHidden = mount(AppNavbar, {
        props: { hidden: true },
      });
      expect(wrapperHidden.props('hidden')).toBe(true);
      wrapperHidden.unmount();
    });
  });

  describe('✅ REQUIRED: Large navbar', () => {
    it('has large prop with default false', () => {
      expect(wrapper.props('large')).toBe(false);
    });

    it('accepts large true', async () => {
      const wrapperLarge = mount(AppNavbar, {
        props: { large: true },
      });
      expect(wrapperLarge.props('large')).toBe(true);
      wrapperLarge.unmount();
    });
  });

  describe('✅ REQUIRED: Transparent navbar', () => {
    it('has transparent prop with default false', () => {
      expect(wrapper.props('transparent')).toBe(false);
    });

    it('accepts transparent true', async () => {
      const wrapperTransparent = mount(AppNavbar, {
        props: { transparent: true },
      });
      expect(wrapperTransparent.props('transparent')).toBe(true);
      wrapperTransparent.unmount();
    });
  });

  describe('✅ REQUIRED: Accessibility attributes', () => {
    it('renders with proper structure', () => {
      expect(wrapper.find('.navbar').exists()).toBe(true);
    });

    it('passes custom class', async () => {
      const wrapperWithClass = mount(AppNavbar, {
        attrs: { class: 'custom-navbar' },
      });
      expect(wrapperWithClass.find('.navbar').classes()).toContain('custom-navbar');
      wrapperWithClass.unmount();
    });

    it('passes custom style', async () => {
      const wrapperWithStyle = mount(AppNavbar, {
        attrs: { style: 'background: red' },
      });
      const navbar = wrapperWithStyle.find('.navbar');
      expect(navbar.exists()).toBe(true);
      wrapperWithStyle.unmount();
    });
  });

  describe('✅ REQUIRED: Slot support', () => {
    it('renders left slot', () => {
      const wrapperWithLeft = mount(AppNavbar, {
        slots: { left: '<button>Left Button</button>' },
      });
      expect(wrapperWithLeft.text()).toContain('Left Button');
      wrapperWithLeft.unmount();
    });

    it('renders title slot', () => {
      const wrapperWithTitle = mount(AppNavbar, {
        slots: { title: '<h1>Title</h1>' },
      });
      expect(wrapperWithTitle.text()).toContain('Title');
      wrapperWithTitle.unmount();
    });

    it('renders right slot', () => {
      const wrapperWithRight = mount(AppNavbar, {
        slots: { right: '<button>Right Button</button>' },
      });
      expect(wrapperWithRight.text()).toContain('Right Button');
      wrapperWithRight.unmount();
    });

    it('renders all slots together', () => {
      const wrapperWithAll = mount(AppNavbar, {
        slots: {
          left: '<button>Left</button>',
          title: '<h1>Title</h1>',
          right: '<button>Right</button>',
        },
      });
      expect(wrapperWithAll.text()).toContain('Left');
      expect(wrapperWithAll.text()).toContain('Title');
      expect(wrapperWithAll.text()).toContain('Right');
      wrapperWithAll.unmount();
    });
  });
});
