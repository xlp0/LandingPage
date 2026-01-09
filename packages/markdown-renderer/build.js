import esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    platform: 'browser',
    target: 'es2020',
    external: ['@pkc/core', 'katex']
});

console.log('✅ @pkc/markdown-renderer built successfully');
