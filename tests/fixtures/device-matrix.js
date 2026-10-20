/**
 * Device Matrix Fixture (INV-DSF-02)
 * Single source of truth deriving Playwright execution contexts from registry profiles.
 */

import { BUILTIN_DEVICES } from '../../js/device-registry.js';

/**
 * Transforms a DeviceProfileV2 and orientation into Playwright BrowserContext options.
 * @param {Object} profile
 * @param {'portrait'|'landscape'} [orientation]
 * @returns {Object} Playwright context options
 */
export function toPlaywrightContext(profile, orientation = null) {
  if (!profile) throw new Error('profile is required');

  const activeOrientation = orientation || profile.defaultOrientation || 'portrait';
  const isLandscape = activeOrientation === 'landscape';

  // Base dimensions: phone/tablet are defined in portrait; desktop in landscape
  let width = profile.width;
  let height = profile.height;

  if (profile.defaultOrientation === 'portrait' && isLandscape) {
    width = profile.height;
    height = profile.width;
  } else if (profile.defaultOrientation === 'landscape' && !isLandscape) {
    width = profile.height;
    height = profile.width;
  }

  const contextOptions = {
    viewport: { width, height },
    deviceScaleFactor: profile.pixelRatio || 1,
    isMobile: profile.isMobile || false,
    hasTouch: profile.hasTouch || false
  };

  if (profile.userAgent) {
    contextOptions.userAgent = profile.userAgent;
  }

  return contextOptions;
}

/**
 * Generates an exhaustive device matrix across categories and orientations.
 * @param {Object} [options]
 * @param {string[]} [options.categories]
 * @param {Array<'portrait'|'landscape'>} [options.orientations=['portrait', 'landscape']]
 * @returns {Array<{ profile: Object, orientation: string, context: Object }>}
 */
export function deviceMatrix({
  categories = null,
  orientations = ['portrait', 'landscape']
} = {}) {
  const devices = categories
    ? BUILTIN_DEVICES.filter((d) => categories.includes(d.category))
    : BUILTIN_DEVICES;

  const matrix = [];
  for (const profile of devices) {
    for (const orientation of orientations) {
      matrix.push({
        profile,
        orientation,
        context: toPlaywrightContext(profile, orientation)
      });
    }
  }
  return matrix;
}
