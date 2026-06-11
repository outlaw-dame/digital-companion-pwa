/**
 * Capability Detection
 * 
 * Detects device capabilities using feature detection.
 * This is the ONLY place that should contain capability detection logic.
 * 
 * Do:
 * - Use feature detection over user agent sniffing
 * - Import from here for capability checks
 * 
 * Don't:
 * - Use navigator.userAgent for capability detection
 * - Duplicate capability detection elsewhere
 */

import { ref, computed } from 'vue';
import { useNativeUi } from './nativeUiProfile';

// Capability interface
export interface DeviceCapabilities {
  touch: boolean;
  passiveEvents: boolean;
  intersectionObserver: boolean;
  resizeObserver: boolean;
  webShare: boolean;
  fileSystemAccess: boolean;
  clipboard: boolean;
  webAuthn: boolean;
  webRTC: boolean;
  geolocation: boolean;
  notifications: boolean;
  serviceWorker: boolean;
  camera: boolean;
  microphone: boolean;
  ReducedMotion: boolean;
  prefersReducedMotion: boolean;
  prefersColorScheme: 'light' | 'dark' | 'no-preference';
}

// Detect touch support
function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Detect passive event listener support
function detectPassiveEvents(): boolean {
  if (typeof window === 'undefined') return false;
  
  let supportsPassive = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get: () => {
        supportsPassive = true;
        return true;
      },
    });
    window.addEventListener('test', () => {}, opts);
    window.removeEventListener('test', () => {}, opts);
  } catch (e) {
    // Error means passive events not supported
  }
  return supportsPassive;
}

// Detect Intersection Observer
function detectIntersectionObserver(): boolean {
  if (typeof window === 'undefined') return false;
  return 'IntersectionObserver' in window;
}

// Detect Resize Observer
function detectResizeObserver(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ResizeObserver' in window;
}

// Detect Web Share API
function detectWebShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'share' in navigator;
}

// Detect File System Access API
function detectFileSystemAccess(): boolean {
  if (typeof window === 'undefined') return false;
  return 'showOpenFilePicker' in window;
}

// Detect Clipboard API
function detectClipboard(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'clipboard' in navigator;
}

// Detect Web Authentication API
function detectWebAuthn(): boolean {
  if (typeof window === 'undefined') return false;
  return 'PublicKeyCredential' in window;
}

// Detect WebRTC
function detectWebRTC(): boolean {
  if (typeof window === 'undefined') return false;
  return 'RTCPeerConnection' in window;
}

// Detect Geolocation
function detectGeolocation(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'geolocation' in navigator;
}

// Detect Notifications
function detectNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

// Detect Service Worker
function detectServiceWorker(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'serviceWorker' in navigator;
}

// Detect Camera access (via Capacitor or browser)
function detectCamera(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check Capacitor Camera
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
    return true;
  }
  
  // Check browser MediaDevices
  return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
}

// Detect Microphone access
function detectMicrophone(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Check Capacitor Microphone
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Microphone) {
    return true;
  }
  
  // Check browser MediaDevices
  return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
}

// Detect reduced motion preference
function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Detect color scheme preference
function detectColorScheme(): 'light' | 'dark' | 'no-preference' {
  if (typeof window === 'undefined') return 'no-preference';
  
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const lightQuery = window.matchMedia('(prefers-color-scheme: light)');
  
  if (darkQuery.matches) {
    return 'dark';
  }
  if (lightQuery.matches) {
    return 'light';
  }
  return 'no-preference';
}

// Create capability detection as a composable
export function useCapability() {
  const touch = ref(detectTouch());
  const passiveEvents = ref(detectPassiveEvents());
  const intersectionObserver = ref(detectIntersectionObserver());
  const resizeObserver = ref(detectResizeObserver());
  const webShare = ref(detectWebShare());
  const fileSystemAccess = ref(detectFileSystemAccess());
  const clipboard = ref(detectClipboard());
  const webAuthn = ref(detectWebAuthn());
  const webRTC = ref(detectWebRTC());
  const geolocation = ref(detectGeolocation());
  const notifications = ref(detectNotifications());
  const serviceWorker = ref(detectServiceWorker());
  const camera = ref(detectCamera());
  const microphone = ref(detectMicrophone());
  
  // Use native UI for platform-specific capabilities
  const { isIOS, isAndroid } = useNativeUi();
  
  // Reduced motion preference
  const prefersReducedMotion = ref(detectReducedMotion());
  const ReducedMotion = computed(() => prefersReducedMotion.value);
  
  // Color scheme preference
  const prefersColorScheme = ref(detectColorScheme());
  
  // Media query listeners for preferences
  if (typeof window !== 'undefined') {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    reducedMotionQuery.addEventListener('change', (e) => {
      prefersReducedMotion.value = e.matches;
    });
    
    colorSchemeQuery.addEventListener('change', (e) => {
      prefersColorScheme.value = e.matches ? 'dark' : detectColorScheme();
    });
  }
  
  // Build capabilities object
  const capabilities = computed<DeviceCapabilities>(() => ({
    touch: touch.value,
    passiveEvents: passiveEvents.value,
    intersectionObserver: intersectionObserver.value,
    resizeObserver: resizeObserver.value,
    webShare: webShare.value,
    fileSystemAccess: fileSystemAccess.value,
    clipboard: clipboard.value,
    webAuthn: webAuthn.value,
    webRTC: webRTC.value,
    geolocation: geolocation.value,
    notifications: notifications.value,
    serviceWorker: serviceWorker.value,
    camera: camera.value,
    microphone: microphone.value,
    ReducedMotion: ReducedMotion.value,
    prefersReducedMotion: prefersReducedMotion.value,
    prefersColorScheme: prefersColorScheme.value,
  }));
  
  // Refresh function for testing
  const refresh = () => {
    touch.value = detectTouch();
    passiveEvents.value = detectPassiveEvents();
    intersectionObserver.value = detectIntersectionObserver();
    resizeObserver.value = detectResizeObserver();
    webShare.value = detectWebShare();
    fileSystemAccess.value = detectFileSystemAccess();
    clipboard.value = detectClipboard();
    webAuthn.value = detectWebAuthn();
    webRTC.value = detectWebRTC();
    geolocation.value = detectGeolocation();
    notifications.value = detectNotifications();
    serviceWorker.value = detectServiceWorker();
    camera.value = detectCamera();
    microphone.value = detectMicrophone();
    prefersReducedMotion.value = detectReducedMotion();
    prefersColorScheme.value = detectColorScheme();
  };
  
  return {
    touch,
    passiveEvents,
    intersectionObserver,
    resizeObserver,
    webShare,
    fileSystemAccess,
    clipboard,
    webAuthn,
    webRTC,
    geolocation,
    notifications,
    serviceWorker,
    camera,
    microphone,
    ReducedMotion,
    prefersReducedMotion,
    prefersColorScheme,
    capabilities,
    refresh,
  };
}

// Export for direct use
export const capabilityDetection = useCapability();

export default useCapability;
