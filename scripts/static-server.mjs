import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Built-in static server executor for LandingPage.
 * Replaces retired legacy builtin without external runtime dependency.
 */
export async function executeStaticServer(config, context = {}, chapterDir = '.') {
  const root = config.root_dir ? path.resolve(chapterDir, config.root_dir) : path.resolve(chapterDir);
  const host = config.host || '0.0.0.0';
  const port = config.port || 8082;

  const server = http.createServer((req, res) => {
    const safeUrl = req.url.split('?')[0];
    let filePath = path.join(root, safeUrl === '/' ? 'index.html' : safeUrl);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.wasm': 'application/wasm'
      };
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, host, () => {
      resolve({
        success: true,
        url: `http://${host}:${port}`,
        root_dir: root,
        pid: process.pid
      });
    });
    server.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
  });
}
