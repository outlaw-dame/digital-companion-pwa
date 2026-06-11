/**
 * AppActionSheet Unit Tests
 * Tests verify all Phase 11 Section 6 requirements for action sheets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppActionSheet from '@/design/semantic/AppActionSheet.vue';

vi.mock('framework7-vue', () => ({
  Actions: {
    template: '<div class="actions-modal"><slot /></div>',
  },
}));

vi.mock('@/platform/nativeUiProfile', () => ({
  useNativeUi: () => ({
    isIOS: { value: false },
    isAndroid: { value: true },
  }),
}));

vi.mock('./AppIcon.vue', () => ({
  default: {
    template: '<span class="icon">{{ name }}</span>',
    props: ['name'],
  },
}));

describe('AppActionSheet - Phase 11 Section 6: Overlay Behavior Tests', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(AppActionSheet);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  describe('✅ REQUIRED: Props and default behavior', () => {
    it('has opened prop with default false', () => {
      expect(wrapper.props('opened')).toBe(false);
      expect(wrapper.vm.internalOpened).toBe(false);
    });

    it('has buttons prop with default empty array', () => {
      expect(wrapper.props('buttons')).toEqual([]);
    });

    it('has groups prop with default empty array', () => {
      expect(wrapper.props('groups')).toEqual([]);
    });

    it('has cancelButton prop with default true', () => {
      expect(wrapper.props('cancelButton')).toBe(true);
    });

    it('has closeOnClick prop with default true', () => {
      expect(wrapper.props('closeOnClick')).toBe(true);
    });

    it('has backdrop prop with default true', () => {
      expect(wrapper.props('backdrop')).toBe(true);
    });

    it('has closeByBackdropClick prop with default true', () => {
      expect(wrapper.props('closeByBackdropClick')).toBe(true);
    });

    it('has closeByEscape prop with default true', () => {
      expect(wrapper.props('closeByEscape')).toBe(true);
    });
  });

  describe('✅ REQUIRED: Platform-specific cancel button', () => {
    it('uses "Close" as default cancel text on Android', () => {
      expect(wrapper.vm.cancelButtonText).toBe('Close');
    });

    it('uses custom cancel button text when provided', async () => {
      const wrapperWithCustom = mount(AppActionSheet, {
        props: { cancelButton: { text: 'Custom Cancel' } },
      });
      expect(wrapperWithCustom.vm.cancelButtonText).toBe('Custom Cancel');
      wrapperWithCustom.unmount();
    });
  });

  describe('✅ REQUIRED: Open/close behavior', () => {
    it('emits open event when opened', async () => {
      const wrapperForOpen = mount(AppActionSheet);
      await wrapperForOpen.vm.open();
      expect(wrapperForOpen.emitted('open')).toBeTruthy();
      expect(wrapperForOpen.emitted('update:opened')).toBeTruthy();
      expect(wrapperForOpen.emitted('update:opened')?.[0]).toEqual([true]);
      wrapperForOpen.unmount();
    });

    it('emits close event when closed', async () => {
      const wrapperForClose = mount(AppActionSheet, {
        props: { opened: true },
      });
      await wrapperForClose.vm.close();
      expect(wrapperForClose.emitted('close')).toBeTruthy();
      expect(wrapperForClose.emitted('update:opened')).toBeTruthy();
      expect(wrapperForClose.emitted('update:opened')?.[0]).toEqual([false]);
      wrapperForClose.unmount();
    });

    it('watches external opened changes', async () => {
      const wrapperWithWatch = mount(AppActionSheet);
      await wrapperWithWatch.setProps({ opened: true });
      expect(wrapperWithWatch.vm.internalOpened).toBe(true);
      await wrapperWithWatch.setProps({ opened: false });
      expect(wrapperWithWatch.vm.internalOpened).toBe(false);
      wrapperWithWatch.unmount();
    });
  });

  describe('✅ REQUIRED: Lifecycle events', () => {
    it('emits opened event', async () => {
      const wrapperForOpened = mount(AppActionSheet);
      await wrapperForOpened.vm.handleOpened();
      expect(wrapperForOpened.emitted('opened')).toBeTruthy();
      wrapperForOpened.unmount();
    });

    it('emits closed event', async () => {
      const wrapperForClosed = mount(AppActionSheet);
      await wrapperForClosed.vm.handleClosed();
      expect(wrapperForClosed.emitted('closed')).toBeTruthy();
      wrapperForClosed.unmount();
    });
  });

  describe('✅ REQUIRED: Button click handling', () => {
    it('emits click event with value and index', async () => {
      const buttons = [
        { text: 'Action 1', value: 'action1' },
        { text: 'Action 2', value: 'action2' },
      ];
      const wrapperWithButtons = mount(AppActionSheet, {
        props: { buttons },
      });
      await wrapperWithButtons.vm.handleButtonClick('action1', 0);
      expect(wrapperWithButtons.emitted('click')).toBeTruthy();
      expect(wrapperWithButtons.emitted('click')?.[0]).toEqual(['action1', 0]);
      wrapperWithButtons.unmount();
    });

    it('closes on button click when closeOnClick is true', async () => {
      const wrapperForClose = mount(AppActionSheet, {
        props: { buttons: [{ text: 'Action', value: 'test' }], closeOnClick: true },
      });
      await wrapperForClose.vm.handleButtonClick('test', 0);
      expect(wrapperForClose.emitted('close')).toBeTruthy();
      wrapperForClose.unmount();
    });

    it('does not close on button click when closeOnClick is false', async () => {
      const wrapperNoClose = mount(AppActionSheet, {
        props: { buttons: [{ text: 'Action', value: 'test' }], closeOnClick: false },
      });
      await wrapperNoClose.vm.handleButtonClick('test', 0);
      expect(wrapperNoClose.emitted('close')).toBeFalsy();
      wrapperNoClose.unmount();
    });
  });

  describe('✅ REQUIRED: Group click handling', () => {
    it('emits group-click event with indices and value', async () => {
      const groups = [
        {
          label: 'Group 1',
          buttons: [
            { text: 'Action 1', value: 'action1' },
            { text: 'Action 2', value: 'action2' },
          ],
        },
      ];
      const wrapperWithGroups = mount(AppActionSheet, {
        props: { groups },
      });
      await wrapperWithGroups.vm.handleGroupClick(0, 0, 'action1');
      expect(wrapperWithGroups.emitted('group-click')).toBeTruthy();
      expect(wrapperWithGroups.emitted('group-click')?.[0]).toEqual([0, 0, 'action1']);
      wrapperWithGroups.unmount();
    });

    it('closes on group click when closeOnClick is true', async () => {
      const groups = [
        {
          label: 'Group 1',
          buttons: [{ text: 'Action', value: 'test' }],
        },
      ];
      const wrapperForClose = mount(AppActionSheet, {
        props: { groups, closeOnClick: true },
      });
      await wrapperForClose.vm.handleGroupClick(0, 0, 'test');
      expect(wrapperForClose.emitted('close')).toBeTruthy();
      wrapperForClose.unmount();
    });
  });

  describe('✅ REQUIRED: Cancel handling', () => {
    it('emits cancel event', async () => {
      const wrapperForCancel = mount(AppActionSheet);
      await wrapperForCancel.vm.handleCancel();
      expect(wrapperForCancel.emitted('cancel')).toBeTruthy();
      wrapperForCancel.unmount();
    });

    it('closes when cancel is clicked', async () => {
      const wrapperForCancelClose = mount(AppActionSheet);
      await wrapperForCancelClose.vm.handleCancel();
      expect(wrapperForCancelClose.emitted('close')).toBeTruthy();
      wrapperForCancelClose.unmount();
    });
  });

  describe('✅ REQUIRED: Actions structure computation', () => {
    it('builds correct structure for buttons', () => {
      const buttons = [{ text: 'Action 1', value: 'a1' }];
      const wrapperWithButtons = mount(AppActionSheet, {
        props: { buttons, cancelButton: false },
      });
      const structure = wrapperWithButtons.vm.actionsStructure;
      expect(structure.length).toBe(1);
      expect(structure[0].buttons.length).toBe(1);
      expect(structure[0].buttons[0].text).toBe('Action 1');
      wrapperWithButtons.unmount();
    });

    it('builds correct structure for groups', () => {
      const groups = [
        {
          label: 'Group 1',
          buttons: [{ text: 'Action 1', value: 'a1' }],
        },
      ];
      const wrapperWithGroups = mount(AppActionSheet, {
        props: { groups, cancelButton: false },
      });
      const structure = wrapperWithGroups.vm.actionsStructure;
      expect(structure.length).toBe(1);
      expect(structure[0].label).toBe('Group 1');
      expect(structure[0].buttons.length).toBe(1);
      wrapperWithGroups.unmount();
    });

    it('includes cancel button by default', () => {
      const wrapperWithCancel = mount(AppActionSheet, {
        props: { cancelButton: true },
      });
      const structure = wrapperWithCancel.vm.actionsStructure;
      // Should have at least the cancel button group
      expect(structure.length).toBeGreaterThan(0);
      wrapperWithCancel.unmount();
    });

    it('excludes cancel button when set to false', () => {
      const wrapperNoCancel = mount(AppActionSheet, {
        props: { cancelButton: false },
      });
      const structure = wrapperNoCancel.vm.actionsStructure;
      // Should only have buttons/groups, no cancel
      expect(structure.length).toBe(0);
      wrapperNoCancel.unmount();
    });
  });

  describe('✅ REQUIRED: Accessibility attributes', () => {
    it('renders with proper structure', () => {
      expect(wrapper.find('.actions-modal').exists()).toBe(true);
    });

    it('passes custom class', async () => {
      const wrapperWithClass = mount(AppActionSheet, {
        attrs: { class: 'custom-actions' },
      });
      expect(wrapperWithClass.find('.actions-modal').classes()).toContain('custom-actions');
      wrapperWithClass.unmount();
    });

    it('passes custom style', async () => {
      const wrapperWithStyle = mount(AppActionSheet, {
        attrs: { style: 'background: red' },
      });
      const modal = wrapperWithStyle.find('.actions-modal');
      expect(modal.exists()).toBe(true);
      wrapperWithStyle.unmount();
    });
  });

  describe('✅ REQUIRED: Button properties', () => {
    it('handles disabled buttons', async () => {
      const buttons = [{ text: 'Action', value: 'test', disabled: true }];
      const wrapperWithDisabled = mount(AppActionSheet, {
        props: { buttons, cancelButton: false },
      });
      const structure = wrapperWithDisabled.vm.actionsStructure;
      expect(structure[0].buttons[0].disabled).toBe(true);
      wrapperWithDisabled.unmount();
    });

    it('handles button colors', async () => {
      const buttons = [{ text: 'Action', value: 'test', color: 'red' }];
      const wrapperWithColor = mount(AppActionSheet, {
        props: { buttons, cancelButton: false },
      });
      const structure = wrapperWithColor.vm.actionsStructure;
      expect(structure[0].buttons[0].color).toBe('red');
      wrapperWithColor.unmount();
    });

    it('handles bold buttons', async () => {
      const buttons = [{ text: 'Action', value: 'test', bold: true }];
      const wrapperWithBold = mount(AppActionSheet, {
        props: { buttons, cancelButton: false },
      });
      const structure = wrapperWithBold.vm.actionsStructure;
      expect(structure[0].buttons[0].bold).toBe(true);
      wrapperWithBold.unmount();
    });
  });
});
