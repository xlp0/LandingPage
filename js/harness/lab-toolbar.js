/**
 * Lab Toolbar Controller
 * Populates target selector from app-config.json, updates diagnostics indicators,
 * manages direct URL typing omnibar, and coordinates target switching via TargetMembrane (INV-STU-01, INV-STU-02).
 */

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
    loadIframeBtn = (typeof document !== 'undefined' ? document.getElementById('btn-load-in-iframe') : null),
    popoutBtn = (typeof document !== 'undefined' ? document.getElementById('mission-control-popout-btn') : null),
    corsStatusPill = (typeof document !== 'undefined' ? document.getElementById('cors-status-pill') : null),
    configUrl = '/app-config.json'
  } = options;

  const cleanupFns = [];

  function listen(target, eventName, handler) {
    if (!target) return;
    target.addEventListener(eventName, handler);
    cleanupFns.push(() => target.removeEventListener(eventName, handler));
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
    opt.textContent = label || (url.startsWith('http') ? url : `Custom Target (${url})`);
    opt.setAttribute('data-status', 'allowed');
    opt.setAttribute('data-desc', `Custom Target URL (${url})`);
    siteSelector.insertBefore(opt, siteSelector.firstChild);
    return 0;
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
    if (typeof document === 'undefined') return;
    const chips = document.querySelectorAll('.target-chip');
    chips.forEach((chip) => {
      const chipUrl = chip.getAttribute('data-url');
      if (!chipUrl) return;
      const isMatch = (chipUrl === currentUrl) ||
        (chipUrl === currentUrl.replace(/\/$/, '')) ||
        (`${chipUrl}/` === currentUrl);
      if (isMatch) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  function updateSiteSelection() {
    const { corsBlockAlert, corsBlockReason, corsBlockTargetName } = resolveCorsElements();
    const membraneTarget = membrane?.getTarget();
    const current = membraneTarget?.raw ||
      (siteSelector && siteSelector.selectedIndex >= 0 ? siteSelector.options[siteSelector.selectedIndex]?.value : (urlInput?.value || 'app.html'));

    const selectedOption = siteSelector && siteSelector.selectedIndex >= 0 ? siteSelector.options[siteSelector.selectedIndex] : null;
    const status = selectedOption?.getAttribute('data-status');
    const reason = selectedOption?.getAttribute('data-reason') || '';
    const name = selectedOption?.text?.split(' - ')[0] || current;

    if (urlInput && !urlInput.matches(':focus') && current) {
      urlInput.value = current;
      updateClearBtnVisibility();
    }

    if (status === 'blocked') {
      if (corsBlockAlert) corsBlockAlert.style.display = 'flex';
      if (corsBlockReason) corsBlockReason.textContent = reason;
      if (corsBlockTargetName) corsBlockTargetName.textContent = name;
      if (corsStatusPill) {
        corsStatusPill.textContent = '⚠️ Iframe Blocked (' + reason + ')';
        corsStatusPill.style.color = 'var(--badge-danger-text)';
      }
    } else {
      if (corsBlockAlert) corsBlockAlert.style.display = 'none';
      if (corsStatusPill) {
        if (membraneTarget?.sameOrigin) {
          corsStatusPill.textContent = '● Controlled Viewport Active (Same-Origin Target)';
        } else if (membraneTarget) {
          corsStatusPill.textContent = '● Controlled Viewport Active (Cross-Origin Target)';
        } else {
          corsStatusPill.textContent = '● Controlled Viewport Active (Iframe Compatible)';
        }
        corsStatusPill.style.color = 'var(--badge-success-text)';
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

    if (siteSelector) {
      const idx = ensureOptionExists(normalized);
      if (idx >= 0) {
        siteSelector.selectedIndex = idx;
      }
    }

    if (membrane) {
      try {
        membrane.bindTarget(normalized, cause);
      } catch (err) {
        console.error('[lab-toolbar] bindTarget failed:', err);
      }
    }

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const curUrl = new URL(window.location.href);
        curUrl.searchParams.set('target', normalized);
        window.history.replaceState(null, '', curUrl.toString());
      } catch {}
    }

    updateSiteSelection();
    updateActiveChips(normalized);
  }

  try {
    const res = await fetch(configUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.labTargets) && data.labTargets.length > 0 && siteSelector) {
        siteSelector.replaceChildren();
        for (const item of data.labTargets) {
          const opt = document.createElement('option');
          opt.value = item.url;
          opt.textContent = item.label || item.url;
          opt.setAttribute('data-status', item.status || 'allowed');
          if (item.reason) opt.setAttribute('data-reason', item.reason);
          if (item.desc) opt.setAttribute('data-desc', item.desc);
          siteSelector.appendChild(opt);
        }
      }
    }
  } catch (err) {
    console.warn('[lab-toolbar] Could not fetch app-config.json, retaining fallback options:', err);
  }

  const existingTarget = membrane?.getTarget();
  let initialTarget = existingTarget?.raw || 'app.html';
  let initialCause = existingTarget?.cause || 'boot-default';

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const targetParam = urlParams.get('target');
    if (targetParam) {
      initialTarget = targetParam;
      initialCause = 'boot-param';
    }
  }

  if (siteSelector && initialTarget) {
    let matched = false;
    for (let i = 0; i < siteSelector.options.length; i++) {
      if (siteSelector.options[i].value === initialTarget) {
        siteSelector.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched && initialTarget !== 'app.html') {
      const customOpt = document.createElement('option');
      customOpt.value = initialTarget;
      customOpt.textContent = `Chosen Target (${initialTarget}) - Configured`;
      customOpt.setAttribute('data-status', 'allowed');
      customOpt.setAttribute('data-desc', `Chosen Target URL (${initialTarget})`);
      siteSelector.insertBefore(customOpt, siteSelector.firstChild);
      siteSelector.selectedIndex = 0;
    }
  }

  if (membrane && !existingTarget) {
    membrane.bindTarget(initialTarget, initialCause);
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
    const targetVal = urlInput && urlInput.value.trim() ? urlInput.value : (siteSelector?.value || 'app.html');
    applyTarget(targetVal, 'load-button');
  });

  listen(siteSelector, 'change', () => {
    if (siteSelector.selectedIndex >= 0) {
      const selectedVal = siteSelector.options[siteSelector.selectedIndex].value;
      applyTarget(selectedVal, 'dropdown-select');
    }
  });

  if (typeof document !== 'undefined') {
    const chips = document.querySelectorAll('.target-chip');
    chips.forEach((chip) => {
      listen(chip, 'click', () => {
        const u = chip.getAttribute('data-url');
        if (u) {
          applyTarget(u, 'preset-chip');
        }
      });
    });
  }

  listen(popoutBtn, 'click', () => {
    const current = membrane?.getTarget()?.url || urlInput?.value || siteSelector?.value || 'app.html';
    window.open(current, '_blank');
  });

  updateSiteSelection();

  function destroy() {
    while (cleanupFns.length > 0) {
      const fn = cleanupFns.pop();
      try {
        fn();
      } catch {}
    }
  }

  return {
    updateSiteSelection,
    getTarget: () => membrane?.getTarget(),
    setTarget: (url, cause = 'custom') => {
      applyTarget(url, cause);
    },
    destroy
  };
}
