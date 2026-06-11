# Frontend Native UI Known Limitations

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-06-10  
**Related:** [Frontend Architecture Contract](./frontend-architecture-contract.md)

---

## Overview

This document transparently documents known limitations of the native UI implementation using Framework7, Capacitor, and PWA. Its purpose is to **prevent rediscovery of known constraints** and provide actionable information for future development.

**Core Principle:** *Known limitations are better than surprising discoveries during development.*

---

## 1. PWA Limitations vs True Native (Swift/Kotlin)

### Navigation

| Limitation | Impact | Workaround | Status |
|------------|--------|------------|--------|
| **No native navigation stack** | PWA uses single-page navigation, loses native back gesture integration | Use Framework7's router with browser history API | ⚠️ Accepted |
| **Back button behavior** | Browser back button may not match app navigation | Custom back button handling in AppNavbar | ✅ Implemented |
| **Deep link handling** | Deep links open in browser, not app | Configure PWA manifest `scope` and service worker | ✅ Implemented |
| **App state restoration** | PWA doesn't restore scroll position, form state on launch | Use sessionStorage or IndexedDB to persist state | ⚠️ Partial |
| **Splash screen** | Browser shows white flash before PWA loads | Use theme color in manifest, optimize loading | ✅ Implemented |

### System Integration

| Limitation | Impact | Workaround | Status |
|------------|--------|------------|--------|
| **No native share sheet** | Must use custom share UI or browser API | Use `navigator.share()` with fallback | ✅ Implemented |
| **No native app settings** | Settings must be in-app | Build comprehensive in-app settings | ✅ Implemented |
| **No native notifications** | Must use browser notifications | Use Notification API with permission handling | ✅ Implemented |
| **No background processing** | PWA suspended when backgrounded | Use service worker for background sync | ⚠️ Partial |
| **No app badge** | Cannot set app icon badge | No workaround for PWA | ❌ None |
| **Limited file system** | No direct filesystem access | Use IndexedDB, opfs, or Capacitor on native | ✅ Implemented |

### Hardware Access

| Limitation | Impact | Workaround | Status |
|------------|--------|------------|--------|
| **Camera access** | Browser camera API differs from native | Use Capacitor Camera plugin | ✅ Implemented |
| **Gallery access** | Browser file picker differs from native | Use Capacitor Photo Gallery or custom picker | ⚠️ Partial |
| **Contacts access** | Limited access to contacts | Use Capacitor Contacts plugin | ✅ Implemented |
| **Location services** | Browser geolocation differs from native | Use Capacitor Geolocation plugin | ✅ Implemented |
| **Sensors** | Limited sensor access | Use Capacitor Device Motion plugin | ⚠️ Partial |

### UI/UX

| Limitation | Impact | Workaround | Status |
|------------|--------|------------|--------|
| **Status bar** | Browser status bar is always visible on iOS | Use `window.innerHeight` adjustments | ✅ Implemented |
| **Safe area insets** | Browser doesn't provide safe area insets | Use CSS `env(safe-area-*)` with fallbacks | ✅ Implemented |
| **Haptic feedback** | Browser has limited haptic API | Use Navigation API haptics or no haptics on PWA | ⚠️ Partial |
| **Pull-to-refresh** | Not native on all platforms | Use AppPullToRefresh with platform detection | ✅ Implemented |
| **Scroll physics** | Browser scroll differs from native | Use CSS scroll-snap, custom scroll handlers | ⚠️ Accepted |
| **Swipe gestures** | Browser touch events differ from native | Use Framework7 gesture handlers | ✅ Implemented |
| **Keyboard** | Virtual keyboard behavior differs | Use AppKeyboard composable | ✅ Implemented |

---

## 2. iOS Safari Keyboard Quirks

### Input Behavior

| Issue | Description | Impact | Workaround | Status |
|-------|-------------|--------|------------|--------|
| **Keyboard appearance delay** | First focus on input may have delay | Slow UX on first interaction | Pre-focus input on page load (hidden) | ✅ Implemented |
| **Keyboard hides on scroll** | Scrolling hides keyboard on iOS | User must re-focus input | Use `position: fixed` for input containers | ✅ Implemented |
| **Auto-capitalization** | `autocapitalize` attribute inconsistently applied | Input may not auto-capitalize correctly | Use `autocapitalize="sentences"` explicitly | ✅ Implemented |
| **Enter key hint** | `enterkeyhint` not supported in all iOS versions | Return key may show wrong label | Use feature detection | ⚠️ Partial |
| **Spellcheck on search** | `spellcheck="false"` may not work | Search inputs may show suggestions | Use `inputmode="search"` + `spellcheck="false"` | ✅ Implemented |
| **Keyboard toolbar** | No native toolbar for text inputs | Cannot add custom actions to keyboard | Use accessory view in AppComposer | ✅ Implemented |

### Keyboard Types

| Input Type | iOS Behavior | Workaround |
|------------|--------------|------------|
| `type="search"` | Shows search keyboard | ✅ Native |
| `type="email"` | Shows email keyboard | ✅ Native |
| `type="tel"` | Shows phone keyboard | ✅ Native |
| `type="url"` | Shows URL keyboard | ✅ Native |
| `type="number"` | Shows number keyboard | ✅ Native |
| `type="password"` | Shows password keyboard | ✅ Native |

### Special Cases

| Case | Issue | Workaround |
|------|-------|------------|
| **Contenteditable** | Keyboard doesn't show on first focus | Use native input elements instead | ❌ Avoid |
| **Textarea newlines** | Return key inserts newline instead of sending | Use `enterkeyhint="send"` | ✅ Implemented |
| **Input focus blur** | Blurring input may cause scroll jump | Use scroll restoration | ✅ Implemented |

---

## 3. Android Chrome Keyboard Quirks

### Input Behavior

| Issue | Description | Impact | Workaround | Status |
|-------|-------------|--------|------------|--------|
| **Keyboard covers input** | Virtual keyboard may cover input field | User cannot see what they're typing | Use `window.visualViewport` to adjust | ✅ Implemented |
| **Keyboard types** | Some input types ignored | May get generic keyboard | Use `inputmode` as fallback | ✅ Implemented |
| **Enter key behavior** | Enter key may submit form unexpectedly | Accidental form submission | Use `enterkeyhint` appropriately | ✅ Implemented |
| **Auto-focus** | `autofocus` may not work on page load | Input not focused on load | Use JS to focus after page load | ✅ Implemented |

### Keyboard Types

| Input Type | Android Behavior | Workaround |
|------------|------------------|------------|
| `type="search"` | Shows generic keyboard | Use `inputmode="search"` | ✅ Implemented |
| `type="email"` | Shows email keyboard | ✅ Native |
| `type="tel"` | Shows phone keyboard | ✅ Native |
| `type="url"` | Shows URL keyboard | ✅ Native |
| `type="number"` | Shows number keyboard | ✅ Native |
| `type="password"` | Shows password keyboard | ✅ Native |

### Special Cases

| Case | Issue | Workaround |
|------|-------|------------|
| **Fullscreen input** | Keyboard may not resize view properly | Content hidden under keyboard | Use `window.visualViewport` and `resize` events | ✅ Implemented |
| **Inputmethod API** | Limited support for virtual keyboards | Cannot detect keyboard type | Feature detect, use fallbacks | ⚠️ Partial |

---

## 4. Safe Area Edge Cases

### Device Variations

| Device | Safe Area Concern | Workaround | Status |
|--------|-------------------|------------|--------|
| **iPhone X+** | Notch at top, home indicator at bottom | Use `env(safe-area-inset-*)` | ✅ Implemented |
| **iPhone 14+** | Dynamic island | Use `env(safe-area-inset-top)` | ✅ Implemented |
| **iPad (portrait)** | No safe area insets needed | Detect iPad and skip insets | ✅ Implemented |
| **iPad (landscape)** | No safe area insets needed | Detect iPad and skip insets | ✅ Implemented |
| **Android notch devices** | Varies by manufacturer | Use `env(safe-area-inset-*)` with fallbacks | ✅ Implemented |
| **Android with gesture nav** | Bottom gesture area | Use `env(safe-area-inset-bottom)` | ✅ Implemented |

### Implementation Issues

| Issue | Description | Workaround |
|-------|-------------|------------|
| **CSS env() not supported** | Some browsers don't support `env()` | Use JS fallback with `window.innerHeight` | ✅ Implemented |
| **Viewport units** | `vh` includes safe area on iOS | Use `dvh` (dynamic viewport height) | ✅ Implemented |
| **Fixed positioning** | Fixed elements may overlap safe area | Use safe area padding/margin | ✅ Implemented |
| **Modal sheets** | Sheets may extend under safe area | Use safe area insets in sheet height | ✅ Implemented |

### Testing Safe Areas

```css
/* Test safe area styling */
.safe-area-test {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 5. Framework7 Limitations

### Component Limitations

| Component | Limitation | Workaround | Status |
|-----------|------------|------------|--------|
| **AppRoot** | Theme changes may cause flash | Use CSS variables, transition opacity | ✅ Implemented |
| **AppPage** | Nested pages have navigation issues | Avoid nesting AppPage | ✅ Enforced |
| **AppNavbar** | Large title transition janky on Android | Use CSS will-change | ⚠️ Accepted |
| **AppTabBar** | Max 5 tabs for usability | Design constraint | ✅ Enforced |
| **AppSearchBar** | Custom search handler may miss events | Use Framework7 search events | ⚠️ Partial |
| **AppSheet** | Nested sheets not supported | Avoid nesting | ✅ Enforced |
| **AppDialog** | Focus trap may interfere with custom focus | Use `trapFocus` prop | ✅ Implemented |
| **AppPopover** | May be clipped by viewport | Position carefully | ⚠️ Accepted |
| **AppVirtualList** | Dynamic item heights need function | Provide `itemHeight` function | ✅ Implemented |

### Styling Limitations

| Limitation | Description | Workaround |
|------------|-------------|------------|
| **CSS custom properties** | Framework7 uses its own CSS vars | Use Framework7 vars or override | ✅ Implemented |
| **Theme colors** | Limited to Framework7 color scheme | Extend with custom CSS vars | ✅ Implemented |
| **Dark mode** | Theme switching may cause flash | Use CSS transition | ✅ Implemented |
| **Custom icons** | Framework7 icon font limited | Use AppIcon with Iconoir | ✅ Implemented |

### Performance

| Limitation | Description | Workaround |
|------------|-------------|------------|
| **Large lists** | Performance degrades with many items | Use AppVirtualList | ✅ Implemented |
| **Complex pages** | Many components may slow rendering | Lazy load, code split | ✅ Implemented |
| **Animations** | Too many animations may cause jank | Use reduced motion respect | ✅ Implemented |

---

## 6. Media Viewer Limitations

### Platform Differences

| Platform | Limitation | Workaround | Status |
|----------|------------|------------|--------|
| **iOS PWA** | No native photo browser | Use AppMediaViewer with custom zoom | ✅ Implemented |
| **Android PWA** | Browser photo viewer may open externally | Use `target="_blank"` carefully | ✅ Implemented |
| **iOS Native** | Can use native photo browser | Use Capacitor Photo Viewer | ⚠️ Planned |
| **Android Native** | Can use native photo viewer | Use Capacitor Photo Viewer | ⚠️ Planned |

### Features

| Feature | Limitation | Workaround |
|---------|------------|------------|
| **Zoom** | Custom zoom implementation | Use pinch gesture handlers | ✅ Implemented |
| **Navigation** | Swipe between images | Use Framework7 gestures | ✅ Implemented |
| **Captions** | May overlap image on small screens | Position caption below | ✅ Implemented |
| **Video** | Video playback controls vary | Use custom controls | ⚠️ Partial |
| **Fullscreen** | Native fullscreen may not work | Use AppMediaViewer fullscreen mode | ✅ Implemented |

---

## 7. Gesture Limitations

### Touch Events

| Gesture | Limitation | Workaround | Status |
|---------|------------|------------|--------|
| **Swipe** | May conflict with scroll | Use passive event listeners | ✅ Implemented |
| **Long press** | May conflict with platform behavior | Use 500ms threshold | ✅ Implemented |
| **Pinch zoom** | May not work in all containers | Use touch-action: pinch-zoom | ✅ Implemented |
| **Pull-to-refresh** | May not work on desktop | Enable ptrMouseWheel | ✅ Implemented |

### Platform Differences

| Gesture | iOS | Android | PWA |
|---------|-----|---------|-----|
| **Swipe back** | Native gesture | Native gesture | Browser back |
| **Swipe down to close** | Modal only | Modal only | Custom |
| **Pull-to-refresh** | Native | Native | Custom |
| **Long press menu** | Native | Native | Context menu |

---

## 8. Unsupported Browser Behavior

### Browser Support Matrix

| Browser | Support Level | Notes |
|---------|---------------|-------|
| **iOS Safari 15+** | ✅ Full | Target platform |
| **iOS Safari 14** | ⚠️ Partial | Some features missing |
| **iOS Safari 13** | ❌ None | Not supported |
| **Android Chrome 100+** | ✅ Full | Target platform |
| **Android Chrome 90-99** | ⚠️ Partial | Most features work |
| **Android Chrome < 90** | ❌ None | Not supported |
| **Desktop Chrome 100+** | ✅ Full | Target platform |
| **Desktop Chrome 90-99** | ⚠️ Partial | Most features work |
| **Desktop Firefox** | ⚠️ Partial | Some CSS issues |
| **Desktop Safari** | ⚠️ Partial | Some features missing |
| **Desktop Edge** | ✅ Full | Chromium-based |

### Unsupported Features

| Feature | Unsupported Browsers | Workaround |
|---------|---------------------|------------|
| **CSS Grid Subgrid** | Safari < 16, Firefox < 117 | Use flexbox fallback | ✅ Implemented |
| **CSS Container Queries** | Safari < 16, Firefox < 110 | Use media queries | ⚠️ Partial |
| **Intersection Observer** | Safari < 12.1, IE | Use scroll listeners | ✅ Implemented |
| **Resize Observer** | Safari < 13.1, Firefox < 69 | Use window resize | ✅ Implemented |
| **WebP images** | Safari < 14 | Use fallback formats | ✅ Implemented |
| **AVIF images** | Safari < 16 | Use WebP fallback | ✅ Implemented |
| **Web Share API** | Safari < 12.2 | Use custom share UI | ✅ Implemented |
| **File System Access API** | Safari not supported | Use IndexedDB | ⚠️ Partial |
| **Web Authentication API** | Limited browser support | Use traditional auth | ⚠️ Partial |

---

## 9. Planned Future Enhancements

### Priority 1 (Critical)
- [ ] Native share sheet integration on iOS/Android
- [ ] Background sync for PWA
- [ ] Offline-first architecture improvements
- [ ] Push notification support

### Priority 2 (High)
- [ ] True native navigation stack via Capacitor
- [ ] Improved haptic feedback on all platforms
- [ ] Better keyboard handling on Android
- [ ] Native file system access on mobile

### Priority 3 (Medium)
- [ ] Custom keyboard toolbar for composers
- [ ] Native app badge support
- [ ] Improved safe area detection
- [ ] Better gesture conflict resolution

### Priority 4 (Low)
- [ ] Firefox full support
- [ ] Desktop Safari full support
- [ ] Legacy browser polyfills

---

## 10. Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Keyboard covers input on Android
**Symptoms:** User cannot see what they're typing
**Solution:** Use `window.visualViewport` to detect keyboard and adjust input position

```javascript
// In keyboardPolicy.ts
const adjustForKeyboard = () => {
  const viewport = window.visualViewport;
  const input = document.activeElement;
  if (input && input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};
```

#### Issue: Safe area insets not working
**Symptoms:** Content obscured by notch or home indicator
**Solution:** Ensure CSS env() is supported, use JS fallback

```css
/* Use dynamic viewport units */
height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
```

#### Issue: Pull-to-refresh not working on desktop
**Symptoms:** Pull gesture doesn't trigger refresh
**Solution:** Enable `ptrMouseWheel` on AppPullToRefresh

```vue
<AppPullToRefresh :ptrMouseWheel="true" @refresh="handleRefresh">
  <!-- content -->
</AppPullToRefresh>
```

#### Issue: iPadOS detected as desktop
**Symptoms:** iPad shows desktop UI instead of mobile
**Solution:** Use nativeUiProfile.ts which handles iPadOS correctly

```typescript
// In nativeUiProfile.ts
const isIpadOS = () => {
  const userAgent = navigator.userAgent;
  const isIpad = userAgent.includes('iPad') || (
    userAgent.includes('Macintosh') && 'ontouchend' in document
  );
  return isIpad && !userAgent.includes('iPhone');
};
```

#### Issue: Animations cause jank on low-end devices
**Symptoms:** UI feels sluggish on older devices
**Solution:** Respect reduced motion, use CSS will-change

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

#### Issue: Framework7 theme flash on change
**Symptoms:** White flash when switching between light/dark mode
**Solution:** Use CSS transition on root element

```css
:root {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

---

## 11. Feature Detection Patterns

### Recommended Feature Detection

```typescript
// In capabilityDetection.ts

// Touch support
export const supportsTouch = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Passive event listeners
export const supportsPassiveEvents = (): boolean => {
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: () => { supportsPassive = true; return true; },
    });
    window.addEventListener('test', () => {}, opts);
    window.removeEventListener('test', () => {}, opts);
  } catch (e) {
    // Error means passive events not supported
  }
  return supportsPassive;
};

// Intersection Observer
export const supportsIntersectionObserver = (): boolean => {
  return 'IntersectionObserver' in window;
};

// Resize Observer
export const supportsResizeObserver = (): boolean => {
  return 'ResizeObserver' in window;
};

// Web Share API
export const supportsWebShare = (): boolean => {
  return 'share' in navigator;
};

// File System Access API
export const supportsFileSystem = (): boolean => {
  return 'showOpenFilePicker' in window;
};

// Reduced motion
export const prefersReducedMotion = (): boolean => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
};

// Color scheme
export const prefersColorScheme = (): 'light' | 'dark' | 'no-preference' => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery.matches ? 'dark' : 'light';
};
```

---

## Success Criteria

This document is successful when:

1. ✅ Known limitations are documented and searchable
2. ✅ Developers don't rediscover already-known constraints
3. ✅ Limitations are transparent and actionable
4. ✅ Workarounds are provided for each limitation
5. ✅ Future enhancements are tracked and prioritized
6. ✅ Troubleshooting guide helps resolve common issues

---

## Contributing to This Document

When you discover a new limitation:

1. **Verify** it's not already documented
2. **Research** potential workarounds
3. **Test** the workaround on all platforms
4. **Document** the limitation with:
   - Clear description
   - Impact assessment
   - Working workaround (if available)
   - Current status
5. **Submit** a PR with the documentation

---

**Next:** [Frontend Architecture Contract](./frontend-architecture-contract.md) | [Frontend Semantic Component Checklist](./frontend-semantic-component-checklist.md)
