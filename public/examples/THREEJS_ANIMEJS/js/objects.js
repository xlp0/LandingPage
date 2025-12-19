import { CONFIG } from './config.js';

export class ObjectFactory {
    static create(type) {
        switch (type) {
            case 'teapot': return this.createTeapot();
            case 'table': return this.createTable();
            case 'crystal': return this.createCrystalBall();
            case 'earth': return this.createEarth();
            case 'solar': return this.createSolarSystem();
            case 'microbes': return this.createMicrobes();
            case 'causalCone': return this.createCausalCone();
            default: return null;
        }
    }

    static createTeapot() {
        const group = new THREE.Group();
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const x = 64 + (i % 4) * 128;
            const y = 64 + Math.floor(i / 4) * 256;
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.stroke();
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(x + Math.cos(angle) * 25, y + Math.sin(angle) * 25, 12, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.fillStyle = '#fbbf24';
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 512, Math.random() * 512, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        const decalTexture = new THREE.CanvasTexture(canvas);
        const mainMaterial = new THREE.MeshPhysicalMaterial({
            map: decalTexture,
            metalness: 0.1,
            roughness: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const metalMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffd700,
            metalness: 0.9, roughness: 0.2
        });

        const bodyGeom = new THREE.SphereGeometry(1, 64, 64);
        bodyGeom.scale(1, 0.7, 1);
        const body = new THREE.Mesh(bodyGeom, mainMaterial);
        body.castShadow = true;
        group.add(body);

        const lidBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.15, 32), metalMaterial);
        lidBase.position.y = 0.65;
        group.add(lidBase);

        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mainMaterial);
        lid.position.y = 0.72;
        group.add(lid);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), metalMaterial);
        knob.position.y = 1.15;
        group.add(knob);

        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.8, 16), mainMaterial);
        spout.position.set(1.0, 0.2, 0);
        spout.rotation.z = -Math.PI / 4;
        group.add(spout);

        const spoutTip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16), metalMaterial);
        spoutTip.position.set(1.35, 0.55, 0);
        spoutTip.rotation.z = -Math.PI / 4;
        group.add(spoutTip);

        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 16, 32, Math.PI), metalMaterial);
        handle.position.set(-0.95, 0.2, 0);
        handle.rotation.set(0, Math.PI / 2, Math.PI / 2);
        group.add(handle);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 16, 32), metalMaterial);
        rim.position.y = -0.6;
        rim.rotation.x = Math.PI / 2;
        group.add(rim);

        group.position.y = 0.5;
        return group;
    }

    static createTable() {
        const group = new THREE.Group();
        const woodCanvas = document.createElement('canvas');
        woodCanvas.width = 512;
        woodCanvas.height = 512;
        const wctx = woodCanvas.getContext('2d');
        wctx.fillStyle = '#8B4513';
        wctx.fillRect(0, 0, 512, 512);

        for (let i = 0; i < 50; i++) {
            wctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.3})`;
            wctx.lineWidth = 1 + Math.random() * 3;
            wctx.beginPath();
            const y = Math.random() * 512;
            wctx.moveTo(0, y);
            for (let x = 0; x < 512; x += 20) {
                wctx.lineTo(x, y + Math.sin(x * 0.02) * 10 + Math.random() * 5);
            }
            wctx.stroke();
        }

        for (let i = 0; i < 5; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const grad = wctx.createRadialGradient(x, y, 0, x, y, 20);
            grad.addColorStop(0, '#3d2817');
            grad.addColorStop(1, '#8B4513');
            wctx.fillStyle = grad;
            wctx.beginPath();
            wctx.ellipse(x, y, 15 + Math.random() * 10, 8 + Math.random() * 5, Math.random() * Math.PI, 0, Math.PI * 2);
            wctx.fill();
        }

        const woodTexture = new THREE.CanvasTexture(woodCanvas);
        woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
        const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.7, metalness: 0.0 });
        const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.3 });

        const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 2), woodMaterial);
        top.position.y = 1;
        top.castShadow = top.receiveShadow = true;
        group.add(top);

        const legGeom = new THREE.CylinderGeometry(0.08, 0.1, 2.3, 16);
        const legPositions = [[-1.3, -0.15, 0.8], [1.3, -0.15, 0.8], [-1.3, -0.15, -0.8], [1.3, -0.15, -0.8]];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeom, metalMaterial);
            leg.position.set(...pos);
            leg.castShadow = true;
            group.add(leg);
        });

        const barGeom = new THREE.CylinderGeometry(0.03, 0.03, 2.6, 8);
        const bar1 = new THREE.Mesh(barGeom, metalMaterial);
        bar1.rotation.z = Math.PI / 2;
        bar1.position.set(0, -0.5, 0.8);
        group.add(bar1);
        const bar2 = new THREE.Mesh(barGeom, metalMaterial);
        bar2.rotation.z = Math.PI / 2;
        bar2.position.set(0, -0.5, -0.8);
        group.add(bar2);

        group.position.y = 0;
        return group;
    }

    static createCrystalBall() {
        const group = new THREE.Group();

        // Place the PKC Box as the primary object
        const pkcBox = this.createPKCBox();
        // Scaled up since the outer ball is gone
        pkcBox.scale.set(0.18, 0.18, 0.18);
        pkcBox.position.y = -0.5;
        group.add(pkcBox);

        const particleGeom = new THREE.BufferGeometry();
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const r = Math.random() * 0.9;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
        }
        particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particles = new THREE.Points(particleGeom, new THREE.PointsMaterial({ color: 0xaaaaff, size: 0.03, transparent: true, opacity: 0.6 }));
        particles.name = 'particles';
        group.add(particles);

        const standMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, metalness: 0.3, roughness: 0.7 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.3, 32), standMaterial);
        base.position.y = -1.4; base.castShadow = true;
        group.add(base);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.4, 32), standMaterial);
        stem.position.y = -1.1;
        group.add(stem);

        group.position.y = 0.5;
        return group;
    }

    /**
     * Create the PKC Box object from the reference image
     * Features: Slanted platform, transparent box, internal CLM cards, PKC branding
     */
    static createPKCBox() {
        const group = new THREE.Group();

        // Materials
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xf0f4f8 });
        const blueMat = new THREE.MeshPhongMaterial({ color: 0x00a0e9 });
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xdef3ff,
            transmission: 0.9,
            thickness: 0.5,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            depthWrite: false // Allow seeing internal cards clearly
        });

        // 1. Main Box Structure (Platform removed)
        const boxContainer = new THREE.Group();

        // Bottom Plate
        const plateGeom = new THREE.BoxGeometry(7, 0.6, 7);
        const bottomPlate = new THREE.Mesh(plateGeom, whiteMat);
        bottomPlate.position.y = -2;
        boxContainer.add(bottomPlate);

        // Top Lid
        const topPlate = new THREE.Mesh(plateGeom, whiteMat);
        topPlate.position.y = 4;
        boxContainer.add(topPlate);

        // Glass Walls
        const glassGeom = new THREE.BoxGeometry(6.8, 6, 6.8);
        const glassBox = new THREE.Mesh(glassGeom, glassMat);
        glassBox.position.y = 1;
        boxContainer.add(glassBox);

        // Corner Pillars (4 blue rods)
        const pillarGeom = new THREE.CylinderGeometry(0.15, 0.15, 6.6, 16);
        const pillarPos = 3.2;
        const pillars = [
            [pillarPos, pillarPos], [pillarPos, -pillarPos], [-pillarPos, pillarPos], [-pillarPos, -pillarPos]
        ];
        pillars.forEach(p => {
            const pillar = new THREE.Mesh(pillarGeom, blueMat);
            pillar.position.set(p[0], 1, p[1]);
            boxContainer.add(pillar);
        });

        group.add(boxContainer);

        // 2. Internal Cards (V-pre, PROCESS, V-post)
        const cardsGroup = new THREE.Group();
        const cardInfos = [
            { label: 'V-pre', color: '#10b981' },   // Green
            { label: 'PROCESS', color: '#3b82f6' }, // Blue
            { label: 'V-post', color: '#10b981' }   // Green
        ];

        // Create CLM text texture (Square)
        const createCanvasTexture = (label, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 512; // Square for slab faces
            const ctx = canvas.getContext('2d');

            // White background (solid)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);

            // Themed border
            ctx.strokeStyle = color;
            ctx.lineWidth = 20;
            ctx.strokeRect(10, 10, 492, 492);

            // Label box 'CLM' at top left
            ctx.fillStyle = color;
            ctx.fillRect(30, 30, 120, 50);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial';
            ctx.fillText('CLM', 50, 68);

            // Big text in middle
            ctx.fillStyle = color;
            ctx.textAlign = 'center';

            if (label === 'PROCESS') {
                ctx.font = 'bold 70px Arial';
                ctx.fillText('PROCESS', 256, 250);
                // Simple process icon
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(176, 340, 30, 0, Math.PI * 2);
                ctx.arc(256, 340, 30, 0, Math.PI * 2);
                ctx.arc(336, 340, 30, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.font = 'bold 100px Arial';
                ctx.fillText(label, 256, 280);
            }

            // Abstract lines at bottom
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(80, 430); ctx.lineTo(432, 430);
            ctx.moveTo(80, 460); ctx.lineTo(320, 460);
            ctx.stroke();

            return new THREE.CanvasTexture(canvas);
        };

        // Dimensions for occupancy (75% volume utilization of space)
        const thickness = 0.15; // Very little thickness as requested
        const cardSize = 5.8;   // Snugly fit for more volume occupancy

        cardInfos.forEach((info, i) => {
            const texture = createCanvasTexture(info.label, info.color);

            // Multi-material for the thin slab: Large faces are +X and -X (Bookshelf style)
            const labelMat = new THREE.MeshBasicMaterial({ map: texture });
            const blankMat = new THREE.MeshPhongMaterial({ color: 0xffffff });

            // Materials for the 6 faces: [+X, -X, +Y, -Y, +Z, -Z]
            const materials = [
                labelMat, labelMat, // Labels on the broad side faces
                blankMat, blankMat,
                blankMat, blankMat
            ];

            const cardGeom = new THREE.BoxGeometry(thickness, cardSize, cardSize);
            const card = new THREE.Mesh(cardGeom, materials);

            // Align in a row along X reaching 75% of box width
            // Spaced out so we can clearly see the Process card in the middle
            const xPos = -2.4 + i * 2.4;
            card.position.set(xPos, 1, 0);
            cardsGroup.add(card);
        });
        group.add(cardsGroup);

        // 3. PKC Label on Lid
        const pkcLabelCanvas = document.createElement('canvas');
        pkcLabelCanvas.width = 256; pkcLabelCanvas.height = 128;
        const pkcCtx = pkcLabelCanvas.getContext('2d');
        pkcCtx.fillStyle = '#00a0e9';
        pkcCtx.roundRect = pkcCtx.roundRect || function (x, y, w, h, r) {
            this.beginPath(); this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r); this.quadraticCurveTo(x + w, y + h, x + w - r, y + h); this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r); this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y); this.closePath();
        };
        pkcCtx.beginPath();
        pkcCtx.roundRect(10, 10, 236, 108, 20);
        pkcCtx.fill();
        pkcCtx.fillStyle = '#ffffff';
        pkcCtx.font = 'bold 64px Arial';
        pkcCtx.fillText('PKC', 60, 85);

        const pkcTexture = new THREE.CanvasTexture(pkcLabelCanvas);
        const pkcLabelGeom = new THREE.PlaneGeometry(3, 1.5);
        const pkcLabel = new THREE.Mesh(pkcLabelGeom, new THREE.MeshBasicMaterial({ map: pkcTexture, transparent: true }));
        pkcLabel.position.set(1.5, 4.31, 1.5);
        pkcLabel.rotation.x = -Math.PI / 2;
        group.add(pkcLabel);

        return group;
    }

    static createEarth() {
        const group = new THREE.Group();
        const loader = new THREE.TextureLoader();

        // Get base path for textures (relative to HTML file location)
        const texturePath = './textures/';
        console.log('[Earth] Loading textures from:', texturePath);

        // Load Earth texture (satellite imagery) with callbacks
        const earthTexture = loader.load(
            texturePath + 'earth.jpg',
            (texture) => console.log('[Earth] ✅ Earth texture loaded successfully'),
            undefined,
            (err) => console.error('[Earth] ❌ Failed to load earth texture:', err)
        );

        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 64, 64),
            new THREE.MeshStandardMaterial({
                map: earthTexture,
                roughness: 0.8,
                metalness: 0.1
            })
        );
        earth.name = 'earth';
        earth.castShadow = true;
        group.add(earth);

        // Load cloud texture with callbacks
        const cloudTexture = loader.load(
            texturePath + 'clouds.jpg',
            (texture) => console.log('[Earth] ✅ Cloud texture loaded successfully'),
            undefined,
            (err) => console.error('[Earth] ❌ Failed to load cloud texture:', err)
        );
        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.52, 64, 64),
            new THREE.MeshStandardMaterial({
                map: cloudTexture,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            })
        );
        clouds.name = 'clouds';
        group.add(clouds);

        // Atmosphere glow
        const atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.65, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0x4da6ff,
                transparent: true,
                opacity: 0.12,
                side: THREE.BackSide
            })
        );
        atmosphere.name = 'atmosphere';
        group.add(atmosphere);

        // Moon
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 })
        );
        moon.position.set(3, 0.5, 0);
        moon.name = 'moon';
        group.add(moon);

        group.position.y = 0.5;
        return group;
    }

    static createSolarSystem() {
        const group = new THREE.Group();
        const sun = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
        sun.name = 'sun'; group.add(sun);
        group.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3, side: THREE.BackSide })));

        const planets = [
            { name: 'mercury', color: 0x888888, size: 0.1, distance: 1.5, speed: 0.04 },
            { name: 'venus', color: 0xddaa66, size: 0.15, distance: 2.0, speed: 0.03 },
            { name: 'earthOrbit', color: 0x4488ff, size: 0.16, distance: 2.6, speed: 0.02 },
            { name: 'mars', color: 0xcc4422, size: 0.12, distance: 3.2, speed: 0.015 },
            { name: 'jupiter', color: 0xddaa88, size: 0.4, distance: 4.2, speed: 0.008 },
            { name: 'saturn', color: 0xddcc88, size: 0.35, distance: 5.2, speed: 0.006, hasRings: true },
            { name: 'uranus', color: 0x88dddd, size: 0.25, distance: 6.0, speed: 0.004 },
            { name: 'neptune', color: 0x4466ff, size: 0.24, distance: 6.8, speed: 0.003 }
        ];

        planets.forEach(p => {
            const orbitGroup = new THREE.Group(); orbitGroup.name = p.name + 'Orbit';
            const orbit = new THREE.Mesh(new THREE.RingGeometry(p.distance - 0.02, p.distance + 0.02, 64), new THREE.MeshBasicMaterial({ color: 0x333344, side: THREE.DoubleSide, transparent: true, opacity: 0.3 }));
            orbit.rotation.x = Math.PI / 2; group.add(orbit);
            const planet = new THREE.Mesh(new THREE.SphereGeometry(p.size, 16, 16), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.7 }));
            planet.position.x = p.distance; planet.castShadow = true; planet.userData = { orbitSpeed: p.speed, orbitDistance: p.distance };
            orbitGroup.add(planet);
            if (p.hasRings) {
                const rings = new THREE.Mesh(new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 32), new THREE.MeshBasicMaterial({ color: 0xaa9966, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
                rings.rotation.x = Math.PI / 3; rings.position.x = p.distance; orbitGroup.add(rings);
            }
            group.add(orbitGroup);
        });

        const asteroidGeom = new THREE.BufferGeometry();
        const asteroidCount = 500; const asteroidPos = new Float32Array(asteroidCount * 3);
        for (let i = 0; i < asteroidCount; i++) {
            const angle = Math.random() * Math.PI * 2; const dist = 3.6 + Math.random() * 0.4;
            asteroidPos[i * 3] = Math.cos(angle) * dist; asteroidPos[i * 3 + 1] = (Math.random() - 0.5) * 0.2; asteroidPos[i * 3 + 2] = Math.sin(angle) * dist;
        }
        asteroidGeom.setAttribute('position', new THREE.BufferAttribute(asteroidPos, 3));
        group.add(new THREE.Points(asteroidGeom, new THREE.PointsMaterial({ color: 0x666666, size: 0.03 })));

        group.position.y = 0; group.scale.setScalar(0.8);
        return group;
    }

    static createMicrobes() {
        const group = new THREE.Group();
        const dishMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.1, thickness: 0.5 });
        const dish = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.3, 64), dishMaterial);
        dish.position.y = -1; group.add(dish);
        const agar = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.15, 64), new THREE.MeshStandardMaterial({ color: 0xeedd99, roughness: 0.6, transparent: true, opacity: 0.8 }));
        agar.position.y = -0.9; group.add(agar);

        const microbeTypes = [
            { type: 'bacteria', color: 0x44dd44, count: 30 },
            { type: 'virus', color: 0xdd4444, count: 15 },
            { type: 'amoeba', color: 0x8888dd, count: 8 }
        ];

        microbeTypes.forEach(mt => {
            for (let i = 0; i < mt.count; i++) {
                let microbe;
                const mat = new THREE.MeshPhysicalMaterial({ color: mt.color, roughness: 0.3, metalness: 0.1, clearcoat: 0.5, transparent: true, opacity: 0.85 });
                if (mt.type === 'bacteria') {
                    microbe = new THREE.Group();
                    microbe.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.15, 8, 16), mat));
                    for (let f = 0; f < 3; f++) {
                        const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.15, 4), new THREE.MeshBasicMaterial({ color: mt.color }));
                        flag.position.set(-0.1, (f - 1) * 0.03, 0); flag.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5; microbe.add(flag);
                    }
                } else if (mt.type === 'virus') {
                    microbe = new THREE.Group(); const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), mat); microbe.add(core);
                    const vertices = core.geometry.attributes.position;
                    for (let v = 0; v < vertices.count; v += 3) {
                        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 4), new THREE.MeshBasicMaterial({ color: mt.color }));
                        const dir = new THREE.Vector3(vertices.getX(v), vertices.getY(v), vertices.getZ(v)).normalize();
                        spike.position.copy(dir.multiplyScalar(0.08)); spike.lookAt(spike.position.clone().multiplyScalar(2)); microbe.add(spike);
                    }
                } else {
                    microbe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
                    const pos = microbe.geometry.attributes.position;
                    for (let v = 0; v < pos.count; v++) {
                        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
                        const noise = 1 + Math.sin(x * 5) * 0.2 + Math.cos(z * 5) * 0.2; pos.setXYZ(v, x * noise, y * noise, z * noise);
                    }
                    pos.needsUpdate = true; microbe.geometry.computeVertexNormals();
                }
                const angle = Math.random() * Math.PI * 2, dist = Math.random() * 2;
                microbe.position.set(Math.cos(angle) * dist, -0.7 + Math.random() * 0.5, Math.sin(angle) * dist);
                microbe.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                microbe.userData = { floatSpeed: 0.5 + Math.random(), floatOffset: Math.random() * Math.PI * 2 };
                microbe.name = 'microbe'; group.add(microbe);
            }
        });
        group.position.y = 1; return group;
    }

    /**
     * Create a Causal Cone (Light Cone) visualization
     * Shows the spacetime structure of special relativity:
     * - Blue upper cone: Future light cone (causally accessible future)
     * - Orange lower cone: Past light cone (causally accessible past)
     * - Green plane: Present moment (spacelike hypersurface)
     * - Vertical axis: Time dimension
     * - Horizontal axes: Space dimensions
     */
    static createCausalCone() {
        const group = new THREE.Group();

        // Materials matching the reference image
        const futureMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4a9eff,  // Blue
            metalness: 0.0,
            roughness: 0.2,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const pastMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff6b3d,  // Orange
            metalness: 0.0,
            roughness: 0.2,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });

        const presentMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x4ade80,  // Green
            metalness: 0.1,
            roughness: 0.3,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
        const originMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x22c55e });

        // Future Light Cone (upper) - apex at origin, widening upward
        // ConeGeometry has apex at top by default, so we rotate 180° to point apex down
        const futureConeGeom = new THREE.ConeGeometry(2.5, 3, 64, 1, true);
        const futureCone = new THREE.Mesh(futureConeGeom, futureMaterial);
        futureCone.position.y = 1.5;  // Center of cone at y=1.5
        futureCone.rotation.x = Math.PI;  // Flip so apex points DOWN toward origin
        futureCone.name = 'futureCone';
        group.add(futureCone);

        // Past Light Cone (lower) - apex at origin, widening downward
        // Apex naturally points up, so no rotation needed
        const pastConeGeom = new THREE.ConeGeometry(2.5, 3, 64, 1, true);
        const pastCone = new THREE.Mesh(pastConeGeom, pastMaterial);
        pastCone.position.y = -1.5;  // Center of cone at y=-1.5
        // No rotation - apex points UP toward origin
        pastCone.name = 'pastCone';
        group.add(pastCone);

        // Present Plane (horizontal plane with Science of Governance texture)
        const textureLoader = new THREE.TextureLoader();
        const presentTexture = textureLoader.load('data/materials/science_of_governance.png');
        presentTexture.colorSpace = THREE.SRGBColorSpace;

        const presentMaterialWithTexture = new THREE.MeshPhysicalMaterial({
            map: presentTexture,
            color: 0xffffff,  // White to show texture colors properly
            metalness: 0.0,
            roughness: 0.3,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        // Image is 725x1024 (portrait), aspect ratio = 0.708
        // Keep height at 5, width = 5 * 0.708 = 3.54 to maintain aspect ratio
        const imageAspect = 725 / 1024;  // ~0.708
        const planeHeight = 5;
        const planeWidth = planeHeight * imageAspect;  // ~3.54
        const presentGeom = new THREE.PlaneGeometry(planeWidth, planeHeight);
        const presentPlane = new THREE.Mesh(presentGeom, presentMaterialWithTexture);
        presentPlane.rotation.x = -Math.PI / 2;  // Horizontal
        presentPlane.name = 'presentPlane';
        group.add(presentPlane);

        // Green border ring around the present plane
        const borderGeom = new THREE.TorusGeometry(3.5, 0.03, 8, 64);
        const borderRing = new THREE.Mesh(borderGeom, borderMaterial);
        borderRing.rotation.x = Math.PI / 2;
        borderRing.name = 'presentBorder';
        group.add(borderRing);

        // Time Axis (vertical line)
        const timeAxisGeom = new THREE.CylinderGeometry(0.02, 0.02, 8, 8);
        const timeAxis = new THREE.Mesh(timeAxisGeom, axisMaterial);
        timeAxis.name = 'timeAxis';
        group.add(timeAxis);

        // Time arrow head
        const timeArrowGeom = new THREE.ConeGeometry(0.12, 0.3, 16);
        const timeArrow = new THREE.Mesh(timeArrowGeom, axisMaterial);
        timeArrow.position.y = 4.15;
        timeArrow.name = 'timeArrow';
        group.add(timeArrow);

        // Space Axis X (horizontal)
        const spaceAxisXGeom = new THREE.CylinderGeometry(0.015, 0.015, 6, 8);
        const spaceAxisX = new THREE.Mesh(spaceAxisXGeom, axisMaterial);
        spaceAxisX.rotation.z = Math.PI / 2;
        spaceAxisX.name = 'spaceAxisX';
        group.add(spaceAxisX);

        // Space arrow X
        const spaceArrowXGeom = new THREE.ConeGeometry(0.08, 0.2, 12);
        const spaceArrowX = new THREE.Mesh(spaceArrowXGeom, axisMaterial);
        spaceArrowX.position.set(-3.1, 0, 0);
        spaceArrowX.rotation.z = Math.PI / 2;
        spaceArrowX.name = 'spaceArrowX';
        group.add(spaceArrowX);

        // Space Axis Z (horizontal, perpendicular)
        const spaceAxisZGeom = new THREE.CylinderGeometry(0.015, 0.015, 6, 8);
        const spaceAxisZ = new THREE.Mesh(spaceAxisZGeom, axisMaterial);
        spaceAxisZ.rotation.x = Math.PI / 2;
        spaceAxisZ.name = 'spaceAxisZ';
        group.add(spaceAxisZ);

        // Origin sphere (the event)
        const originGeom = new THREE.SphereGeometry(0.1, 16, 16);
        const origin = new THREE.Mesh(originGeom, originMaterial);
        origin.name = 'origin';
        group.add(origin);

        // Event indicators inside cones
        const futureEventMat = new THREE.MeshStandardMaterial({ color: 0x4a9eff });
        const futureEvent = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), futureEventMat);
        futureEvent.position.set(0.3, 1.5, 0.2);
        futureEvent.name = 'futureEvent';
        group.add(futureEvent);

        const pastEventMat = new THREE.MeshStandardMaterial({ color: 0xff6b3d });
        const pastEvent = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), pastEventMat);
        pastEvent.position.set(-0.2, -1.2, 0.3);
        pastEvent.name = 'pastEvent';
        group.add(pastEvent);

        // Add text labels using CSS2D or sprite (simplified here)
        // The labels would be: "time" at top, "space" on side, "FUTURE"/"PAST" on cones

        return group;
    }
}
