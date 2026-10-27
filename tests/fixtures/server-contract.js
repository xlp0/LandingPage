import fs from 'node:fs';
import module from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(THIS_FILE), '../..');
const PROD_MCARD_DB_PATH = path.join(REPO_ROOT, 'data', 'mcard-api.db');

export const EXPRESS_DEFAULT_PORT = 3000;
export const PLAYWRIGHT_DEFAULT_PORT = 3001;
export const ASTRO_DEV_PORT = 4322;
export const DEFAULT_TEST_SERVER_COMMAND = 'node ws-server.js';

function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false';
}

function appendImportOption(existingNodeOptions, moduleFileUrl) {
  const flag = `--import ${moduleFileUrl}`;
  const base = typeof existingNodeOptions === 'string' ? existingNodeOptions.trim() : '';
  if (!base) return flag;
  if (base.includes(flag)) return base;
  return `${base} ${flag}`;
}

export function resolvePlaywrightServerContract(env = process.env) {
  const rawPort = env?.TEST_PORT ?? String(PLAYWRIGHT_DEFAULT_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError(`Invalid TEST_PORT value "${rawPort}"`);
  }

  const baseURL = String(env?.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, '');
  const command =
    typeof env?.TEST_SERVER_COMMAND === 'string' && env.TEST_SERVER_COMMAND.trim().length > 0
      ? env.TEST_SERVER_COMMAND.trim()
      : DEFAULT_TEST_SERVER_COMMAND;

  const isCI = isTruthyFlag(env?.CI);
  const reuseExistingServer = !isCI && env?.PW_REUSE_SERVER === '1';

  const explicitDb =
    typeof env?.MCARD_DB_PATH === 'string' && env.MCARD_DB_PATH.trim().length > 0
      ? path.resolve(env.MCARD_DB_PATH.trim())
      : null;

  const mcardDbPath =
    explicitDb ||
    path.join(os.tmpdir(), `landingpage-pw-${port}-${process.pid}`, 'mcard-api.db');

  if (path.resolve(mcardDbPath) === PROD_MCARD_DB_PATH) {
    throw new Error('MCARD_DB_PATH must not target the repository data/mcard-api.db file');
  }

  const preloadUrl = pathToFileURL(THIS_FILE).href;

  return {
    port,
    expressDefaultPort: EXPRESS_DEFAULT_PORT,
    astroDevPort: ASTRO_DEV_PORT,
    baseURL,
    command,
    url: `${baseURL}/health`,
    reuseExistingServer,
    mcardDbPath,
    env: {
      PORT: String(port),
      TEST_PORT: String(port),
      BASE_URL: baseURL,
      MCARD_DB_PATH: mcardDbPath,
      PW_EPHEMERAL_MCARD_DB: explicitDb ? '0' : '1',
      PW_SERVER_BOOT_GUARD: reuseExistingServer ? '0' : '1',
      NODE_OPTIONS: appendImportOption(env?.NODE_OPTIONS, preloadUrl),
    },
  };
}

function probeHostPort(host, port, timeoutMs = 250) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (inUse) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(inUse);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function assertPortAvailableForBoot(port) {
  const [ipv4Busy, ipv6Busy] = await Promise.all([
    probeHostPort('127.0.0.1', port),
    probeHostPort('::1', port),
  ]);
  if (ipv4Busy || ipv6Busy) {
    process.stderr.write(
      `ERROR Port ${port} is already occupied by another process while reuseExistingServer is false.\n`
    );
    process.exit(1);
  }
}

const HOOK_KEY = Symbol.for('gqc01.mcardDbHookRegistered');

if (
  process.env.MCARD_DB_PATH &&
  path.resolve(process.env.MCARD_DB_PATH) !== PROD_MCARD_DB_PATH &&
  typeof module.registerHooks === 'function' &&
  !globalThis[HOOK_KEY]
) {
  globalThis[HOOK_KEY] = true;
  const targetDbPath = path.resolve(process.env.MCARD_DB_PATH);
  const targetDbDir = path.dirname(targetDbPath);

  if (process.env.PW_EPHEMERAL_MCARD_DB === '1') {
    const cleanEphemeralDir = () => {
      try {
        fs.rmSync(targetDbDir, { recursive: true, force: true });
      } catch {}
    };
    process.on('exit', cleanEphemeralDir);
    process.once('SIGTERM', () => {
      cleanEphemeralDir();
      process.exit(0);
    });
    process.once('SIGINT', () => {
      cleanEphemeralDir();
      process.exit(0);
    });
  }

  module.registerHooks({
    load(url, context, nextLoad) {
      const result = nextLoad(url, context);
      if (url.endsWith('/server/mcard-probe-policy.mjs') && result?.source) {
        const rawPolicy =
          typeof result.source === 'string'
            ? result.source
            : Buffer.from(result.source).toString('utf8');
        const activePort = process.env.PORT || process.env.TEST_PORT;
        if (!activePort) return result;
        const patchedPolicy = rawPolicy.replace(
          "'http://127.0.0.1:5320',",
          `'http://127.0.0.1:5320', 'http://localhost:${activePort}', 'http://127.0.0.1:${activePort}',`
        );
        return { ...result, source: patchedPolicy };
      }
      if (!url.endsWith('/server/mcard-api.mjs') || !result?.source) {
        return result;
      }
      fs.mkdirSync(targetDbDir, { recursive: true });
      const rawSource =
        typeof result.source === 'string'
          ? result.source
          : Buffer.from(result.source).toString('utf8');
      const patchedSource = rawSource.replace(
        "dbFile = path.join(process.cwd(), 'data', 'mcard-api.db')",
        "dbFile = process.env.MCARD_DB_PATH || path.join(process.cwd(), 'data', 'mcard-api.db')"
      );
      return {
        ...result,
        source: patchedSource,
      };
    },
  });
}

if (
  process.env.PW_SERVER_BOOT_GUARD === '1' &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.join(REPO_ROOT, 'ws-server.js')
) {
  const bootPort = Number(process.env.PORT || PLAYWRIGHT_DEFAULT_PORT);
  await assertPortAvailableForBoot(bootPort);
}
