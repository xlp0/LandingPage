
const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(__dirname, '../public/assets/chapters');
const outputFile = path.join(chaptersDir, 'manifest.json');

const entries = [];

// Extensions to treat as text (isBinary: false)
const textExtensions = new Set(['md', 'markdown', 'txt', 'json', 'yaml', 'yml', 'clm', 'csv', 'sql', 'xml', 'html', 'js', 'css', 'py', 'c', 'rs', 'lean']);

function scanDirectory(dir, relativePrefix = '') {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file === 'manifest.json' || file.startsWith('.')) continue;
        if (file === '__pycache__') continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath, path.join(relativePrefix, file));
        } else {
            const ext = path.extname(file).slice(1).toLowerCase();
            const relPath = path.join(relativePrefix, file);

            // Create a smart handle
            // e.g. chapter_01_arithmetic/addition.yaml -> clm-chapter_01_arithmetic-addition
            // But user might just want the filename if unique enough, or path based.
            // Let's stick to a clean path-based handle to avoid collisions.

            // Normalize path separators to /
            const normalizedPath = relPath.split(path.sep).join('/');

            // Create handle: replace / with - and remove extension
            let handle = normalizedPath.replace(/\//g, '-').replace(/\.[^.]+$/, '').toLowerCase();

            // Sanitize: replace any char that is not a-z, 0-9, or - with -
            handle = handle.replace(/[^a-z0-9-]/g, '-');

            // Remove multiple dashes
            handle = handle.replace(/-+/g, '-');

            // Remove leading/trailing dashes
            handle = handle.replace(/^-|-$/g, '');

            // Add prefix if not present (optional, but good for grouping)
            if (!handle.startsWith('clm-')) {
                handle = 'clm-' + handle;
            }

            const isBinary = !textExtensions.has(ext);

            entries.push({
                handle: handle,
                path: normalizedPath, // Path relative to baseUrl (chapters root)
                isBinary: isBinary
            });
        }
    }
}

console.log(`Scanning ${chaptersDir}...`);
scanDirectory(chaptersDir);

console.log(`Found ${entries.length} files.`);
fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2));
console.log(`Wrote manifest to ${outputFile}`);
