import { executeStaticServer } from './node_modules/mcard-js/dist/ptr/node/clm/builtins/static-server.js';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clmPath = path.join(__dirname, 'serve-landing.yaml');

console.log(`📖 Reading CLM from ${clmPath}...`);

try {
    const fileContents = fs.readFileSync(clmPath, 'utf8');
    const doc = yaml.load(fileContents);

    const impl = doc?.clm?.concrete_impl;

    if (!impl || impl.builtin !== 'static_server') {
        throw new Error('Invalid CLM: Missing concrete_impl or not a static_server builtin');
    }

    console.log('🚀 Executing CLM builtin: static_server');
    console.log('⚙️  Config:', impl.config);

    // Resolve root_dir relative to current dir if needed
    const config = { ...impl.config };
    if (config.root_dir.startsWith('./')) {
        config.root_dir = path.join(__dirname, config.root_dir);
    }

    // Execute
    const chapterDir = __dirname;
    const context = {}; // Context from CLM if needed

    (async () => {
        try {
            const result = await executeStaticServer(config, context, chapterDir);

            if (result.success) {
                console.log('\n✅ CLM Execution Successful!');
                console.log(`📡 URL: ${result.url}`);
                console.log(`📂 Root: ${result.root_dir || config.root_dir}`);
                console.log(`🆔 PID: ${result.pid}`);
                console.log('\nPress Ctrl+C to stop (process runs in background)');
            } else {
                console.error('\n❌ CLM Execution Failed:', result.error);
                process.exit(1);
            }
        } catch (error) {
            console.error('Runtime error:', error);
        }
    })();

} catch (e) {
    console.error('Error processing CLM:', e);
}
