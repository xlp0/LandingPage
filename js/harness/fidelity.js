/**
 * Fidelity Resolver (INV-DSF-01, SPRINT-ERB-05 §5.3)
 * Maps runner types to emulation tiers (T0-T3) and accounts for active vs not-emulated capabilities.
 */

export const RUNNER_TIERS = Object.freeze({
  'lab-iframe': 0,
  'playwright': 1,
  'playwright-cdp': 2,
  'real-device': 3
});

export const CAPABILITY_TIER_MAP = Object.freeze({
  viewport: 0,
  pixelRatio: 1,
  hasTouch: 1,
  pointer: 1,
  hover: 1,
  isMobile: 1,
  userAgent: 1,
  colorScheme: 1,
  reducedMotion: 1,
  geolocation: 1,
  permissions: 1,
  locale: 1,
  timezone: 1,
  cpuThrottle: 2,
  network: 2,
  sensors: 2,
  screenOrientationApi: 3,
  safeAreaInsets: 3
});

/**
 * Resolves emulation tier and emulated / notEmulated capability lists.
 * @param {Object} profile DeviceProfileV2
 * @param {'lab-iframe'|'playwright'|'playwright-cdp'|'real-device'} runner
 * @param {Object} [runOptions={}]
 * @returns {Object} FidelityDeclaration
 */
export function resolveFidelity(profile, runner = 'lab-iframe', runOptions = {}) {
  const tier = RUNNER_TIERS[runner] !== undefined ? RUNNER_TIERS[runner] : 0;
  const emulated = [];
  const notEmulated = [];

  // Check profile-declared capabilities
  const declaredCapabilities = new Set(['viewport']);

  if (profile) {
    if (profile.pixelRatio && profile.pixelRatio !== 1) declaredCapabilities.add('pixelRatio');
    if (profile.hasTouch) declaredCapabilities.add('hasTouch');
    if (profile.pointer && profile.pointer === 'coarse') declaredCapabilities.add('pointer');
    if (profile.hover === false) declaredCapabilities.add('hover');
    if (profile.isMobile) declaredCapabilities.add('isMobile');
    if (profile.userAgent) declaredCapabilities.add('userAgent');
    if (profile.safeAreaInsets && (profile.safeAreaInsets.top > 0 || profile.safeAreaInsets.bottom > 0)) {
      declaredCapabilities.add('safeAreaInsets');
    }
  }

  // Check run options
  if (runOptions.colorScheme) declaredCapabilities.add('colorScheme');
  if (runOptions.reducedMotion) declaredCapabilities.add('reducedMotion');
  if (runOptions.network) declaredCapabilities.add('network');
  if (runOptions.cpuThrottle) declaredCapabilities.add('cpuThrottle');
  if (runOptions.screenOrientationApi) declaredCapabilities.add('screenOrientationApi');

  for (const cap of declaredCapabilities) {
    const requiredTier = CAPABILITY_TIER_MAP[cap] ?? 1;
    if (tier >= requiredTier) {
      emulated.push(cap);
    } else {
      notEmulated.push(cap);
    }
  }

  return {
    tier,
    runner,
    emulated: Object.freeze(emulated),
    notEmulated: Object.freeze(notEmulated)
  };
}
