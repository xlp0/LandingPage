import { CubicalComponent } from '../cubical-core.js';

export class WelcomeComponent extends CubicalComponent {
    constructor() {
        super('welcome-banner', 'w-full py-4 text-center z-10 relative mt-8');
    }

    mount() {
        this.element.innerHTML = `
            <h2 class="text-2xl font-light tracking-widest text-pkc-gold uppercase opacity-0" id="welcome-text">
                Welcome to PKC Landing Page
            </h2>
        `;

        // Simple animation if anime.js is available
        if (window.anime) {
            anime({
                targets: this.element.querySelector('#welcome-text'),
                opacity: [0, 1],
                translateY: [-20, 0],
                duration: 1500,
                delay: 500,
                easing: 'easeOutExpo'
            });
        }
    }
}
