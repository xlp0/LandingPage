import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    platform: 'browser',
    target: 'es2020',
    external: [] // No external dependencies
});

console.log('✅ @pkc/core built successfully');
