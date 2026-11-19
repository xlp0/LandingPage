/**
 * Baseline rows for the page-load run. Every console error and every 4xx/5xx
 * resource failure a page emits on purpose needs a row with an owner and a
 * reason. The spec and the unit test share this module so both judge a row by
 * the same rules.
 */

const HTTP_FAILURE = /Failed to load resource: the server responded with a status of (\d{3})/;

export const OWNERS = new Set(['page', 'server', 'fixture', 'policy', 'database']);

export function validateBaseline(baseline) {
  const problems = [];
  const seen = new Set();
  const check = (row, table, extra) => {
    if (!row.id || seen.has(row.id)) problems.push(`${table}: duplicate or missing id ${row.id ?? ''}`);
    seen.add(row.id);
    if (!OWNERS.has(row.owner)) problems.push(`${row.id}: owner "${row.owner}" is not one of ${[...OWNERS].join(', ')}`);
    if (!row.reason || String(row.reason).trim().length < 10) problems.push(`${row.id}: reason is missing or too short`);
    if (typeof row.pattern !== 'string' || row.pattern.length === 0) problems.push(`${row.id}: pattern is empty`);
    else {
      let regex;
      try {
        regex = new RegExp(row.pattern);
      } catch (error) {
        problems.push(`${row.id}: pattern does not compile: ${error.message}`);
        return;
      }
      if (regex.test('')) problems.push(`${row.id}: pattern matches the empty string, so it is a catch-all`);
    }
    extra?.(row);
  };
  for (const row of baseline.console ?? []) check(row, 'console', null);
  for (const row of baseline.http ?? []) {
    check(row, 'http', null);
    if (!Number.isInteger(row.status) || row.status < 400 || row.status > 599) {
      problems.push(`${row.id}: status ${row.status} is not a 4xx or 5xx`);
    }
  }
  if (!Array.isArray(baseline.console) || !Array.isArray(baseline.http)) {
    problems.push('baseline needs console and http arrays');
  }
  return problems;
}

export function compileBaseline(baseline) {
  return {
    console: (baseline.console ?? []).map((row) => ({ ...row, regex: new RegExp(row.pattern) })),
    http: (baseline.http ?? []).map((row) => ({ ...row, regex: new RegExp(row.pattern) }))
  };
}

export function httpStatusOf(text) {
  const match = HTTP_FAILURE.exec(text);
  return match ? Number(match[1]) : null;
}

export function unexpectedConsoleErrors(texts, compiled) {
  return texts.filter((text) => httpStatusOf(text) === null && !compiled.console.some((row) => row.regex.test(text)));
}

export function unexpectedHttpErrors(texts, compiled) {
  return texts.filter((text) => {
    const status = httpStatusOf(text);
    if (status === null || status < 400) return false;
    return !compiled.http.some((row) => row.status === status && row.regex.test(text));
  });
}
