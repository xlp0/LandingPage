/**
 * Lab Toolbar Controller
 * Populates target selector from app-config.json, updates diagnostics indicators,
 * manages direct URL typing omnibar, and coordinates target switching via TargetMembrane (INV-STU-01, INV-STU-02).
 */

import { validateLabConfig } from './target-membrane.js';

const FALLBACK_TARGETS = Object.freeze([
  {
    id: 'local-ui-app',
    url: 'app.html',
    label: 'Local UI Target (app.html) - Iframe Compatible',
    chipLabel: '⚡ app.html',
    targetType: 'webapp',
    status: 'allowed',
    quickLaunch: true,
    desc: 'Local Responsive UI Target (Iframe Compatible)'
  }
]);

const RECOVERABLE_STATES = new Set([
  'blocked',
  'capture-unavailable',
  'handshake-timeout',
  'custom-unapproved',
  'undecided-preview',
  'invalid-target'
]);

const POLICY_LABELS = Object.freeze({
  'approved-same-origin': 'Policy: Approved (Same-Origin)',
  'pending-handshake': 'Policy: Handshake Pending (5s max)',
  'approved-probe': 'Policy: Approved (Probe Connected)',
  'blocked': 'Policy: Blocked Frame Policy',
  'capture-unavailable': 'Policy: Capture Unavailable',
  'handshake-timeout': 'Policy: Handshake Timeout (Capture Unavailable)',
  'custom-unapproved': 'Policy: Custom Unapproved (Capture Disabled)',
  'undecided-preview': 'Policy: Undecided Class (Capture Disabled)',
  'invalid-target': 'Policy: Rejected Malformed/Unsafe URL'
});

export function normalizeInputUrl(raw) {
  if (!raw || typeof raw !== 'string') return 'app.html';
  const trimmed = raw.trim();
  if (!trimmed) return 'app.html';

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `http:${trimmed}`;
  }
  if (/\.html?([?#].*)?$/i.test(trimmed) || trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/.*)?$/i.test(trimmed) ||
      /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

export async function initLabToolbar(options = {}) {
  const {
    membrane,
    urlInput = (typeof document !== 'undefined' ? document.getElementById('target-url-input') : null),
    clearUrlBtn = (typeof document !== 'undefined' ? document.getElementById('btn-clear-target-url') : null),
    siteSelector = (typeof document !== 'undefined' ? document.getElementById('public-site-selector') : null),
    quickChipsContainer = (typeof document !== 'undefined' ? document.getElementById('target-quick-chips') : null),
    loadIframeBtn = (typeof document !== 'undefined' ? document.getElementById('btn-load-in-iframe') : null),
    popoutBtn = (typeof document !== 'undefined' ? document.getElementById('mission-control-popout-btn') : null),
    corsStatusPill = (typeof document !== 'undefined' ? document.getElementById('cors-status-pill') : null),
    targetTypeBadge = (typeof document !== 'undefined' ? document.getElementById('target-type-badge') : null),
    targetPolicyStatus = (typeof document !== 'undefined' ? document.getElementById('target-policy-status') : null),
    recoverBtn = (typeof document !== 'undefined' ? document.getElementById('btn-target-recover') : null),
    configUrl = '/app-config.json'
  } = options;

  const cleanupFns = [];
  let chipCleanupFns = [];
  let defaultTargetUrl = 'app.html';

  function listen(target, eventName, handler) {
    if (!target) return;
    target.addEventListener(eventName, handler);
    cleanupFns.push(() => target.removeEventListener(eventName, handler));
  }

  function clearChipListeners() {
    while (chipCleanupFns.length > 0) {
      const fn = chipCleanupFns.pop();
      try {
        fn();
      } catch {}
    }
  }

  function resolveCorsElements() {
    return {
      corsBlockAlert: options.corsBlockAlert || (typeof document !== 'undefined' ? document.getElementById('cors-block-alert') : null),
      corsBlockReason: options.corsBlockReason || (typeof document !== 'undefined' ? document.getElementById('cors-block-reason') : null),
      corsBlockTargetName: options.corsBlockTargetName || (typeof document !== 'undefined' ? document.getElementById('cors-block-target-name') : null)
    };
  }

  function findOptionIndex(url) {
    if (!siteSelector) return -1;
    for (let i = 0; i < siteSelector.options.length; i++) {
      if (siteSelector.options[i].value === url) {
        return i;
      }
    }
    return -1;
  }

  function ensureOptionExists(url, label = null) {
    if (!siteSelector) return -1;
    const existing = findOptionIndex(url);
    if (existing >= 0) return existing;

    const opt = document.createElement('option');
    opt.value = url;
    opt.textContent = label || (url.startsWith('http') ? `Chosen Target (${url})` : `Custom Target (${url})`);
    opt.setAttribute('data-status', 'unapproved');
    opt.setAttribute('data-target-type', 'custom');
    opt.setAttribute('data-desc', `Custom Target URL (${url})`);
    siteSelector.insertBefore(opt, siteSelector.firstChild);
    return 0;
  }

  function renderQuickLaunchChips(targets) {
    if (!quickChipsContainer || typeof document === 'undefined') return;
    clearChipListeners();
    quickChipsContainer.replaceChildren();

    const quickTargets = (Array.isArray(targets) ? targets : []).filter(
      (item) => item && item.quickLaunch === true && item.status === 'allowed'
    );

    for (const item of quickTargets) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'target-chip';
      chip.setAttribute('data-url', item.url);
      if (item.id) chip.setAttribute('data-target-id', item.id);
      if (item.targetType) chip.setAttribute('data-target-type', item.targetType);
      chip.title = item.desc || item.label || item.url;
      chip.textContent = item.chipLabel || item.label || item.url;
      const onChipClick = () => {
        applyTarget(item.url, 'preset-chip');
      };
      chip.addEventListener('click', onChipClick);
      chipCleanupFns.push(() => chip.removeEventListener('click', onChipClick));
      quickChipsContainer.appendChild(chip);
    }
  }

  function updateClearBtnVisibility() {
    if (!clearUrlBtn) return;
    if (urlInput && urlInput.value.trim().length > 0) {
      clearUrlBtn.style.display = 'inline-flex';
    } else {
      clearUrlBtn.style.display = 'none';
    }
  }

  function updateActiveChips(currentUrl) {
    if (typeof document === 'undefined' || !currentUrl) return;
    const chips = document.querySelectorAll('.target-chip');
    chips.forEach((chip) => {
      const chipUrl = chip.getAttribute('data-url');
      if (!chipUrl) return;
      const isMatch =
        chipUrl === currentUrl ||
        chipUrl === currentUrl.replace(/\/$/, '') ||
        `${chipUrl}/` === currentUrl;
      if (isMatch) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  function renderPolicyIndicators(effectiveDetail) {
    const targetType = effectiveDetail?.targetType || 'webapp';
    const policyState = effectiveDetail?.policyState || 'approved-same-origin';
    const reason = effectiveDetail?.reason || '';

    if (targetTypeBadge) {
      targetTypeBadge.textContent = `Type: ${targetType}`;
      targetTypeBadge.setAttribute('data-target-type', targetType);
    }

    if (targetPolicyStatus) {
      targetPolicyStatus.textContent = POLICY_LABELS[policyState] || `Policy: ${policyState}`;
      targetPolicyStatus.setAttribute('data-policy-state', policyState);
      targetPolicyStatus.title = reason || POLICY_LABELS[policyState] || policyState;
      if (RECOVERABLE_STATES.has(policyState)) {
        targetPolicyStatus.style.background = 'var(--badge-danger-bg)';
        targetPolicyStatus.style.color = 'var(--badge-danger-text)';
        targetPolicyStatus.style.borderColor = 'var(--badge-danger-border, var(--color-danger))';
      } else if (policyState === 'pending-handshake') {
        targetPolicyStatus.style.background = 'var(--overlay-soft)';
        targetPolicyStatus.style.color = 'var(--color-text-secondary)';
        targetPolicyStatus.style.borderColor = 'var(--color-border)';
      } else {
        targetPolicyStatus.style.background = 'var(--badge-success-bg)';
        targetPolicyStatus.style.color = 'var(--badge-success-text)';
        targetPolicyStatus.style.borderColor = 'var(--badge-success-border)';
      }
    }

    if (recoverBtn) {
      recoverBtn.style.display = RECOVERABLE_STATES.has(policyState) ? 'inline-flex' : 'none';
    }
  }

  function updateSiteSelection() {
    const { corsBlockAlert, corsBlockReason, corsBlockTargetName } = resolveCorsElements();
    const rejection = membrane?.getLastPolicyRejection?.();
    const membraneTarget = membrane?.getTarget();
    const effective = rejection || membraneTarget;

    const current = membraneTarget?.raw ||
      (siteSelector && siteSelector.selectedIndex >= 0 ? siteSelector.options[siteSelector.selectedIndex]?.value : (urlInput?.value || defaultTargetUrl));

    if (siteSelector && current && !rejection) {
      const idx = findOptionIndex(current);
      if (idx >= 0 && siteSelector.selectedIndex !== idx) {
        siteSelector.selectedIndex = idx;
      }
    }

    const selectedOption = siteSelector && siteSelector.selectedIndex >= 0 ? siteSelector.options[siteSelector.selectedIndex] : null;
    const status = effective?.status || selectedOption?.getAttribute('data-status') || 'allowed';
    const policyState = effective?.policyState || 'approved-same-origin';
    const reason = effective?.reason || selectedOption?.getAttribute('data-reason') || '';
    const name = selectedOption?.text?.split(' - ')[0] || current;

    if (urlInput && !urlInput.matches(':focus') && current && !rejection) {
      urlInput.value = current;
      updateClearBtnVisibility();
    }

    renderPolicyIndicators(effective);

    if (status === 'blocked' || policyState === 'blocked') {
      if (corsBlockAlert) corsBlockAlert.style.display = 'flex';
      if (corsBlockReason) corsBlockReason.textContent = reason || 'Blocked by frame policy';
      if (corsBlockTargetName) corsBlockTargetName.textContent = name;
      if (corsStatusPill) {
        corsStatusPill.textContent = `⚠️ Iframe Blocked (${reason || 'Frame Policy'})`;
        corsStatusPill.style.color = 'var(--badge-danger-text)';
      }
    } else {
      if (corsBlockAlert) corsBlockAlert.style.display = 'none';
      if (corsStatusPill) {
        if (RECOVERABLE_STATES.has(policyState)) {
          corsStatusPill.textContent = `⚠️ ${reason || POLICY_LABELS[policyState] || 'Capture Unavailable'}`;
          corsStatusPill.style.color = 'var(--badge-danger-text)';
        } else if (policyState === 'pending-handshake') {
          corsStatusPill.textContent = '● Cross-Origin Target (Awaiting Probe Handshake…)';
          corsStatusPill.style.color = 'var(--badge-info-text)';
        } else if (policyState === 'approved-probe') {
          corsStatusPill.textContent = '● Controlled Viewport Active (Probe Agent Connected)';
          corsStatusPill.style.color = 'var(--badge-success-text)';
        } else if (membraneTarget?.sameOrigin) {
          corsStatusPill.textContent = '● Controlled Viewport Active (Same-Origin Target)';
          corsStatusPill.style.color = 'var(--badge-success-text)';
        } else {
          corsStatusPill.textContent = '● Controlled Viewport Active (Iframe Compatible)';
          corsStatusPill.style.color = 'var(--badge-success-text)';
        }
      }
    }

    updateActiveChips(current);
  }

  function applyTarget(rawUrl, cause = 'user-input') {
    const normalized = normalizeInputUrl(rawUrl);
    if (urlInput && urlInput.value !== normalized) {
      urlInput.value = normalized;
    }
    updateClearBtnVisibility();

    let boundOk = false;
    if (membrane) {
      try {
        membrane.bindTarget(normalized, cause);
        boundOk = true;
      } catch (err) {
        console.warn('[lab-toolbar] bindTarget rejected:', err.message);
      }
    }

    if (boundOk && siteSelector) {
      const idx = ensureOptionExists(normalized);
      if (idx >= 0) {
        siteSelector.selectedIndex = idx;
      }
    }

    if (boundOk && typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const curUrl = new URL(window.location.href);
        curUrl.searchParams.set('target', normalized);
        window.history.replaceState(null, '', curUrl.toString());
      } catch {}
    }

    updateSiteSelection();
  }

  function recoverToDefaultTarget() {
    if (membrane?.recoverToDefault) {
      membrane.recoverToDefault(defaultTargetUrl);
    } else if (membrane) {
      membrane.bindTarget(defaultTargetUrl, 'policy-recover');
    }
    if (urlInput) {
      urlInput.value = defaultTargetUrl;
      updateClearBtnVisibility();
    }
    if (siteSelector) {
      const idx = findOptionIndex(defaultTargetUrl);
      if (idx >= 0) siteSelector.selectedIndex = idx;
    }
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const curUrl = new URL(window.location.href);
        curUrl.searchParams.set('target', defaultTargetUrl);
        window.history.replaceState(null, '', curUrl.toString());
      } catch {}
    }
    updateSiteSelection();
  }

  let configuredTargets = [...FALLBACK_TARGETS];
  try {
    const res = await fetch(configUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const validation = validateLabConfig(data);
      const candidateTargets = validation.ok
        ? data.labTargets
        : (Array.isArray(data.labTargets) && data.labTargets.length > 0 ? data.labTargets : FALLBACK_TARGETS);
      configuredTargets = candidateTargets;

      if (data.defaultTargetId) {
        const defEntry = configuredTargets.find((t) => t.id === data.defaultTargetId && t.status === 'allowed');
        if (defEntry?.url) {
          defaultTargetUrl = defEntry.url;
        }
      }
    }
  } catch (err) {
    console.warn('[lab-toolbar] Could not fetch app-config.json, using default target fallback:', err);
  }

  membrane?.setRegistry?.(configuredTargets);

  if (siteSelector) {
    siteSelector.replaceChildren();
    for (const item of configuredTargets) {
      const opt = document.createElement('option');
      opt.value = item.url;
      opt.textContent = item.label || item.url;
      opt.setAttribute('data-status', item.status || 'allowed');
      if (item.id) opt.setAttribute('data-target-id', item.id);
      if (item.targetType) opt.setAttribute('data-target-type', item.targetType);
      if (item.reason) opt.setAttribute('data-reason', item.reason);
      if (item.desc) opt.setAttribute('data-desc', item.desc);
      siteSelector.appendChild(opt);
    }
  }

  renderQuickLaunchChips(configuredTargets);

  const existingTarget = membrane?.getTarget();
  let initialTarget = existingTarget?.raw || defaultTargetUrl;
  let initialCause = existingTarget?.cause || 'boot-default';

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const targetParam = urlParams.get('target');
    if (targetParam) {
      initialTarget = targetParam;
      initialCause = 'boot-param';
    }
  }

  if (membrane && !existingTarget) {
    try {
      membrane.bindTarget(initialTarget, initialCause);
      if (siteSelector && initialTarget) {
        const idx = ensureOptionExists(
          initialTarget,
          `Chosen Target (${initialTarget}) - Configured`
        );
        if (idx >= 0) {
          siteSelector.selectedIndex = idx;
        }
      }
    } catch (err) {
      console.warn('[lab-toolbar] Rejected boot target parameter:', err.message);
    }
  } else if (siteSelector && initialTarget) {
    const idx = ensureOptionExists(initialTarget, `Chosen Target (${initialTarget}) - Configured`);
    if (idx >= 0) {
      siteSelector.selectedIndex = idx;
    }
  }

  if (urlInput) {
    urlInput.value = initialTarget;
    updateClearBtnVisibility();
  }

  listen(urlInput, 'input', () => {
    updateClearBtnVisibility();
  });

  listen(urlInput, 'keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyTarget(urlInput.value, 'url-input-enter');
    } else if (e.key === 'Escape') {
      urlInput.value = '';
      updateClearBtnVisibility();
    }
  });

  listen(clearUrlBtn, 'click', () => {
    if (urlInput) {
      urlInput.value = '';
      urlInput.focus();
      updateClearBtnVisibility();
    }
  });

  listen(loadIframeBtn, 'click', () => {
    const targetVal = urlInput && urlInput.value.trim() ? urlInput.value : (siteSelector?.value || defaultTargetUrl);
    applyTarget(targetVal, 'load-button');
  });

  listen(siteSelector, 'change', () => {
    if (siteSelector.selectedIndex >= 0) {
      const selectedVal = siteSelector.options[siteSelector.selectedIndex].value;
      applyTarget(selectedVal, 'dropdown-select');
    }
  });

  listen(recoverBtn, 'click', () => {
    recoverToDefaultTarget();
  });

  const recoverAlertBtn = typeof document !== 'undefined' ? document.getElementById('btn-cors-alert-recover') : null;
  listen(recoverAlertBtn, 'click', () => {
    recoverToDefaultTarget();
  });

  listen(popoutBtn, 'click', () => {
    const current = membrane?.getTarget()?.url || urlInput?.value || siteSelector?.value || defaultTargetUrl;
    window.open(current, '_blank');
  });

  if (typeof document !== 'undefined') {
    listen(document, 'lab:target-change', () => updateSiteSelection());
    listen(document, 'lab:target-policy-update', () => updateSiteSelection());
    listen(document, 'lab:target-policy-error', () => updateSiteSelection());
  }

  updateSiteSelection();

  function destroy() {
    clearChipListeners();
    while (cleanupFns.length > 0) {
      const fn = cleanupFns.pop();
      try {
        fn();
      } catch {}
    }
  }

  return {
    updateSiteSelection,
    recoverToDefaultTarget,
    getTarget: () => membrane?.getTarget(),
    setTarget: (url, cause = 'custom') => {
      applyTarget(url, cause);
    },
    destroy
  };
}
