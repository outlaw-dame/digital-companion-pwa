/**
 * AppListItem Unit Tests
 * Tests for the semantic list item component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppListItem from '@/design/semantic/AppListItem.vue';
import AppIcon from '@/design/semantic/AppIcon.vue';

// Mock Framework7 ListItem component
vi.mock('framework7-vue', () => ({
  ListItem: {
    template: '<li v-bind="$attrs"><slot name="before" /><slot /><slot name="after" /></li>',
  },
}));

// Mock useNativeUi
vi.mock('@/platform/nativeUiProfile', () => ({
  useNativeUi: () => ({
    isIOS: { value: false },
    isAndroid: { value: false },
  }),
}));

// Mock AppIcon
vi.mock('@/design/semantic/AppIcon.vue', () => ({
  default: {
    template: '<span class="app-icon"><slot /></span>',
  },
}));

describe('AppListItem', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppListItem);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('Rendering', () => {
    it('renders with Framework7 ListItem', () => {
      expect(wrapper.find('li').exists()).toBe(true);
    });

    it('renders with title', () => {
      const titleWrapper = mount(AppListItem, {
        props: { title: 'Test Item' },
      });
      expect(titleWrapper.find('.list-item-title').text()).toBe('Test Item');
      titleWrapper.unmount();
    });

    it('renders with subtitle', () => {
      const subtitleWrapper = mount(AppListItem, {
        props: { title: 'Test', subtitle: 'Subtitle' },
      });
      expect(subtitleWrapper.find('.list-item-subtitle').text()).toBe('Subtitle');
      subtitleWrapper.unmount();
    });

    it('renders with text', () => {
      const textWrapper = mount(AppListItem, {
        props: { title: 'Test', text: 'Item text' },
      });
      expect(textWrapper.find('.list-item-text').text()).toBe('Item text');
      textWrapper.unmount();
    });

    it('renders with media', () => {
      const mediaWrapper = mount(AppListItem, {
        props: { media: 'Media content' },
      });
      expect(mediaWrapper.find('li').attributes('media')).toBe('Media content');
      mediaWrapper.unmount();
    });
  });

  describe('Platform Behavior', () => {
    it('respects explicit chevron prop', () => {
      const chevronWrapper = mount(AppListItem, {
        props: { chevron: true },
      });
      expect(chevronWrapper.vm.showChevron).toBe(true);
      chevronWrapper.unmount();
    });

    it('hides chevron when explicitly false', () => {
      const noChevronWrapper = mount(AppListItem, {
        props: { chevron: false, link: true },
      });
      expect(noChevronWrapper.vm.showChevron).toBe(false);
      noChevronWrapper.unmount();
    });

    it('shows chevron for links on iOS', () => {
      vi.doMock('@/platform/nativeUiProfile', () => ({
        useNativeUi: () => ({
          isIOS: { value: true },
          isAndroid: { value: false },
        }),
      }));
      
      const iosWrapper = mount(AppListItem, {
        props: { link: true },
      });
      expect(iosWrapper.vm.showChevron).toBe(true);
      iosWrapper.unmount();
    });
  });

  describe('Accessibility', () => {
    it('has list-item-disabled class when disabled', () => {
      const disabledWrapper = mount(AppListItem, {
        props: { disabled: true },
      });
      expect(disabledWrapper.find('li').classes()).toContain('list-item-disabled');
      disabledWrapper.unmount();
    });

    it('passes disabled state to Framework7 ListItem', () => {
      const disabledWrapper = mount(AppListItem, {
        props: { disabled: true },
      });
      expect(disabledWrapper.find('li').attributes('disabled')).toBe('');
      disabledWrapper.unmount();
    });
  });

  describe('Selection State', () => {
    it('passes selected state to Framework7 ListItem', () => {
      const selectedWrapper = mount(AppListItem, {
        props: { selected: true },
      });
      expect(selectedWrapper.find('li').attributes('selected')).toBe('');
      selectedWrapper.unmount();
    });
  });

  describe('Form Integration', () => {
    it('renders as checkbox', () => {
      const checkboxWrapper = mount(AppListItem, {
        props: { checkbox: true },
      });
      expect(checkboxWrapper.find('li').attributes('checkbox')).toBe('');
      checkboxWrapper.unmount();
    });

    it('renders as radio button', () => {
      const radioWrapper = mount(AppListItem, {
        props: { radio: true, radioName: 'group' },
      });
      expect(radioWrapper.find('li').attributes('radio')).toBe('');
      expect(radioWrapper.find('li').attributes('radio-name')).toBe('group');
      radioWrapper.unmount();
    });

    it('renders as checked', () => {
      const checkedWrapper = mount(AppListItem, {
        props: { checkbox: true, checked: true },
      });
      expect(checkedWrapper.find('li').attributes('checked')).toBe('');
      checkedWrapper.unmount();
    });
  });

  describe('Grouping', () => {
    it('renders as group title', () => {
      const groupTitleWrapper = mount(AppListItem, {
        props: { groupTitle: true, title: 'Group Title' },
      });
      expect(groupTitleWrapper.find('li').attributes('group-title')).toBe('');
      groupTitleWrapper.unmount();
    });

    it('renders with divider', () => {
      const dividerWrapper = mount(AppListItem, {
        props: { divider: true },
      });
      expect(dividerWrapper.find('li').attributes('divider')).toBe('');
      dividerWrapper.unmount();
    });
  });

  describe('Event Handling', () => {
    it('emits click event', async () => {
      const li = wrapper.find('li');
      await li.trigger('click');
      expect(wrapper.emitted('click')).toBeTruthy();
    });

    it('does not emit click when disabled', async () => {
      const disabledWrapper = mount(AppListItem, {
        props: { disabled: true },
      });
      const li = disabledWrapper.find('li');
      await li.trigger('click');
      expect(disabledWrapper.emitted('click')).toBeFalsy();
      disabledWrapper.unmount();
    });

    it('emits change event for checkbox/radio', async () => {
      const checkboxWrapper = mount(AppListItem, {
        props: { checkbox: true },
      });
      const li = checkboxWrapper.find('li');
      await li.trigger('change');
      expect(checkboxWrapper.emitted('change')).toBeTruthy();
      checkboxWrapper.unmount();
    });
  });

  describe('Slots', () => {
    it('renders before slot with custom content', () => {
      const wrapperWithBefore = mount(AppListItem, {
        slots: {
          before: '<span class="before-slot">Before</span>',
        },
      });
      expect(wrapperWithBefore.find('.before-slot').text()).toBe('Before');
      wrapperWithBefore.unmount();
    });

    it('renders after slot with custom content', () => {
      const wrapperWithAfter = mount(AppListItem, {
        slots: {
          after: '<span class="after-slot">After</span>',
        },
      });
      expect(wrapperWithAfter.find('.after-slot').text()).toBe('After');
      wrapperWithAfter.unmount();
    });

    it('renders default slot with custom content', () => {
      const wrapperWithDefault = mount(AppListItem, {
        slots: {
          default: '<div class="default-slot">Default</div>',
        },
      });
      expect(wrapperWithDefault.find('.default-slot').text()).toBe('Default');
      wrapperWithDefault.unmount();
    });
  });
});
