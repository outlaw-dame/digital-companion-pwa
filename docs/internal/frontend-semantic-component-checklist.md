# Frontend Semantic Component Checklist

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-06-10  
**Related:** [Frontend Architecture Contract](./frontend-architecture-contract.md)

---

## Overview

This document provides a comprehensive checklist for all semantic components in the `design/semantic/` directory. Each semantic primitive must be used instead of raw Framework7 components or custom implementations.

**Rule:** All shell, list, search, form, sheet, dialog, tabbar, toolbar, action menu, and composer UI **MUST** use these semantic components.

---

## Component Catalog

### Shell Components

#### AppRoot

| Aspect | Details |
|--------|---------|
| **Purpose** | Root application container that provides Framework7 context and global styling |
| **Allowed Props** | `theme` (light/dark/auto), `class`, `style` |
| **Platform Behavior** | Consistent across iOS, Android, PWA. Handles theme synchronization with system preferences. |
| **Accessibility** | Sets `role="application"` on root, ensures focus management |
| **Testing Expectations** | Renders children, applies theme correctly, handles theme toggling |
| **Known Limitations** | Theme changes may cause brief flash on some Android devices |
| **Replaces** | Raw `<App>` from Framework7 |

**Do:**
- Use as the single root component in `main.ts`
- Pass theme prop to enable system theme detection
- Wrap entire application content

**Don't:**
- Create multiple AppRoot instances
- Use raw Framework7 `<App>` component
- Add custom styling directly to AppRoot

---

#### AppPage

| Aspect | Details |
|--------|---------|
| **Purpose** | Page-level container for each route/view |
| **Allowed Props** | `name` (optional, for Framework7 navigation), `class`, `style`, `ptr` (pull-to-refresh enabled), `infinite` (infinite scroll enabled) |
| **Platform Behavior** | Native-like page transitions on iOS/Android. PWA uses CSS transitions. |
| **Accessibility** | Sets `role="main"` when appropriate, manages focus on page change |
| **Testing Expectations** | Renders content, handles pull-to-refresh, manages scroll state |
| **Known Limitations** | Pull-to-refresh not supported on all desktop browsers |
| **Replaces** | Raw `<Page>` from Framework7 |

**Do:**
- Use as wrapper for each route view component
- Use `name` prop for Framework7 navigation integration
- Enable `ptr` for pull-to-refresh capable pages

**Don't:**
- Nest AppPage within AppPage
- Use raw Framework7 `<Page>` component
- Create custom page containers

---

#### AppNavbar

| Aspect | Details |
|--------|---------|
| **Purpose** | Navigation bar for pages with title, back button, and actions |
| **Allowed Props** | `title`, `backLink` (string or object), `sliding` (boolean), `hidden` (boolean), `large` (boolean), `transparent` (boolean) |
| **Platform Behavior** | iOS: Large title on scroll, blur effect. Android: Material-style elevation. PWA: Adaptive based on viewport. |
| **Accessibility** | Back button has `aria-label`, title has proper heading level, focus trap for actions |
| **Testing Expectations** | Renders title, back button works, actions are accessible, responds to scroll |
| **Known Limitations** | Large title transition may be janky on low-end Android devices |
| **Replaces** | Raw `<Navbar>` from Framework7 |

**Do:**
- Use for all page navigation bars
- Provide `backLink` for navigable pages
- Use `sliding` prop for pages that slide in/out

**Don't:**
- Use raw Framework7 `<Navbar>`
- Create custom header components
- Add interactive elements outside AppNavbar actions slot

---

#### AppTabBar

| Aspect | Details |
|--------|---------|
| **Purpose** | Bottom tab bar navigation for primary app sections |
| **Allowed Props** | `labels` (boolean, show/hide labels), `icons` (boolean, show/hide icons), `scrollable` (boolean), `position` ('bottom'/'top') |
| **Platform Behavior** | iOS: Icons only default, labels on selection. Android: Icons + labels. PWA: Adaptive. |
| **Accessibility** | Each tab has accessible label, keyboard navigable, focus visible |
| **Testing Expectations** | Renders all tabs, selection works, keyboard navigation works, responds to platform |
| **Known Limitations** | Maximum 5 tabs recommended for usability |
| **Replaces** | Raw `<Toolbar tabbar>` from Framework7 |

**Do:**
- Use for main app navigation
- Provide both icon and label for each tab
- Use platform-appropriate tab count (max 5)

**Don't:**
- Use raw Framework7 tabbar
- Create more than 5 tabs
- Use icons only without labels (accessibility issue)

---

#### AppToolbar

| Aspect | Details |
|--------|---------|
| **Purpose** | Toolbar for actions, typically at bottom of page |
| **Allowed Props** | `position` ('bottom'/'top'), `tabbar` (boolean), `labels` (boolean), `scrollable` (boolean) |
| **Platform Behavior** | Same as AppTabBar when `tabbar=true`. Otherwise, inline action toolbar. |
| **Accessibility** | Actions are keyboard accessible, proper ARIA roles |
| **Testing Expectations** | Renders actions, keyboard navigation works, responds to platform |
| **Known Limitations** | Bottom toolbars may be hidden by virtual keyboard on mobile |
| **Replaces** | Raw `<Toolbar>` from Framework7 |

**Do:**
- Use for action toolbars
- Group related actions together
- Use AppTabBar for navigation, AppToolbar for actions

**Don't:**
- Use raw Framework7 `<Toolbar>`
- Mix navigation and actions in same toolbar

---

### List Components

#### AppList

| Aspect | Details |
|--------|---------|
| **Purpose** | Container for list items with consistent styling |
| **Allowed Props** | `dividers` (boolean, show dividers), `inset` (boolean, inset list), ` mediaList` (boolean, media list style), `simpleList` (boolean, simple style) |
| **Platform Behavior** | iOS: Full-width dividers. Android: Inset dividers. PWA: Adaptive. |
| **Accessibility** | Sets `role="list"`, manages focus for list items |
| **Testing Expectations** | Renders children, applies correct divider style, keyboard navigable |
| **Known Limitations** | Very long lists should use AppVirtualList instead |
| **Replaces** | Raw `<List>` from Framework7 |

**Do:**
- Use for all list containers
- Choose appropriate style for content
- Use with AppListItem children

**Don't:**
- Use raw Framework7 `<List>`
- Use dividers on media lists (platform convention)
- Create custom list containers

---

#### AppListItem

| Aspect | Details |
|--------|---------|
| **Purpose** | Individual list item with consistent styling and behavior |
| **Allowed Props** | `title`, `subtitle`, `text`, `after`, `before`, `media`, `mediaItem` (for AppMediaViewer), `link` (boolean, makes it a link), `chevron` (boolean, shows chevron), `divider` (boolean, shows divider), `group` (string, group title for grouped lists) |
| **Platform Behavior** | iOS: Chevron on right. Android: Chevron on right with ripple. PWA: Adaptive. |
| **Accessibility** | Proper ARIA attributes, keyboard accessible, focus visible |
| **Testing Expectations** | Renders all slots, link behavior works, keyboard navigation works |
| **Known Limitations** | Complex media layouts may need custom styling |
| **Replaces** | Raw `<ListItem>` from Framework7 |

**Do:**
- Use for all list items
- Use appropriate props for content type
- Use `link` prop for navigable items

**Don't:**
- Use raw Framework7 `<ListItem>`
- Use custom div/li elements for list items
- Forget accessible labels for icon-only items

---

#### AppGroupedList

| Aspect | Details |
|--------|---------|
| **Purpose** | List with section headers for grouped content |
| **Allowed Props** | Same as AppList, plus `groups` (array of group definitions) |
| **Platform Behavior** | Consistent across platforms with platform-specific styling |
| **Accessibility** | Group headers have proper heading level, proper ARIA grouping |
| **Testing Expectations** | Renders groups, items are properly associated with groups |
| **Known Limitations** | Nested groups not supported |
| **Replaces** | Raw grouped lists with Framework7 |

**Do:**
- Use for settings pages, grouped data
- Provide clear group labels
- Keep group count reasonable

**Don't:**
- Create custom grouped list implementations
- Nest AppGroupedList within AppGroupedList

---

### Form Components

#### AppSearchBar

| Aspect | Details |
|--------|---------|
| **Purpose** | Search input field with native-like behavior |
| **Allowed Props** | `placeholder`, `value` (v-model), `disabled`, `readonly`, `clear` (boolean, show clear button), `customSearch` (boolean, use custom search handler) |
| **Platform Behavior** | iOS: Native search field styling. Android: Material search. PWA: Native browser search styling. |
| **Accessibility** | `type="search"`, `inputmode="search"`, `enterkeyhint="search"`, `autocapitalize="none"`, `spellcheck="false"`, accessible label |
| **Testing Expectations** | Type works, clear button works, enter triggers search, keyboard hints correct |
| **Known Limitations** | Custom search handlers may not get all native search events |
| **Replaces** | Raw `<Searchbar>` from Framework7 |

**Do:**
- Use for all search inputs
- Provide accessible label
- Handle enter key appropriately
- Use `clear` prop for search field clearing

**Don't:**
- Use raw Framework7 `<Searchbar>`
- Create custom search inputs
- Use `contenteditable` for search
- Suppress native keyboard behavior

---

#### AppSegmentedControl

| Aspect | Details |
|--------|---------|
| **Purpose** | Horizontal segmented control for selecting between options |
| **Allowed Props** | `buttons` (array of button configs: { text, value, active }), `color` (theme color) |
| **Platform Behavior** | iOS: Rounded segments. Android: Material segments. PWA: Adaptive. |
| **Accessibility** | Radio group pattern, keyboard navigable, proper ARIA roles |
| **Testing Expectations** | Selection works, keyboard navigation works, accessibility attributes correct |
| **Known Limitations** | Not suitable for more than 4-5 options |
| **Replaces** | Raw `<Segmented>` from Framework7 |

**Do:**
- Use for filtering, view switching
- Keep option count reasonable
- Provide clear labels for each option

**Don't:**
- Use raw Framework7 `<Segmented>`
- Create more than 5 segments
- Use for primary navigation (use AppTabBar instead)

---

#### AppButton

| Aspect | Details |
|--------|---------|
| **Purpose** | Primary action button with consistent styling |
| **Allowed Props** | `text`, `icon`, `iconPosition` ('left'/'right'), `size` ('small'/'medium'/'large'), `fill` ('solid'/'outline'/'clear'), `color` (theme color), `disabled`, `loading`, `round` (boolean), `raised` (boolean) |
| **Platform Behavior** | iOS: Rounded corners. Android: Material styling. PWA: Adaptive. |
| **Accessibility** | Proper button role, keyboard accessible, focus visible, disabled state announced |
| **Testing Expectations** | Click works, disabled state prevents interaction, loading state shows spinner |
| **Known Limitations** | Custom icons may need sizing adjustments |
| **Replaces** | Raw `<Button>` from Framework7 |

**Do:**
- Use for all primary actions
- Choose appropriate fill and size
- Provide accessible label when using icon-only

**Don't:**
- Use raw Framework7 `<Button>`
- Create custom button implementations
- Use icon-only without accessible label

---

#### AppIcon

| Aspect | Details |
|--------|---------|
| **Purpose** | Icon wrapper that manages icon registry and platform-specific icons |
| **Allowed Props** | `name` (icon name from registry), `size` (number), `color` (string), `class` |
| **Platform Behavior** | Uses platform-specific icon variants when available |
| **Accessibility** | Icon has `aria-hidden="true"` unless it's interactive, proper size for touch targets |
| **Testing Expectations** | Renders correct icon, respects platform variants, handles missing icons gracefully |
| **Known Limitations** | Custom SVG icons need to be added to registry |
| **Replaces** | All direct icon library imports |

**Do:**
- Use for ALL icons in the application
- Use icon names from registry
- Specify platform-specific variants when needed

**Don't:**
- Import Iconoir or any other icon library directly
- Create inline SVG icons
- Use emoji as icons

---

#### AppTextField

| Aspect | Details |
|--------|---------|
| **Purpose** | Single-line text input with consistent styling |
| **Allowed Props** | `type` ('text'/'password'/'email'/'tel'/'url'/'number'), `placeholder`, `value` (v-model), `label`, `disabled`, `readonly`, `clear` (boolean, show clear button), `error` (string, error message), `required` |
| **Platform Behavior** | iOS: Native input styling. Android: Material input. PWA: Adaptive. |
| **Accessibility** | Proper input type, autocomplete attributes, accessible label, error announcement |
| **Testing Expectations** | Input works, clear button works, validation shows, autocomplete works |
| **Known Limitations** | Password visibility toggle not built-in (use AppPasswordField if needed) |
| **Replaces** | Raw `<Input>` from Framework7 |

**Do:**
- Use for all single-line text inputs
- Provide appropriate type and autocomplete
- Use clear button for search-like fields

**Don't:**
- Use raw Framework7 `<Input>`
- Create custom text inputs
- Forget accessible labels

---

#### AppTextArea

| Aspect | Details |
|--------|---------|
| **Purpose** | Multi-line text input with consistent styling |
| **Allowed Props** | `placeholder`, `value` (v-model), `label`, `disabled`, `readonly`, `resize` ('none'/'vertical'/'horizontal'/'both'), `rows`, `maxlength`, `error` (string) |
| **Platform Behavior** | iOS: Native textarea styling. Android: Material textarea. PWA: Adaptive. |
| **Accessibility** | Proper textarea role, accessible label, error announcement, `enterkeyhint="send"` for composers |
| **Testing Expectations** | Input works, resize works, maxlength enforced, accessibility correct |
| **Known Limitations** | Auto-grow not built-in (can be added via composable) |
| **Replaces** | Raw `<Textarea>` from Framework7 |

**Do:**
- Use for multi-line text input
- Use `resize="vertical"` for controlled resizing
- Set appropriate `enterkeyhint` for composer use

**Don't:**
- Use raw Framework7 `<Textarea>`
- Create custom textarea implementations

---

#### AppComposer

| Aspect | Details |
|--------|---------|
| **Purpose** | Message/story composer with input, actions, and send button |
| **Allowed Props** | `placeholder`, `value` (v-model), `disabled`, `sendDisabled` (boolean, controlled by parent), `maxLength`, `showLength` (boolean), `rows` (min rows) |
| **Platform Behavior** | Native-like composer styling, safe area insets respected |
| **Accessibility** | `inputmode="text"`, `enterkeyhint="send"`, `autocapitalize="sentences"`, `spellcheck="true"`, accessible send button |
| **Testing Expectations** | Input works, send button disabled/enabled correctly, paste works, emoji preserved |
| **Known Limitations** | Rich text formatting not built-in |
| **Replaces** | Custom composer implementations |

**Do:**
- Use for all message/story composers
- Handle send state appropriately
- Preserve emoji and unicode

**Don't:**
- Create custom composer implementations
- Block paste or emoji input
- Use `spellcheck="false"`

---

### Overlay Components

#### AppSheet

| Aspect | Details |
|--------|---------|
| **Purpose** | Bottom sheet that can be swiped up/down |
| **Allowed Props** | `open` (v-model), `swipeToClose`, `swipeToStep`, `backdrop`, `closeByBackdropClick`, `closeOnEscape`, `height` (string, e.g., '50%'), `style` |
| **Platform Behavior** | iOS: Native sheet styling with handle. Android: Material modal bottom sheet. PWA: Adaptive. |
| **Accessibility** | Modal pattern, focus trap, keyboard closable, backdrop click closes (configurable) |
| **Testing Expectations** | Opens/closes, swipe works, keyboard closes, backdrop click works |
| **Known Limitations** | Nested sheets not supported |
| **Replaces** | Raw `<Sheet>` from Framework7 |

**Do:**
- Use for bottom sheets
- Provide clear close mechanism
- Respect safe areas

**Don't:**
- Use raw Framework7 `<Sheet>`
- Create nested sheets
- Forget accessible close button

---

#### AppActionSheet

| Aspect | Details |
|--------|---------|
| **Purpose** | Action sheet with list of actions |
| **Allowed Props** | `open` (v-model), `buttons` (array of button configs: { text, icon, color, bold, action }), `cancelText`, `closeOnEscape` |
| **Platform Behavior** | iOS: Native action sheet styling. Android: Material action sheet. PWA: Adaptive. |
| **Accessibility** | Modal pattern, keyboard navigable, focus trap, accessible button labels |
| **Testing Expectations** | Opens/closes, button actions work, keyboard navigation works |
| **Known Limitations** | Maximum 6-8 actions recommended |
| **Replaces** | Raw `<Actions>` from Framework7 |

**Do:**
- Use for action menus
- Group destructive actions separately
- Keep action count reasonable

**Don't:**
- Use raw Framework7 `<Actions>`
- Create more than 8 actions
- Forget to handle action callbacks

---

#### AppDialog

| Aspect | Details |
|--------|---------|
| **Purpose** | Modal dialog for alerts, confirmations, forms |
| **Allowed Props** | `open` (v-model), `title`, `content`, `buttons` (array of button configs), `closeByBackdropClick`, `closeOnEscape`, `size` ('small'/'medium'/'large') |
| **Platform Behavior** | iOS: Native dialog styling. Android: Material dialog. PWA: Adaptive. |
| **Accessibility** | Modal pattern, focus trap, keyboard closable, proper ARIA roles |
| **Testing Expectations** | Opens/closes, button actions work, keyboard navigation works, focus trap works |
| **Known Limitations** | Complex forms may need custom dialog implementation |
| **Replaces** | Raw `<Dialog>` from Framework7 |

**Do:**
- Use for modals, alerts, confirmations
- Provide clear title and actions
- Make closable via escape/backdrop

**Don't:**
- Use raw Framework7 `<Dialog>`
- Create unclosable dialogs
- Forget focus trap

---

#### AppPopover

| Aspect | Details |
|--------|---------|
| **Purpose** | Small overlay panel that points to a target element |
| **Allowed Props** | `open` (v-model), `target` (ref to target element), `position` ('top'/'bottom'/'left'/'right'), `closeByBackdropClick`, `closeOnEscape` |
| **Platform Behavior** | Consistent across platforms with arrow pointing to target |
| **Accessibility** | Focus trap, keyboard closable, accessible close button |
| **Testing Expectations** | Opens/closes, positioning correct, keyboard closes |
| **Known Limitations** | May be clipped by viewport on mobile |
| **Replaces** | Raw `<Popover>` from Framework7 |

**Do:**
- Use for small contextual overlays
- Position appropriately for viewport
- Provide clear close mechanism

**Don't:**
- Use raw Framework7 `<Popover>`
- Use for large content (use AppSheet or AppDialog instead)

---

#### AppToast

| Aspect | Details |
|--------|---------|
| **Purpose** | Brief notification that auto-dismisses |
| **Allowed Props** | `open` (v-model), `text`, `position` ('top'/'center'/'bottom'), `duration` (ms), `closeButton` (boolean), `icon`, `color` |
| **Platform Behavior** | iOS: Bottom toast. Android: Bottom toast. PWA: Adaptive. |
| **Accessibility** | Accessible label, auto-dismiss announced to screen readers |
| **Testing Expectations** | Shows, auto-dismisses, accessible label present |
| **Known Limitations** | Not suitable for important messages (use AppDialog instead) |
| **Replaces** | Raw `<Toast>` from Framework7 |

**Do:**
- Use for brief notifications
- Keep text short
- Use appropriate duration

**Don't:**
- Use raw Framework7 `<Toast>`
- Use for important or action-requiring messages
- Make toast stay indefinitely

---

### Media Components

#### AppMediaViewer

| Aspect | Details |
|--------|---------|
| **Purpose** | Full-screen media viewer for images and videos |
| **Allowed Props** | `open` (v-model), `items` (array of media items: { url, type, caption }), `initialIndex`, `closeOnEscape`, `closeByBackdropClick`, `swipeToClose` |
| **Platform Behavior** | iOS: Native viewer styling. Android: Native viewer styling. PWA: Adaptive. |
| **Accessibility** | Focus trap, keyboard closable, pinch zoom accessible, accessible captions |
| **Testing Expectations** | Opens/closes, navigation between items works, zoom works |
| **Known Limitations** | Video playback may have platform-specific quirks |
| **Replaces** | Raw `<PhotoBrowser>` from Framework7 |

**Do:**
- Use for all media viewing
- Support zoom and navigation
- Handle various media types

**Don't:**
- Use raw Framework7 photo browser
- Create custom media viewers

---

### Scroll Components

#### AppPullToRefresh

| Aspect | Details |
|--------|---------|
| **Purpose** | Pull-to-refresh wrapper for scrollable content |
| **Allowed Props** | `onRefresh` (callback), `done` (function to call when refresh complete), `ptrMouseWheel` (boolean, enable on desktop) |
| **Platform Behavior** | iOS: Native pull-to-refresh. Android: Material pull-to-refresh. PWA: Works on touch and mouse wheel (configurable) |
| **Accessibility** | Announces refresh state to screen readers |
| **Testing Expectations** | Pull triggers refresh, done callback stops spinner, mouse wheel works (when enabled) |
| **Known Limitations** | Some desktop browsers don't support native pull-to-refresh |
| **Replaces** | Raw `<Ptr>` from Framework7 |

**Do:**
- Use for refreshable content
- Call `done()` when refresh complete
- Enable mouse wheel for desktop PWA

**Don't:**
- Use raw Framework7 `<Ptr>`
- Forget to call `done()`

---

#### AppVirtualList

| Aspect | Details |
|--------|---------|
| **Purpose** | Virtualized list for large datasets |
| **Allowed Props** | `items` (array), `itemHeight` (number or function), `renderItem` (function), `virtual` (boolean, enable virtualization), `searchAll` (boolean) |
| **Platform Behavior** | Consistent across platforms with performance optimization |
| **Accessibility** | Proper ARIA roles for virtualized content, keyboard navigation works |
| **Testing Expectations** | Renders only visible items, scroll works, keyboard navigation works |
| **Known Limitations** | Dynamic item heights require `itemHeight` function |
| **Replaces** | Raw `<VirtualList>` from Framework7 |

**Do:**
- Use for lists with 100+ items
- Provide accurate item height
- Test with various item heights

**Don't:**
- Use raw Framework7 `<VirtualList>`
- Use for small lists (< 50 items)

---

## Semantic Component Selection Guide

### When to Use Which Component

| Use Case | Component | Notes |
|----------|-----------|-------|
| App root | AppRoot | Single instance only |
| Route page | AppPage | Wrap each route view |
| Page navigation | AppNavbar | Use with backLink for navigable pages |
| Main navigation | AppTabBar | Max 5 tabs |
| Action toolbar | AppToolbar | Separate from navigation |
| List container | AppList | Use with AppListItem |
| List item | AppListItem | Use within AppList |
| Grouped list | AppGroupedList | Settings, grouped data |
| Search input | AppSearchBar | Native search behavior |
| Segmented control | AppSegmentedControl | 2-5 options |
| Button | AppButton | Primary actions |
| Icon | AppIcon | ALL icons |
| Text input | AppTextField | Single line |
| Text area | AppTextArea | Multi-line |
| Composer | AppComposer | Messages, stories |
| Bottom sheet | AppSheet | Swipeable bottom panel |
| Action sheet | AppActionSheet | Action menu |
| Dialog | AppDialog | Modal |
| Popover | AppPopover | Small overlay |
| Toast | AppToast | Brief notification |
| Media viewer | AppMediaViewer | Full-screen media |
| Pull-to-refresh | AppPullToRefresh | Wrap scrollable content |
| Virtual list | AppVirtualList | Large lists |

---

## New Component Justification Template

If you need to create a custom component that doesn't use a semantic primitive, include this justification in the component file header:

```vue
<!-- 
  Custom component: [Brief explanation of why semantic primitive is insufficient]
  
  Reason: [Detailed explanation]
  
  Semantic alternatives considered:
  - [Component name]: [Why it doesn't work]
  - [Component name]: [Why it doesn't work]
  
  Accessibility notes: [How accessibility is handled]
  Platform behavior: [Any platform-specific considerations]
  
  TODO: [Any follow-up work needed]
-->
```

---

## Checklist for Review

Before merging any UI code, verify:

- [ ] All shell UI uses semantic components
- [ ] All list UI uses semantic components
- [ ] All search UI uses AppSearchBar
- [ ] All form inputs use semantic components
- [ ] All sheets use AppSheet
- [ ] All dialogs use AppDialog
- [ ] All action menus use AppActionSheet
- [ ] All icons use AppIcon
- [ ] No raw Framework7 imports in views/features/components
- [ ] No custom implementations of semantic primitives
- [ ] Custom components have proper justification

---

## Success Criteria

This checklist is successful when:

1. ✅ Future developers can easily find which semantic component to use for any UI need
2. ✅ New custom UI must justify why a semantic primitive is insufficient
3. ✅ All semantic primitives have clear documentation on purpose, props, and behavior
4. ✅ Platform-specific behavior is documented and predictable
5. ✅ Accessibility expectations are clear for each component
6. ✅ Testing expectations are defined for each component
7. ✅ Known limitations are transparently documented

---

**Next:** [Frontend Route Ownership Map](./frontend-route-ownership.md) | [Frontend PR Checklist](./frontend-pr-checklist.md)
