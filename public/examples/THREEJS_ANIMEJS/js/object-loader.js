/**
 * ObjectLoader - Data-Driven 3D Object Loader
 * 
 * Loads 3D objects from JSON data files and creates Three.js meshes.
 * This separates object DEFINITION (data) from object CREATION (code).
 */

import { CONFIG } from './config.js';

export class ObjectLoader {
    static cache = new Map();
    static textureGenerators = {};

    /**
     * Load and create an object from JSON data
     * @param {string} objectId - Object identifier (e.g., 'teapot', 'earth')
     * @returns {Promise<THREE.Group>}
     */
    static async load(objectId) {
        try {
            // Check cache first
            const cached = this.cache.get(objectId);
            if (cached) {
                return this.cloneGroup(cached);
            }

            // Load JSON data
            const data = await this.fetchObjectData(objectId);

            // Build Three.js object from data
            const group = await this.buildFromData(data);

            // Cache for reuse
            this.cache.set(objectId, group);

            console.log(`[ObjectLoader] Loaded '${objectId}' from JSON data`);
            return group;

        } catch (error) {
            console.error(`[ObjectLoader] Failed to load '${objectId}':`, error);
            // Fallback to legacy factory
            const { ObjectFactory } = await import('./objects.js');
            return ObjectFactory.create(objectId);
        }
    }

    /**
     * Fetch object JSON data
     */
    static async fetchObjectData(objectId) {
        const url = `data/objects/${objectId}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Build Three.js Group from JSON data
     */
    static async buildFromData(data) {
        const group = new THREE.Group();
        group.name = data.id;

        // Parse materials first (they're referenced by name)
        const materials = {};
        if (data.materials) {
            for (const [name, matDef] of Object.entries(data.materials)) {
                materials[name] = await this.createMaterial(matDef);
            }
        }

        // Create child meshes
        if (data.children) {
            for (const childDef of data.children) {
                const child = await this.createMeshNode(childDef, materials);
                if (child) group.add(child);
            }
        }

        // Handle special scene types
        if (data.planets) {
            this.createPlanets(group, data.planets, materials);
        }
        if (data.asteroidBelt) {
            this.createAsteroidBelt(group, data.asteroidBelt);
        }
        if (data.microbeTypes) {
            this.createMicrobes(group, data.microbeTypes, data.microbeSpawnArea);
        }

        // Apply root transform
        if (data.transform) {
            this.applyTransform(group, data.transform);
        }

        return group;
    }

    /**
     * Create a material from definition
     */
    static async createMaterial(def) {
        let mat;
        const color = def.color ? new THREE.Color(def.color) : undefined;

        switch (def.type) {
            case 'basic':
                mat = new THREE.MeshBasicMaterial({ color });
                break;
            case 'standard':
                mat = new THREE.MeshStandardMaterial({
                    color,
                    metalness: def.metalness ?? 0,
                    roughness: def.roughness ?? 0.5
                });
                break;
            case 'physical':
                mat = new THREE.MeshPhysicalMaterial({
                    color,
                    metalness: def.metalness ?? 0,
                    roughness: def.roughness ?? 0,
                    transmission: def.transmission,
                    thickness: def.thickness,
                    clearcoat: def.clearcoat,
                    clearcoatRoughness: def.clearcoatRoughness,
                    ior: def.ior
                });
                break;
            case 'points':
                mat = new THREE.PointsMaterial({
                    color,
                    size: def.size ?? 0.05
                });
                break;
            default:
                mat = new THREE.MeshStandardMaterial({ color });
        }

        // Common properties
        if (def.transparent !== undefined) mat.transparent = def.transparent;
        if (def.opacity !== undefined) mat.opacity = def.opacity;
        if (def.side === 'double') mat.side = THREE.DoubleSide;
        if (def.side === 'back') mat.side = THREE.BackSide;

        // Handle textures
        if (def.texture) {
            if (def.texture.type === 'image' && def.texture.url) {
                // Load image texture
                const loader = new THREE.TextureLoader();
                try {
                    const texture = await new Promise((resolve, reject) => {
                        loader.load(def.texture.url, resolve, undefined, reject);
                    });
                    mat.map = texture;
                    console.log(`[ObjectLoader] Loaded image texture: ${def.texture.url}`);
                } catch (e) {
                    console.warn(`[ObjectLoader] Failed to load texture: ${def.texture.url}`, e);
                }
            } else if (def.texture.type === 'procedural') {
                // Generate procedural texture
                const texture = await this.createProceduralTexture(def.texture);
                if (texture) mat.map = texture;
            }
        }

        return mat;
    }

    /**
     * Create geometry from definition
     */
    static createGeometry(def) {
        let geom;

        switch (def.type) {
            case 'sphere':
                geom = new THREE.SphereGeometry(
                    def.radius ?? 1,
                    def.widthSegments ?? 32,
                    def.heightSegments ?? 32,
                    def.phiStart,
                    def.phiLength,
                    def.thetaStart,
                    def.thetaLength
                );
                break;
            case 'box':
                geom = new THREE.BoxGeometry(
                    def.width ?? 1,
                    def.height ?? 1,
                    def.depth ?? 1
                );
                break;
            case 'cylinder':
                geom = new THREE.CylinderGeometry(
                    def.radiusTop ?? 0.5,
                    def.radiusBottom ?? 0.5,
                    def.height ?? 1,
                    def.radialSegments ?? 32
                );
                break;
            case 'cone':
                geom = new THREE.ConeGeometry(
                    def.radius ?? 0.5,
                    def.height ?? 1,
                    def.radialSegments ?? 16
                );
                break;
            case 'torus':
                geom = new THREE.TorusGeometry(
                    def.radius ?? 1,
                    def.tube ?? 0.4,
                    def.radialSegments ?? 16,
                    def.tubularSegments ?? 32,
                    def.arc
                );
                break;
            case 'ring':
                geom = new THREE.RingGeometry(
                    def.innerRadius ?? 0.5,
                    def.outerRadius ?? 1,
                    def.thetaSegments ?? 32
                );
                break;
            case 'capsule':
                geom = new THREE.CapsuleGeometry(
                    def.radius ?? 0.5,
                    def.length ?? 1,
                    def.capSegments ?? 8,
                    def.radialSegments ?? 16
                );
                break;
            case 'icosahedron':
                geom = new THREE.IcosahedronGeometry(
                    def.radius ?? 1,
                    def.detail ?? 0
                );
                break;
            default:
                geom = new THREE.SphereGeometry(1, 16, 16);
        }

        // Apply scale to geometry if specified
        if (def.scale) {
            geom.scale(def.scale[0], def.scale[1], def.scale[2]);
        }

        return geom;
    }

    /**
     * Create a mesh node from definition
     */
    static async createMeshNode(def, materials) {
        const geom = this.createGeometry(def.geometry);

        // Resolve material (by name or inline)
        let mat;
        if (typeof def.material === 'string') {
            mat = materials[def.material];
        } else if (def.material) {
            mat = await this.createMaterial(def.material);
        } else {
            mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        }

        // Create mesh (or Points for particles)
        let mesh;
        if (def.geometry.type === 'particles') {
            mesh = this.createParticles(def.geometry, mat);
        } else {
            mesh = new THREE.Mesh(geom, mat);
        }

        mesh.name = def.name;
        if (def.castShadow) mesh.castShadow = true;
        if (def.receiveShadow) mesh.receiveShadow = true;

        // Apply transform
        if (def.transform) {
            this.applyTransform(mesh, def.transform);
        }

        // Store animation data for runtime
        if (def.animation) {
            mesh.userData.animation = def.animation;
        }

        return mesh;
    }

    /**
     * Create particle system
     */
    static createParticles(def, mat) {
        const count = def.count ?? 100;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const radius = def.radius ?? 1;

        for (let i = 0; i < count; i++) {
            if (def.distribution === 'spherical') {
                const r = Math.random() * radius;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = r * Math.cos(phi);
            } else {
                positions[i * 3] = (Math.random() - 0.5) * radius * 2;
                positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 2;
                positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
            }
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const points = new THREE.Points(geom, mat);
        points.name = 'particles';
        return points;
    }

    /**
     * Apply transform to object
     */
    static applyTransform(obj, t) {
        if (t.position) obj.position.set(...t.position);
        if (t.rotation) obj.rotation.set(...t.rotation);
        if (t.scale) obj.scale.set(...t.scale);
    }

    /**
     * Create procedural texture
     * @param {Object} def - Texture definition from JSON
     */
    static async createProceduralTexture(def) {
        const [width, height] = def.size || [512, 512];
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Load external data file if specified
        let textureData = def.data || {};
        if (def.dataFile) {
            try {
                const response = await fetch(def.dataFile);
                if (response.ok) {
                    const externalData = await response.json();
                    textureData = { ...textureData, ...externalData };
                    console.log(`[ObjectLoader] Loaded external data: ${def.dataFile}`);
                }
            } catch (e) {
                console.warn(`[ObjectLoader] Failed to load external data: ${def.dataFile}`, e);
            }
        }

        // Call the appropriate generator with data from JSON
        const generator = this.textureGenerators[def.generator];
        if (generator) {
            // Pass the texture data to the generator
            generator(ctx, width, height, textureData);
        } else {
            // Default gradient
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, '#6366f1');
            grad.addColorStop(1, '#8b5cf6');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        }

        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Register a procedural texture generator
     */
    static registerTextureGenerator(name, fn) {
        this.textureGenerators[name] = fn;
    }

    /**
     * Create planets for solar system
     */
    static createPlanets(group, planets, materials) {
        for (const p of planets) {
            const orbitGroup = new THREE.Group();
            orbitGroup.name = p.name + 'Orbit';

            // Orbit ring
            const orbitMat = materials.orbit || new THREE.MeshBasicMaterial({
                color: 0x333344, side: THREE.DoubleSide, transparent: true, opacity: 0.3
            });
            const orbit = new THREE.Mesh(
                new THREE.RingGeometry(p.distance - 0.02, p.distance + 0.02, 64),
                orbitMat
            );
            orbit.rotation.x = Math.PI / 2;
            group.add(orbit);

            // Planet
            const planet = new THREE.Mesh(
                new THREE.SphereGeometry(p.size, 16, 16),
                new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.7 })
            );
            planet.position.x = p.distance;
            planet.castShadow = true;
            planet.userData = { orbitSpeed: p.orbitSpeed, orbitDistance: p.distance };
            orbitGroup.add(planet);

            // Saturn rings
            if (p.hasRings) {
                const rings = new THREE.Mesh(
                    new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 32),
                    materials.rings || new THREE.MeshBasicMaterial({
                        color: 0xaa9966, side: THREE.DoubleSide, transparent: true, opacity: 0.7
                    })
                );
                rings.rotation.x = Math.PI / 3;
                rings.position.x = p.distance;
                orbitGroup.add(rings);
            }

            group.add(orbitGroup);
        }
    }

    /**
     * Create asteroid belt
     */
    static createAsteroidBelt(group, belt) {
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(belt.count * 3);

        for (let i = 0; i < belt.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = belt.innerRadius + Math.random() * (belt.outerRadius - belt.innerRadius);
            positions[i * 3] = Math.cos(angle) * dist;
            positions[i * 3 + 1] = (Math.random() - 0.5) * belt.heightVariance;
            positions[i * 3 + 2] = Math.sin(angle) * dist;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const points = new THREE.Points(geom, new THREE.PointsMaterial({
            color: belt.color || 0x666666,
            size: belt.particleSize || 0.03
        }));
        group.add(points);
    }

    /**
     * Create microbes
     */
    static createMicrobes(group, microbeTypes, spawnArea) {
        for (const mt of microbeTypes) {
            for (let i = 0; i < mt.count; i++) {
                const microbe = this.createSingleMicrobe(mt);

                // Random position in spawn area
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (spawnArea?.radius || 2);
                const minY = spawnArea?.minY || -0.7;
                const maxY = spawnArea?.maxY || -0.2;

                microbe.position.set(
                    Math.cos(angle) * dist,
                    minY + Math.random() * (maxY - minY),
                    Math.sin(angle) * dist
                );
                microbe.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                microbe.userData = {
                    floatSpeed: 0.5 + Math.random(),
                    floatOffset: Math.random() * Math.PI * 2
                };
                microbe.name = 'microbe';
                group.add(microbe);
            }
        }
    }

    /**
     * Create a single microbe based on type
     */
    static createSingleMicrobe(mt) {
        const mat = new THREE.MeshPhysicalMaterial({
            color: mt.color,
            roughness: 0.3,
            metalness: 0.1,
            clearcoat: 0.5,
            transparent: true,
            opacity: 0.85
        });

        let microbe;

        if (mt.type === 'bacteria' && mt.geometry?.type === 'capsule') {
            microbe = new THREE.Group();
            microbe.add(new THREE.Mesh(
                new THREE.CapsuleGeometry(
                    mt.geometry.radius || 0.05,
                    mt.geometry.length || 0.15,
                    mt.geometry.capSegments || 8,
                    mt.geometry.radialSegments || 16
                ),
                mat
            ));
            // Add flagella
            if (mt.flagella) {
                for (let f = 0; f < mt.flagella.count; f++) {
                    const flag = new THREE.Mesh(
                        new THREE.CylinderGeometry(mt.flagella.radius, mt.flagella.radius, mt.flagella.length, 4),
                        new THREE.MeshBasicMaterial({ color: mt.color })
                    );
                    flag.position.set(-0.1, (f - 1) * 0.03, 0);
                    flag.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                    microbe.add(flag);
                }
            }
        } else if (mt.type === 'virus' && mt.geometry?.type === 'icosahedron') {
            microbe = new THREE.Group();
            const core = new THREE.Mesh(
                new THREE.IcosahedronGeometry(mt.geometry.radius || 0.08, mt.geometry.detail || 0),
                mat
            );
            microbe.add(core);
            // Add spikes
            if (mt.spikes) {
                const vertices = core.geometry.attributes.position;
                for (let v = 0; v < vertices.count; v += 3) {
                    const spike = new THREE.Mesh(
                        new THREE.ConeGeometry(mt.spikes.radius, mt.spikes.height, 4),
                        new THREE.MeshBasicMaterial({ color: mt.color })
                    );
                    const dir = new THREE.Vector3(
                        vertices.getX(v),
                        vertices.getY(v),
                        vertices.getZ(v)
                    ).normalize();
                    spike.position.copy(dir.multiplyScalar(mt.geometry.radius || 0.08));
                    spike.lookAt(spike.position.clone().multiplyScalar(2));
                    microbe.add(spike);
                }
            }
        } else {
            // Amoeba - deformed sphere
            microbe = new THREE.Mesh(
                new THREE.SphereGeometry(mt.geometry?.radius || 0.15, 16, 16),
                mat
            );
            if (mt.geometry?.deform) {
                const pos = microbe.geometry.attributes.position;
                for (let v = 0; v < pos.count; v++) {
                    const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
                    const freq = mt.geometry.deformFrequency || 5;
                    const amp = mt.geometry.deformAmplitude || 0.2;
                    const noise = 1 + Math.sin(x * freq) * amp + Math.cos(z * freq) * amp;
                    pos.setXYZ(v, x * noise, y * noise, z * noise);
                }
                pos.needsUpdate = true;
                microbe.geometry.computeVertexNormals();
            }
        }

        return microbe;
    }

    /**
     * Clone a group (for cache reuse)
     */
    static cloneGroup(group) {
        return group.clone(true);
    }
}

// Register default procedural texture generators
ObjectLoader.registerTextureGenerator('teapotDecal', (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        const x = 64 + (i % 4) * 128;
        const y = 64 + Math.floor(i / 4) * 256;
        ctx.beginPath();
        ctx.arc(x, y, 40, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 4, 0, Math.PI * 2);
        ctx.fill();
    }
});

ObjectLoader.registerTextureGenerator('woodGrain', (ctx, w, h) => {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 50; i++) {
        ctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.3})`;
        ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath();
        const y = Math.random() * h;
        ctx.moveTo(0, y);
        for (let x = 0; x < w; x += 20) {
            ctx.lineTo(x, y + Math.sin(x * 0.02) * 10 + Math.random() * 5);
        }
        ctx.stroke();
    }
});

/**
 * Earth Surface Texture Generator - Data-Driven
 * Reads continent shapes, colors, and ocean data from JSON
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {Object} data - Data from earth.json texture.data
 */
ObjectLoader.registerTextureGenerator('earthSurface', (ctx, w, h, data) => {
    // Ocean background - read from JSON or use defaults
    if (data.ocean?.gradient) {
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
        data.ocean.gradient.forEach(g => {
            oceanGrad.addColorStop(g.stop, g.color);
        });
        ctx.fillStyle = oceanGrad;
    } else {
        ctx.fillStyle = '#1a5f7a';
    }
    ctx.fillRect(0, 0, w, h);

    // Draw continents from JSON data
    if (data.continents && Array.isArray(data.continents)) {
        for (const continent of data.continents) {
            const path = continent.path;
            if (!path || path.length < 3) continue;

            // Main landmass fill
            ctx.fillStyle = continent.color || '#3d7a37';
            ctx.beginPath();
            ctx.moveTo(path[0][0] * w, path[0][1] * h);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i][0] * w, path[i][1] * h);
            }
            ctx.closePath();
            ctx.fill();

            // Coastline shadow
            ctx.strokeStyle = 'rgba(0,40,80,0.4)';
            ctx.lineWidth = Math.max(1, w / 500);
            ctx.stroke();
        }
    }

    // Polar ice caps from JSON data
    if (data.polarCaps) {
        // North pole
        if (data.polarCaps.north) {
            const northHeight = data.polarCaps.north.height || 0.05;
            const polarGrad = ctx.createLinearGradient(0, 0, 0, h * northHeight * 2);
            polarGrad.addColorStop(0, data.polarCaps.north.color || 'rgba(255,255,255,0.9)');
            polarGrad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = polarGrad;
            ctx.fillRect(0, 0, w, h * northHeight);
        }
        // South pole
        if (data.polarCaps.south) {
            const southHeight = data.polarCaps.south.height || 0.08;
            const southGrad = ctx.createLinearGradient(0, h * (1 - southHeight * 1.5), 0, h);
            southGrad.addColorStop(0, 'rgba(255,255,255,0)');
            southGrad.addColorStop(1, data.polarCaps.south.color || 'rgba(255,255,255,0.7)');
            ctx.fillStyle = southGrad;
            ctx.fillRect(0, h * (1 - southHeight), w, h * southHeight);
        }
    }
});

ObjectLoader.registerTextureGenerator('clouds', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 100; i++) {
        ctx.beginPath();
        ctx.ellipse(
            Math.random() * w,
            Math.random() * h,
            20 + Math.random() * 40,
            10 + Math.random() * 20,
            Math.random() * Math.PI,
            0, Math.PI * 2
        );
        ctx.fill();
    }
});

export default ObjectLoader;
