// The headless browser the filming scripts share. playwright-core is the one
// dependency filming needs and the kit doesn't, so a missing install says how
// to fix it rather than failing on the import. Chrome is the installed one
// (CHROME_PATH overrides), found on macOS, Windows and Linux alike.
export async function launch() {
  let chromium
  try {
    ;({ chromium } = await import('playwright-core'))
  } catch {
    console.error('Filming needs playwright-core: run `npm i -D playwright-core` (or pnpm/yarn) in this project, then try again.')
    process.exit(2)
  }
  const chromePath = process.env.CHROME_PATH
  try {
    return await chromium.launch(chromePath ? { executablePath: chromePath } : { channel: 'chrome' })
  } catch (err) {
    if (!chromePath) {
      // Container and CI hosts often install Playwright Chromium without branded Chrome.
      try {
        const pw = await import('playwright')
        const fallbackPath = pw.chromium?.executablePath?.()
        if (fallbackPath) {
          return await chromium.launch({ executablePath: fallbackPath })
        }
      } catch {
        // Fall through to unified launch failure below.
      }
    }
    console.error(`Couldn't start Chrome${chromePath ? ` at ${chromePath}` : ''}. Install Google Chrome, or set CHROME_PATH to a Chrome or Chromium binary. (${err?.message || err})`)
    process.exit(2)
  }
}
