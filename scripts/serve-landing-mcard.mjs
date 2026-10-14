import { executeStaticServer } from './static-server.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Using sovereign static-server builtin to serve LandingPage...');

const config = {
    action: 'deploy',
    port: 8082,
    host: '0.0.0.0',
    root_dir: path.join(__dirname, 'public')
};

// "chapterDir" can just be current dir for context
const chapterDir = __dirname;
const context = {};

(async () => {
    try {
        const result = await executeStaticServer(config, context, chapterDir);

        if (result.success) {
            console.log('\n✅ Server deployed successfully!');
            console.log(`📡 URL: ${result.url}`);
            console.log(`📂 Root: ${result.root_dir || config.root_dir}`);
            console.log(`🆔 PID: ${result.pid}`);
            console.log('\nPress Ctrl+C to stop (process runs in background, PID file created)');
        } else {
            console.error('\n❌ Failed to deploy server:', result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('Unexpected error:', error);
    }
})();
