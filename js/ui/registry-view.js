/**
 * Pure data helpers for the CLM Sprint Registry view (SPRINT-DCI-01).
 *
 * Zero DOM access so grouping, filtering, and URL parameter state stay testable in Node.
 */

const VALID_STATES = new Set(['sealed', 'specification']);

export function programOf(code) {
  const raw = typeof code === 'string' ? code : '';
  const epicMatch = /^00-PROGRAM-CHARTER-EPIC-([A-Z]+)/.exec(raw);
  if (epicMatch) return epicMatch[1];
  const prefixMatch = /^([A-Z]+)-/.exec(raw);
  if (prefixMatch) return prefixMatch[1];
  return 'OTHER';
}

export function matchesQuery(sprint, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return true;
  const code = String(sprint?.code ?? '').toLowerCase();
  if (code.includes(needle)) return true;
  const title = String(sprint?.title ?? '').toLowerCase();
  if (title.includes(needle)) return true;
  const refs = Array.isArray(sprint?.dod?.vcard_refs) ? sprint.dod.vcard_refs : [];
  return refs.some((ref) => String(ref ?? '').toLowerCase().includes(needle));
}

export function filterSprints(sprints, filters = {}) {
  const list = Array.isArray(sprints) ? sprints : [];
  const state = filters?.state ? String(filters.state) : '';
  const program = filters?.program ? String(filters.program) : '';
  const query = filters?.query ?? '';
  return list.filter((sprint) => {
    const sprintState = sprint?.dod?.state || 'specification';
    if (state && sprintState !== state) return false;
    if (program && programOf(sprint?.code) !== program) return false;
    if (!matchesQuery(sprint, query)) return false;
    return true;
  });
}

export function groupSprints(sprints) {
  const list = Array.isArray(sprints) ? sprints : [];
  const groups = new Map();
  for (const sprint of list) {
    const program = programOf(sprint?.code);
    let entry = groups.get(program);
    if (!entry) {
      entry = { program, sprints: [], sealed: 0, specification: 0 };
      groups.set(program, entry);
    }
    entry.sprints.push(sprint);
    if ((sprint?.dod?.state || 'specification') === 'sealed') {
      entry.sealed += 1;
    } else {
      entry.specification += 1;
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.program < b.program ? -1 : a.program > b.program ? 1 : 0
  );
}

export function parseRegistryUrlState(search, { programs = [] } = {}) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const rawState = params.get('state') || '';
  const state = VALID_STATES.has(rawState) ? rawState : '';
  const allowedPrograms = programs instanceof Set ? programs : new Set(programs || []);
  const rawProgram = params.get('program') || '';
  const program = rawProgram && allowedPrograms.has(rawProgram) ? rawProgram : '';
  const query = params.get('q') || '';
  return { state, program, query };
}

export function mergeRegistryUrlState(search, nextState = {}) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  params.delete('state');
  params.delete('program');
  params.delete('q');
  const state = nextState?.state ? String(nextState.state) : '';
  const program = nextState?.program ? String(nextState.program) : '';
  const rawQuery = nextState?.query ?? nextState?.q ?? '';
  const query = String(rawQuery || '').trim();
  if (state) params.set('state', state);
  if (program) params.set('program', program);
  if (query) params.set('q', query);
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}
