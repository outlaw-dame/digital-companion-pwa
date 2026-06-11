# AppActionSheet

## Purpose
Action sheet modal for presenting contextual actions. Provides platform-appropriate styling and behavior, with automatic cancel buttons on iOS.

## Usage

```vue
<AppActionSheet 
  :buttons="actions"
  @click="handleAction"
/>
```

## Do
- Use for contextual actions (e.g., message actions, post options)
- Provide clear, action-oriented button labels
- Group related actions together
- Always provide a cancel button on iOS
- Use icons for better discoverability

## Do Not
- Use raw Framework7 `<Actions>`
- Create custom action sheet implementations
- Forget cancel buttons on iOS
- Use for more than 5-6 actions
- Mix destructive and non-destructive actions without separation

## Accessibility Rules
- Each button must have a clear, descriptive label
- Buttons must be focusable
- Cancel button must be clearly identified
- Actions must be announced to screen readers
- Keyboard navigation must work (Tab, Escape)

## Platform Behavior
- **iOS**: 
  - Cancel button appears at bottom with gray color
  - Actions slide up from bottom
  - Max 5-6 actions recommended
  - Cancel button text: "Cancel"
- **Android/Material**:
  - Cancel button appears as part of actions
  - Actions appear in a modal
  - Cancel button text: "Close"
- **PWA**: Uses platform-appropriate styling

## Action Ordering
1. Primary/destructive actions at top (red color)
2. Secondary actions in middle
3. Cancel at bottom (iOS only, automatic)

## Example

```vue
<!-- Basic action sheet -->
<AppActionSheet 
  :buttons="[
    { text: 'Delete', color: 'red', value: 'delete' },
    { text: 'Edit', value: 'edit' },
    { text: 'Share', value: 'share' },
  ]"
  @click="handleAction"
/>

<!-- With grouped actions -->
<AppActionSheet 
  :groups="[
    {
      label: 'Post Actions',
      buttons: [
        { text: 'Save', icon: 'bookmark', value: 'save' },
        { text: 'Hide', icon: 'eye-off', value: 'hide' },
      ]
    },
    {
      label: 'Report',
      buttons: [
        { text: 'Report Content', icon: 'flag', color: 'orange', value: 'report' },
        { text: 'Block User', icon: 'user-ban', color: 'red', value: 'block' },
      ]
    }
  ]"
  @group-click="handleGroupAction"
/>

<!-- With custom cancel button -->
<AppActionSheet 
  :buttons="actions"
  :cancel-button="{ text: 'Done', color: 'blue', bold: true }"
  @click="handleAction"
  @cancel="closeSheet"
/>
```

## Props

### Buttons
Array of button definitions:
```typescript
{
  text: string;           // Button label
  icon?: string;          // Icon name
  color?: string;         // Color: 'red', 'green', 'blue', etc.
  bold?: boolean;         // Bold text
  disabled?: boolean;     // Disabled state
  value?: any;           // Value to emit on click
}
```

### Groups
Array of grouped action definitions:
```typescript
{
  label?: string;         // Group label
  buttons: Array<Button>; // Buttons in this group
}
```

### Cancel Button
```typescript
boolean | {
  text?: string;
  color?: string;
  bold?: boolean;
}
```

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | - | Action sheet opened |
| `opened` | - | Action sheet open animation complete |
| `close` | - | Action sheet closing |
| `closed` | - | Action sheet closed |
| `click` | `(value, index)` | Button clicked |
| `group-click` | `(groupIndex, buttonIndex, value)` | Grouped button clicked |
| `cancel` | - | Cancel button clicked |

## Test Expectations
- Must render with platform-appropriate styling
- Must show cancel button on iOS
- Must emit `click` event with value when button clicked
- Must emit `cancel` event when cancel clicked
- Must close when button is clicked (if `closeOnClick` is true)
- Must close when backdrop clicked (if `closeByBackdropClick` is true)
- Must close when Escape key pressed (if `closeByEscape` is true)
- Must disable buttons that have `disabled: true`
- Must show icons for buttons with icon prop
- Must apply color to buttons with color prop
- Must group buttons by group label
