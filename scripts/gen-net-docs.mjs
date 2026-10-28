import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNetEnvelope } from './check-net.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT_DIR = path.resolve(SCRIPT_DIR, '..');
export const WORKBENCH_NET_REL = 'src/net/workbench-net.yaml';
export const WORKBENCH_DOC_REL = 'docs/01-architecture/workbench-net.md';

function cleanCell(value) {
  if (value === null || value === undefined || value === '') return 'n/a';
  return String(value)
    .replace(/\u2014/g, '-')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function cleanMermaidLabel(value) {
  return String(value || '')
    .replace(/\u2014/g, '-')
    .replace(/"/g, "'")
    .replace(/[<>]/g, '')
    .replace(/\r?\n/g, ' ')
    .trim();
}

export function renderWorkbenchNetDocs(envelope) {
  const places = Array.isArray(envelope?.topology?.places) ? envelope.topology.places : [];
  const transitions = Array.isArray(envelope?.topology?.transitions) ? envelope.topology.transitions : [];
  const placeBindings = envelope?.bindings?.places || {};
  const transitionBindings = envelope?.bindings?.transitions || {};
  const nonUiEndpoints = Array.isArray(envelope?.nonUiEndpoints)
    ? envelope.nonUiEndpoints
    : (Array.isArray(envelope?.bindings?.nonUiEndpoints) ? envelope.bindings.nonUiEndpoints : []);

  const kindCounts = new Map();
  for (const place of places) {
    const kind = placeBindings[place.id]?.kind || 'unknown';
    kindCounts.set(kind, (kindCounts.get(kind) || 0) + 1);
  }

  const transitionKindCounts = new Map();
  for (const tr of transitions) {
    const kind = transitionBindings[tr.id]?.kind || 'unknown';
    transitionKindCounts.set(kind, (transitionKindCounts.get(kind) || 0) + 1);
  }

  const lines = [];
  lines.push('# Workbench Navigation Net Reference');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push('| Audience | Developers, architects, and QA engineers inspecting workbench Places, Transitions, and recovery paths |');
  lines.push('| BMAD Owner | Architect (`bmad-agent-architect`) and Test Architect |');
  lines.push('| Source of Truth | [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml) via [`scripts/gen-net-docs.mjs`](../../scripts/gen-net-docs.mjs) |');
  lines.push('| Drift Gate | `npm run docs:check` (`GQC-07-UNIT-06`) and `npm run check:net` |');
  lines.push('');
  lines.push('> [!IMPORTANT]');
  lines.push('> This file is generated deterministically from [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml) by `npm run docs:gen-net`. Do not hand-edit tables or diagrams here. Edit `src/net/workbench-net.yaml` and re-run `npm run docs:gen-net`.');
  lines.push('');
  lines.push('## Net Envelope Summary');
  lines.push('');
  lines.push('| Property | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Schema | \`${cleanCell(envelope.schema)}\` |`);
  lines.push(`| Net ID | \`${cleanCell(envelope.netId)}\` |`);
  lines.push(`| Target Handle | \`${cleanCell(envelope.targetHandle)}\` |`);
  lines.push(`| Entry Place | \`${cleanCell(envelope.entryPlaceId)}\` |`);
  lines.push(`| Total Places | ${places.length} |`);
  lines.push(`| Total Transitions | ${transitions.length} |`);
  lines.push(`| Non-UI Programmatic Endpoints | ${nonUiEndpoints.length} |`);
  lines.push('');
  lines.push('Related architecture guides include [LandingPage Architecture](./landing-page-architecture.md) and [Astro Host and Preact Islands](./astro-host-and-islands.md).');
  lines.push('');
  lines.push('### Place Counts by Kind');
  lines.push('');
  lines.push('| Place Kind | Count |');
  lines.push('| --- | --- |');
  for (const [kind, count] of [...kindCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| \`${cleanCell(kind)}\` | ${count} |`);
  }
  lines.push('');
  lines.push('### Transition Counts by Kind');
  lines.push('');
  lines.push('| Transition Kind | Count |');
  lines.push('| --- | --- |');
  for (const [kind, count] of [...transitionKindCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| \`${cleanCell(kind)}\` | ${count} |`);
  }
  lines.push('');
  lines.push('## Places');
  lines.push('');
  lines.push('| Place ID | Kind | Route | Route Handle | CLM Type URI | Migration State | Entry Mode | Owner | Description |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const place of places) {
    const b = placeBindings[place.id] || {};
    const entryMode = b.entry ? 'entry' : (b.deepLinkEntry ? 'deep-link' : 'reachable');
    const mig = b.migrationState ? `\`${cleanCell(b.migrationState)}\`` : 'n/a';
    const route = b.route ? `\`${cleanCell(b.route)}\`` : 'n/a';
    const handle = b.routeHandle ? `\`${cleanCell(b.routeHandle)}\`` : 'n/a';
    const clmUri = b.clmTypeUri ? `\`${cleanCell(b.clmTypeUri)}\`` : 'n/a';
    lines.push(
      `| \`${cleanCell(place.id)}\` | \`${cleanCell(b.kind)}\` | ${route} | ${handle} | ${clmUri} | ${mig} | ${entryMode} | ${cleanCell(b.owner)} | ${cleanCell(place.description)} |`
    );
  }
  lines.push('');
  lines.push('## Transitions');
  lines.push('');
  lines.push('| Transition ID | Kind | From Place | To Place | Endpoint or Route | Owner Page | Owner | Trigger |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const tr of transitions) {
    const b = transitionBindings[tr.id] || {};
    const fromId = b.fromPlaceId || (Array.isArray(tr.inputs) && tr.inputs[0]?.place) || '';
    const toId = b.toPlaceId || (Array.isArray(tr.outputs) && tr.outputs[0]?.place) || '';
    const endpointOrRoute = b.httpMethod && b.httpPath
      ? `\`${cleanCell(b.httpMethod)} ${cleanCell(b.httpPath)}\``
      : (b.route ? `\`${cleanCell(b.route)}\`` : 'n/a');
    lines.push(
      `| \`${cleanCell(tr.id)}\` | \`${cleanCell(b.kind)}\` | \`${cleanCell(fromId)}\` | \`${cleanCell(toId)}\` | ${endpointOrRoute} | \`${cleanCell(b.ownerPage)}\` | ${cleanCell(b.owner)} | ${cleanCell(b.trigger || tr.description)} |`
    );
  }
  lines.push('');

  if (nonUiEndpoints.length > 0) {
    lines.push('## Non-UI Programmatic Endpoints');
    lines.push('');
    lines.push('| HTTP Method | Path | Source | Status | Owner | Reason |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const ep of nonUiEndpoints) {
      lines.push(
        `| \`${cleanCell(ep.httpMethod)}\` | \`${cleanCell(ep.httpPath)}\` | \`${cleanCell(ep.source)}\` | \`${cleanCell(ep.status)}\` | ${cleanCell(ep.owner)} | ${cleanCell(ep.reason)} |`
      );
    }
    lines.push('');
  }

  lines.push('## Workbench Topology Diagram');
  lines.push('');
  lines.push('```mermaid');
  lines.push('flowchart TD');
  for (const place of places) {
    const kind = placeBindings[place.id]?.kind || 'place';
    const label = cleanMermaidLabel(`${place.id} (${kind})`);
    lines.push(`  ${place.id}["${label}"]`);
  }
  for (const tr of transitions) {
    const b = transitionBindings[tr.id] || {};
    const fromId = b.fromPlaceId || (Array.isArray(tr.inputs) && tr.inputs[0]?.place) || '';
    const toId = b.toPlaceId || (Array.isArray(tr.outputs) && tr.outputs[0]?.place) || '';
    if (fromId && toId) {
      const edgeLabel = cleanMermaidLabel(`${tr.id} (${b.kind || 'transition'})`);
      lines.push(`  ${fromId} -->|"${edgeLabel}"| ${toId}`);
    }
  }
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

export function generateWorkbenchNetDocs({
  rootDir = DEFAULT_ROOT_DIR,
  write = true
} = {}) {
  const netAbs = path.join(rootDir, WORKBENCH_NET_REL);
  const outAbs = path.join(rootDir, WORKBENCH_DOC_REL);
  const envelope = loadNetEnvelope(netAbs);
  const markdown = renderWorkbenchNetDocs(envelope);
  if (write) {
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, markdown, 'utf8');
  }
  return {
    netAbs,
    outAbs,
    placeCount: Array.isArray(envelope?.topology?.places) ? envelope.topology.places.length : 0,
    transitionCount: Array.isArray(envelope?.topology?.transitions) ? envelope.topology.transitions.length : 0,
    markdown
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const stdoutOnly = process.argv.includes('--stdout');
  const result = generateWorkbenchNetDocs({ write: !stdoutOnly });
  if (stdoutOnly) {
    process.stdout.write(result.markdown);
  } else {
    console.log(
      `[docs:gen-net] Wrote ${WORKBENCH_DOC_REL} (${result.placeCount} Places, ${result.transitionCount} Transitions)`
    );
  }
}
