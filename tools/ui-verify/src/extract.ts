export interface ExtractorBinding {
  key: string;
  driver: 'browser' | 'terminal';
  expression: string;
}

export interface GeneratorBinding {
  key: string;
  actionName: string;
  selector: string;
}

export const EXTRACTOR_BINDINGS: Record<string, ExtractorBinding> = {
  'ext.spa.overview': {
    key: 'ext.spa.overview',
    driver: 'browser',
    expression: `state.document.body?.getAttribute("data-place-id") ?? ""`,
  },
  'ext.spa.details': {
    key: 'ext.spa.details',
    driver: 'browser',
    expression: `state.document.body?.getAttribute("data-place-id") ?? ""`,
  },
  'ext.spa.missing_transition': {
    key: 'ext.spa.missing_transition',
    driver: 'browser',
    expression: `state.document.body?.getAttribute("data-place-id") ?? ""`,
  },
};

export const GENERATOR_BINDINGS: Record<string, GeneratorBinding> = {
  'gen.spa.open_details': {
    key: 'gen.spa.open_details',
    actionName: 'TriggerOpenDetails',
    selector: '#btn-spa-open-details',
  },
  'gen.spa.back_overview': {
    key: 'gen.spa.back_overview',
    actionName: 'TriggerBackOverview',
    selector: '#btn-spa-back-overview',
  },
  'gen.spa.invalid_unmapped': {
    key: 'gen.spa.invalid_unmapped',
    actionName: 'TriggerInvalidUnmapped',
    selector: '#btn-spa-invalid-unmapped',
  },
  'gen.spa.recover_overview': {
    key: 'gen.spa.recover_overview',
    actionName: 'TriggerRecoverOverview',
    selector: '#btn-spa-recover-overview',
  },
};

export interface NamespaceSelectorBinding {
  rootSelector: string;
  alertSelector: string;
}

export const NAMESPACE_SELECTORS: Record<string, NamespaceSelectorBinding> = {
  spa: {
    rootSelector: '[data-testid="spa-app-root"]',
    alertSelector: '[data-testid="spa-error-alert"]',
  },
};

export function resolveNamespaceSelectors(extractorNamespace: string): NamespaceSelectorBinding {
  const known = NAMESPACE_SELECTORS[extractorNamespace];
  if (known) {
    return known;
  }
  return {
    rootSelector: `[data-testid="${extractorNamespace}-app-root"]`,
    alertSelector: `[data-testid="${extractorNamespace}-error-alert"]`,
  };
}

export function resolveExtractorExpression(extractorKey: string): string {
  const known = EXTRACTOR_BINDINGS[extractorKey];
  if (known) {
    return known.expression;
  }
  return `state.document.body?.getAttribute("data-place-id") ?? ""`;
}

export function resolveGeneratorBinding(transitionId: string, generatorKey: string): GeneratorBinding {
  const known = GENERATOR_BINDINGS[generatorKey];
  if (known) {
    return known;
  }
  const safeName = transitionId
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
  return {
    key: generatorKey,
    actionName: `Trigger${safeName}`,
    selector: `[data-transition-id="${transitionId}"]`,
  };
}
