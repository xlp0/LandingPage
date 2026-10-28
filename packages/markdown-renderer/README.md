# @pkc/markdown-renderer

PKC browser module descriptor for the Markdown capability slot in `PKC.init()`.

## Ownership and workspace status

- Workspace package name is `@pkc/markdown-renderer` (`1.0.0`), registered in root `package.json#workspaces`.
- Ownership classification in `scripts/package-source-parity.json` is `shared-source`, owned by the Platform and Docs Shell team.
- Canonical source is `packages/markdown-renderer/src/index.js`.
- Built package output is `packages/markdown-renderer/dist/index.js`, produced by `npm run build` (`esbuild`).
- In-repository browser caller `js/modules/markdown-renderer/index.js` re-exports the default descriptor from `../../../packages/markdown-renderer/src/index.js` without duplicating implementation lines or importing from outside the repository.

## Installation and build

```bash
cd packages/markdown-renderer
npm run build
```

External package consumers import the built `./dist/index.js` entry declared in `package.json#exports`. `tests/unit/package-source-parity.test.mjs` packs `@pkc/markdown-renderer` with `npm pack` into `os.tmpdir()` and verifies that the unpacked tarball imports cleanly with zero repository-relative parent paths.

## Exported contract

`@pkc/markdown-renderer` exports a default PKC module lifecycle object with `id`, `init({ pkc, capabilities })`, `start()`, and `stop()` methods.

```javascript
import MarkdownRendererModule from '@pkc/markdown-renderer';

await MarkdownRendererModule.init({
  pkc: { ctx: { log: console.log } },
  capabilities: { indexeddb: true, websocket: true }
});
await MarkdownRendererModule.start();
await MarkdownRendererModule.stop();
```

## Relationship to LandingPage Markdown surfaces

`@pkc/markdown-renderer` provides the `markdown-renderer` capability descriptor referenced by `modules.json`. Single-page MCard document rendering on `index.html?noredirect=1` is owned separately by `js/landing-page-mcard.js` and `server/mcard-modality.mjs`. Component-isolation Markdown, KaTeX, and Mermaid DOM rendering is owned separately by `js/renderers/MarkdownRenderer.js`.

## License

ISC
