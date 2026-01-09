import esbuild from 'esbuild';

// Build main entry point
await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    platform: 'browser',
    target: 'es2020',
    external: ['mcard-js']
});

// Build individual component exports
await esbuild.build({
    entryPoints: [
        'src/MCardManager.js',
        'src/CardViewer.js',
        'src/BrowserContentTypeDetector.js'
    ],
    bundle: false,
    format: 'esm',
    outdir: 'dist',
    platform: 'browser',
    target: 'es2020'
});

console.log('✅ @pkc/mcard built successfully');
