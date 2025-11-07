// PKC Module: markdown-renderer (baseline)
// For now this module just logs and prepares hooks; actual viewer lives in pkc-viewer.html
export default {
  id: 'markdown-renderer',
  async init({ pkc, config, capabilities }) {
    pkc.ctx.log('markdown-renderer:init', { capabilities });
    // Future: attach markdown rendering helpers or enhance links to pkc-viewer.html
  },
  async start() {
    // No-op for index.html baseline
  },
  async stop() {}
};
