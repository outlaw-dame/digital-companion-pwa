/**
 * Platform Index
 * 
 * Export all platform utilities for easy importing.
 * 
 * Usage:
 * import { useNativeUi, useCapability } from '@/platform';
 */

export { useNativeUi, nativeUi } from './nativeUiProfile';
export type { PlatformType, UIDialect, DeviceType, NativeUIProfile } from './nativeUiProfile';

export { useCapability, capabilityDetection } from './capabilityDetection';
export type { DeviceCapabilities } from './capabilityDetection';

export { useKeyboard } from './keyboardPolicy';
export type { KeyboardPolicy } from './keyboardPolicy';

export { useSafeArea } from './safeAreaPolicy';
export type { SafeAreaPolicy } from './safeAreaPolicy';

export { useHaptics } from './hapticPolicy';
export type { HapticPolicy } from './hapticPolicy';

export { useMotion } from './motionPolicy';
export type { MotionPolicy } from './motionPolicy';

export { platformIcons } from './platformIcons';
