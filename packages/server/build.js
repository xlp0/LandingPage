import esbuild from 'esbuild';

// Build main entry point
await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    platform: 'node',
    target: 'node18',
    external: ['express', 'ws', 'cors']
});

// Build individual exports
await esbuild.build({
    entryPoints: [
        'src/ws-server.js',
        'src/room-registry.mjs'
    ],
    bundle: false,
    format: 'esm',
    outdir: 'dist',
    platform: 'node',
    target: 'node18'
});

console.log('✅ pkc-server built successfully');
