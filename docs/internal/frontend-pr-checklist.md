# Frontend PR Checklist

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-06-10  
**Related:** [Frontend Architecture Contract](./frontend-architecture-contract.md)

---

## Overview

This checklist must be completed for **every PR** that touches frontend code. It enforces the architecture contract and prevents UI drift.

**Rule:** PRs that don't pass this checklist **will be rejected**.

---

## Pre-Submission Checklist

### For All PRs

- [ ] **Architecture Contract** - I have read and understood [frontend-architecture-contract.md](./frontend-architecture-contract.md)
- [ ] **Import Boundaries** - All imports follow the allowed import direction
- [ ] **Semantic Components** - All UI uses semantic components from `design/semantic/`
- [ ] **Type Safety** - All new/changed code passes TypeScript compilation
- [ ] **Tests Pass** - All existing tests pass
- [ ] **New Tests** - New/changed functionality has corresponding tests
- [ ] **Lint Clean** - `bun run lint` passes with no errors
- [ ] **Build Succeeds** - `bun run build` completes without errors
- [ ] **Architecture Check** - `bun run check:architecture` passes

### For UI Changes

- [ ] **Semantic Component Usage** - All new UI uses semantic primitives
- [ ] **Icon Usage** - All icons use `<AppIcon>` component
- [ ] **Platform Behavior** - UI respects platform conventions (iOS/Android/PWA)
- [ ] **Accessibility** - New UI meets accessibility standards (see below)
- [ ] **Keyboard/Input** - Input behavior respects native keyboard rules
- [ ] **Safe Areas** - UI respects safe area insets on notched devices
- [ ] **Reduced Motion** - UI respects `prefers-reduced-motion`
- [ ] **Large Text** - UI works at 120%+ text size

---

## Detailed Checks

### 1. Semantic Component Usage

**Rule:** All shell, list, search, form, sheet, dialog, tabbar, toolbar, action menu, and composer UI **MUST** use semantic components.

#### Shell Components
- [ ] Main app root uses `AppRoot`
- [ ] Each route view uses `AppPage`
- [ ] Navigation bars use `AppNavbar`
- [ ] Bottom tab navigation uses `AppTabBar`
- [ ] Action toolbars use `AppToolbar`

#### List Components
- [ ] List containers use `AppList`
- [ ] List items use `AppListItem`
- [ ] Grouped lists use `AppGroupedList`

#### Form Components
- [ ] Search inputs use `AppSearchBar`
- [ ] Segmented controls use `AppSegmentedControl`
- [ ] Buttons use `AppButton`
- [ ] Icons use `AppIcon`
- [ ] Text inputs use `AppTextField`
- [ ] Text areas use `AppTextArea`
- [ ] Composers use `AppComposer`

#### Overlay Components
- [ ] Bottom sheets use `AppSheet`
- [ ] Action menus use `AppActionSheet`
- [ ] Modals use `AppDialog`
- [ ] Small overlays use `AppPopover`
- [ ] Notifications use `AppToast`

#### Media Components
- [ ] Media viewers use `AppMediaViewer`

#### Scroll Components
- [ ] Pull-to-refresh uses `AppPullToRefresh`
- [ ] Virtual lists use `AppVirtualList`

---

### 2. Import Boundary Enforcement

**Rule:** Imports must follow the architecture contract's allowed import direction.

#### Raw Framework7
- [ ] No `views/` import `framework7-vue` directly
- [ ] No `features/` import `framework7-vue` directly
- [ ] No `components/` import `framework7-vue` directly
- [ ] Only `design/semantic/` imports `framework7-vue`

#### Raw Capacitor
- [ ] No `views/` import `@capacitor/*` directly
- [ ] No `features/` import `@capacitor/*` directly
- [ ] No `components/` import `@capacitor/*` directly
- [ ] No `design/` import `@capacitor/*` directly
- [ ] Only `platform/` imports `@capacitor/*`

#### Raw Iconoir
- [ ] No `views/` import `@iconoir/core` or `@iconoir/vue` directly
- [ ] No `features/` import `@iconoir/core` or `@iconoir/vue` directly
- [ ] No `components/` import `@iconoir/core` or `@iconoir/vue` directly
- [ ] Only `design/icons/` imports `@iconoir/core`

#### Konsta
- [ ] No imports of `konsta` or `konsta/vue` **anywhere**

#### Custom Verification
```bash
# Run architecture check
bun run check:architecture
```

---

### 3. Icon Usage

**Rule:** **ALL** icons **MUST** use the `<AppIcon>` component.

- [ ] All icons use `<AppIcon name="..." />`
- [ ] No direct Iconoir component usage (`<IconoirSearch />`)
- [ ] No inline SVG icons
- [ ] No emoji used as icons
- [ ] Icon names are from the registered icon registry
- [ ] Platform-specific icons use the platform icon mapping

#### Icon Registry Check
- [ ] New icons are added to `design/icons/iconRegistry.ts`
- [ ] Platform-specific variants are defined in `design/icons/platformIcons.ts`

---

### 4. Platform Behavior

**Rule:** All platform-specific behavior **MUST** go through the `platform/` layer.

- [ ] No raw `Platform.is()` calls outside `platform/`
- [ ] No raw `navigator.userAgent` checks outside `platform/`
- [ ] Uses `useNativeUi()` from `platform/nativeUiProfile.ts`
- [ ] Uses `useCapability()` from `platform/capabilityDetection.ts`
- [ ] Uses `useKeyboard()` from `platform/keyboardPolicy.ts`
- [ ] Uses `useSafeArea()` from `platform/safeAreaPolicy.ts`
- [ ] Uses `useHaptics()` from `platform/hapticPolicy.ts`
- [ ] Uses `useMotion()` from `platform/motionPolicy.ts`

#### Platform-Specific UI
- [ ] iPadOS is correctly classified (not as desktop)
- [ ] iPhone vs Android differences are abstracted
- [ ] PWA-specific behavior is handled
- [ ] Safe areas are respected on notched devices

---

### 5. Keyboard/Input Behavior

**Rule:** Native keyboard behavior **MUST NOT** be suppressed or altered.

#### Search Inputs (`AppSearchBar`)
- [ ] Uses `type="search"`
- [ ] Uses `inputmode="search"`
- [ ] Uses `enterkeyhint="search"`
- [ ] Uses `autocapitalize="none"`
- [ ] Uses `spellcheck="false"`
- [ ] Has accessible label (`aria-label` or associated label)

#### Message Composers (`AppComposer`, `AppTextArea`)
- [ ] Uses `inputmode="text"`
- [ ] Uses `enterkeyhint="send"`
- [ ] Uses `autocapitalize="sentences"`
- [ ] Uses `spellcheck="true"`
- [ ] Send button is disabled when invalid
- [ ] Send button is enabled when valid
- [ ] Paste is **NOT** blocked
- [ ] Emoji/unicode content is preserved

#### Auth/Profile Fields (`AppTextField`)
- [ ] Uses appropriate `autocomplete` values
- [ ] Password fields use `autocomplete="current-password"` or `new-password`
- [ ] Email fields use `inputmode="email"` and `autocapitalize="off"`
- [ ] Username fields use `autocomplete="username"`

---

### 6. Accessibility

**Rule:** **ALL** UI **MUST** meet WCAG 2.2 AA standards.

#### Non-Negotiable
- [ ] Every interactive element is keyboard accessible
- [ ] Every icon-only button has an accessible label
- [ ] Every form input has an associated label
- [ ] Every modal/dialog traps focus and is closable via keyboard
- [ ] Color alone does **NOT** convey state or meaning
- [ ] Focus order is logical and predictable
- [ ] Screen reader announcements for dynamic content changes

#### Semantic HTML
- [ ] Uses semantic HTML elements (`<nav>`, `<main>`, `<section>`, etc.)
- [ ] Uses proper heading hierarchy
- [ ] Uses proper ARIA roles when needed
- [ ] Uses proper `aria-*` attributes

#### Testing
- [ ] Run accessibility tests: `bun run test:a11y`
- [ ] Manual testing with VoiceOver (iOS)
- [ ] Manual testing with TalkBack (Android)
- [ ] Manual testing with keyboard only (Desktop)
- [ ] Manual testing with reduced motion enabled
- [ ] Manual testing with large text (120%+)
- [ ] Manual testing with high contrast

---

### 7. Safe Areas

**Rule:** UI **MUST** respect safe area insets on notched devices.

- [ ] Uses `useSafeArea()` composable for safe area insets
- [ ] Bottom toolbars respect safe area
- [ ] Modal sheets respect safe area
- [ ] Input fields respect safe area when keyboard is open
- [ ] No content is obscured by device notches or rounded corners

---

### 8. Motion

**Rule:** UI **MUST** respect user motion preferences.

- [ ] Uses `useMotion()` composable to check `prefersReducedMotion`
- [ ] Animations are disabled or simplified when reduced motion is enabled
- [ ] No auto-playing animations or videos
- [ ] Transitions respect reduced motion preference

---

### 9. Testing

**Rule:** All new/changed functionality **MUST** have tests.

#### Unit Tests
- [ ] New components have unit tests
- [ ] Changed components have updated tests
- [ ] Tests cover props, events, rendering, accessibility
- [ ] Run with: `bun run test:unit`

#### E2E Tests
- [ ] If UI changed, E2E tests updated or added
- [ ] Smoke tests for critical flows
- [ ] Run with: `bun run test:e2e`

#### Accessibility Tests
- [ ] Axe-core tests added for new pages
- [ ] Run with: `bun run test:a11y`

#### Test Coverage
- [ ] `design/semantic/` maintains 100% coverage
- [ ] `platform/` maintains 100% coverage
- [ ] `stores/` maintains 90%+ coverage
- [ ] `features/` maintains 80%+ coverage
- [ ] `components/` maintains 80%+ coverage

---

### 10. Logging

**Rule:** Logging **MUST** be intentional and secure.

- [ ] No sensitive data in logs (tokens, passwords, messages, drafts)
- [ ] Uses centralized logging utility (`utils/logging.ts`)
- [ ] Development logs are easy to disable in production
- [ ] Production error logging is preserved
- [ ] No `console.log` with user content
- [ ] No `console.error` with sensitive data

#### Sensitive Data That Must NOT Be Logged
- [ ] POST request bodies
- [ ] Message bodies/content
- [ ] Draft text
- [ ] Auth tokens
- [ ] Private attachment URLs
- [ ] Raw encrypted payloads
- [ ] Full platform fingerprint dumps

---

### 11. Demo/Mock Data

**Rule:** Demo/mock data **MUST** be clearly governed.

- [ ] Demo data lives under clearly named files (`*mock*`, `*demo*`, `*placeholder*`)
- [ ] Demo data does NOT masquerade as live user content
- [ ] Production builds do NOT show demo data unless explicitly configured
- [ ] Placeholders are labeled as placeholders in code
- [ ] Uses `ENABLE_DEMO_DATA = import.meta.env.DEV` or feature flag

---

### 12. Build and CI

**Rule:** All checks **MUST** pass before merging.

#### Required Checks
- [ ] `bun run type-check` - TypeScript compilation passes
- [ ] `bun run build` - Build succeeds
- [ ] `bun run test:unit` - Unit tests pass
- [ ] `bun run check:architecture` - Architecture checks pass

#### Recommended Checks
- [ ] `bun run test:e2e` - E2E tests pass
- [ ] `bun run test:a11y` - Accessibility tests pass
- [ ] `bun run lint` - Linting passes

---

### 13. Manual Testing

**Rule:** UI changes **MUST** be manually tested on all platforms.

#### Required Platforms
- [ ] iPhone Safari
- [ ] iPhone installed PWA
- [ ] Android Chrome
- [ ] Android installed PWA
- [ ] Desktop Chrome (narrow viewport)
- [ ] Desktop Chrome (wide viewport)

#### Critical Flows to Test
- [ ] Auth shell hiding
- [ ] Tab navigation
- [ ] Back navigation
- [ ] Settings navigation
- [ ] Explore search
- [ ] Feed filter
- [ ] Pull-to-refresh fallback
- [ ] Story viewer open/close
- [ ] Media viewer open/close
- [ ] Message composer send disabled/enabled
- [ ] Action sheet open/close
- [ ] Keyboard open/close

---

## Review Checklist (For Reviewers)

When reviewing a PR, verify:

### Architecture Compliance
- [ ] No raw Framework7 imports in `views/`, `features/`, `components/`
- [ ] No raw Capacitor imports outside `platform/`
- [ ] No raw Iconoir imports outside `design/icons/`
- [ ] No Konsta imports anywhere
- [ ] Import direction follows contract

### Semantic Component Usage
- [ ] All UI uses semantic components
- [ ] All icons use `<AppIcon>`
- [ ] Custom components have proper justification

### Platform Behavior
- [ ] Platform-specific code is in `platform/` layer
- [ ] No raw platform detection in UI code
- [ ] iPadOS handling is correct

### Accessibility
- [ ] Interactive elements are keyboard accessible
- [ ] Icon-only buttons have accessible labels
- [ ] Form inputs have associated labels
- [ ] Modals have focus traps
- [ ] Color is not sole indicator of state

### Testing
- [ ] Tests cover new/changed functionality
- [ ] Test coverage meets requirements
- [ ] CI checks pass

---

## Success Criteria

This PR checklist is successful when:

1. ✅ Developers have a clear, actionable checklist for every PR
2. ✅ Review process matches architecture goals
3. ✅ Architecture violations are caught before merge
4. ✅ UI drift is prevented
5. ✅ Quality standards are maintained
6. ✅ Security and privacy are protected

---

## Quick Reference

### Before Submitting
```bash
# Run all required checks
bun run check:frontend

# Or individually
bun run type-check
bun run build
bun run test:unit
bun run check:architecture
```

### If UI Changed
```bash
# Also run
bun run test:e2e
bun run test:a11y
bun run lint
```

---

## Templates

### PR Description Template

```markdown
## Description

[Brief description of changes]

## Type
- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Documentation
- [ ] Chore

## Architecture Impact
- [ ] Changes semantic components
- [ ] Changes platform layer
- [ ] Changes import boundaries
- [ ] None

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed (list platforms)

## Checklist
- [ ] Architecture contract followed
- [ ] Import boundaries respected
- [ ] Semantic components used
- [ ] Accessibility requirements met
- [ ] Platform behavior correct
- [ ] Logging is secure
- [ ] Demo data is governed
- [ ] All checks pass

## Reviewers
@frontend-maintainer
```

---

**Next:** [Frontend Architecture Contract](./frontend-architecture-contract.md) | [Frontend Route Ownership Map](./frontend-route-ownership.md)
