# Semantic Components

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-06-10  
**Related:** [Frontend Architecture Contract](../../../docs/internal/frontend-architecture-contract.md)

---

## Overview

This directory contains **semantic components** - native UI primitives backed by Framework7. These are the only components that may import Framework7 directly.

**Rule:** All shell, list, search, form, sheet, dialog, tabbar, toolbar, action menu, and composer UI **MUST** use these semantic components instead of raw Framework7.

---

## Component Catalog

### Shell Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `AppRoot.vue` | Root app container | [View Component](AppRoot.vue) |
| `AppPage.vue` | Page container | [View Component](AppPage.vue) |
| `AppNavbar.vue` | Navigation bar | [View Component](AppNavbar.vue) |
| `AppTabBar.vue` | Tab bar | [View Component](AppTabBar.vue) |
| `AppToolbar.vue` | Toolbar | Planned |

### List Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `AppList.vue` | List container | Planned |
| `AppListItem.vue` | List item | Planned |
| `AppGroupedList.vue` | Grouped list | Planned |

### Form Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `AppSearchBar.vue` | Search field | [View Documentation](AppSearchBar.md) |
| `AppSegmentedControl.vue` | Segmented control | Planned |
| `AppButton.vue` | Button | Planned |
| `AppIcon.vue` | Icon wrapper | [View Component](AppIcon.vue) |
| `AppTextField.vue` | Text field | Planned |
| `AppTextArea.vue` | Text area | Planned |
| `AppComposer.vue` | Composer | [View Documentation](AppComposer.md) |

### Overlay Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `AppSheet.vue` | Bottom sheet | Planned |
| `AppActionSheet.vue` | Action sheet | [View Documentation](AppActionSheet.md) |
| `AppDialog.vue` | Dialog | Planned |
| `AppPopover.vue` | Popover | Planned |
| `AppToast.vue` | Toast | Planned |

### Media Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `AppMediaViewer.vue` | Media viewer | [View Documentation](AppMediaViewer.md) |

### Scroll Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `AppPullToRefresh.vue` | Pull-to-refresh | Planned |
| `AppVirtualList.vue` | Virtual list | Planned |

---

## Usage Rules

### Do ✅

1. **Use semantic components for all UI**
   - Use `AppPage` for route views
   - Use `AppNavbar` for navigation bars
   - Use `AppList` and `AppListItem` for lists
   - Use `AppButton` for buttons
   - Use `AppIcon` for ALL icons

2. **Pass appropriate props**
   - Each component has documented allowed props
   - Use the props that match your use case

3. **Use slots for custom content**
   - Most components support slots for customization
   - Check component documentation for available slots

4. **Respect platform behavior**
   - Components handle platform differences internally
   - No need for platform-specific code in views/features

### Don't ❌

1. **Import Framework7 directly**
   - Only `design/semantic/` can import Framework7
   - Use semantic components instead

2. **Create custom implementations**
   - Don't create custom page containers
   - Don't create custom navbars
   - Don't create custom lists

3. **Ignore accessibility**
   - Components have accessibility built-in
   - Don't override ARIA attributes unless necessary

4. **Use raw icon libraries**
   - Always use `AppIcon` for icons
   - Never import Iconoir directly

---

## Component Documentation

### AppRoot

**Purpose:** Root application container that provides Framework7 context and global styling

**Usage:**
```vue
<template>
  <AppRoot theme="auto">
    <AppPage>
      <!-- Your app content -->
    </AppPage>
  </AppRoot>
</template>
```

**Props:**
- `theme` - 'light' | 'dark' | 'auto' (default: 'auto')

**Accessibility:**
- Sets `role="application"` on root
- Ensures focus management

---

### AppPage

**Purpose:** Page-level container for each route/view

**Usage:**
```vue
<template>
  <AppPage name="home" :ptr="true">
    <!-- Page content -->
  </AppPage>
</template>
```

**Props:**
- `name` - Optional name for Framework7 navigation
- `ptr` - Enable pull-to-refresh (default: false)
- `infinite` - Enable infinite scroll (default: false)
- `ptrMouseWheel` - Enable mouse wheel for PWA (default: false)

**Accessibility:**
- Sets `role="main"` when appropriate
- Manages focus on page change

**Testing:**
- Renders content
- Applies correct theme
- Handles pull-to-refresh
- Manages scroll state

---

### AppNavbar

**Purpose:** Navigation bar for pages with title, back button, and actions

**Usage:**
```vue
<template>
  <AppNavbar title="Home" back-link="Back">
    <template #right>
      <AppButton icon="settings" />
    </template>
  </AppNavbar>
</template>
```

**Props:**
- `title` - Page title
- `backLink` - Back link text or true for default
- `sliding` - Enable sliding animation (default: false)
- `hidden` - Hide navbar (default: false)
- `large` - Use large title style (default: false)
- `transparent` - Transparent background (default: false)

**Slots:**
- `left` - Left-side content
- `title` - Custom title content
- `right` - Right-side actions

**Accessibility:**
- Back button has `aria-label`
- Title has proper heading level
- Focus trap for actions

---

### AppTabBar

**Purpose:** Bottom tab bar navigation for primary app sections

**Usage:**
```vue
<template>
  <AppTabBar :tabs="tabs" />
</template>

<script setup>
const tabs = [
  { path: '/', icon: 'home', label: 'Home', active: true },
  { path: '/explore', icon: 'explore', label: 'Explore' },
  { path: '/messages', icon: 'messages', label: 'Messages' },
  { path: '/profile', icon: 'profile', label: 'Profile' },
];
</script>
```

**Props:**
- `tabs` - Array of tab definitions
- `labels` - Show/hide labels (default: true)
- `icons` - Show/hide icons (default: true)
- `scrollable` - Enable scrollable tabs (default: false)
- `position` - 'bottom' | 'top' (default: 'bottom')

**Tab Definition:**
- `path` - Route path
- `icon` - Icon name (from icon registry)
- `label` - Tab label
- `badge` - Optional badge text/number
- `active` - Is this tab active?

**Accessibility:**
- Each tab has accessible label
- Keyboard navigable
- Focus visible

**Limitations:**
- Maximum 5 tabs recommended
- Nested tabs not supported

---

### AppIcon

**Purpose:** Icon wrapper that manages icon registry and platform-specific icons

**Usage:**
```vue
<template>
  <AppIcon name="home" />
  <AppIcon name="search" size="24" color="#ff0000" />
  <AppIcon name="back" platform="ios" />
</template>
```

**Props:**
- `name` - Icon name from registry (required)
- `size` - Icon size in pixels or CSS size
- `color` - Icon color
- `class` - Additional CSS classes
- `platform` - Platform override ('ios' | 'android' | 'pwa' | 'auto')

**Accessibility:**
- `aria-hidden="true"` by default
- Icon has appropriate touch target size

**Icon Registry:**
- All icons must be registered in `../icons/iconRegistry.ts`
- Platform-specific variants defined in `../icons/platformIcons.ts`

---

## Adding a New Semantic Component

Before adding a new semantic component, ask:

1. **Is there an existing semantic component that does this?**
2. **Can an existing semantic component be extended?**
3. **Is this a true primitive that will be used across the app?**

If yes to #1 or #2, use/extend the existing component.

If you need to create a new semantic component:

1. **Create the component** in `design/semantic/`
2. **Add documentation** in the component header
3. **Add to this README** in the appropriate section
4. **Add unit tests** in `tests/unit/design/semantic/`
5. **Document props, slots, accessibility**
6. **Document platform behavior**

---

## Testing

All semantic components must have unit tests covering:
- Props validation
- Slots rendering
- Event emission
- Accessibility attributes
- Platform-specific behavior (when applicable)

Run tests:
```bash
bun run test:unit tests/unit/design/semantic/
```

---

## Platform Behavior

Semantic components abstract platform differences:

| Platform | Behavior |
|----------|----------|
| iOS | Native iOS styling and behavior |
| Android | Material Design styling and behavior |
| PWA | Adaptive styling based on platform |

Components automatically:
- Apply platform-specific styling
- Handle platform-specific interactions
- Respect safe areas
- Use platform-appropriate gestures

---

## Accessibility

All semantic components follow WCAG 2.2 AA standards:
- Proper ARIA roles and attributes
- Keyboard accessibility
- Screen reader compatibility
- Focus management
- Color contrast requirements

---

## Success Criteria

This semantic component layer is successful when:

1. ✅ All UI uses semantic components instead of raw Framework7
2. ✅ Platform differences are abstracted
3. ✅ Accessibility is built-in
4. ✅ Components are well-documented
5. ✅ Components are thoroughly tested
6. ✅ Icon usage is centralized through AppIcon

---

**See Also:**
- [Frontend Architecture Contract](../../../docs/internal/frontend-architecture-contract.md)
- [Frontend Semantic Component Checklist](../../../docs/internal/frontend-semantic-component-checklist.md)
