import esbuild from 'esbuild';

// Build main entry point
await esbuild.build({
    entryPoints: ['src/main.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    platform: 'browser',
    target: 'es2020',
    external: ['@pkc/core']
});

// Build individual exports
await esbuild.build({
    entryPoints: [
        'src/connection.js',
        'src/discovery.js',
        'src/qr-code.js',
        'src/config.js'
    ],
    bundle: false, // Don't bundle, just copy for subpath exports
    format: 'esm',
    outdir: 'dist',
    platform: 'browser',
    target: 'es2020'
});

console.log('✅ @pkc/p2p built successfully');
