/**
 * Lab Toolbar Controller
 * Populates target selector from app-config.json, updates diagnostics indicators,
 * and coordinates target switching via TargetMembrane (INV-STU-01, INV-STU-02).
 */

export async function initLabToolbar(options = {}) {
  const {
    membrane,
    siteSelector = document.getElementById('public-site-selector'),
    loadIframeBtn = document.getElementById('btn-load-in-iframe'),
    popoutBtn = document.getElementById('mission-control-popout-btn'),
    corsBlockAlert = document.getElementById('cors-block-alert'),
    corsBlockReason = document.getElementById('cors-block-reason'),
    corsBlockTargetName = document.getElementById('cors-block-target-name'),
    corsStatusPill = document.getElementById('cors-status-pill'),
    configUrl = '/app-config.json'
  } = options;

  function updateSiteSelection() {
    if (!siteSelector) return;
    const selectedOption = siteSelector.options[siteSelector.selectedIndex];
    const url = selectedOption ? selectedOption.value : 'app.html';
    const status = selectedOption?.getAttribute('data-status');
    const reason = selectedOption?.getAttribute('data-reason') || '';
    const name = selectedOption?.text.split(' - ')[0] || url;

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
        corsStatusPill.textContent = '● Controlled Viewport Active (Iframe Compatible)';
        corsStatusPill.style.color = 'var(--badge-success-text)';
      }
    }
  }

  // Fetch targets from config if available
  try {
    const res = await fetch(configUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.labTargets) && data.labTargets.length > 0 && siteSelector) {
        // Clear hardcoded options and render from single registry
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

  // Handle URL query parameter ?target=
  let initialTarget = 'app.html';
  let initialCause = 'boot-default';

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const targetParam = urlParams.get('target');
    if (targetParam) {
      initialTarget = targetParam;
      initialCause = 'boot-param';

      if (siteSelector) {
        let matched = false;
        for (let i = 0; i < siteSelector.options.length; i++) {
          if (siteSelector.options[i].value === targetParam) {
            siteSelector.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched) {
          const customOpt = document.createElement('option');
          customOpt.value = targetParam;
          customOpt.textContent = `Chosen Target (${targetParam}) - Configured`;
          customOpt.setAttribute('data-status', 'allowed');
          customOpt.setAttribute('data-desc', `Chosen Target URL (${targetParam})`);
          siteSelector.insertBefore(customOpt, siteSelector.firstChild);
          siteSelector.selectedIndex = 0;
        }
      }
    }
  }

  // Bind initial target through membrane
  if (membrane) {
    membrane.bindTarget(initialTarget, initialCause);
  }

  siteSelector?.addEventListener('change', updateSiteSelection);
  updateSiteSelection();

  loadIframeBtn?.addEventListener('click', () => {
    if (!siteSelector) return;
    const selectedOption = siteSelector.options[siteSelector.selectedIndex];
    const url = selectedOption ? selectedOption.value : 'app.html';
    if (membrane) {
      membrane.bindTarget(url, 'load-button');
    }
    updateSiteSelection();
  });

  popoutBtn?.addEventListener('click', () => {
    const current = membrane?.getTarget()?.url || siteSelector?.value || 'app.html';
    window.open(current, '_blank');
  });

  return {
    updateSiteSelection,
    getTarget: () => membrane?.getTarget(),
    setTarget: (url, cause = 'custom') => {
      if (siteSelector) {
        for (let i = 0; i < siteSelector.options.length; i++) {
          if (siteSelector.options[i].value === url) {
            siteSelector.selectedIndex = i;
            break;
          }
        }
      }
      membrane?.bindTarget(url, cause);
      updateSiteSelection();
    }
  };
}
