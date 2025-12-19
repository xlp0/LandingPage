#!/usr/bin/env node
/**
 * Convert Natural Earth GeoJSON to our Earth texture format
 * Simplifies coordinates and converts to 0-1 range for Mercator projection
 */

const fs = require('fs');

// Read the GeoJSON file
const geojson = JSON.parse(fs.readFileSync('/tmp/ne_110m.geojson', 'utf8'));

// Color mapping by country/region
const colorMap = {
    // Americas
    'United States of America': '#2d5a27',
    'Canada': '#3d6a37',
    'Mexico': '#3d7a37',
    'Brazil': '#3d7a37',
    'Argentina': '#4d8a47',
    'Chile': '#4d8a47',
    'Colombia': '#3d7a37',
    'Peru': '#4d7a37',
    'Venezuela': '#3d7a37',
    'Bolivia': '#4d7a37',
    'Ecuador': '#3d7a37',
    'Paraguay': '#4d7a37',
    'Uruguay': '#4d8a47',
    'Greenland': '#c8d8c8',

    // Europe
    'Russia': '#5a7a4a',
    'France': '#4d6b3a',
    'Spain': '#5d7b4a',
    'Germany': '#4d6b3a',
    'Italy': '#5d7b4a',
    'United Kingdom': '#4d7a3a',
    'Poland': '#4d6b3a',
    'Ukraine': '#5a7a4a',
    'Romania': '#4d6b3a',
    'Norway': '#5d7b4a',
    'Sweden': '#5d7b4a',
    'Finland': '#5d7b4a',
    'Iceland': '#a8c8a8',

    // Africa
    'Algeria': '#a08060',
    'Libya': '#a08060',
    'Egypt': '#a08060',
    'Sudan': '#a08060',
    'South Africa': '#8B7355',
    'Nigeria': '#6a9a5a',
    'Ethiopia': '#8B7355',
    'Kenya': '#6a9a5a',
    'Tanzania': '#6a9a5a',
    'Dem. Rep. Congo': '#4d7a3d',
    'Madagascar': '#6a9a5a',
    'Morocco': '#a08060',

    // Asia
    'China': '#5a8a4a',
    'India': '#6a8a5a',
    'Indonesia': '#4d7a3d',
    'Japan': '#5a8a4a',
    'South Korea': '#5a8a4a',
    'Taiwan': '#5a8a4a',
    'Vietnam': '#4d7a3d',
    'Thailand': '#4d7a3d',
    'Malaysia': '#4d7a3d',
    'Philippines': '#4d8a3d',
    'Myanmar': '#4d7a3d',
    'Pakistan': '#8a9a6a',
    'Bangladesh': '#6a8a5a',
    'Saudi Arabia': '#a08060',
    'Iran': '#8a9a6a',
    'Turkey': '#7a9a6a',
    'Kazakhstan': '#8a9a6a',
    'Mongolia': '#8a9a6a',

    // Oceania
    'Australia': '#c4a35a',
    'New Zealand': '#4d8a3d',
    'Papua New Guinea': '#3d7a2d',

    // Polar
    'Antarctica': '#e8e8f0',
};

const defaultColor = '#5a7a4a';

// Convert longitude/latitude to 0-1 Mercator coordinates
function lonLatToMercator(lon, lat) {
    // Normalize longitude from -180..180 to 0..1
    const x = (lon + 180) / 360;

    // Mercator projection for latitude
    // Clamp latitude to avoid infinity at poles
    lat = Math.max(-85, Math.min(85, lat));
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = (1 - mercN / Math.PI) / 2;

    return [parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4))];
}

// Simplify a polygon by reducing points
function simplifyPolygon(coords, tolerance = 0.005) {
    if (coords.length <= 4) return coords;

    const simplified = [coords[0]];
    let lastPoint = coords[0];

    for (let i = 1; i < coords.length - 1; i++) {
        const dx = coords[i][0] - lastPoint[0];
        const dy = coords[i][1] - lastPoint[1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= tolerance) {
            simplified.push(coords[i]);
            lastPoint = coords[i];
        }
    }

    // Always include the last point
    simplified.push(coords[coords.length - 1]);

    return simplified;
}

// Process features
const continents = [];
const processed = new Set();

for (const feature of geojson.features) {
    const name = feature.properties.ADMIN || feature.properties.NAME || feature.properties.name;

    if (!name || processed.has(name)) continue;
    processed.add(name);

    const color = colorMap[name] || defaultColor;
    const geometry = feature.geometry;

    if (geometry.type === 'Polygon') {
        const coords = geometry.coordinates[0];
        const mercatorCoords = coords.map(c => lonLatToMercator(c[0], c[1]));
        const simplified = simplifyPolygon(mercatorCoords, 0.008);

        if (simplified.length >= 3) {
            continents.push({
                name: name,
                color: color,
                path: simplified
            });
        }
    } else if (geometry.type === 'MultiPolygon') {
        // For multi-polygons, process each polygon
        geometry.coordinates.forEach((polygon, idx) => {
            const coords = polygon[0];
            const mercatorCoords = coords.map(c => lonLatToMercator(c[0], c[1]));
            const simplified = simplifyPolygon(mercatorCoords, 0.008);

            if (simplified.length >= 3) {
                continents.push({
                    name: idx === 0 ? name : name + ' (' + (idx + 1) + ')',
                    color: color,
                    path: simplified
                });
            }
        });
    }
}

// Sort by size (larger first for better rendering)
continents.sort((a, b) => b.path.length - a.path.length);

// Output
const output = {
    totalCountries: continents.length,
    continents: continents
};

console.log(JSON.stringify(output, null, 2));

// Also output stats
console.error('Processed ' + continents.length + ' countries/regions');
console.error('Total points: ' + continents.reduce((s, c) => s + c.path.length, 0));
