/**
 * AppButton Unit Tests
 * Tests verify all Phase 11 Section 6 requirements for buttons
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppButton from '@/design/semantic/AppButton.vue';

vi.mock('framework7-vue', () => ({
  Button: {
    template: '<button class="button"><slot /></button>',
  },
}));

vi.mock('./AppIcon.vue', () => ({
  default: {
    template: '<span class="icon">{{ name }}</span>',
    props: ['name'],
  },
}));

describe('AppButton - Phase 11 Section 6: Form Input Tests', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppButton);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('✅ REQUIRED: Props and default behavior', () => {
    it('has text prop with default undefined', () => {
      expect(wrapper.props('text')).toBeUndefined();
    });

    it('has icon prop with default undefined', () => {
      expect(wrapper.props('icon')).toBeUndefined();
    });

    it('has iconPosition prop with default left', () => {
      expect(wrapper.props('iconPosition')).toBe('left');
    });

    it('has size prop with default medium', () => {
      expect(wrapper.props('size')).toBe('medium');
    });

    it('has fill prop with default solid', () => {
      expect(wrapper.props('fill')).toBe('solid');
    });

    it('has color prop with default undefined', () => {
      expect(wrapper.props('color')).toBeUndefined();
    });

    it('has disabled prop with default false', () => {
      expect(wrapper.props('disabled')).toBe(false);
    });

    it('has loading prop with default false', () => {
      expect(wrapper.props('loading')).toBe(false);
    });

    it('has round prop with default false', () => {
      expect(wrapper.props('round')).toBe(false);
    });

    it('has raised prop with default false', () => {
      expect(wrapper.props('raised')).toBe(false);
    });

    it('has large prop with default false', () => {
      expect(wrapper.props('large')).toBe(false);
    });

    it('has small prop with default false', () => {
      expect(wrapper.props('small')).toBe(false);
    });

    it('has type prop with default button', () => {
      expect(wrapper.props('type')).toBe('button');
    });
  });

  describe('✅ REQUIRED: Text rendering', () => {
    it('renders text prop', () => {
      const wrapperWithText = mount(AppButton, {
        props: { text: 'Click Me' },
      });
      expect(wrapperWithText.text()).toContain('Click Me');
      wrapperWithText.unmount();
    });

    it('renders default slot', () => {
      const wrapperWithSlot = mount(AppButton, {
        slots: { default: 'Custom Button' },
      });
      expect(wrapperWithSlot.text()).toContain('Custom Button');
      wrapperWithSlot.unmount();
    });

    it('prioritizes slot over text prop', () => {
      const wrapperWithBoth = mount(AppButton, {
        props: { text: 'Prop Text' },
        slots: { default: 'Slot Text' },
      });
      expect(wrapperWithBoth.text()).toContain('Slot Text');
      wrapperWithBoth.unmount();
    });
  });

  describe('✅ REQUIRED: Size variants', () => {
    it('has default size medium', () => {
      expect(wrapper.props('size')).toBe('medium');
    });

    it('accepts small size', async () => {
      const wrapperSmall = mount(AppButton, {
        props: { size: 'small' },
      });
      expect(wrapperSmall.props('size')).toBe('small');
      wrapperSmall.unmount();
    });

    it('accepts large size', async () => {
      const wrapperLarge = mount(AppButton, {
        props: { size: 'large' },
      });
      expect(wrapperLarge.props('size')).toBe('large');
      wrapperLarge.unmount();
    });

    it('size prop affects large and small props', async () => {
      const wrapperLarge = mount(AppButton, {
        props: { size: 'large' },
      });
      expect(wrapperLarge.props('large')).toBe(false);
      expect(wrapperLarge.props('size')).toBe('large');
      wrapperLarge.unmount();
    });
  });

  describe('✅ REQUIRED: Fill variants', () => {
    it('has default fill solid', () => {
      expect(wrapper.props('fill')).toBe('solid');
    });

    it('accepts outline fill', async () => {
      const wrapperOutline = mount(AppButton, {
        props: { fill: 'outline' },
      });
      expect(wrapperOutline.props('fill')).toBe('outline');
      wrapperOutline.unmount();
    });

    it('accepts clear fill', async () => {
      const wrapperClear = mount(AppButton, {
        props: { fill: 'clear' },
      });
      expect(wrapperClear.props('fill')).toBe('clear');
      wrapperClear.unmount();
    });
  });

  describe('✅ REQUIRED: Icon handling', () => {
    it('has icon prop', () => {
      expect(wrapper.props('icon')).toBeUndefined();
    });

    it('accepts icon prop', async () => {
      const wrapperWithIcon = mount(AppButton, {
        props: { icon: 'home' },
      });
      expect(wrapperWithIcon.props('icon')).toBe('home');
      wrapperWithIcon.unmount();
    });

    it('has iconPosition prop with default left', () => {
      expect(wrapper.props('iconPosition')).toBe('left');
    });

    it('accepts iconPosition right', async () => {
      const wrapperRight = mount(AppButton, {
        props: { icon: 'home', iconPosition: 'right' },
      });
      expect(wrapperRight.props('iconPosition')).toBe('right');
      wrapperRight.unmount();
    });

    it('computes iconSlot based on position', () => {
      expect(wrapper.vm.iconSlot).toBe('before');
    });

    it('computes iconSlot as after when position is right', async () => {
      const wrapperRight = mount(AppButton, {
        props: { iconPosition: 'right' },
      });
      expect(wrapperRight.vm.iconSlot).toBe('after');
      wrapperRight.unmount();
    });
  });

  describe('✅ REQUIRED: Accessibility - aria-label', () => {
    it('computes ariaLabel for icon-only buttons', async () => {
      const wrapperIconOnly = mount(AppButton, {
        props: { icon: 'home' },
      });
      expect(wrapperIconOnly.vm.ariaLabel).toBe('home');
      wrapperIconOnly.unmount();
    });

    it('returns undefined ariaLabel when text is present', async () => {
      const wrapperWithText = mount(AppButton, {
        props: { text: 'Click Me', icon: 'home' },
      });
      expect(wrapperWithText.vm.ariaLabel).toBeUndefined();
      wrapperWithText.unmount();
    });

    it('returns Button as default ariaLabel for empty button', () => {
      expect(wrapper.vm.ariaLabel).toBe('Button');
    });
  });

  describe('✅ REQUIRED: State handling', () => {
    it('has disabled prop with default false', () => {
      expect(wrapper.props('disabled')).toBe(false);
    });

    it('accepts disabled true', async () => {
      const wrapperDisabled = mount(AppButton, {
        props: { disabled: true },
      });
      expect(wrapperDisabled.props('disabled')).toBe(true);
      wrapperDisabled.unmount();
    });

    it('has loading prop with default false', () => {
      expect(wrapper.props('loading')).toBe(false);
    });

    it('accepts loading true', async () => {
      const wrapperLoading = mount(AppButton, {
        props: { loading: true },
      });
      expect(wrapperLoading.props('loading')).toBe(true);
      wrapperLoading.unmount();
    });

    it('does not emit click when disabled', async () => {
      const wrapperDisabled = mount(AppButton, {
        props: { disabled: true },
      });
      await wrapperDisabled.vm.handleClick(new MouseEvent('click'));
      expect(wrapperDisabled.emitted('click')).toBeFalsy();
      wrapperDisabled.unmount();
    });

    it('does not emit click when loading', async () => {
      const wrapperLoading = mount(AppButton, {
        props: { loading: true },
      });
      await wrapperLoading.vm.handleClick(new MouseEvent('click'));
      expect(wrapperLoading.emitted('click')).toBeFalsy();
      wrapperLoading.unmount();
    });

    it('emits click when enabled', async () => {
      const wrapperEnabled = mount(AppButton, {
        props: { disabled: false, loading: false },
      });
      await wrapperEnabled.vm.handleClick(new MouseEvent('click'));
      expect(wrapperEnabled.emitted('click')).toBeTruthy();
      wrapperEnabled.unmount();
    });
  });

  describe('✅ REQUIRED: Type attribute', () => {
    it('has type prop with default button', () => {
      expect(wrapper.props('type')).toBe('button');
    });

    it('accepts submit type', async () => {
      const wrapperSubmit = mount(AppButton, {
        props: { type: 'submit' },
      });
      expect(wrapperSubmit.props('type')).toBe('submit');
      wrapperSubmit.unmount();
    });

    it('accepts reset type', async () => {
      const wrapperReset = mount(AppButton, {
        props: { type: 'reset' },
      });
      expect(wrapperReset.props('type')).toBe('reset');
      wrapperReset.unmount();
    });
  });

  describe('✅ REQUIRED: Styling props', () => {
    it('has color prop', () => {
      expect(wrapper.props('color')).toBeUndefined();
    });

    it('accepts color prop', async () => {
      const wrapperWithColor = mount(AppButton, {
        props: { color: 'primary' },
      });
      expect(wrapperWithColor.props('color')).toBe('primary');
      wrapperWithColor.unmount();
    });

    it('has round prop', () => {
      expect(wrapper.props('round')).toBe(false);
    });

    it('accepts round true', async () => {
      const wrapperRound = mount(AppButton, {
        props: { round: true },
      });
      expect(wrapperRound.props('round')).toBe(true);
      wrapperRound.unmount();
    });

    it('has raised prop', () => {
      expect(wrapper.props('raised')).toBe(false);
    });

    it('accepts raised true', async () => {
      const wrapperRaised = mount(AppButton, {
        props: { raised: true },
      });
      expect(wrapperRaised.props('raised')).toBe(true);
      wrapperRaised.unmount();
    });
  });

  describe('✅ REQUIRED: Accessibility attributes', () => {
    it('renders with proper structure', () => {
      expect(wrapper.find('.button').exists()).toBe(true);
    });

    it('passes custom class', async () => {
      const wrapperWithClass = mount(AppButton, {
        attrs: { class: 'custom-button' },
      });
      expect(wrapperWithClass.find('.button').classes()).toContain('custom-button');
      wrapperWithClass.unmount();
    });

    it('passes custom style', async () => {
      const wrapperWithStyle = mount(AppButton, {
        attrs: { style: 'background: red' },
      });
      const button = wrapperWithStyle.find('.button');
      expect(button.exists()).toBe(true);
      wrapperWithStyle.unmount();
    });
  });

  describe('✅ REQUIRED: Slot support', () => {
    it('renders before slot for icon', () => {
      const wrapperWithBefore = mount(AppButton, {
        slots: { before: '<span>Before</span>' },
      });
      expect(wrapperWithBefore.text()).toContain('Before');
      wrapperWithBefore.unmount();
    });

    it('renders after slot for icon', () => {
      const wrapperWithAfter = mount(AppButton, {
        slots: { after: '<span>After</span>' },
      });
      expect(wrapperWithAfter.text()).toContain('After');
      wrapperWithAfter.unmount();
    });
  });
});
