
const http = require('http');

const baseUrl = 'http://localhost:8765';
const startPath = '/public/data/chapters/';

async function fetchUrl(path) {
    return new Promise((resolve, reject) => {
        http.get(baseUrl + path, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        });
    });
}

function parseLinks(html, currentPath) {
    // Simple regex to extract hrefs from serve-index HTML
    const regex = /href="([^"]+)"/g;
    const links = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        let href = match[1];
        if (href === '../' || href === './') continue;

        // hrefs from serve-index are usually relative to the current path or absolute
        // serve-index typically returns: /public/data/chapters/chapter_01_arithmetic/

        // Check if it's the current directory itself (sometimes happens)
        if (href === currentPath) continue;

        links.push(href);
    }
    return links;
}

async function scan(path) {
    console.log(`Scanning ${path}...`);
    const html = await fetchUrl(path);
    const links = parseLinks(html, path);

    for (const link of links) {
        // serve-index links are URL encoded and usually full paths from root
        const decoded = decodeURIComponent(link);
        const isDir = decoded.endsWith('/');

        if (isDir) {
            await scan(decoded);
        } else {
            console.log(`Found file: ${decoded}`);
        }
    }
}

scan(startPath).catch(console.error);
