/**
 * Accessible in-page dialog prompt for external LandingPage URLs (SPRINT-DCI-04).
 */

export function requestExternalUrl(dialog, { validate, returnFocusTo } = {}) {
  if (!dialog) return Promise.resolve('');
  const form = dialog.querySelector('form');
  const input = dialog.querySelector('#open-url-input');
  const errorEl = dialog.querySelector('#open-url-error');
  const cancelBtn = dialog.querySelector('[data-testid="open-url-cancel"]');

  if (input) input.value = '';
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      form?.removeEventListener('submit', onSubmit);
      cancelBtn?.removeEventListener('click', onCancel);
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      returnFocusTo?.focus?.();
      resolve(value);
    };

    const onSubmit = (event) => {
      event.preventDefault();
      const raw = String(input?.value ?? '').trim();
      const ok = typeof validate === 'function' ? validate(raw) : Boolean(raw);
      if (!ok) {
        if (errorEl) {
          errorEl.textContent = 'Enter an http or https URL.';
          errorEl.hidden = false;
        }
        input?.focus?.();
        return;
      }
      finish(raw);
    };

    const onCancel = (event) => {
      event.preventDefault?.();
      finish('');
    };

    form?.addEventListener('submit', onSubmit);
    cancelBtn?.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel);

    dialog.showModal?.();
    input?.focus?.();
  });
}
