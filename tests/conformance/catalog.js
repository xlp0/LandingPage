/**
 * Conformance Check Catalog (SPRINT-ERB-06 §2)
 * Central index of all device-sensitive conformance check modules.
 */

import noHorizontalOverflow from './checks/no-horizontal-overflow.js';
import noConsoleErrors from './checks/no-console-errors.js';
import keyTargetsVisible from './checks/key-targets-visible.js';
import breakpointLayout from './checks/breakpoint-layout.js';
import viewportMeta from './checks/viewport-meta.js';
import tapTargetSize from './checks/tap-target-size.js';
import hoverHasTouchPath from './checks/hover-has-touch-path.js';
import orientationPreservesState from './checks/orientation-preserves-state.js';
import frameBudget from './checks/frame-budget.js';
import layoutStability from './checks/layout-stability.js';
import dprAssets from './checks/dpr-assets.js';
import reducedMotion from './checks/reduced-motion.js';
import colorScheme from './checks/color-scheme.js';
import geolocationDenied from './checks/geolocation-denied.js';
import safeAreaInsets from './checks/safe-area-insets.js';

export const CHECK_CATALOG = {
  'no-horizontal-overflow': noHorizontalOverflow,
  'no-console-errors': noConsoleErrors,
  'key-targets-visible': keyTargetsVisible,
  'breakpoint-layout': breakpointLayout,
  'viewport-meta': viewportMeta,
  'tap-target-size': tapTargetSize,
  'hover-has-touch-path': hoverHasTouchPath,
  'orientation-preserves-state': orientationPreservesState,
  'frame-budget': frameBudget,
  'layout-stability': layoutStability,
  'dpr-assets': dprAssets,
  'reduced-motion': reducedMotion,
  'color-scheme': colorScheme,
  'geolocation-denied': geolocationDenied,
  'safe-area-insets': safeAreaInsets
};

export function getCheck(id) {
  return CHECK_CATALOG[id] || null;
}
