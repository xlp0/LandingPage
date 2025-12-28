function getEnvValue(key) {
  if (window.process && window.process.env && window.process.env[key]) {
    return window.process.env[key];
  }

  if (window.pkc && window.pkc.ctx && window.pkc.ctx.appConfig && window.pkc.ctx.appConfig[key] != null) {
    return window.pkc.ctx.appConfig[key];
  }

  if (window.PKC && window.PKC.ctx && window.PKC.ctx.appConfig && window.PKC.ctx.appConfig[key] != null) {
    return window.PKC.ctx.appConfig[key];
  }

  return '';
}

function parseDotEnv(raw) {
  const out = {};
  if (!raw)
    return out;

  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#'))
      continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1)
      continue;

    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

export async function getDemoMCardImportSources() {
  const defaultSources = [
    {
      kind: 'manifest',
      url: '/public/data/demo/manifest.json',
      baseUrl: '/public/',
      updateIfChanged: true
    },
    {
      kind: 'directory',
      dir: '/public/data/',
      recursive: true,
      skipPrefixes: ['/public/data/demo/'],
      handlePrefix: 'data',
      isBinaryByDefault: false,
      textExtensions: ['md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'csv', 'sql', 'xml', 'html', 'js', 'css'],
      updateIfChanged: false
    },
    {
      kind: 'directory',
      dir: '/public/assets/videos/',
      recursive: false,
      handlePrefix: 'video',
      includeExtensions: ['mp4', 'webm', 'mov', 'm4v', 'mkv', 'avi', 'flv', 'mpeg', 'mpg', 'wmv'],
      isBinaryByDefault: true,
      updateIfChanged: false
    }
  ];

  const appConfigValue = getEnvValue('mcardDemoImportSources');
  if (appConfigValue && String(appConfigValue).trim()) {
    try {
      const parsed = typeof appConfigValue === 'string' ? JSON.parse(appConfigValue) : appConfigValue;
      if (Array.isArray(parsed) && parsed.length > 0)
        return parsed;
    } catch {
    }
  }

  const envValue = getEnvValue('MCARD_DEMO_IMPORT_SOURCES');
  if (envValue && String(envValue).trim()) {
    try {
      const parsed = typeof envValue === 'string' ? JSON.parse(envValue) : envValue;
      if (Array.isArray(parsed) && parsed.length > 0)
        return parsed;
    } catch {
    }
  }

  try {
    const host = (window.location && window.location.hostname) || '';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
    if (isLocalHost) {
      const res = await fetch(`/.env?t=${Date.now()}`, { cache: 'no-cache' });
      if (res.ok) {
        const env = parseDotEnv(await res.text());
        const raw = env.MCARD_DEMO_IMPORT_SOURCES;
        if (raw && String(raw).trim()) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0)
            return parsed;
        }
      }
    }
  } catch {
  }

  return defaultSources;
}
