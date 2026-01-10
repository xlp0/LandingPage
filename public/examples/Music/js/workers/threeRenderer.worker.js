// Web Worker for Three.js Rendering using OffscreenCanvas
// Offloads 3D rendering to background thread for better performance

importScripts('../lib/three.min.js');

let scene, camera, renderer, bars, controls;
let animationId = null;

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'INIT':
            initThreeScene(data);
            break;
        case 'UPDATE_BARS':
            updateBars(data.fftData);
            break;
        case 'RESIZE':
            onResize(data.width, data.height);
            break;
        case 'STOP':
            stopAnimation();
            break;
    }
};

function initThreeScene({ canvas, width, height }) {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.Fog(0x0a0e14, 20, 100);
    
    // Camera
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 5, 0);
    
    // Renderer with OffscreenCanvas
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xec4899, 0.3);
    rimLight.position.set(0, 5, -15);
    scene.add(rimLight);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create 3D bars
    createBars();
    
    // Start animation loop
    animate();
    
    self.postMessage({ type: 'INIT_COMPLETE' });
}

function createBars() {
    bars = [];
    const barCount = 32;
    const spacing = 1.5;
    const startX = -(barCount * spacing) / 2;
    
    for (let i = 0; i < barCount; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const hue = (i / barCount) * 0.7;
        const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            roughness: 0.3,
            metalness: 0.7
        });
        
        const bar = new THREE.Mesh(geometry, material);
        bar.position.x = startX + i * spacing;
        bar.position.y = 0.5;
        bar.castShadow = true;
        bar.receiveShadow = true;
        
        scene.add(bar);
        bars.push(bar);
    }
}

function updateBars(fftData) {
    if (!bars || !fftData) return;
    
    for (let i = 0; i < bars.length && i < fftData.length; i++) {
        const bar = bars[i];
        const value = fftData[i];
        
        // Normalize value (0-1)
        const normalizedValue = (value + 140) / 140;
        const height = Math.max(0.5, normalizedValue * 15);
        
        // Smooth transition
        const targetScaleY = height;
        bar.scale.y += (targetScaleY - bar.scale.y) * 0.3;
        bar.position.y = bar.scale.y / 2;
        
        // Update emissive intensity based on height
        const emissiveIntensity = normalizedValue * 0.8;
        bar.material.emissiveIntensity = emissiveIntensity;
    }
}

function onResize(width, height) {
    if (!camera || !renderer) return;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Rotate camera slowly
    const time = Date.now() * 0.0001;
    camera.position.x = Math.sin(time) * 35;
    camera.position.z = Math.cos(time) * 35;
    camera.lookAt(0, 5, 0);
    
    renderer.render(scene, camera);
}

function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}
