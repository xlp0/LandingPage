import { CONFIG } from './config.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.ambientLight = null;
        this.keyLight = null;
        this.fillLight = null;
        this.rimLight = null;
        this.clock = new THREE.Clock();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.lighting.studio.background);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(...CONFIG.camera.front.position);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 0, 0);

        this.createLights();
        this.createFloor();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    createLights() {
        this.ambientLight = new THREE.AmbientLight(
            CONFIG.lighting.studio.ambient.color,
            CONFIG.lighting.studio.ambient.intensity
        );
        this.scene.add(this.ambientLight);

        this.keyLight = new THREE.DirectionalLight(
            CONFIG.lighting.studio.key.color,
            CONFIG.lighting.studio.key.intensity
        );
        this.keyLight.position.set(...CONFIG.lighting.studio.key.position);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.width = 2048;
        this.keyLight.shadow.mapSize.height = 2048;
        this.keyLight.shadow.camera.near = 0.5;
        this.keyLight.shadow.camera.far = 50;
        this.keyLight.shadow.camera.left = -10;
        this.keyLight.shadow.camera.right = 10;
        this.keyLight.shadow.camera.top = 10;
        this.keyLight.shadow.camera.bottom = -10;
        this.scene.add(this.keyLight);

        this.fillLight = new THREE.PointLight(
            CONFIG.lighting.studio.fill.color,
            CONFIG.lighting.studio.fill.intensity
        );
        this.fillLight.position.set(...CONFIG.lighting.studio.fill.position);
        this.scene.add(this.fillLight);

        this.rimLight = new THREE.PointLight(
            CONFIG.lighting.studio.rim.color,
            CONFIG.lighting.studio.rim.intensity
        );
        this.rimLight.position.set(...CONFIG.lighting.studio.rim.position);
        this.scene.add(this.rimLight);
    }

    createFloor() {
        const floorGeometry = new THREE.CircleGeometry(15, 64);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x222233,
            metalness: 0.5,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.5;
        floor.receiveShadow = true;
        floor.name = 'floor';
        this.scene.add(floor);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
