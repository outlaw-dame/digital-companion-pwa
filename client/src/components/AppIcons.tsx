/**
 * AppIcons — Platform-adaptive icon system
 *
 * Two tiers, in priority order:
 *
 *   1. Native emoji  — rendered by the OS emoji font (Apple Color Emoji on iOS/macOS,
 *                      Noto on Android). Use for semantic / expressive contexts.
 *                      No library, no overhead — the platform does the work.
 *
 *   2. Lucide icons  — stroke-width=1.5, round caps/joins by default. This is
 *                      SF Symbols' exact visual formula for web. Use for precision
 *                      UI chrome: buttons, inputs, navigation, actions.
 *
 * What NOT to use Lucide for: anything where native emoji is appropriate.
 * What NOT to use emoji for: anything that needs precise pixel alignment.
 */

import React from 'react';
import {
  ArrowUp,
  Search,
  X,
  Link,
  AlertTriangle,
  ChevronDown,
  Check,
  Wifi,
  WifiOff,
  Cpu,
  Sparkles,
  Settings,
  Trash2,
  type LucideProps,
} from 'lucide-react';

// ─── Shared style defaults ────────────────────────────────────────────────────
// stroke-width=1.5, round caps — matches SF Symbols' visual weight exactly.

const BASE: Partial<LucideProps> = {
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// ─── UI Chrome icons (Lucide) ─────────────────────────────────────────────────
// These need consistent sizing and optical precision — emoji won't do.

export const SendIcon    = (p: LucideProps) => <ArrowUp       {...BASE} {...p} />;
export const SearchIcon  = (p: LucideProps) => <Search        {...BASE} {...p} />;
export const CloseIcon   = (p: LucideProps) => <X             {...BASE} {...p} />;
export const LinkIcon    = (p: LucideProps) => <Link          {...BASE} {...p} />;
export const WarningIcon = (p: LucideProps) => <AlertTriangle {...BASE} {...p} />;
export const ChevronIcon = (p: LucideProps) => <ChevronDown   {...BASE} {...p} />;
export const CheckIcon   = (p: LucideProps) => <Check         {...BASE} {...p} />;
export const OnlineIcon  = (p: LucideProps) => <Wifi          {...BASE} {...p} />;
export const OfflineIcon = (p: LucideProps) => <WifiOff       {...BASE} {...p} />;
export const CpuIcon     = (p: LucideProps) => <Cpu           {...BASE} {...p} />;
export const SparkleIcon = (p: LucideProps) => <Sparkles      {...BASE} {...p} />;
export const SettingsIcon= (p: LucideProps) => <Settings      {...BASE} {...p} />;
export const TrashIcon   = (p: LucideProps) => <Trash2        {...BASE} {...p} />;

// ─── Native emoji constants ───────────────────────────────────────────────────
// Rendered by the OS — Apple Color Emoji on iOS/macOS, Noto on Android.
// Use for semantic/expressive contexts where platform character is a feature,
// not a bug. The ️ variation selector forces emoji (color) presentation.

export const EMOJI = {
  // Warnings & status
  warning:      '⚠️',   // ⚠️  — blocked links, errors
  link:         '🔗',          // link fallback in previews
  locked:       '🔒',
  unlock:       '🔓',

  // Entity / AI
  spark:        '✨',
  brain:        '🧠',
  eye:          '👁️',   // entity observing
  sync:         '🔄',

  // Status
  online:       '🟢',
  offline:      '🟡',
  error:        '🔴',
} as const;
