import { SceneManager } from './scene.js';
import { ObjectFactory } from './objects.js';
import { AnimationManager } from './animations.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';
import { CONFIG } from './config.js';

class TheaterApp {
    constructor() {
        this.sceneManager = new SceneManager('canvas-container');
        this.animations = new AnimationManager(this.sceneManager);
        this.audio = new AudioManager();
        this.ui = new UIManager(this);
        this.currentObject = null;
        this.currentObjectType = 'teapot';
    }

    async init() {
        try {
            this.sceneManager.init();
            await this.audio.init();
            this.ui.init();
            this.createInitialObject();

            setTimeout(() => {
                document.getElementById('loading').classList.add('hidden');
                this.ui.showUI();
            }, 800);

            this.animate();
            console.log('🌟 3D Theater Modular App Initialized');
        } catch (error) {
            console.error('Initialization error:', error);
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Error: ' + error.message;
        }
    }

    createInitialObject() {
        this.currentObject = ObjectFactory.create('teapot');
        if (this.currentObject) {
            this.sceneManager.scene.add(this.currentObject);
        }
    }

    switchObject(type) {
        if (this.animations.isAnimating) return;

        this.audio.playSwitchSound();
        this.updateStatus('Loading ' + type + '...', true);
        this.animations.isAnimating = true;

        if (this.currentObject) {
            anime({
                targets: this.currentObject.scale,
                x: 0, y: 0, z: 0,
                duration: 400,
                easing: 'easeInQuad',
                complete: () => {
                    this.sceneManager.scene.remove(this.currentObject);
                    this.loadNewObject(type);
                }
            });
        } else {
            this.loadNewObject(type);
        }
    }

    loadNewObject(type) {
        try {
            this.currentObject = ObjectFactory.create(type);
            this.currentObjectType = type;
            if (this.currentObject) {
                this.currentObject.scale.set(0, 0, 0);
                this.sceneManager.scene.add(this.currentObject);

                // Update info panel
                document.getElementById('object-title').textContent = CONFIG.objects[type].title;
                document.getElementById('object-desc').textContent = CONFIG.objects[type].desc;

                anime({
                    targets: this.currentObject.scale,
                    x: 1, y: 1, z: 1,
                    duration: 600,
                    easing: 'easeOutElastic(1, 0.5)',
                    complete: () => {
                        this.animations.isAnimating = false;
                        this.updateStatus('Ready', false);
                    }
                });
            }
        } catch (error) {
            console.error('Error switching object:', error);
            this.animations.isAnimating = false;
            this.updateStatus('Error: ' + error.message, false);
        }
    }

    updateStatus(text, animating) {
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');
        if (statusText) statusText.textContent = text;
        if (statusDot) {
            if (animating) statusDot.classList.add('animating');
            else statusDot.classList.remove('animating');
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const elapsed = this.sceneManager.clock.getElapsedTime();

        // Auto rotation
        if (this.animations.autoRotate && this.currentObject && !this.animations.isAnimating) {
            this.currentObject.rotation.y += 0.003;
        }

        // Per-frame updates
        if (this.currentObject) {
            const particles = this.currentObject.getObjectByName('particles');
            if (particles) {
                particles.rotation.y += 0.005;
                particles.rotation.x += 0.002;
            }

            const earth = this.currentObject.getObjectByName('earth');
            if (earth) earth.rotation.y += 0.002;
            const clouds = this.currentObject.getObjectByName('clouds');
            if (clouds) clouds.rotation.y += 0.0025;
            const moon = this.currentObject.getObjectByName('moon');
            if (moon) {
                const moonAngle = elapsed * 0.3;
                moon.position.x = Math.cos(moonAngle) * 3;
                moon.position.z = Math.sin(moonAngle) * 3;
            }

            if (this.currentObjectType === 'solar') {
                this.currentObject.children.forEach(child => {
                    if (child.name && child.name.includes('Orbit') && child.children[0]) {
                        const planet = child.children[0];
                        if (planet.userData.orbitSpeed) child.rotation.y += planet.userData.orbitSpeed;
                    }
                });
                const sun = this.currentObject.getObjectByName('sun');
                if (sun) sun.rotation.y += 0.01;
            }

            if (this.currentObjectType === 'microbes') {
                this.currentObject.children.forEach(child => {
                    if (child.name === 'microbe') {
                        child.position.y += Math.sin(elapsed * child.userData.floatSpeed + child.userData.floatOffset) * 0.001;
                        child.rotation.x += 0.005;
                        child.rotation.z += 0.003;
                    }
                });
            }
        }

        this.sceneManager.render();
    }
}

const app = new TheaterApp();
app.init();
