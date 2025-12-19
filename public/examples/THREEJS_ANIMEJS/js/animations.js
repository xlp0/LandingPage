import { CONFIG } from './config.js?v=10';

export class AnimationManager {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.isAnimating = false;
        this.autoRotate = true;
    }

    animateCameraTo(preset, onStatusUpdate) {
        const targetPos = CONFIG.camera[preset].position;
        const targetLookAt = CONFIG.camera[preset].target;

        onStatusUpdate('Moving camera...', true);
        this.isAnimating = true;
        this.autoRotate = false;

        anime({
            targets: this.sm.camera.position,
            x: targetPos[0],
            y: targetPos[1],
            z: targetPos[2],
            duration: 1500,
            easing: 'easeInOutQuart',
            update: () => {
                this.sm.camera.lookAt(new THREE.Vector3(...targetLookAt));
                this.sm.controls.target.set(...targetLookAt);
            },
            complete: () => {
                this.isAnimating = false;
                this.autoRotate = true;
                onStatusUpdate('Ready', false);
            }
        });
    }

    animateLightingTo(preset, onStatusUpdate) {
        const config = CONFIG.lighting[preset];
        onStatusUpdate('Changing lighting...', true);
        this.isAnimating = true;

        const startBg = {
            r: this.sm.scene.background.r,
            g: this.sm.scene.background.g,
            b: this.sm.scene.background.b
        };
        const targetBgColor = new THREE.Color(config.background);

        anime({
            targets: startBg,
            r: targetBgColor.r, g: targetBgColor.g, b: targetBgColor.b,
            duration: 1000,
            easing: 'easeInOutQuad',
            update: () => { this.sm.scene.background.setRGB(startBg.r, startBg.g, startBg.b); }
        });

        const targets = [
            { obj: this.sm.ambientLight, config: config.ambient },
            { obj: this.sm.keyLight, config: config.key },
            { obj: this.sm.fillLight, config: config.fill },
            { obj: this.sm.rimLight, config: config.rim }
        ];

        targets.forEach(t => {
            anime({ targets: t.obj, intensity: t.config.intensity, duration: 1000, easing: 'easeInOutQuad' });
            if (t.config.position) {
                anime({ targets: t.obj.position, x: t.config.position[0], y: t.config.position[1], z: t.config.position[2], duration: 1000 });
            }
            const color = new THREE.Color(t.config.color);
            anime({ targets: t.obj.color, r: color.r, g: color.g, b: color.b, duration: 1000 });
        });

        setTimeout(() => {
            this.isAnimating = false;
            onStatusUpdate('Ready', false);
        }, 1000);
    }

    playFullAnimation(currentObject, onStatusUpdate) {
        if (this.isAnimating || !currentObject) return;

        onStatusUpdate('Animating...', true);
        this.isAnimating = true;
        this.autoRotate = false;

        const timeline = anime.timeline({
            easing: 'easeOutQuad',
            complete: () => {
                this.isAnimating = false;
                this.autoRotate = true;
                onStatusUpdate('Ready', false);
            }
        });

        currentObject.scale.set(0.1, 0.1, 0.1);
        timeline
            .add({
                targets: currentObject.scale,
                x: [0.1, 1.1, 1], y: [0.1, 1.1, 1], z: [0.1, 1.1, 1],
                duration: 1000, easing: 'easeOutElastic(1, 0.5)'
            })
            .add({
                targets: currentObject.rotation,
                y: currentObject.rotation.y + Math.PI * 2,
                duration: 2000, easing: 'easeInOutQuart'
            }, '-=500')
            .add({
                targets: this.sm.camera.position,
                x: [this.sm.camera.position.x, 6, -6, this.sm.camera.position.x],
                z: [this.sm.camera.position.z, 6, 6, this.sm.camera.position.z],
                duration: 3000, easing: 'easeInOutQuad',
                update: () => { this.sm.camera.lookAt(0, 0, 0); }
            }, '-=1500');
    }
}
