import { CONFIG } from './config.js?v=10';

export class UIManager {
    constructor(app) {
        this.app = app;
    }

    init() {
        // Populate object dropdown from CONFIG
        this.populateObjectSelect();

        // Object dropdown event
        const objectSelect = document.getElementById('object-select');
        if (objectSelect) {
            objectSelect.addEventListener('change', (e) => {
                this.app.switchObject(e.target.value);
            });
        }

        // Camera buttons
        document.querySelectorAll('[data-camera]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.camera;
                this.updateActiveBtn('[data-camera]', e.target);
                this.app.audio.playCameraSound(preset);
                this.app.animations.animateCameraTo(preset, (t, a) => this.app.updateStatus(t, a));
            });
        });

        // Lighting buttons
        document.querySelectorAll('[data-lighting]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.target.dataset.lighting;
                this.updateActiveBtn('[data-lighting]', e.target);
                this.app.audio.playLightingSound(preset);
                this.app.animations.animateLightingTo(preset, (t, a) => this.app.updateStatus(t, a));
            });
        });

        // Play button
        const playBtn = document.getElementById('play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.app.audio.playTheme();
                this.app.animations.playFullAnimation(this.app.currentObject, (t, a) => this.app.updateStatus(t, a));
            });
        }
    }

    updateActiveBtn(selector, activeBtn) {
        document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
        anime({ targets: activeBtn, scale: [0.9, 1], duration: 300, easing: 'easeOutElastic(1, 0.5)' });
    }

    showUI() {
        anime({ targets: '#control-panel', translateY: [50, 0], opacity: [0, 1], duration: 800, delay: 200, easing: 'easeOutQuart' });
        anime({ targets: '#info-panel', translateX: [-50, 0], opacity: [0, 1], duration: 800, delay: 100, easing: 'easeOutQuart' });
        anime({ targets: '#indicator', translateX: [50, 0], opacity: [0, 1], duration: 800, delay: 150, easing: 'easeOutQuart' });
    }

    /**
     * Dynamically populate the object select dropdown from CONFIG.objects
     */
    populateObjectSelect() {
        const select = document.getElementById('object-select');
        if (!select) return;

        // Clear existing options
        select.innerHTML = '';

        // Generate options from CONFIG.objects registry
        for (const [id, obj] of Object.entries(CONFIG.objects)) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${obj.icon} ${obj.label}`;
            select.appendChild(option);
        }

        console.log('[UI] Object dropdown populated with', Object.keys(CONFIG.objects).length, 'items');
    }
}
