# AppMediaViewer

## Purpose
Full-screen media viewer for images, videos, and other media content. Provides zoom, gesture navigation, and platform-appropriate styling.

## Usage

```vue
<AppMediaViewer 
  :images="mediaItems"
  @change="handleMediaChange"
/>
```

## Do
- Use for viewing full-screen media
- Support zoom and gesture navigation
- Provide appropriate captions
- Use for both images and videos
- Support lazy loading for performance

## Do Not
- Use raw Framework7 `<PhotoBrowser>`
- Create custom media viewer implementations
- Forget accessibility for media (alt text, captions)
- Use for non-media content
- Block zoom/gestures without justification

## Accessibility Rules
- Each media item must have appropriate alt text
- Captions must be readable by screen readers
- Focus must be trapped in viewer
- Keyboard navigation must work (Escape to close, arrows to navigate)
- Zoom controls must be accessible

## Platform Behavior
- **iOS**: 
  - Uses iOS-style navbar and toolbar
  - Supports native gesture navigation
  - Toolbar at bottom with safe area insets
- **Android/Material**:
  - Uses Material Design styling
  - Supports native back gesture
  - Toolbar at top
- **PWA**:
  - Uses desktop-appropriate styling
  - Supports keyboard navigation
  - Supports mouse wheel zoom

## Gesture Support
- **Pinch to zoom**: Zooms in/out on media
- **Swipe left/right**: Navigates between media items
- **Swipe down**: Closes viewer (if `swipeToClose` is true)
- **Double tap**: Toggles zoom

## Example

```vue
<!-- Basic usage -->
<AppMediaViewer :images="photos" />

<!-- With specific starting index -->
<AppMediaViewer :images="photos" :index="currentIndex" />

<!-- With custom toolbar -->
<AppMediaViewer :images="photos">
  <template #toolbar="{ index }">
    <div class="custom-toolbar">
      <AppButton icon="download" @click="downloadMedia(index)" />
      <AppButton icon="share" @click="shareMedia(index)" />
    </div>
  </template>
</AppMediaViewer>

<!-- With custom caption -->
<AppMediaViewer :images="photos">
  <template #caption="{ caption, index }">
    <div class="custom-caption">
      <strong>{{ caption.title }}</strong>
      <p>{{ caption.description }}</p>
    </div>
  </template>
</AppMediaViewer>

<!-- Manual control -->
<template>
  <AppButton @click="openViewer">Open Gallery</AppButton>
  <AppMediaViewer ref="viewer" :images="photos" />
</template>

<script setup>
import { ref } from 'vue';
import AppMediaViewer from '@/design/semantic/AppMediaViewer.vue';

const viewer = ref(null);
const photos = [...];

const openViewer = () => {
  viewer.value.open();
};

const openAtIndex = (index) => {
  viewer.value.openAt(index);
};
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `opened` | boolean | `false` | Viewer open state |
| `images` | Array | `[]` | Media items to display |
| `index` | number | `0` | Starting index |
| `theme` | string | `'auto'` | Theme: 'light', 'dark', 'auto' |
| `type` | string | `'standalone'` | Type: 'standalone', 'page', 'popover' |
| `navbar` | boolean | `true` | Show navbar |
| `toolbar` | boolean | `true` | Show toolbar |
| `swipeToClose` | boolean | `true` | Enable swipe to close |
| `zoom` | boolean | `true` | Enable zoom |
| `lazyLoading` | boolean | `true` | Lazy load images |
| `backdrop` | boolean | `true` | Show backdrop |
| `closeByBackdropClick` | boolean | `true` | Close on backdrop click |
| `closeByEscape` | boolean | `true` | Close on Escape key |

### Image Item Structure
```typescript
{
  url: string;           // Media URL
  caption?: string;      // Caption text
  width?: number;        // Image width
  height?: number;       // Image height
  alt?: string;          // Alternative text for accessibility
}
```

## Methods

| Method | Description |
|--------|-------------|
| `open()` | Opens the viewer |
| `close()` | Closes the viewer |
| `openAt(index)` | Opens viewer at specific index |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | - | Viewer opening |
| `opened` | - | Viewer opened |
| `close` | - | Viewer closing |
| `closed` | - | Viewer closed |
| `change` | `index` | Media changed |

## Test Expectations
- Must render with platform-appropriate styling
- Must open and close correctly
- Must navigate between items with swipe
- Must zoom in/out with pinch gesture
- Must close on swipe down (if enabled)
- Must close on Escape key
- Must close on backdrop click (if enabled)
- Must emit `change` event when navigating
- Must respect safe area insets
- Must handle keyboard navigation
- Must load images lazily (if enabled)
- Must show captions for each item
- Must handle rotation for images
- Must support videos with appropriate controls
