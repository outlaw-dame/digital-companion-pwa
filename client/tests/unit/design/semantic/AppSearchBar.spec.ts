/**
 * AppSearchBar Unit Tests
 * Tests verify all Phase 11 Section 6 requirements for search inputs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppSearchBar from '@/design/semantic/AppSearchBar.vue';

vi.mock('framework7-vue', () => ({
  Searchbar: {
    template: '<input type="text" v-bind="$attrs" @input="$emit(\'update:value\', $event.target.value)" />',
  },
}));

describe('AppSearchBar - Phase 11 Section 6: Keyboard/Input Tests', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppSearchBar);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('✅ REQUIRED: Search input attributes (Section 6)', () => {
    it('has type="search"', () => {
      expect(wrapper.find('input').attributes('type')).toBe('search');
    });

    it('has inputmode="search"', () => {
      expect(wrapper.find('input').attributes('inputmode')).toBe('search');
    });

    it('has enterkeyhint="search"', () => {
      expect(wrapper.find('input').attributes('enterkeyhint')).toBe('search');
    });

    it('has autocapitalize="none"', () => {
      expect(wrapper.find('input').attributes('autocapitalize')).toBe('none');
    });

    it('has spellcheck="false"', () => {
      expect(wrapper.find('input').attributes('spellcheck')).toBe('false');
    });
  });

  describe('✅ REQUIRED: Accessible label (Section 6)', () => {
    it('has accessible label present', () => {
      expect(wrapper.find('input').attributes('aria-label')).toBeDefined();
    });

    it('has aria-label from placeholder', () => {
      expect(wrapper.find('input').attributes('aria-label')).toBe('Search');
    });
  });

  describe('✅ REQUIRED: Native keyboard behavior (Section 6)', () => {
    it('does not block paste', async () => {
      const input = wrapper.find('input');
      await input.trigger('paste', { clipboardData: { getData: () => 'pasted text' } });
      expect(wrapper.emitted('update:value')).toBeTruthy();
    });

    it('preserves emoji/unicode content', async () => {
      const input = wrapper.find('input');
      await input.setValue('Hello 👋 🌍');
      expect(wrapper.vm.internalValue).toBe('Hello 👋 🌍');
    });
  });

  describe('Value Binding', () => {
    it('emits update:value on input', async () => {
      const input = wrapper.find('input');
      await input.setValue('test query');
      expect(wrapper.emitted('update:value')).toBeTruthy();
      expect(wrapper.emitted('update:value')?.[0]).toEqual(['test query']);
    });

    it('handles external value changes', async () => {
      const wrapperWithValue = mount(AppSearchBar, {
        props: { value: 'initial' },
      });
      expect(wrapperWithValue.vm.internalValue).toBe('initial');
      await wrapperWithValue.setProps({ value: 'updated' });
      expect(wrapperWithValue.vm.internalValue).toBe('updated');
      wrapperWithValue.unmount();
    });
  });

  describe('Search Submission', () => {
    it('emits search on form submit', async () => {
      const input = wrapper.find('input');
      await input.setValue('search term');
      await wrapper.find('form').trigger('submit.prevent');
      expect(wrapper.emitted('search')).toBeTruthy();
      expect(wrapper.emitted('search')?.[0]).toEqual(['search term']);
    });

    it('emits search on Enter key', async () => {
      const input = wrapper.find('input');
      await input.setValue('search term');
      await input.trigger('keydown', { key: 'Enter', preventDefault: vi.fn() });
      expect(wrapper.emitted('search')).toBeTruthy();
    });

    it('emits clear event', async () => {
      const wrapperWithClear = mount(AppSearchBar, {
        props: { value: 'test', clear: true },
      });
      await wrapperWithClear.vm.handleClear();
      expect(wrapperWithClear.emitted('clear')).toBeTruthy();
      wrapperWithClear.unmount();
    });
  });

  describe('Props', () => {
    it('respects disabled prop', () => {
      const disabledWrapper = mount(AppSearchBar, {
        props: { disabled: true },
      });
      expect(disabledWrapper.find('input').attributes('disabled')).toBe('');
      disabledWrapper.unmount();
    });

    it('respects readonly prop', () => {
      const readonlyWrapper = mount(AppSearchBar, {
        props: { readonly: true },
      });
      expect(readonlyWrapper.find('input').attributes('readonly')).toBe('');
      readonlyWrapper.unmount();
    });

    it('respects custom placeholder', () => {
      const customWrapper = mount(AppSearchBar, {
        props: { placeholder: 'Custom placeholder' },
      });
      expect(customWrapper.find('input').attributes('placeholder')).toBe('Custom placeholder');
      customWrapper.unmount();
    });

    it('respects debounce prop', () => {
      const debouncedWrapper = mount(AppSearchBar, {
        props: { debounce: 500 },
      });
      expect(debouncedWrapper.vm.debounce).toBe(500);
      debouncedWrapper.unmount();
    });
  });

  describe('Focus/Blur Events', () => {
    it('emits focus event', async () => {
      const input = wrapper.find('input');
      await input.trigger('focus');
      expect(wrapper.emitted('focus')).toBeTruthy();
    });

    it('emits blur event', async () => {
      const input = wrapper.find('input');
      await input.trigger('blur');
      expect(wrapper.emitted('blur')).toBeTruthy();
    });

    it('emits keydown event', async () => {
      const input = wrapper.find('input');
      await input.trigger('keydown', { key: 'a' });
      expect(wrapper.emitted('keydown')).toBeTruthy();
    });
  });
});
