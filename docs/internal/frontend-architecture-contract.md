# Frontend Architecture Contract

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-06-10  
**Owner:** Frontend Architecture Team

---

## Overview

This document defines the architectural contract for the frontend codebase following the Framework7/native migration (Phase 10). Its purpose is to **prevent UI drift** by enforcing strict boundaries between layers, ensuring consistent use of semantic components, and maintaining platform-specific behavior in a controlled manner.

**Core Principle:** *The frontend must feel native on every platform while maintaining a single, maintainable codebase.*

---

## 1. Approved Stack

### UI Framework
- **Framework7-Vue** (v8.x+) - Primary UI framework for native-like components
- **Vue 3** (Composition API) - Reactive framework
- **Pinia** - State management
- **Capacitor** (v6.x+) - Native runtime for iOS/Android

### Build Toolchain
- **Vite** (v5.x+) - Build system
- **TypeScript** (v5.x+) - Type system
- **ESLint** - Linting
- **Playwright** - E2E testing
- **Vitest** - Unit testing
- **@axe-core/playwright** - Accessibility testing

### Styling
- **CSS Custom Properties** - Design tokens
- **Framework7 CSS** - Base styles (used only through semantic wrappers)

### Icon System
- **Iconoir** - Primary icon library (used only through `AppIcon` wrapper)
- **Custom SVG icons** - App-specific icons in design/icons/

### Forbidden
- **Konsta** - BLOCKED. Do not use under any circumstances.
- **Second major mobile UI framework** - Not allowed without explicit approval
- **Heavy animation libraries** - Require explicit approval
- **Raw icon library imports** - Use `AppIcon` only
- **Duplicate gesture libraries** - Not allowed unless justified

---

## 2. Folder Responsibilities

### Directory Structure

```
client/
├── src/
│   ├── views/                    # Route orchestration only
│   │   ├── ExploreView.vue
│   │   ├── MessagesView.vue
│   │   ├── SettingsView.vue
│   │   └── ...
│   │
│   ├── features/                # Product feature UI and local composables
│   │   ├── explore/
│   │   │   ├── ExploreSearch.vue
│   │   │   ├── ExploreResults.vue
│   │   │   ├── useExploreSearch.ts
│   │   │   └── index.ts
│   │   ├── messages/
│   │   │   ├── MessageComposer.vue
│   │   │   ├── MessageList.vue
│   │   │   └── useMessages.ts
│   │   └── ...
│   │
│   ├── components/              # Shared product components
│   │   ├── PostLinkPreview.vue
│   │   ├── PostEmbedCard.vue
│   │   ├── ThreadSummary.vue
│   │   ├── ProfileHeader.vue
│   │   ├── NotificationRow.vue
│   │   ├── SettingsRow.vue
│   │   ├── ExploreRow.vue
│   │   ├── MessageBubble.vue
│   │   └── StoryControls.vue
│   │
│   ├── design/
│   │   ├── semantic/            # Native UI primitives backed by Framework7
│   │   │   ├── AppRoot.vue
│   │   │   ├── AppPage.vue
│   │   │   ├── AppNavbar.vue
│   │   │   ├── AppTabBar.vue
│   │   │   ├── AppToolbar.vue
│   │   │   ├── AppList.vue
│   │   │   ├── AppListItem.vue
│   │   │   ├── AppGroupedList.vue
│   │   │   ├── AppSearchBar.vue
│   │   │   ├── AppSegmentedControl.vue
│   │   │   ├── AppButton.vue
│   │   │   ├── AppIcon.vue
│   │   │   ├── AppSheet.vue
│   │   │   ├── AppActionSheet.vue
│   │   │   ├── AppDialog.vue
│   │   │   ├── AppPopover.vue
│   │   │   ├── AppToast.vue
│   │   │   ├── AppComposer.vue
│   │   │   ├── AppTextField.vue
│   │   │   ├── AppTextArea.vue
│   │   │   ├── AppMediaViewer.vue
│   │   │   ├── AppPullToRefresh.vue
│   │   │   ├── AppVirtualList.vue
│   │   │   └── README.md
│   │   │
│   │   ├── icons/              # Icon registry and platform icon mapping
│   │   │   ├── iconRegistry.ts
│   │   │   ├── platformIcons.ts
│   │   │   └── README.md
│   │   │
│   │   └── tokens/             # Design tokens
│   │       ├── colors.ts
│   │       ├── spacing.ts
│   │       ├── typography.ts
│   │       └── index.ts
│   │
│   ├── platform/               # Capacitor/browser capability wrappers
│   │   ├── nativeUiProfile.ts
│   │   ├── capabilityDetection.ts
│   │   ├── keyboardPolicy.ts
│   │   ├── safeAreaPolicy.ts
│   │   ├── hapticPolicy.ts
│   │   ├── motionPolicy.ts
│   │   ├── platformIcons.ts
│   │   └── index.ts
│   │
│   ├── stores/                 # Pinia state and API-facing orchestration
│   │   ├── useAuthStore.ts
│   │   ├── useMessageStore.ts
│   │   ├── useSettingsStore.ts
│   │   └── api/
│   │       ├── authApi.ts
│   │       ├── messageApi.ts
│   │       └── client.ts
│   │
│   ├── composables/            # Shared composable utilities
│   │   ├── usePlatform.ts
│   │   ├── useNativeUi.ts
│   │   ├── useSafeArea.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── logging.ts          # Centralized logging utility
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── assets/                 # Tokens, global CSS, and app-level style rules
│   │   ├── css/
│   │   │   ├── global.css
│   │   │   └── variables.css
│   │   └── images/
│   │
│   ├── router/
│   │   └── index.ts
│   │
│   ├── App.vue
│   └── main.ts
│
├── tests/
│   ├── unit/
│   │   ├── design/
│   │   │   └── semantic/
│   │   │       ├── AppSearchBar.spec.ts
│   │   │       └── ...
│   │   └── platform/
│   │       ├── nativeUiProfile.spec.ts
│   │       ├── keyboardPolicy.spec.ts
│   │       └── ...
│   │
│   ├── e2e/
│   │   ├── smoke/
│   │   │   ├── auth.spec.ts
│   │   │   ├── tabNavigation.spec.ts
│   │   │   └── ...
│   │   └── accessibility/
│   │       ├── welcome.spec.ts
│   │       ├── signin.spec.ts
│   │       └── ...
│   │
│   └── visual/
│       ├── app-shell.spec.ts
│       ├── settings.spec.ts
│       ├── explore.spec.ts
│       └── ...
│
├── scripts/
│   └── check-frontend-architecture.mjs
│
├── package.json
├── eslint.config.js
├── vite.config.ts
└── tsconfig.json
```

### Responsibility Breakdown

| Directory | Responsibility | Can Import From |
|-----------|---------------|-----------------|
| `views/` | Route orchestration only. Coordinate features, handle route params, manage layout. | features/, design/semantic/, stores/ |
| `features/` | Product feature UI and local feature composables. Contain feature-specific logic. | components/, design/semantic/, stores/, composables/ |
| `components/` | Shared product components. Reusable across features. | design/semantic/, composables/ |
| `design/semantic/` | Native UI primitives backed by Framework7. Only place that imports Framework7 directly. | Framework7, design/tokens/ |
| `design/icons/` | Icon registry and platform icon mapping. Only place that imports Iconoir directly. | @iconoir/core, custom SVGs |
| `design/tokens/` | Design tokens (colors, spacing, typography). Pure data, no logic. | - |
| `platform/` | Capacitor/browser capability wrappers. Abstract platform differences. | @capacitor/* (directly), composables/ |
| `stores/` | Pinia state and API-facing orchestration. Business logic layer. | API/client utilities, other stores |
| `composables/` | Shared composable utilities. Platform-agnostic utilities. | platform/ (sparingly), design/semantic/ |
| `utils/` | Shared utilities. Logging, validation, helpers. | - |
| `assets/` | Static assets. Global CSS, tokens, images. | - |

---

## 3. Allowed Imports by Layer

### Import Direction (Allowed Flow)

```
views/     → features/, design/semantic/, stores/
features/  → components/, design/semantic/, stores/, composables/
components/→ design/semantic/, composables/
design/semantic/ → Framework7, design/tokens/
platform/  → Capacitor/browser APIs
stores/    → API/client utilities
```

### Import Restrictions (Blocked Flow)

The following import patterns **MUST NOT** occur:

#### Raw Framework7
- ❌ `views/` importing `framework7-vue` directly
- ❌ `features/` importing `framework7-vue` directly
- ❌ `components/` importing `framework7-vue` directly
- ✅ `design/semantic/` CAN import `framework7-vue`
- ✅ `design/framework7/` CAN import `framework7-vue`

#### Raw Capacitor
- ❌ `views/` importing `@capacitor/*` directly
- ❌ `features/` importing `@capacitor/*` directly
- ❌ `components/` importing `@capacitor/*` directly
- ❌ `design/` importing `@capacitor/*` directly
- ✅ `platform/` CAN import `@capacitor/*`
- ⚠️ `composables/` CAN import from `platform/` (during migration only, then reduce)

#### Raw Iconoir
- ❌ `views/` importing `@iconoir/core` or `@iconoir/vue` directly
- ❌ `features/` importing `@iconoir/core` or `@iconoir/vue` directly
- ❌ `components/` importing `@iconoir/core` or `@iconoir/vue` directly
- ✅ `design/icons/` CAN import `@iconoir/core`
- ✅ `components/AppIcon.vue` CAN import from `design/icons/`

#### Konsta
- ❌ **EVERYWHERE** - Konsta is hard-blocked in all directories

### Enforcement

ESLint rules and the `check-frontend-architecture.mjs` script enforce these restrictions. CI will fail if violations are detected.

---

## 4. Semantic Component Usage

### Rule

**ALL** shell, list, search, form, sheet, dialog, tabbar, toolbar, action menu, and composer UI **MUST** use semantic components from `design/semantic/`.

### Available Semantic Primitives

| Component | Purpose | Usage |
|-----------|---------|-------|
| `AppRoot` | Root app container | Wraps entire app, provides Framework7 context |
| `AppPage` | Page container | Wraps each route view |
| `AppNavbar` | Navigation bar | Top navigation for pages |
| `AppTabBar` | Tab bar | Bottom tab navigation |
| `AppToolbar` | Toolbar | Toolbar for actions |
| `AppList` | List container | Wraps list items |
| `AppListItem` | List item | Individual list row |
| `AppGroupedList` | Grouped list | Lists with section headers |
| `AppSearchBar` | Search field | Search inputs with native behavior |
| `AppSegmentedControl` | Segmented control | Tab-like selectors |
| `AppButton` | Button | Primary action button |
| `AppIcon` | Icon | All icons must use this wrapper |
| `AppSheet` | Bottom sheet | Modal bottom sheets |
| `AppActionSheet` | Action sheet | Action menu from bottom |
| `AppDialog` | Dialog | Modal dialogs |
| `AppPopover` | Popover | Small overlay panels |
| `AppToast` | Toast | Brief notifications |
| `AppComposer` | Composer | Text input for messages/stories |
| `AppTextField` | Text field | Single-line text input |
| `AppTextArea` | Text area | Multi-line text input |
| `AppMediaViewer` | Media viewer | Image/video viewer |
| `AppPullToRefresh` | Pull to refresh | Refresh gesture wrapper |
| `AppVirtualList` | Virtual list | Large list performance |

### Custom Component Creation Rule

**Before creating a custom component**, ask:
1. Is there a semantic primitive that already does this?
2. Can an existing semantic primitive be extended to support this?
3. Is this truly a product-specific UI element?

If the answer to #1 or #2 is yes, use/extend the semantic primitive instead.

New custom UI must include:
- Justification in component header comment: `// Custom component: [reason semantic primitive is insufficient]`
- Full documentation in the component's markdown doc
- Accessibility audit
- Platform behavior notes

---

## 5. Platform API Usage

### Rule

**ALL** platform-specific behavior (Capacitor, browser APIs, device detection) **MUST** go through the `platform/` layer.

### Available Platform Abstractions

| Module | Purpose | Usage |
|--------|---------|-------|
| `nativeUiProfile.ts` | Detect platform UI dialect | iOS vs Android vs PWA |
| `capabilityDetection.ts` | Detect device capabilities | Camera, share, haptics |
| `keyboardPolicy.ts` | Keyboard behavior management | Open/close, safe areas |
| `safeAreaPolicy.ts` | Safe area insets | iPhone notch, Android cutouts |
| `hapticPolicy.ts` | Haptic feedback | Vibration, impact |
| `motionPolicy.ts` | Motion preferences | Reduced motion support |
| `platformIcons.ts` | Platform-specific icons | Native share, back buttons |

### Platform Detection Rule

**NEVER** use raw platform detection in views, features, or components:

```typescript
// ❌ BAD - Raw platform detection in feature
import { Platform } from '@capacitor/core';
if (Platform.is('ios')) { ... }

// ✅ GOOD - Use platform abstraction
import { useNativeUi } from '@/platform/nativeUiProfile';
const { isIOS } = useNativeUi();
```

### Feature Detection Over Browser Sniffing

Prefer feature detection over user agent sniffing:

```typescript
// ❌ BAD - Browser sniffing
const isIpad = navigator.userAgent.includes('iPad');

// ✅ GOOD - Feature detection
const supportsTouch = 'ontouchstart' in window;
// Or use platform abstraction
const { isTablet } = useNativeUi();
```

### iPadOS Special Handling

iPadOS with desktop-like UA must be properly classified. Use `nativeUiProfile.ts` which handles this correctly.

---

## 6. Icon Usage

### Rule

**ALL** icons **MUST** use the `<AppIcon>` component. No direct Iconoir imports.

### Icon Usage Pattern

```vue
<!-- ✅ GOOD -->
<AppIcon name="search" />
<AppIcon name="home" />
<AppIcon name="settings" />

<!-- ❌ BAD -->
<IconoirSearch />
import { Search } from '@iconoir/vue';
```

### Icon Registry

All icons must be registered in `design/icons/iconRegistry.ts`:

```typescript
// design/icons/iconRegistry.ts
export const iconRegistry = {
  search: { component: IconoirSearch, platforms: ['ios', 'android', 'pwa'] },
  home: { component: IconoirHome, platforms: ['ios', 'android', 'pwa'] },
  // ...
} as const;
```

### Platform-Specific Icons

Some icons have platform-specific variants. Use `platformIcons.ts`:

```typescript
// design/icons/platformIcons.ts
export const platformIcons = {
  back: {
    ios: 'chevron-left',
    android: 'arrow-left',
    pwa: 'arrow-left',
  },
  // ...
} as const;
```

---

## 7. Keyboard/Input Rules

### Rule

**ALL** input components **MUST** respect native keyboard behavior and provide appropriate hints.

### Input Attributes by Component Type

#### Search Inputs (`AppSearchBar`)
```vue
<input
  type="search"
  inputmode="search"
  enterkeyhint="search"
  autocapitalize="none"
  :spellcheck="false"
  :aria-label="searchLabel"
/>
```

#### Message Composers (`AppComposer`, `AppTextArea`)
```vue
<textarea
  inputmode="text"
  enterkeyhint="send"
  autocapitalize="sentences"
  spellcheck="true"
/>
```

#### Auth/Profile Fields (`AppTextField`)
```vue
<input
  type="text"
  inputmode="text"
  autocapitalize="words"
  autocomplete="username"
/>

<input
  type="password"
  inputmode="text"
  autocapitalize="off"
  autocomplete="current-password"
/>

<input
  type="email"
  inputmode="email"
  autocapitalize="off"
  autocomplete="email"
/>
```

### Rules

1. **Search fields** must use `type="search"`, `inputmode="search"`, `enterkeyhint="search"`
2. **Composer inputs** must use `enterkeyhint="send"`, `autocapitalize="sentences"`
3. **Password fields** must use `autocomplete="current-password"` or `new-password`
4. **Email fields** must use `inputmode="email"`, `autocapitalize="off"`
5. **ALL inputs** must have appropriate labels (aria-label or associated label element)
6. **Emoji/unicode** must be preserved in all text inputs
7. **Paste** must never be blocked
8. **Spellcheck** should be enabled for text areas, disabled for search

### Keyboard Plugin Support

Use `keyboardPolicy.ts` to detect and handle native keyboard plugins:

```typescript
import { useKeyboard } from '@/platform/keyboardPolicy';

const { isKeyboardPluginAvailable, showKeyboard, hideKeyboard } = useKeyboard();
```

---

## 8. Motion/Gesture Rules

### Rule

**ALL** motion and gestures **MUST** respect user preferences and platform conventions.

### Motion Preferences

Check reduced motion preference before any animation:

```typescript
import { useMotion } from '@/platform/motionPolicy';

const { prefersReducedMotion } = useMotion();

// Always respect reduced motion
const animation = prefersReducedMotion ? 'none' : 'fade';
```

### Gesture Rules

1. **Swipe gestures** must provide alternative non-gesture controls
2. **Long-press** must not conflict with platform conventions
3. **Pull-to-refresh** must use `AppPullToRefresh` wrapper
4. **Scroll behavior** must be native-like on each platform

### Haptic Feedback

Use `hapticPolicy.ts` for consistent haptics:

```typescript
import { useHaptics } from '@/platform/hapticPolicy';

const { impactLight, impactMedium, impactHeavy, notifySuccess, notifyError } = useHaptics();

// Use sparingly and only for user-initiated actions
button.addEventListener('click', () => {
  impactLight();
});
```

Haptic rules:
- Light impact: Small confirmations (button presses, toggles)
- Medium impact: Important actions (form submission)
- Heavy impact: Critical actions (destructive operations)
- Success notification: Positive feedback
- Error notification: Error feedback

---

## 9. Accessibility Baseline

### Rule

**ALL** UI **MUST** meet WCAG 2.2 AA standards and be usable with screen readers.

### Non-Negotiable Requirements

1. **Every interactive element** must be keyboard accessible
2. **Every icon-only button** must have an accessible label
3. **Every form input** must have an associated label
4. **Every modal/dialog** must trap focus and be closable via keyboard
5. **Color alone** must never convey state or meaning
6. **Focus order** must be logical and predictable
7. **Screen reader announcements** must be used for dynamic content changes

### Accessibility Testing

Run accessibility tests before merging:

```bash
# Unit accessibility tests
bun run test:a11y

# E2E accessibility smoke tests
bun run test:e2e:a11y
```

### Manual Testing Checklist

- [ ] VoiceOver (iOS) - All elements readable and interactive
- [ ] TalkBack (Android) - All elements readable and interactive
- [ ] Keyboard only (Desktop) - All interactive elements reachable and usable
- [ ] Reduced motion - No problematic animations
- [ ] Large text (120%+) - Layout remains usable
- [ ] High contrast - All UI elements visible

### Axe-Core Integration

Use `@axe-core/playwright` for automated accessibility testing:

```typescript
// tests/e2e/accessibility/welcome.spec.ts
import { test } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('Welcome page accessibility', async ({ page }) => {
  await page.goto('/welcome');
  await injectAxe(page);
  await checkA11y(page, { detailedReport: true, detailedReportOptions: { html: true } });
});
```

---

## 10. Testing Baseline

### Unit Tests

Every component must have unit tests covering:
- Props validation
- Emitted events
- Rendered content
- Accessibility attributes
- Platform-specific behavior (when applicable)

```bash
# Run unit tests
bun run test:unit
```

### E2E Tests

Smoke tests for critical user flows:
- Auth shell hiding
- Tab navigation
- Back navigation
- Settings navigation
- Explore search
- Feed filter
- Pull-to-refresh fallback
- Story viewer open/close
- Media viewer open/close
- Message composer send disabled/enabled
- Action sheet open/close

```bash
# Run E2E tests
bun run test:e2e
```

### Visual Regression Tests

Prepare for visual regression testing with defined viewports:
- iPhone (390x844)
- iPhone SE narrow
- Android (412x915)
- iPad portrait
- Desktop narrow
- Desktop wide

```bash
# Run visual regression tests (when configured)
bun run test:visual
```

### Test Coverage Requirements

| Layer | Coverage Requirement |
|-------|---------------------|
| `design/semantic/` | 100% (critical infrastructure) |
| `platform/` | 100% (platform abstractions) |
| `stores/` | 90% (state management) |
| `features/` | 80% (feature logic) |
| `components/` | 80% (shared components) |
| `views/` | 70% (route orchestration) |

---

## 11. PR Checklist

See [frontend-pr-checklist.md](./frontend-pr-checklist.md) for the complete PR review checklist.

---

## 12. Contribution Rules

### Before Submitting a PR

1. **Read this document** - Understand the architecture contract
2. **Check the PR checklist** - Ensure all requirements are met
3. **Run architecture checks** - `bun run check:architecture`
4. **Run type checks** - `bun run type-check`
5. **Run unit tests** - `bun run test:unit`
6. **Run build** - `bun run build`
7. **If UI changed** - Run E2E tests: `bun run test:e2e`
8. **If UI changed** - Manual smoke test on iOS/Android/PWA

### Review Process

Every PR must be reviewed by at least one frontend maintainer. Reviewers will check:
- Architecture contract compliance
- Import boundary violations
- Semantic component usage
- Platform API usage
- Icon usage
- Keyboard/input behavior
- Accessibility
- Test coverage

### Breaking the Contract

If you need to break a rule in this contract:
1. Open a discussion/issue explaining why
2. Get approval from frontend architecture team
3. Document the exception in the PR description
4. Add a TODO to remove the exception when possible

---

## 13. Enforcement

### Automated Checks

| Check | Script | CI |
|-------|--------|----|
| Architecture import boundaries | `bun run check:architecture` | ✅ Required |
| Type checking | `bun run type-check` | ✅ Required |
| Unit tests | `bun run test:unit` | ✅ Required |
| Build | `bun run build` | ✅ Required |
| E2E smoke tests | `bun run test:e2e` | ⚠️ Recommended |
| Accessibility tests | `bun run test:a11y` | ⚠️ Recommended |
| Visual regression | `bun run test:visual` | ⚠️ Optional |

### ESLint Rules

Custom ESLint rules enforce import boundaries:
- `no-restricted-imports` for Konsta
- `no-restricted-imports` for raw Framework7 outside design/semantic/
- `no-restricted-imports` for raw Capacitor outside platform/
- `no-restricted-imports` for raw Iconoir outside design/icons/

### CI Configuration

CI pipeline must include:

```yaml
jobs:
  frontend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout
      - uses: actions/setup-node
      - run: bun install
      - run: bun run type-check
      - run: bun run build
      - run: bun run test:unit
      - run: bun run check:architecture
      - run: bun run test:e2e # Optional but recommended
```

---

## 14. Maintenance

### Architecture Contract Updates

This document is a living contract. Updates require:
1. Discussion and approval from frontend architecture team
2. Documentation of breaking changes
3. Migration guide for existing code
4. Update to all related documentation

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-10 | Initial contract for Phase 11 |

---

## 15. Quick Reference

### Do This ✅

- Use semantic components from `design/semantic/`
- Use `<AppIcon>` for all icons
- Use platform abstractions from `platform/`
- Respect reduced motion preferences
- Provide accessible labels for all interactive elements
- Use appropriate input attributes
- Create unit tests for all components
- Run `bun run check:architecture` before committing

### Don't Do This ❌

- Import Framework7 directly in views/features/components
- Import Capacitor directly in views/features/components
- Import Iconoir directly anywhere except `design/icons/`
- Import Konsta (blocked everywhere)
- Create custom UI without using semantic primitives
- Ignore platform-specific behavior
- Hardcode platform detection
- Block paste or emoji input
- Use color alone for state
- Skip accessibility testing

---

**This contract is enforceable. Violations will cause CI failures and PR rejections.**
