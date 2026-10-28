export default {
  id: 'markdown-renderer',
  async init({ pkc, capabilities }) {
    pkc.ctx.log('markdown-renderer:init', { capabilities });
  },
  async start() {},
  async stop() {}
};
