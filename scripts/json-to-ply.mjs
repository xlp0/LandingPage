import fs from 'fs';
import path from 'path';
import * as THREE from 'three';

// --- PLY Exporter Function ---
function exportToPLY(geometry, filename, metadata = {}) {
    const vertices = geometry.getAttribute('position');
    const colors = geometry.getAttribute('color'); // Now expected to be Float32 w/ itemSize 4 (RGBA) or 3 (RGB)
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');
    const indices = geometry.getIndex();

    if (!vertices) {
        console.error(`No vertices found for ${filename}`);
        return;
    }

    let header = 'ply\n';
    header += 'format ascii 1.0\n';
    header += `element vertex ${vertices.count}\n`;
    header += 'property float x\n';
    header += 'property float y\n';
    header += 'property float z\n';

    if (normals) {
        header += 'property float nx\n';
        header += 'property float ny\n';
        header += 'property float nz\n';
    }

    if (uvs) {
        header += 'property float s\n';
        header += 'property float t\n';
    }

    if (colors) {
        header += 'property uchar red\n';
        header += 'property uchar green\n';
        header += 'property uchar blue\n';
        if (colors.itemSize === 4) {
            header += 'property uchar alpha\n';
        }
    }

    if (indices) {
        header += `element face ${indices.count / 3}\n`;
        header += 'property list uchar int vertex_index\n';
    }

    // Custom Comments for Metadata
    if (metadata.texture) {
        // Adjust path: JSON had './textures/x.jpg'. We want relative to 'data/ply/'
        // Accessing 'public/examples/THREEJS_ANIMEJS/textures/x.jpg' from 'public/examples/THREEJS_ANIMEJS/data/ply/'
        // is '../../textures/x.jpg'
        // But let's just clean the string provided.
        // If JSON said './textures/earth.jpg', we convert to '../../textures/earth.jpg'

        let texPath = metadata.texture;
        if (texPath.startsWith('./textures/')) {
            texPath = '../../textures/' + texPath.replace('./textures/', '');
        } else if (texPath.startsWith('textures/')) {
            texPath = '../../textures/' + texPath.replace('textures/', '');
        }

        header += `comment TextureFile ${texPath}\n`;
    }

    if (metadata.lighting) {
        header += `comment Lighting ${metadata.lighting}\n`;
    }

    if (metadata.roughness !== undefined) header += `comment Roughness ${metadata.roughness}\n`;
    if (metadata.metalness !== undefined) header += `comment Metalness ${metadata.metalness}\n`;

    header += 'end_header\n';

    const ws = fs.createWriteStream(filename);
    ws.write(header);

    for (let i = 0; i < vertices.count; i++) {
        let line = `${vertices.getX(i)} ${vertices.getY(i)} ${vertices.getZ(i)}`;

        if (normals) {
            line += ` ${normals.getX(i)} ${normals.getY(i)} ${normals.getZ(i)}`;
        }

        if (uvs) {
            line += ` ${uvs.getX(i)} ${uvs.getY(i)}`;
        }

        if (colors) {
            // Colors in THREE are 0-1 float
            line += ` ${Math.floor(colors.getX(i) * 255)} ${Math.floor(colors.getY(i) * 255)} ${Math.floor(colors.getZ(i) * 255)}`;
            if (colors.itemSize === 4) {
                line += ` ${Math.floor(colors.getW(i) * 255)}`;
            }
        }

        ws.write(line + '\n');
    }

    if (indices) {
        for (let i = 0; i < indices.count; i += 3) {
            ws.write(`3 ${indices.getX(i)} ${indices.getY(i)} ${indices.getZ(i)}\n`);
        }
    }

    ws.end();
    console.log(`Saved ${filename}`);
}

// --- Helper: Apply Transform ---
function applyTransform(geometry, transform) {
    if (!transform) return;

    // 1. Scale
    if (transform.scale) {
        geometry.scale(transform.scale[0], transform.scale[1], transform.scale[2]);
    }

    // 2. Rotate (Standard Euler XYZ: Rotate X, then Y, then Z)
    if (transform.rotation) {
        geometry.rotateX(transform.rotation[0]);
        geometry.rotateY(transform.rotation[1]);
        geometry.rotateZ(transform.rotation[2]);
    }

    // 3. Translate
    if (transform.position) {
        geometry.translate(transform.position[0], transform.position[1], transform.position[2]);
    }
}

// --- Geometry Generators ---

function createGeometry(config, materialMap) {
    let geometry;
    const type = config.geometry.type;
    const params = config.geometry;

    switch (type) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(
                params.radius,
                params.widthSegments || 32,
                params.heightSegments || 16,
                params.phiStart, params.phiLength,
                params.thetaStart, params.thetaLength
            );
            // Apply non-uniform scale if specified in geometry params (teapot case)
            if (params.scale) {
                geometry.scale(params.scale[0], params.scale[1], params.scale[2]);
            }
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(
                params.radiusTop,
                params.radiusBottom,
                params.height,
                params.radialSegments || 32,
                params.heightSegments || 1,
                params.openEnded,
                params.thetaStart, params.thetaLength
            );
            break;
        case 'torus':
            geometry = new THREE.TorusGeometry(
                params.radius,
                params.tube,
                params.radialSegments || 16,
                params.tubularSegments || 100,
                params.arc
            );
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(
                params.radius,
                params.height,
                params.radialSegments || 8,
                params.heightSegments || 1,
                params.openEnded,
                params.thetaStart, params.thetaLength
            );
            break;
        case 'plane':
            geometry = new THREE.PlaneGeometry(
                params.width,
                params.height,
                params.widthSegments || 1,
                params.heightSegments || 1
            );
            break;
        case 'box': // Just in case
            geometry = new THREE.BoxGeometry(
                params.width || 1,
                params.height || 1,
                params.depth || 1
            );
            break;
        default:
            console.warn(`Unknown geometry type: ${type}`);
            return null;
    }

    // Apply Child/Object Transformations
    if (config.transform) {
        applyTransform(geometry, config.transform);
    }

    // Apply Material Color & Opacity
    let colorHex = "#ffffff";
    let opacity = 1.0;

    let matConfig = null;

    if (typeof config.material === 'string' && materialMap[config.material]) {
        matConfig = materialMap[config.material];
    } else if (typeof config.material === 'object') {
        matConfig = config.material;
    }

    if (matConfig) {
        if (matConfig.color) colorHex = matConfig.color;
        if (matConfig.opacity !== undefined) opacity = matConfig.opacity;
    } else if (config.color) {
        // Fallback for direct properties (planets)
        colorHex = config.color;
    }

    const color = new THREE.Color(colorHex);
    const count = geometry.getAttribute('position').count;

    // Use RGBA (4 components) to store Alpha
    const colors = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
        colors[i * 4] = color.r;
        colors[i * 4 + 1] = color.g;
        colors[i * 4 + 2] = color.b;
        colors[i * 4 + 3] = opacity;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    return geometry;
}

// --- Processor ---

const SOURCE_DIR = 'public/examples/THREEJS_ANIMEJS/data/objects';
const TARGET_DIR = 'public/examples/THREEJS_ANIMEJS/data/ply'; // Creating a new dir for clarity

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function processFile(filename) {
    if (!filename.endsWith('.json') || filename === 'schema.json') return;

    console.log(`Processing ${filename}...`);
    const content = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, filename), 'utf-8'));

    const geometries = [];

    // Metadata collection
    const metadata = {};
    if (content.metadata && content.metadata.defaultLighting) {
        metadata.lighting = content.metadata.defaultLighting;
    }

    // Find primary texture and material interaction
    // We scan materials to find the first texture used
    let primaryTexture = null;
    let primaryRoughness = 0.5;
    let primaryMetalness = 0.0;

    if (content.materials) {
        for (const [key, mat] of Object.entries(content.materials)) {
            if (mat.texture && mat.texture.url) {
                if (!primaryTexture) primaryTexture = mat.texture.url;
            }
            // Just take the first meaningful values found?
            if (mat.roughness !== undefined) primaryRoughness = mat.roughness;
            if (mat.metalness !== undefined) primaryMetalness = mat.metalness;
        }
    }

    if (primaryTexture) {
        metadata.texture = primaryTexture;
    }
    metadata.roughness = primaryRoughness;
    metadata.metalness = primaryMetalness;

    // 1. Process 'children'
    if (content.children) {
        content.children.forEach(child => {
            if (!child.geometry && !child.children) return;
            const geo = createGeometry(child, content.materials || {});
            if (geo) {
                // Apply Root/Scene Transform to the child geometry
                if (content.transform) {
                    applyTransform(geo, content.transform);
                }
                geometries.push(geo);
            }
        });
    }

    // 2. Process 'planets' (custom solar system logic)
    if (content.planets) {
        content.planets.forEach(planet => {
            // Planet geometry: Sphere
            const sphereParams = {
                type: 'sphere',
                radius: planet.size,
                widthSegments: 32,
                heightSegments: 32
            };

            // Transform: Assume 'distance' is X translation (simple alignment)
            const transform = {
                position: [planet.distance, 0, 0]
            };

            const planetConfig = {
                geometry: sphereParams,
                transform: transform,
                color: planet.color
            };

            const geo = createGeometry(planetConfig, content.materials || {});
            if (geo) {
                if (content.transform) applyTransform(geo, content.transform);
                geometries.push(geo);
            }

            // Add Rings if present
            if (planet.hasRings) {
                // Ring geometry: Torus (flattened) or Tube? 
                // Using flattened Torus to simulate ring
                const ringParams = {
                    type: 'torus',
                    radius: (planet.ringInnerRadius + planet.ringOuterRadius) / 2,
                    tube: (planet.ringOuterRadius - planet.ringInnerRadius) / 2,
                    radialSegments: 2, // Flat
                    tubularSegments: 64,
                    arc: 6.283185
                };

                // Rotate to be flat on XZ plane? usually rings are. 
                // By default Torus is in XY plane. Rotate X 90 deg.
                const ringTransform = {
                    position: [planet.distance, 0, 0],
                    rotation: [Math.PI / 2, 0, 0]
                };

                const ringConfig = {
                    geometry: ringParams,
                    transform: ringTransform,
                    color: planet.color // Reuse planet color or make slightly different?
                };

                // Opacity for rings? Usually they are transparent.
                // Hardcode some opacity if not defined?
                // The original JSON usually doesn't define ring material separately but uses planet color.
                // We'll stick to planet color for now.

                // Adjust ring flatness (scale Y of torus tube)
                const ringGeo = createGeometry(ringConfig, content.materials || {});
                if (ringGeo) {
                    ringGeo.scale(1, 1, 0.1); // Flatten the tube
                    if (content.transform) applyTransform(ringGeo, content.transform);
                    geometries.push(ringGeo);
                }
            }
        });
    }

    // 3. Process 'asteroidBelt' (simple particle approximation)
    /* 
       Skipping asteroid belt for now as converting particles to mesh is heavy/undefined 
       and PLY faces logic differs from Point Cloud logic. 
       If we want point cloud mix, we can add vertices without faces, but standard PLY loaders
       might get confused if file has 'element face' but some verts are orphans.
       Safest to stick to solid geometry for this task.
    */

    if (geometries.length === 0) {
        console.warn(`No geometry generated for ${filename}`);
        return;
    }

    // Merge all geometries
    // We use BufferGeometryUtils usually, but here we can manually merge attributes since we know structure
    // Actually, simple merge:

    // Calculate totals
    let totalVertices = 0;
    let totalIndices = 0;
    geometries.forEach(g => {
        totalVertices += g.getAttribute('position').count;
        if (g.getIndex()) totalIndices += g.getIndex().count;
    });

    const mergedPositions = new Float32Array(totalVertices * 3);
    const mergedNormals = new Float32Array(totalVertices * 3);
    const mergedUVs = new Float32Array(totalVertices * 2);
    const mergedColors = new Float32Array(totalVertices * 4); // RGBA
    const mergedIndices = new Uint32Array(totalIndices);

    let vOffset = 0;
    let iOffset = 0;

    geometries.forEach(g => {
        const p = g.getAttribute('position');
        const n = g.getAttribute('normal');
        const uv = g.getAttribute('uv');
        const c = g.getAttribute('color');
        const idx = g.getIndex();

        // Copy attributes
        mergedPositions.set(p.array, vOffset * 3);
        if (n) mergedNormals.set(n.array, vOffset * 3);
        if (uv) mergedUVs.set(uv.array, vOffset * 2);

        // Handle color merging (ensure we're copying correctly if some are missing or different size)
        // createGeometry always adds itemSize 4 color.
        if (c && c.itemSize === 4) {
            mergedColors.set(c.array, vOffset * 4);
        } else if (c && c.itemSize === 3) {
            // Upcast RGB to RGBA
            for (let k = 0; k < c.count; k++) {
                mergedColors[(vOffset + k) * 4] = c.getX(k);
                mergedColors[(vOffset + k) * 4 + 1] = c.getY(k);
                mergedColors[(vOffset + k) * 4 + 2] = c.getZ(k);
                mergedColors[(vOffset + k) * 4 + 3] = 1.0; // Default alpha to 1.0
            }
        } else {
            // If no color attribute, default to opaque white
            for (let k = 0; k < p.count; k++) {
                mergedColors[(vOffset + k) * 4] = 1.0;
                mergedColors[(vOffset + k) * 4 + 1] = 1.0;
                mergedColors[(vOffset + k) * 4 + 2] = 1.0;
                mergedColors[(vOffset + k) * 4 + 3] = 1.0;
            }
        }

        // Copy indices with offset
        if (idx) {
            for (let i = 0; i < idx.count; i++) {
                mergedIndices[iOffset + i] = idx.getX(i) + vOffset;
            }
            iOffset += idx.count;
        }

        vOffset += p.count;
    });

    const mergedGeometry = new THREE.BufferGeometry();
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
    mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
    mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(mergedUVs, 2));
    mergedGeometry.setAttribute('color', new THREE.BufferAttribute(mergedColors, 4));
    mergedGeometry.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

    // Save
    const outName = path.basename(filename, '.json') + '.ply';
    exportToPLY(mergedGeometry, path.join(TARGET_DIR, outName), metadata);
}

// Run
const files = fs.readdirSync(SOURCE_DIR);
files.forEach(f => processFile(f));
