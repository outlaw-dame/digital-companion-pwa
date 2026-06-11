# AppComposer

## Purpose
Rich text input for message/comment composition with native-like behavior. Designed specifically for chat and social media input scenarios.

## Usage

```vue
<AppComposer 
  v-model="message"
  @send="sendMessage"
  placeholder="Type a message..."
/>
```

## Do
- Use for message composition in chat threads
- Use for comment composition
- Use for story/comment replies
- Support emoji and unicode content
- Provide appropriate keyboard hints
- Enable spellcheck for natural language
- Disable send button when empty

## Do Not
- Block paste
- Suppress emoji/unicode
- Forget to disable send when invalid
- Use for single-line inputs (use AppTextField)
- Use for form fields (use AppTextField)
- Add custom styling that breaks native feel

## Accessibility Rules
- Input must have appropriate `inputmode="text"`
- Input must have appropriate `enterkeyhint` based on platform
- Input must have `autocapitalize="sentences"`
- Input must have `spellcheck="true"`
- Send button must be disabled when input is empty
- Send button must have accessible label
- Character counter must be accessible to screen readers

## Platform Behavior
- **iOS**: Uses `enterkeyhint="done"`
- **Android**: Uses `enterkeyhint="send"`
- **Desktop**: Uses platform-appropriate enter key hint
- All platforms: Supports multi-line input with auto-grow
- All platforms: Send button disabled when empty

## Keyboard Behavior
- Enter key in multi-line mode: Adds newline
- Enter key when send is focused: Sends message
- Escape key: May close keyboard on mobile
- Paste: Always allowed
- Emoji picker: Native support where available

## Example

```vue
<!-- Basic usage -->
<AppComposer v-model="message" @send="sendMessage" />

<!-- With custom placeholder -->
<AppComposer 
  v-model="comment"
  placeholder="Add a comment..."
  @send="postComment"
/>

<!-- With character counter -->
<AppComposer 
  v-model="storyText"
  :max-length="500"
  @send="createStory"
/>

<!-- With custom send button -->
<AppComposer v-model="message" send-icon="paper-plane" send-label="Send">
  <template #right-actions>
    <AppButton icon="camera" @click="attachPhoto" />
  </template>
</AppComposer>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | string | `'Type a message...'` | Input placeholder |
| `value` | string | `''` | Current message content |
| `disabled` | boolean | `false` | Disable the composer |
| `maxLength` | number | `5000` | Maximum character limit |
| `rows` | number | `3` | Initial number of rows |
| `showCounter` | boolean | `true` | Show character counter |
| `sendLabel` | string | `'Send'` | Send button text |
| `sendIcon` | string | `'send'` | Send button icon name |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:value` | `string` | Message content changed |
| `send` | `string` | Send button clicked with message |
| `focus` | - | Composer focused |
| `blur` | - | Composer blurred |

## Test Expectations
- Must render with `inputmode="text"`
- Must render with `enterkeyhint` based on platform (done/send)
- Must render with `autocapitalize="sentences"`
- Must render with `spellcheck="true"`
- Send button must be disabled when value is empty
- Send button must be enabled when value is not empty
- Must emit `send` event when send button clicked
- Must emit `update:value` on input
- Must not block paste
- Must preserve emoji/unicode content
- Character counter must show remaining characters
- Must show warning when approaching limit
- Must handle multi-line input correctly
