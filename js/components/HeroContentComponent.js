import { CubicalComponent } from '../cubical-core.js';

export class HeroContentComponent extends CubicalComponent {
    constructor() {
        super('main-hero', 'max-w-4xl mx-auto px-8 py-16 text-center relative z-10');
    }

    mount() {
        this.element.setAttribute('data-anime', 'main-content');
        
        this.element.innerHTML = `
            <p id="pkc-title-text" class="text-xl md:text-2xl font-semibold mb-4 opacity-0 translate-y-8" data-anime="env-title"></p>
            <h1 class="text-4xl md:text-5xl font-bold mb-4 opacity-0 translate-y-8" data-anime="title">PKC Landing Page</h1>
            <p class="text-xl md:text-2xl mb-12 opacity-0 translate-y-8" data-anime="subtitle">Static-first. Modular by design. Local‑first ready.</p>
            <div class="flex flex-wrap gap-4 justify-center mb-16 opacity-0 translate-y-8" data-anime="buttons">
                <a href="pkc-docs-index.html" class="px-6 py-3 bg-white text-pkc-primary rounded-full border border-white/40 hover:bg-white/90 transition-colors font-medium">Browse Documentation</a>
                <a href="tic-tac-toe.html" class="px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium">🎮 Tic-Tac-Toe P2P</a>
                <a href="js/modules/p2p-serverless/example.html" class="px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium">🔗 P2P Demo</a>
                <a href="js/modules/webrtc-dashboard/index.html" class="px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium">🌐 WebRTC Dashboard</a>
                <a href="pkc-viewer.html?doc=LaTeX-Test.md" class="px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium">LaTeX Test</a>
                <a href="https://github.com/xlp0/LandingPage" target="_blank" rel="noopener" class="px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium">GitHub</a>
                <a href="/js/modules/video-meeting/index.html" class="px-6 py-3 rounded-full border border-white/40 text-white hover:bg-white/10 transition-colors font-medium">🎥 Video Meeting P2P</a>
            </div>
        `;

        this.initAnimations();
        this.startEnvWatcher();
    }

    initAnimations() {
        // Need to wait for DOM insertion or call this manually after mount
        if (window.anime) {
            const tl = anime.timeline({
                easing: 'easeOutExpo',
                duration: 800
            });
            
            tl.add({
                targets: '[data-anime="env-title"]',
                opacity: [0, 1],
                translateY: [32, 0],
                duration: 1000
            })
            .add({
                targets: '[data-anime="title"]',
                opacity: [0, 1],
                translateY: [32, 0],
                duration: 1000
            }, '-=800')
            .add({
                targets: '[data-anime="subtitle"]',
                opacity: [0, 1],
                translateY: [24, 0],
                duration: 800
            }, '-=600')
            .add({
                targets: '[data-anime="buttons"]',
                opacity: [0, 1],
                translateY: [16, 0],
                duration: 600
            }, '-=400');

            // Button hover effects
            const buttons = this.element.querySelectorAll('[data-anime="buttons"] a');
            buttons.forEach(button => {
                button.addEventListener('mouseenter', () => {
                    anime({
                        targets: button,
                        scale: 1.05,
                        duration: 300,
                        easing: 'easeOutQuad'
                    });
                });
                button.addEventListener('mouseleave', () => {
                    anime({
                        targets: button,
                        scale: 1.0,
                        duration: 300,
                        easing: 'easeOutQuad'
                    });
                });
            });
        }
    }

    async startEnvWatcher() {
        const updateEnvTitle = async () => {
            try {
                const response = await fetch('/api/env', { cache: 'no-cache' });
                if (response.ok) {
                    const env = await response.json();
                    if (env.PKC_Title_Text) {
                        const titleEl = this.element.querySelector('#pkc-title-text');
                        if (titleEl && titleEl.textContent !== env.PKC_Title_Text) {
                            titleEl.textContent = env.PKC_Title_Text;
                        }
                    }
                }
            } catch (err) {
                // Silent fail or fallback
            }
        };
        
        updateEnvTitle();
        setInterval(updateEnvTitle, 2000);
    }
}
