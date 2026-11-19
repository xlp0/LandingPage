import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitBombadilSpec } from './emit-bombadil.ts';
import { blake3Qualified, loadModelWithNet } from './model.ts';
import { adaptJsonlToTrace, serializeTraceCard } from './trace.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function getArg(argv: string[], flag: string): string | undefined {
  const idx = argv.indexOf(flag);
  if (idx >= 0 && idx + 1 < argv.length) {
    return argv[idx + 1];
  }
  return undefined;
}

export function resolveVerifyPath(rawPath: string, _forWrite = false): string {
  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }
  if (rawPath.startsWith('evidence/bmb-')) {
    return path.join(REPO_ROOT, 'docs/sprints/programs/bmb', rawPath);
  }
  return path.resolve(rawPath);
}

export function runCli(argv: string[]): number {
  const [subcmd, ...rest] = argv;
  if (subcmd === 'model') {
    const modelPath = getArg(rest, '--model');
    const netPath = getArg(rest, '--net');
    if (!modelPath) {
      console.error('Usage: ui-verify model --model <path> [--net <path>]');
      return 2;
    }
    const { model, modelHash, netHash } = loadModelWithNet(resolveVerifyPath(modelPath), netPath ? resolveVerifyPath(netPath) : undefined);
    console.log(
      JSON.stringify(
        {
          model_id: model.model_id,
          model_hash: modelHash,
          net_hash: netHash,
          engine_version: model.engine.version,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  if (subcmd === 'emit') {
    const modelPath = getArg(rest, '--model');
    const netPath = getArg(rest, '--net');
    const outPath = getArg(rest, '--out');
    if (!modelPath) {
      console.error('Usage: ui-verify emit --model <path> [--net <path>] [--out <path>]');
      return 2;
    }
    const { model, net, modelHash, netHash } = loadModelWithNet(resolveVerifyPath(modelPath), netPath ? resolveVerifyPath(netPath) : undefined);
    const source = emitBombadilSpec(model, net, { modelHash, netHash });
    if (outPath) {
      const resolvedOut = resolveVerifyPath(outPath, true);
      fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
      fs.writeFileSync(resolvedOut, source, 'utf8');
      console.log(
        JSON.stringify(
          {
            ok: true,
            out: resolvedOut,
            model_hash: modelHash,
            net_hash: netHash,
          },
          null,
          2,
        ),
      );
    } else {
      process.stdout.write(source);
    }
    return 0;
  }

  if (subcmd === 'trace') {
    const tracePath = getArg(rest, '--trace');
    const modelPath = getArg(rest, '--model');
    const netPath = getArg(rest, '--net');
    const outPath = getArg(rest, '--out');
    const seedArg = getArg(rest, '--seed');
    if (!tracePath || !modelPath) {
      console.error('Usage: ui-verify trace --trace <jsonl> --model <path> [--net <path>] [--out <path>] [--seed <seed>]');
      return 2;
    }
    const resolvedTrace = resolveVerifyPath(tracePath);
    const { model, modelHash } = loadModelWithNet(resolveVerifyPath(modelPath), netPath ? resolveVerifyPath(netPath) : undefined);
    const jsonl = fs.readFileSync(resolvedTrace, 'utf8');
    const seed = seedArg === undefined ? null : /^\d+$/.test(seedArg) ? Number(seedArg) : seedArg;
    const card = adaptJsonlToTrace(jsonl, model, { modelHash, seed });
    const traceHash = blake3Qualified(card);
    const serialized = serializeTraceCard(card);
    if (outPath) {
      const resolvedOut = resolveVerifyPath(outPath, true);
      fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
      fs.writeFileSync(resolvedOut, serialized, 'utf8');
      console.log(
        JSON.stringify(
          {
            ok: true,
            out: resolvedOut,
            model_hash: modelHash,
            trace_hash: traceHash,
            step_count: card.observations.length,
          },
          null,
          2,
        ),
      );
    } else {
      process.stdout.write(serialized);
    }
    return 0;
  }

  console.error(`Unknown subcommand: ${String(subcmd)}`);
  return 2;
}
