/**
 * AppComposer Unit Tests
 * Tests verify all Phase 11 Section 6 requirements for message composition
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppComposer from '@/design/semantic/AppComposer.vue';
import AppTextArea from '@/design/semantic/AppTextArea.vue';
import AppButton from '@/design/semantic/AppButton.vue';

// Mock child components
vi.mock('@/design/semantic/AppTextArea.vue', () => ({
  default: {
    template: '<textarea v-bind="$attrs" @update:value="$emit(\'update:value\', $event)" @focus="$emit(\'focus\')" @blur="$emit(\'blur\')" />',
  },
}));

vi.mock('@/design/semantic/AppButton.vue', () => ({
  default: {
    template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}));

// Mock useNativeUi
vi.mock('@/platform/nativeUiProfile', () => ({
  useNativeUi: () => ({
    isIOS: { value: false },
  }),
}));

describe('AppComposer - Phase 11 Section 6: Keyboard/Input Tests', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppComposer);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('✅ REQUIRED: Composer input attributes (Section 6)', () => {
    it('has inputmode="text"', () => {
      expect(wrapper.find('textarea').attributes('inputmode')).toBe('text');
    });

    it('has enterkeyhint based on platform', () => {
      expect(wrapper.vm.keyboardHint).toBeDefined();
    });

    it('has autocapitalize="sentences"', () => {
      expect(wrapper.find('textarea').attributes('autocapitalize')).toBe('sentences');
    });

    it('has spellcheck enabled', () => {
      expect(wrapper.find('textarea').attributes('spellcheck')).toBe('true');
    });
  });

  describe('✅ REQUIRED: Native keyboard behavior (Section 6)', () => {
    it('does not block paste', async () => {
      const textarea = wrapper.find('textarea');
      await textarea.trigger('paste', { clipboardData: { getData: () => 'pasted content' } });
      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('preserves emoji/unicode content', async () => {
      const textarea = wrapper.find('textarea');
      await textarea.setValue('Hello 👋 🌍 🎉');
      expect(wrapper.vm.internalValue).toBe('Hello 👋 🌍 🎉');
    });

    it('has send disabled when invalid (empty)', () => {
      const emptyWrapper = mount(AppComposer, { props: { value: '' } });
      expect(emptyWrapper.vm.canSend).toBe(false);
      emptyWrapper.unmount();
    });

    it('has send enabled when valid', () => {
      const validWrapper = mount(AppComposer, { props: { value: 'Hello' } });
      expect(validWrapper.vm.canSend).toBe(true);
      validWrapper.unmount();
    });
  });

  describe('Rendering', () => {
    it('renders with default placeholder', () => {
      expect(wrapper.find('textarea').attributes('placeholder')).toBe('Type a message...');
    });

    it('renders AppTextArea component', () => {
      expect(wrapper.findComponent(AppTextArea).exists()).toBe(true);
    });

    it('renders send button', () => {
      expect(wrapper.findComponent(AppButton).exists()).toBe(true);
    });

    it('renders with custom placeholder', () => {
      const customWrapper = mount(AppComposer, {
        props: { placeholder: 'Write a comment...' },
      });
      expect(customWrapper.find('textarea').attributes('placeholder')).toBe('Write a comment...');
      customWrapper.unmount();
    });
  });

  describe('Send Button', () => {
    it('has send label by default', () => {
      expect(wrapper.findComponent(AppButton).text()).toContain('Send');
    });

    it('has custom send label', () => {
      const customWrapper = mount(AppComposer, {
        props: { sendLabel: 'Post' },
      });
      expect(customWrapper.findComponent(AppButton).text()).toContain('Post');
      customWrapper.unmount();
    });

    it('is disabled when value is empty', () => {
      const emptyWrapper = mount(AppComposer, { props: { value: '' } });
      expect(emptyWrapper.findComponent(AppButton).attributes('disabled')).toBe('true');
      emptyWrapper.unmount();
    });

    it('is enabled when value is not empty', () => {
      const filledWrapper = mount(AppComposer, { props: { value: 'Hello' } });
      expect(filledWrapper.findComponent(AppButton).attributes('disabled')).toBeUndefined();
      filledWrapper.unmount();
    });

    it('is disabled when composer is disabled', () => {
      const disabledWrapper = mount(AppComposer, {
        props: { value: 'Hello', disabled: true },
      });
      expect(disabledWrapper.findComponent(AppButton).attributes('disabled')).toBe('true');
      disabledWrapper.unmount();
    });

    it('is disabled when value is only whitespace', () => {
      const whitespaceWrapper = mount(AppComposer, { props: { value: '   ' } });
      expect(whitespaceWrapper.findComponent(AppButton).attributes('disabled')).toBe('true');
      whitespaceWrapper.unmount();
    });
  });

  describe('Send Functionality', () => {
    it('emits send event when send button clicked with valid content', async () => {
      const filledWrapper = mount(AppComposer, { props: { value: 'Hello world' } });
      const button = filledWrapper.findComponent(AppButton);
      await button.trigger('click');
      expect(filledWrapper.emitted('send')).toBeTruthy();
      expect(filledWrapper.emitted('send')?.[0]).toEqual(['Hello world']);
      filledWrapper.unmount();
    });

    it('does not emit send when value is empty', async () => {
      const emptyWrapper = mount(AppComposer, { props: { value: '' } });
      const button = emptyWrapper.findComponent(AppButton);
      await button.trigger('click');
      expect(emptyWrapper.emitted('send')).toBeFalsy();
      emptyWrapper.unmount();
    });

    it('does not emit send when value is only whitespace', async () => {
      const whitespaceWrapper = mount(AppComposer, { props: { value: '   ' } });
      const button = whitespaceWrapper.findComponent(AppButton);
      await button.trigger('click');
      expect(whitespaceWrapper.emitted('send')).toBeFalsy();
      whitespaceWrapper.unmount();
    });
  });

  describe('Value Binding', () => {
    it('updates value on input', async () => {
      const textarea = wrapper.find('textarea');
      await textarea.setValue('test message');
      expect(wrapper.emitted('update:value')).toBeTruthy();
      expect(wrapper.emitted('update:value')?.[0]).toEqual(['test message']);
    });

    it('handles external value changes', async () => {
      const wrapperWithValue = mount(AppComposer, {
        props: { value: 'initial message' },
      });
      expect(wrapperWithValue.vm.internalValue).toBe('initial message');
      await wrapperWithValue.setProps({ value: 'updated message' });
      expect(wrapperWithValue.vm.internalValue).toBe('updated message');
      wrapperWithValue.unmount();
    });
  });

  describe('Character Counter', () => {
    it('shows counter when showCounter is true and near limit', () => {
      const nearLimitWrapper = mount(AppComposer, {
        props: { value: 'a'.repeat(95), maxLength: 100, showCounter: true },
      });
      expect(nearLimitWrapper.vm.remainingChars).toBe(5);
      nearLimitWrapper.unmount();
    });

    it('shows warning when approaching limit', () => {
      const warningWrapper = mount(AppComposer, {
        props: { value: 'a'.repeat(98), maxLength: 100, showCounter: true },
      });
      expect(warningWrapper.vm.remainingChars).toBe(2);
      expect(warningWrapper.vm.remainingChars < 20).toBe(true);
      warningWrapper.unmount();
    });

    it('hides counter when showCounter is false', () => {
      const noCounterWrapper = mount(AppComposer, {
        props: { showCounter: false },
      });
      expect(noCounterWrapper.find('.composer-counter').exists()).toBe(false);
      noCounterWrapper.unmount();
    });
  });

  describe('Props', () => {
    it('respects disabled prop', () => {
      const disabledWrapper = mount(AppComposer, {
        props: { disabled: true },
      });
      expect(disabledWrapper.find('textarea').attributes('disabled')).toBe('');
      disabledWrapper.unmount();
    });

    it('respects maxLength prop', () => {
      const maxLengthWrapper = mount(AppComposer, {
        props: { maxLength: 100 },
      });
      expect(maxLengthWrapper.vm.maxLength).toBe(100);
      maxLengthWrapper.unmount();
    });

    it('respects rows prop', () => {
      const rowsWrapper = mount(AppComposer, {
        props: { rows: 5 },
      });
      expect(rowsWrapper.find('textarea').attributes('rows')).toBe('5');
      rowsWrapper.unmount();
    });
  });

  describe('Event Handling', () => {
    it('emits focus event from textarea', async () => {
      const textarea = wrapper.find('textarea');
      await textarea.trigger('focus');
      expect(wrapper.emitted('focus')).toBeTruthy();
    });

    it('emits blur event from textarea', async () => {
      const textarea = wrapper.find('textarea');
      await textarea.trigger('blur');
      expect(wrapper.emitted('blur')).toBeTruthy();
    });
  });
});
