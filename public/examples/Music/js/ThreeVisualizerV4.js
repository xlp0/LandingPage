// ThreeVisualizerV4 - Modular 3D Audio Visualizer
// Highly reusable, configurable, and performant

class ThreeVisualizerV4 {
    constructor(config = {}) {
        // Configuration with defaults
        this.config = {
            containerId: config.containerId || 'three-container',
            canvasId: config.canvasId || 'three-canvas',
            barCount: config.barCount || 32,
            barWidth: config.barWidth || 0.8,
            barGap: config.barGap || 0.4,
            maxBarHeight: config.maxBarHeight || 15,
            cameraPosition: config.cameraPosition || { x: 0, y: 20, z: 35 },
            cameraTarget: config.cameraTarget || { x: 0, y: 5, z: 0 },
            backgroundColor: config.backgroundColor || 0x0f172a,
            groundColor: config.groundColor || 0x1e293b,
            hueRange: config.hueRange || { start: 0.5, range: 0.3 },
            orbitControls: config.orbitControls !== false,
            animationDuration: config.animationDuration || 100,
            animationEasing: config.animationEasing || 'easeOutQuad'
        };

        this.container = null;
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.bars = [];
        this.animationFrameId = null;
        this.resizeHandler = null;
        this.isDisposed = false;
    }

    /**
     * Initialize the 3D scene
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isDisposed) {
            throw new Error('Cannot initialize disposed visualizer');
        }

        this.container = document.getElementById(this.config.containerId);
        this.canvas = document.getElementById(this.config.canvasId);

        if (!this.container || !this.canvas) {
            throw new Error(`Container or canvas not found: ${this.config.containerId}, ${this.config.canvasId}`);
        }

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);

        // Camera setup
        const { x, y, z } = this.config.cameraPosition;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(x, y, z);
        this.camera.lookAt(
            this.config.cameraTarget.x,
            this.config.cameraTarget.y,
            this.config.cameraTarget.z
        );

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lighting
        this._setupLighting();

        // Create visualization bars
        this._createBars();

        // Ground plane
        this._createGround();

        // OrbitControls (optional)
        if (this.config.orbitControls && typeof THREE.OrbitControls !== 'undefined') {
            this._setupOrbitControls();
        }

        // Handle resize with debouncing
        this.resizeHandler = this._debounce(() => this.onResize(), 250);
        window.addEventListener('resize', this.resizeHandler);

        // Start animation loop
        this.animate();

        return this;
    }

    /**
     * Setup scene lighting
     * @private
     */
    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(10, 20, 10);
        this.scene.add(pointLight);
    }

    /**
     * Create 3D bars for visualization
     * @private
     */
    _createBars() {
        const { barCount, barWidth, barGap, hueRange } = this.config;
        const totalWidth = barCount * (barWidth + barGap);
        const startX = -totalWidth / 2;

        for (let i = 0; i < barCount; i++) {
            const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth);
            const hue = (i / barCount) * hueRange.range + hueRange.start;
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(hue, 0.8, 0.5),
                metalness: 0.3,
                roughness: 0.4,
                emissive: new THREE.Color().setHSL(hue, 0.8, 0.2)
            });
            const bar = new THREE.Mesh(geometry, material);
            bar.position.x = startX + i * (barWidth + barGap);
            bar.position.y = 0.5;
            bar.userData = { targetScale: 1, currentScale: 1, hue };
            this.scene.add(bar);
            this.bars.push(bar);
        }
    }

    /**
     * Create ground plane
     * @private
     */
    _createGround() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: this.config.groundColor,
            metalness: 0.8,
            roughness: 0.4
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        this.scene.add(ground);
    }

    /**
     * Setup OrbitControls
     * @private
     */
    _setupOrbitControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.target.set(
            this.config.cameraTarget.x,
            this.config.cameraTarget.y,
            this.config.cameraTarget.z
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 80;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.autoRotate = false;
        this.controls.update();
    }

    /**
     * Update bars based on FFT data
     * @param {Float32Array|Array} fftData - FFT frequency data
     */
    updateBars(fftData) {
        if (!fftData || fftData.length === 0 || this.isDisposed) return;

        const barCount = this.bars.length;
        const { maxBarHeight, hueRange } = this.config;

        for (let i = 0; i < barCount; i++) {
            const bar = this.bars[i];
            const dataIndex = Math.floor((i / barCount) * fftData.length);
            const db = fftData[dataIndex];
            const value = Math.max(0.1, (db + 100) / 100);
            const targetHeight = value * maxBarHeight;

            // Smooth interpolation instead of anime.js for better performance
            bar.userData.targetScale = targetHeight;
            
            // Lerp for smooth animation
            const lerpFactor = 0.3;
            bar.userData.currentScale += (bar.userData.targetScale - bar.userData.currentScale) * lerpFactor;
            bar.scale.y = bar.userData.currentScale;
            bar.position.y = bar.userData.currentScale / 2;

            // Update emissive based on intensity
            const hue = bar.userData.hue;
            bar.material.emissive.setHSL(hue, 0.8, value * 0.3);
        }
    }

    /**
     * Handle window resize
     */
    onResize() {
        if (this.isDisposed) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        if (this.isDisposed) return;

        this.animationFrameId = requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Dispose and cleanup resources
     */
    dispose() {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        // Dispose Three.js resources
        this.bars.forEach(bar => {
            bar.geometry.dispose();
            bar.material.dispose();
        });
        this.bars = [];

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }

        this.scene = null;
        this.camera = null;
        this.container = null;
        this.canvas = null;
    }

    /**
     * Debounce utility
     * @private
     */
    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}
