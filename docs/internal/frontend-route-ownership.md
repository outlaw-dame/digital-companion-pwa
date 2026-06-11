# Frontend Route Ownership Map

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-06-10  
**Related:** [Frontend Architecture Contract](./frontend-architecture-contract.md)

---

## Overview

This document maps every route in the application to its implementation details, ownership, and testing status. It provides a **single source of truth** for understanding where route logic belongs.

**Purpose:** *AI and developers can quickly find where logic belongs without guessing.*

---

## Route Map

### Authentication Routes

#### `/welcome`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/welcome` |
| **Route Component** | `client/src/views/WelcomeView.vue` |
| **Feature Folder** | `client/src/features/auth/` |
| **Stores Used** | `useAuthStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppButton`, `AppIcon` |
| **Platform-Specific** | Detects installed state (PWA/native), handles auth shell hiding |
| **Tests Covering** | `tests/e2e/smoke/auth.spec.ts`, `tests/unit/views/WelcomeView.spec.ts` |
| **Known Gaps** | Platform-specific welcome text variants |
| **Owner** | @auth-team |

**Dependencies:**
- `features/auth/useWelcome.ts` - Welcome screen logic
- `stores/useAuthStore.ts` - Auth state
- `platform/nativeUiProfile.ts` - Platform detection

---

#### `/signin`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/signin` |
| **Route Component** | `client/src/views/SignInView.vue` |
| **Feature Folder** | `client/src/features/auth/` |
| **Stores Used** | `useAuthStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppTextField`, `AppButton`, `AppIcon`, `AppToast` |
| **Platform-Specific** | Keyboard handling for form inputs, safe area insets |
| **Tests Covering** | `tests/e2e/smoke/auth.spec.ts`, `tests/unit/views/SignInView.spec.ts`, `tests/e2e/accessibility/signin.spec.ts` |
| **Known Gaps** | Biometric authentication (future) |
| **Owner** | @auth-team |

**Dependencies:**
- `features/auth/SignInForm.vue` - Sign in form component
- `features/auth/useSignIn.ts` - Sign in logic
- `stores/useAuthStore.ts` - Auth state and API
- `platform/keyboardPolicy.ts` - Keyboard handling

---

### Main App Routes

#### `/` (Home/Feed)

| Aspect | Details |
|--------|---------|
| **Route Path** | `/` |
| **Route Component** | `client/src/views/HomeView.vue` |
| **Feature Folder** | `client/src/features/feed/` |
| **Stores Used** | `useMessageStore`, `useAuthStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppToolbar`, `AppList`, `AppListItem`, `AppPullToRefresh`, `AppComposer` |
| **Platform-Specific** | Pull-to-refresh behavior, infinite scroll, composer keyboard handling |
| **Tests Covering** | `tests/e2e/smoke/feed.spec.ts`, `tests/unit/views/HomeView.spec.ts`, `tests/e2e/accessibility/feed.spec.ts` |
| **Known Gaps** | Native pull-to-refresh on iOS Safari |
| **Owner** | @feed-team |

**Dependencies:**
- `features/feed/FeedList.vue` - Feed list component
- `features/feed/MessageComposer.vue` - Message composer
- `features/feed/useFeed.ts` - Feed logic
- `features/feed/useFeedScroll.ts` - Scroll handling
- `stores/useMessageStore.ts` - Message state
- `platform/keyboardPolicy.ts` - Keyboard handling
- `platform/safeAreaPolicy.ts` - Safe area for composer

---

#### `/explore`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/explore` |
| **Route Component** | `client/src/views/ExploreView.vue` |
| **Feature Folder** | `client/src/features/explore/` |
| **Stores Used** | `useExploreStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppSearchBar`, `AppTabBar`, `AppSegmentedControl`, `AppGroupedList`, `AppListItem` |
| **Platform-Specific** | Search input focus, tab selection persistence, keyboard handling |
| **Tests Covering** | `tests/e2e/smoke/explore.spec.ts`, `tests/unit/views/ExploreView.spec.ts`, `tests/unit/features/explore/useExploreSearch.spec.ts` |
| **Known Gaps** | Search debounce optimization |
| **Owner** | @explore-team |

**Dependencies:**
- `features/explore/ExploreSearch.vue` - Search component
- `features/explore/ExploreResults.vue` - Results list
- `features/explore/ExploreCategories.vue` - Category tabs
- `features/explore/useExploreSearch.ts` - Search logic
- `stores/useExploreStore.ts` - Explore state

---

### Content Routes

#### `/thread/:id`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/thread/:id` |
| **Route Component** | `client/src/views/ThreadView.vue` |
| **Feature Folder** | `client/src/features/thread/` |
| **Stores Used** | `useMessageStore`, `useThreadStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppList`, `AppListItem`, `AppComposer`, `AppMediaViewer` |
| **Platform-Specific** | Thread loading state, message grouping, media viewer |
| **Tests Covering** | `tests/e2e/smoke/thread.spec.ts`, `tests/unit/views/ThreadView.spec.ts`, `tests/unit/features/thread/useThread.spec.ts` |
| **Known Gaps** | Thread pagination, media optimization |
| **Owner** | @thread-team |

**Dependencies:**
- `features/thread/ThreadHeader.vue` - Thread header
- `features/thread/MessageList.vue` - Message list
- `features/thread/ThreadComposer.vue` - Reply composer
- `features/thread/useThread.ts` - Thread logic
- `stores/useThreadStore.ts` - Thread state
- `components/MessageBubble.vue` - Message bubble
- `components/PostLinkPreview.vue` - Link previews
- `components/PostEmbedCard.vue` - Embed cards

---

#### `/story/:id`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/story/:id` |
| **Route Component** | `client/src/views/StoryView.vue` |
| **Feature Folder** | `client/src/features/story/` |
| **Stores Used** | `useStoryStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppMediaViewer`, `AppComposer` |
| **Platform-Specific** | Story viewer, swipe navigation, safe area handling |
| **Tests Covering** | `tests/e2e/smoke/story.spec.ts`, `tests/unit/views/StoryView.spec.ts` |
| **Known Gaps** | Story expiration handling |
| **Owner** | @story-team |

**Dependencies:**
- `features/story/StoryViewer.vue` - Story viewer component
- `features/story/StoryControls.vue` - Story controls
- `features/story/useStory.ts` - Story logic
- `stores/useStoryStore.ts` - Story state
- `platform/motionPolicy.ts` - Reduced motion handling

---

### Messaging Routes

#### `/messages`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/messages` |
| **Route Component** | `client/src/views/MessagesView.vue` |
| **Feature Folder** | `client/src/features/messages/` |
| **Stores Used** | `useMessageStore`, `useConversationStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppList`, `AppListItem`, `AppSearchBar` |
| **Platform-Specific** | Conversation list, search, pull-to-refresh |
| **Tests Covering** | `tests/e2e/smoke/messages.spec.ts`, `tests/unit/views/MessagesView.spec.ts` |
| **Known Gaps** | Conversation grouping, search optimization |
| **Owner** | @messaging-team |

**Dependencies:**
- `features/messages/ConversationList.vue` - Conversation list
- `features/messages/MessageSearch.vue` - Message search
- `features/messages/useMessages.ts` - Messages logic
- `stores/useConversationStore.ts` - Conversation state

---

#### `/messages/:conversationId`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/messages/:conversationId` |
| **Route Component** | `client/src/views/ConversationView.vue` |
| **Feature Folder** | `client/src/features/messages/` |
| **Stores Used** | `useMessageStore`, `useConversationStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppToolbar`, `AppList`, `AppListItem`, `AppComposer`, `AppMediaViewer` |
| **Platform-Specific** | Message list, composer, media handling, keyboard |
| **Tests Covering** | `tests/e2e/smoke/messages.spec.ts`, `tests/unit/views/ConversationView.spec.ts` |
| **Known Gaps** | Message pagination, typing indicators |
| **Owner** | @messaging-team |

**Dependencies:**
- `features/messages/MessageList.vue` - Message list
- `features/messages/ConversationHeader.vue` - Conversation header
- `features/messages/MessageComposer.vue` - Message composer
- `features/messages/useConversation.ts` - Conversation logic

---

### Social Routes

#### `/notifications`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/notifications` |
| **Route Component** | `client/src/views/NotificationsView.vue` |
| **Feature Folder** | `client/src/features/notifications/` |
| **Stores Used** | `useNotificationStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppList`, `AppListItem`, `AppPullToRefresh` |
| **Platform-Specific** | Notification list, grouping, actions |
| **Tests Covering** | `tests/e2e/smoke/notifications.spec.ts`, `tests/unit/views/NotificationsView.spec.ts` |
| **Known Gaps** | Push notification handling, grouping logic |
| **Owner** | @notifications-team |

**Dependencies:**
- `features/notifications/NotificationList.vue` - Notification list
- `features/notifications/NotificationRow.vue` - Notification row
- `features/notifications/useNotifications.ts` - Notifications logic
- `stores/useNotificationStore.ts` - Notification state
- `components/NotificationRow.vue` - Shared notification row

---

### User Routes

#### `/profile/:username`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/profile/:username` |
| **Route Component** | `client/src/views/ProfileView.vue` |
| **Feature Folder** | `client/src/features/profile/` |
| **Stores Used** | `useProfileStore`, `useAuthStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppToolbar`, `AppGroupedList`, `AppListItem` |
| **Platform-Specific** | Profile header, tab navigation, safe area |
| **Tests Covering** | `tests/e2e/smoke/profile.spec.ts`, `tests/unit/views/ProfileView.spec.ts` |
| **Known Gaps** | Profile caching, follow state synchronization |
| **Owner** | @profile-team |

**Dependencies:**
- `features/profile/ProfileHeader.vue` - Profile header
- `features/profile/ProfileTabs.vue` - Profile tabs
- `features/profile/ProfileContent.vue` - Profile content
- `features/profile/useProfile.ts` - Profile logic
- `stores/useProfileStore.ts` - Profile state
- `components/ProfileHeader.vue` - Shared profile header

---

#### `/settings`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/settings` |
| **Route Component** | `client/src/views/SettingsView.vue` |
| **Feature Folder** | `client/src/features/settings/` |
| **Stores Used** | `useSettingsStore`, `useAuthStore` |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppGroupedList`, `AppListItem`, `AppButton` |
| **Platform-Specific** | Settings sections, safe area, platform-specific options |
| **Tests Covering** | `tests/e2e/smoke/settings.spec.ts`, `tests/unit/views/SettingsView.spec.ts`, `tests/e2e/accessibility/settings.spec.ts` |
| **Known Gaps** | Platform-specific settings synchronization |
| **Owner** | @settings-team |

**Dependencies:**
- `features/settings/SettingsSection.vue` - Settings section
- `features/settings/SettingsRow.vue` - Settings row
- `features/settings/useSettings.ts` - Settings logic
- `stores/useSettingsStore.ts` - Settings state
- `components/SettingsRow.vue` - Shared settings row

---

### Media Routes

#### `/media/:id`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/media/:id` |
| **Route Component** | `client/src/views/MediaView.vue` |
| **Feature Folder** | `client/src/features/media/` |
| **Stores Used** | `useMediaStore` |
| **Semantic Primitives** | `AppPage`, `AppMediaViewer` |
| **Platform-Specific** | Media viewer, zoom, navigation |
| **Tests Covering** | `tests/e2e/smoke/media.spec.ts`, `tests/unit/views/MediaView.spec.ts` |
| **Known Gaps** | Video playback controls, media caching |
| **Owner** | @media-team |

**Dependencies:**
- `features/media/MediaViewerWrapper.vue` - Media viewer wrapper
- `features/media/useMedia.ts` - Media logic
- `stores/useMediaStore.ts` - Media state

---

### Error Routes

#### `/404`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/404` |
| **Route Component** | `client/src/views/NotFoundView.vue` |
| **Feature Folder** | `client/src/features/errors/` |
| **Stores Used** | None |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppButton` |
| **Platform-Specific** | None |
| **Tests Covering** | `tests/unit/views/NotFoundView.spec.ts` |
| **Known Gaps** | Custom error handling |
| **Owner** | @platform-team |

---

#### `/error`

| Aspect | Details |
|--------|---------|
| **Route Path** | `/error` |
| **Route Component** | `client/src/views/ErrorView.vue` |
| **Feature Folder** | `client/src/features/errors/` |
| **Stores Used** | None |
| **Semantic Primitives** | `AppPage`, `AppNavbar`, `AppButton` |
| **Platform-Specific** | None |
| **Tests Covering** | `tests/unit/views/ErrorView.spec.ts` |
| **Known Gaps** | Error reporting integration |
| **Owner** | @platform-team |

---

## Route Ownership Summary

### By Team

| Team | Routes | Components |
|------|--------|------------|
| @auth-team | `/welcome`, `/signin` | `WelcomeView`, `SignInView` |
| @feed-team | `/` | `HomeView` |
| @explore-team | `/explore` | `ExploreView` |
| @thread-team | `/thread/:id` | `ThreadView` |
| @story-team | `/story/:id` | `StoryView` |
| @messaging-team | `/messages`, `/messages/:conversationId` | `MessagesView`, `ConversationView` |
| @notifications-team | `/notifications` | `NotificationsView` |
| @profile-team | `/profile/:username` | `ProfileView` |
| @settings-team | `/settings` | `SettingsView` |
| @media-team | `/media/:id` | `MediaView` |
| @platform-team | `/404`, `/error` | `NotFoundView`, `ErrorView` |

### By Feature

| Feature | Routes | Feature Folder |
|---------|--------|---------------|
| Authentication | `/welcome`, `/signin` | `features/auth/` |
| Feed | `/` | `features/feed/` |
| Explore | `/explore` | `features/explore/` |
| Threads | `/thread/:id` | `features/thread/` |
| Stories | `/story/:id` | `features/story/` |
| Messages | `/messages`, `/messages/:conversationId` | `features/messages/` |
| Notifications | `/notifications` | `features/notifications/` |
| Profile | `/profile/:username` | `features/profile/` |
| Settings | `/settings` | `features/settings/` |
| Media | `/media/:id` | `features/media/` |
| Errors | `/404`, `/error` | `features/errors/` |

---

## Shared Components Usage

### Components Used Across Routes

| Component | Used In Routes | Feature |
|-----------|----------------|---------|
| `AppRoot` | All | Shell |
| `AppPage` | All | Shell |
| `AppNavbar` | All (except some modals) | Navigation |
| `AppTabBar` | `/`, `/explore`, `/messages`, `/profile` | Navigation |
| `AppList` | `/`, `/explore`, `/messages`, `/notifications`, `/settings` | Lists |
| `AppListItem` | Most routes | Lists |
| `AppSearchBar` | `/explore`, `/messages` | Search |
| `AppComposer` | `/`, `/thread/:id`, `/messages/:conversationId` | Input |
| `AppMediaViewer` | `/thread/:id`, `/story/:id`, `/media/:id` | Media |
| `AppButton` | All | Actions |
| `AppIcon` | All | Icons |
| `AppToast` | Many | Notifications |
| `AppDialog` | Many | Modals |
| `AppActionSheet` | Many | Actions |
| `PostLinkPreview` | `/`, `/thread/:id` | Rich content |
| `PostEmbedCard` | `/`, `/thread/:id` | Rich content |
| `MessageBubble` | `/`, `/thread/:id`, `/messages/:conversationId` | Messaging |
| `ThreadSummary` | `/explore`, `/profile/:username` | Preview |
| `ProfileHeader` | `/profile/:username` | Profile |
| `NotificationRow` | `/notifications` | Notifications |
| `SettingsRow` | `/settings` | Settings |
| `ExploreRow` | `/explore` | Explore |
| `StoryControls` | `/story/:id` | Stories |

---

## Platform-Specific Behavior by Route

| Route | Platform-Specific Behavior |
|-------|----------------------------|
| `/welcome` | Installed state detection, auth shell hiding |
| `/signin` | Keyboard handling, safe area for form |
| `/` | Pull-to-refresh, infinite scroll, composer keyboard |
| `/explore` | Search focus, tab selection, keyboard |
| `/thread/:id` | Media viewer, swipe navigation |
| `/story/:id` | Story viewer, swipe navigation, safe area |
| `/messages` | Search, pull-to-refresh |
| `/messages/:conversationId` | Composer, media viewer, keyboard |
| `/notifications` | Pull-to-refresh, grouping |
| `/profile/:username` | Tabs, safe area |
| `/settings` | Safe area, platform-specific options |
| `/media/:id` | Media viewer, zoom |

---

## Testing Coverage by Route

### E2E Smoke Tests

| Route | Smoke Test | Status |
|-------|------------|--------|
| `/welcome` | `tests/e2e/smoke/auth.spec.ts` | ✅ |
| `/signin` | `tests/e2e/smoke/auth.spec.ts` | ✅ |
| `/` | `tests/e2e/smoke/feed.spec.ts` | ✅ |
| `/explore` | `tests/e2e/smoke/explore.spec.ts` | ✅ |
| `/thread/:id` | `tests/e2e/smoke/thread.spec.ts` | ✅ |
| `/story/:id` | `tests/e2e/smoke/story.spec.ts` | ✅ |
| `/messages` | `tests/e2e/smoke/messages.spec.ts` | ✅ |
| `/messages/:conversationId` | `tests/e2e/smoke/messages.spec.ts` | ✅ |
| `/notifications` | `tests/e2e/smoke/notifications.spec.ts` | ✅ |
| `/profile/:username` | `tests/e2e/smoke/profile.spec.ts` | ✅ |
| `/settings` | `tests/e2e/smoke/settings.spec.ts` | ✅ |
| `/media/:id` | `tests/e2e/smoke/media.spec.ts` | ✅ |

### Accessibility Tests

| Route | Accessibility Test | Status |
|-------|-------------------|--------|
| `/welcome` | `tests/e2e/accessibility/welcome.spec.ts` | ✅ |
| `/signin` | `tests/e2e/accessibility/signin.spec.ts` | ✅ |
| `/` | `tests/e2e/accessibility/feed.spec.ts` | ✅ |
| `/explore` | `tests/e2e/accessibility/explore.spec.ts` | ✅ |
| `/thread/:id` | `tests/e2e/accessibility/thread.spec.ts` | ⚠️ Planned |
| `/messages` | `tests/e2e/accessibility/messages.spec.ts` | ✅ |
| `/profile/:username` | `tests/e2e/accessibility/profile.spec.ts` | ⚠️ Planned |
| `/settings` | `tests/e2e/accessibility/settings.spec.ts` | ✅ |

### Unit Tests

| Route | Unit Test | Status |
|-------|-----------|--------|
| `/welcome` | `tests/unit/views/WelcomeView.spec.ts` | ✅ |
| `/signin` | `tests/unit/views/SignInView.spec.ts` | ✅ |
| `/` | `tests/unit/views/HomeView.spec.ts` | ✅ |
| `/explore` | `tests/unit/views/ExploreView.spec.ts` | ✅ |
| `/thread/:id` | `tests/unit/views/ThreadView.spec.ts` | ✅ |
| `/story/:id` | `tests/unit/views/StoryView.spec.ts` | ✅ |
| `/messages` | `tests/unit/views/MessagesView.spec.ts` | ✅ |
| `/messages/:conversationId` | `tests/unit/views/ConversationView.spec.ts` | ✅ |
| `/notifications` | `tests/unit/views/NotificationsView.spec.ts` | ✅ |
| `/profile/:username` | `tests/unit/views/ProfileView.spec.ts` | ✅ |
| `/settings` | `tests/unit/views/SettingsView.spec.ts` | ✅ |
| `/media/:id` | `tests/unit/views/MediaView.spec.ts` | ✅ |
| `/404` | `tests/unit/views/NotFoundView.spec.ts` | ✅ |
| `/error` | `tests/unit/views/ErrorView.spec.ts` | ✅ |

---

## Architecture Compliance by Route

### Semantic Component Usage

| Route | All Semantic | Custom Components | Status |
|-------|--------------|-------------------|--------|
| `/welcome` | ✅ | None | ✅ |
| `/signin` | ✅ | None | ✅ |
| `/` | ✅ | MessageBubble, PostLinkPreview, PostEmbedCard | ⚠️ Accepted |
| `/explore` | ✅ | ThreadSummary, ExploreRow | ⚠️ Accepted |
| `/thread/:id` | ✅ | MessageBubble, PostLinkPreview, PostEmbedCard, ThreadSummary | ⚠️ Accepted |
| `/story/:id` | ✅ | StoryControls | ⚠️ Accepted |
| `/messages` | ✅ | None | ✅ |
| `/messages/:conversationId` | ✅ | MessageBubble | ⚠️ Accepted |
| `/notifications` | ✅ | NotificationRow | ⚠️ Accepted |
| `/profile/:username` | ✅ | ProfileHeader | ⚠️ Accepted |
| `/settings` | ✅ | SettingsRow | ⚠️ Accepted |
| `/media/:id` | ✅ | None | ✅ |
| `/404` | ✅ | None | ✅ |
| `/error` | ✅ | None | ✅ |

### Import Boundary Compliance

| Route | Raw Framework7 | Raw Capacitor | Raw Iconoir | Status |
|-------|----------------|---------------|-------------|--------|
| `/welcome` | ❌ | ❌ | ❌ | ✅ |
| `/signin` | ❌ | ❌ | ❌ | ✅ |
| `/` | ❌ | ❌ | ❌ | ✅ |
| `/explore` | ❌ | ❌ | ❌ | ✅ |
| `/thread/:id` | ❌ | ❌ | ❌ | ✅ |
| `/story/:id` | ❌ | ❌ | ❌ | ✅ |
| `/messages` | ❌ | ❌ | ❌ | ✅ |
| `/messages/:conversationId` | ❌ | ❌ | ❌ | ✅ |
| `/notifications` | ❌ | ❌ | ❌ | ✅ |
| `/profile/:username` | ❌ | ❌ | ❌ | ✅ |
| `/settings` | ❌ | ❌ | ❌ | ✅ |
| `/media/:id` | ❌ | ❌ | ❌ | ✅ |
| `/404` | ❌ | ❌ | ❌ | ✅ |
| `/error` | ❌ | ❌ | ❌ | ✅ |

---

## Known Gaps and Future Work

### High Priority

| Route | Gap | Impact | Planned Fix |
|-------|-----|--------|------------|
| `/` | Thread pagination | Infinite scroll not implemented | Q3 2026 |
| `/thread/:id` | Message grouping | Messages not grouped by time | Q3 2026 |
| `/messages/:conversationId` | Typing indicators | No typing indicators | Q3 2026 |

### Medium Priority

| Route | Gap | Impact | Planned Fix |
|-------|-----|--------|------------|
| `/explore` | Search debounce | Search may fire too frequently | Q4 2026 |
| `/profile/:username` | Profile caching | Profile data re-fetched on each visit | Q4 2026 |
| `/notifications` | Grouping logic | Notifications not grouped by time | Q4 2026 |

### Low Priority

| Route | Gap | Impact | Planned Fix |
|-------|-----|--------|------------|
| `/settings` | Platform sync | Settings not synced across devices | 2027 |
| `/media/:id` | Video controls | Custom video controls needed | 2027 |

---

## Contributing to This Document

When adding a new route:

1. **Add route entry** to this document with all required information
2. **Specify owner** (team or individual)
3. **Document dependencies** (stores, features, composables)
4. **Link tests** (unit, E2E, accessibility)
5. **Note known gaps** with impact and planned fixes
6. **Update architecture compliance** section

When modifying an existing route:

1. **Update route entry** if dependencies change
2. **Update testing coverage** if new tests added
3. **Update known gaps** if new limitations discovered
4. **Update architecture compliance** if boundaries change

---

## Success Criteria

This document is successful when:

1. ✅ Every route has a documented entry
2. ✅ Ownership is clear for every route
3. ✅ Dependencies are documented for every route
4. ✅ Testing coverage is tracked for every route
5. ✅ Known gaps are visible and prioritized
6. ✅ AI and developers can find route logic without guessing

---

## Quick Reference

### Find Route Implementation
```bash
# List all route components
grep -r "Route.*path.*:" client/src/router/ client/src/views/

# Find route by path
grep -r "/explore" client/src/
```

### Verify Route Compliance
```bash
# Check for raw Framework7 imports in route
bun run check:architecture --route /explore

# Run route-specific tests
bun run test:unit tests/unit/views/ExploreView.spec.ts
bun run test:e2e tests/e2e/smoke/explore.spec.ts
```

---

**Next:** [Frontend Architecture Contract](./frontend-architecture-contract.md) | [Frontend PR Checklist](./frontend-pr-checklist.md)
