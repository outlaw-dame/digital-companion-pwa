/**
 * Icon Registry
 * 
 * Central registry for all icons used in the application.
 * This is the ONLY place that can import Iconoir directly.
 * 
 * All icons must be registered here and accessed via <AppIcon name="..." />
 */

// Import Iconoir icons - THIS IS THE ONLY PLACE this is allowed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { mdiAccount, mdiCog, mdiHome, mdiMagnify, mdiMessage, mdiBell, 
  mdiHeart, mdiDotsVertical, mdiArrowLeft, mdiChevronLeft, mdiChevronRight,
  mdiPlus, mdiSend, mdiCamera, mdiImage, mdiPaperclip, mdiEmoticon, mdiClose,
  mdiSearch, mdiSettings, mdiTrendingUp, mdiFire, mdiClock, mdiCalendar,
  mdiMapMarker, mdiContentCopy, mdiContentPaste, mdiDelete, mdiEdit,
  mdiEye, mdiEyeOff, mdiCheck, mdiStar, mdiBookmark, mdiShare,
  mdiDownload, mdiUpload, mdiRefresh, mdiSync, mdiWifi, mdiCellphone,
  mdiEmail, mdiLock, mdiLockOpen, mdiAlert, mdiInformation, mdiCheckCircle,
  mdiCloseCircle, mdiPlay, mdiPause, mdiStop, mdiVolumeHigh, mdiVolumeOff
} from '@iconoir/core';

// Icon definition type
export interface IconDefinition {
  component: any;
  platforms: ('ios' | 'android' | 'pwa')[];
}

// Icon registry
export const iconRegistry = {
  // Navigation icons
  home: { component: mdiHome, platforms: ['ios', 'android', 'pwa'] },
  explore: { component: mdiTrendingUp, platforms: ['ios', 'android', 'pwa'] },
  messages: { component: mdiMessage, platforms: ['ios', 'android', 'pwa'] },
  notifications: { component: mdiBell, platforms: ['ios', 'android', 'pwa'] },
  profile: { component: mdiAccount, platforms: ['ios', 'android', 'pwa'] },
  settings: { component: mdiCog, platforms: ['ios', 'android', 'pwa'] },
  
  // Action icons
  back: { component: mdiArrowLeft, platforms: ['ios', 'android', 'pwa'] },
  close: { component: mdiClose, platforms: ['ios', 'android', 'pwa'] },
  add: { component: mdiPlus, platforms: ['ios', 'android', 'pwa'] },
  send: { component: mdiSend, platforms: ['ios', 'android', 'pwa'] },
  save: { component: mdiCheck, platforms: ['ios', 'android', 'pwa'] },
  edit: { component: mdiEdit, platforms: ['ios', 'android', 'pwa'] },
  delete: { component: mdiDelete, platforms: ['ios', 'android', 'pwa'] },
  share: { component: mdiShare, platforms: ['ios', 'android', 'pwa'] },
  copy: { component: mdiContentCopy, platforms: ['ios', 'android', 'pwa'] },
  paste: { component: mdiContentPaste, platforms: ['ios', 'android', 'pwa'] },
  
  // Media icons
  camera: { component: mdiCamera, platforms: ['ios', 'android', 'pwa'] },
  image: { component: mdiImage, platforms: ['ios', 'android', 'pwa'] },
  attachment: { component: mdiPaperclip, platforms: ['ios', 'android', 'pwa'] },
  emoji: { component: mdiEmoticon, platforms: ['ios', 'android', 'pwa'] },
  
  // Search icons
  search: { component: mdiMagnify, platforms: ['ios', 'android', 'pwa'] },
  
  // Social icons
  like: { component: mdiHeart, platforms: ['ios', 'android', 'pwa'] },
  bookmark: { component: mdiBookmark, platforms: ['ios', 'android', 'pwa'] },
  
  // Status icons
  loading: { component: mdiSync, platforms: ['ios', 'android', 'pwa'] },
  success: { component: mdiCheckCircle, platforms: ['ios', 'android', 'pwa'] },
  error: { component: mdiCloseCircle, platforms: ['ios', 'android', 'pwa'] },
  warning: { component: mdiAlert, platforms: ['ios', 'android', 'pwa'] },
  info: { component: mdiInformation, platforms: ['ios', 'android', 'pwa'] },
  
  // Media controls
  play: { component: mdiPlay, platforms: ['ios', 'android', 'pwa'] },
  pause: { component: mdiPause, platforms: ['ios', 'android', 'pwa'] },
  stop: { component: mdiStop, platforms: ['ios', 'android', 'pwa'] },
  volume: { component: mdiVolumeHigh, platforms: ['ios', 'android', 'pwa'] },
  mute: { component: mdiVolumeOff, platforms: ['ios', 'android', 'pwa'] },
  
  // Location
  location: { component: mdiMapMarker, platforms: ['ios', 'android', 'pwa'] },
  
  // Auth
  lock: { component: mdiLock, platforms: ['ios', 'android', 'pwa'] },
  unlock: { component: mdiLockOpen, platforms: ['ios', 'android', 'pwa'] },
  
  // Time
  time: { component: mdiClock, platforms: ['ios', 'android', 'pwa'] },
  calendar: { component: mdiCalendar, platforms: ['ios', 'android', 'pwa'] },
  
  // Connectivity
  wifi: { component: mdiWifi, platforms: ['ios', 'android', 'pwa'] },
  phone: { component: mdiCellphone, platforms: ['ios', 'android', 'pwa'] },
  email: { component: mdiEmail, platforms: ['ios', 'android', 'pwa'] },
  
  // Visibility
  visible: { component: mdiEye, platforms: ['ios', 'android', 'pwa'] },
  hidden: { component: mdiEyeOff, platforms: ['ios', 'android', 'pwa'] },
  
  // Star/favorite
  star: { component: mdiStar, platforms: ['ios', 'android', 'pwa'] },
  
  // Refresh
  refresh: { component: mdiRefresh, platforms: ['ios', 'android', 'pwa'] },
  
  // Download/upload
  download: { component: mdiDownload, platforms: ['ios', 'android', 'pwa'] },
  upload: { component: mdiUpload, platforms: ['ios', 'android', 'pwa'] },
  
  // More/kebab menu
  more: { component: mdiDotsVertical, platforms: ['ios', 'android', 'pwa'] },
  
  // Chevrons
  chevronLeft: { component: mdiChevronLeft, platforms: ['ios', 'android', 'pwa'] },
  chevronRight: { component: mdiChevronRight, platforms: ['ios', 'android', 'pwa'] },
  
  // Platform-specific back icons (iOS uses chevron, Android uses arrow)
  backIos: { component: mdiChevronLeft, platforms: ['ios'] },
  backAndroid: { component: mdiArrowLeft, platforms: ['android'] },
  backPwa: { component: mdiArrowLeft, platforms: ['pwa'] },
} as const satisfies Record<string, IconDefinition>;

// Platform-specific icon variants
export const platformIcons = {
  // Back button icon varies by platform
  back: {
    ios: 'backIos',
    android: 'backAndroid',
    pwa: 'backPwa',
  },
  
  // Home icon might have different styling but same icon
  home: {
    ios: 'home',
    android: 'home',
    pwa: 'home',
  },
  
  // Settings icon
  settings: {
    ios: 'settings',
    android: 'settings',
    pwa: 'settings',
  },
  
  // More menu
  more: {
    ios: 'more',
    android: 'more',
    pwa: 'more',
  },
} as const satisfies Record<string, Record<'ios' | 'android' | 'pwa', string>>;

// Get all registered icon names
export const iconNames = Object.keys(iconRegistry) as Array<keyof typeof iconRegistry>;

// Type-safe icon name type
export type IconName = keyof typeof iconRegistry;

// Validate icon name
export const isValidIcon = (name: string): name is IconName => {
  return name in iconRegistry;
};

// Get icon by name
export const getIcon = (name: IconName): IconDefinition => {
  return iconRegistry[name];
};

export default iconRegistry;
