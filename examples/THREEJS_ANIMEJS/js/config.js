export const CONFIG = {
    camera: {
        front: { position: [0, 2, 8], target: [0, 0, 0] },
        top: { position: [0, 12, 0.1], target: [0, 0, 0] },
        side: { position: [10, 2, 0], target: [0, 0, 0] },
        orbit: { position: [5, 4, 5], target: [0, 0, 0] },
        closeup: { position: [2, 1, 3], target: [0, 0.3, 0] }
    },
    lighting: {
        studio: {
            ambient: { color: 0xffffff, intensity: 0.4 },
            key: { color: 0xffffff, intensity: 1.2, position: [5, 5, 5] },
            fill: { color: 0x8888ff, intensity: 0.4, position: [-5, 3, 0] },
            rim: { color: 0xffaa00, intensity: 0.6, position: [0, 3, -5] },
            background: 0x1a1a2e
        },
        soft: {
            ambient: { color: 0xfff5e6, intensity: 0.5 },
            key: { color: 0xfff0dd, intensity: 1.0, position: [3, 6, 3] },
            fill: { color: 0xfff0dd, intensity: 0.6, position: [-3, 4, 3] },
            rim: { color: 0xffffff, intensity: 0.3, position: [0, 2, -4] },
            background: 0x2a2a3e
        },
        product: {
            ambient: { color: 0xffffff, intensity: 0.6 },
            key: { color: 0xffffff, intensity: 1.5, position: [0, 8, 4] },
            fill: { color: 0xeeeeff, intensity: 0.5, position: [-4, 3, 4] },
            rim: { color: 0xffffff, intensity: 0.8, position: [4, 3, -3] },
            background: 0xf0f0f5
        },
        sunset: {
            ambient: { color: 0xff8844, intensity: 0.3 },
            key: { color: 0xff6600, intensity: 1.5, position: [-5, 2, 5] },
            fill: { color: 0x4400ff, intensity: 0.3, position: [5, 3, -3] },
            rim: { color: 0xff0044, intensity: 0.8, position: [0, 5, -5] },
            background: 0x1a0a1e
        },
        neon: {
            ambient: { color: 0x220033, intensity: 0.2 },
            key: { color: 0xff00ff, intensity: 1.2, position: [4, 4, 4] },
            fill: { color: 0x00ffff, intensity: 0.8, position: [-4, 3, 2] },
            rim: { color: 0xffff00, intensity: 0.6, position: [0, 2, -5] },
            background: 0x0a0015
        },
        space: {
            ambient: { color: 0x111122, intensity: 0.1 },
            key: { color: 0xffffee, intensity: 2.0, position: [10, 5, 5] },
            fill: { color: 0x222244, intensity: 0.2, position: [-5, 0, 0] },
            rim: { color: 0x4444ff, intensity: 0.3, position: [0, -5, -5] },
            background: 0x000008
        }
    },
    objects: {
        teapot: { title: '🫖 Teapot', desc: 'Classic teapot with decorative decals, gold metallic accents, and procedural textures.' },
        table: { title: '🪑 Table', desc: 'Wooden dining table with detailed wood grain texture and metal fixtures.' },
        crystal: { title: '🔮 Crystal Ball', desc: 'Mystical crystal ball with internal glow, caustics, and magical particles.' },
        earth: { title: '🌍 Earth', desc: 'Planet Earth with atmosphere, clouds layer, and city lights on the night side.' },
        solar: { title: '☀️ Solar System', desc: 'Miniature solar system with orbiting planets and asteroid belt.' },
        microbes: { title: '🦠 Microbes', desc: 'Microscopic organisms floating in a petri dish environment.' }
    }
};
