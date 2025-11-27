import { CubicalApp } from './cubical-core.js';
import { AuthStatusComponent } from './components/AuthStatusComponent.js';
import { HeroContentComponent } from './components/HeroContentComponent.js';
import { P2PStatusComponent } from './components/P2PStatusComponent.js';
import { WSStatusComponent } from './components/WSStatusComponent.js';
import { BasicTextComponent } from './components/BasicTextComponent.js';
import { WelcomeComponent } from './components/WelcomeComponent.js';
import { PKC } from './pkc-core.js';
import { AuthManager } from './modules/auth-manager.js';

/**
 * The Playwright Script
 * Orchestrates the narrative flow of the landing page.
 */
class AppEntry {
    constructor() {
        this.app = new CubicalApp('app-root');
        this.modules = null;
        this.authManager = new AuthManager();
        this.loader = new BasicTextComponent('system-loader', 'System initializing...', 'fixed bottom-12 left-0 w-full text-center text-xs font-mono text-white/40 pointer-events-none z-40');
    }

    async init() {
        console.log('[App] Initializing narrative...');
        
        // Show loader immediately
        this.app.addComponent(this.loader);

        // 0. Initialize Auth (Critical Context)
        this.loader.setState({ text: 'Establishing identity context...' });
        await this.authManager.init();

        // 1. Setup the stage (load components)
        // We do this BEFORE starting the engine so that modules can find their DOM elements
        this.loader.setState({ text: 'Constructing reality...' });
        this.setupStage();

        // 2. Start the logic engine (PKC)
        this.loader.setState({ text: 'Booting logic engine...' });
        await this.startEngine();
        
        // 3. Bind interactions
        this.bindInteractions();

        // Clear loader after a moment
        setTimeout(() => {
            this.loader.setState({ text: '' });
            // Optional: remove loader element entirely
            const loaderEl = document.getElementById('system-loader');
            if (loaderEl) loaderEl.style.opacity = '0';
        }, 500);
    }

    setupStage() {
        // Add components in specific Z-order / layout order
        this.app.addComponent(new WelcomeComponent());
        this.app.addComponent(new HeroContentComponent());
        this.app.addComponent(new P2PStatusComponent());
        this.app.addComponent(new WSStatusComponent());
        // Auth component is already effectively handled via AuthManager but we add the UI
        this.app.addComponent(new AuthStatusComponent());

        // Initial update for auth component
        const authComp = this.app.components.get('auth-status-bar');
        const user = this.authManager.store.getState().auth.user;
        if (authComp) authComp.updateUser(user);
    }

    async startEngine() {
        try {
            // Initialize PKC with specific modules for the landing page
            // We explicitly exclude 'tic-tac-toe-p2p' as it requires game UI elements not present here
            this.modules = await PKC.init({
                modules: [
                    { id: 'markdown-renderer', entry: './modules/markdown-renderer/index.js' },
                    { id: 'net-gateway', entry: './modules/net-gateway/index.js', config: { wsUrl: 'ws://localhost:3000/ws/' } },
                    { id: 'p2p-serverless', entry: './modules/p2p-serverless/index.js', config: { announceInterval: 15000 } }
                ]
            });

            console.log('[App] Engine started. Modules ready:', Object.keys(this.modules));
        } catch (error) {
            console.error('[App] Engine failure:', error);
            this.loader.setState({ text: 'Engine Failure: ' + error.message });
        }
    }

    bindInteractions() {
        // Expose global auth methods for the AuthComponent
        window.app = {
            login: () => this.authManager.login(),
            logout: () => this.authManager.logout()
        };

        // Listen for auth events to update UI
        document.addEventListener('auth:status-changed', (e) => {
            const { user } = e.detail;
            const authComp = this.app.components.get('auth-status-bar');
            if (authComp) {
                authComp.updateUser(user);
            }
        });
    }
}

// Start the show
const entry = new AppEntry();
document.addEventListener('DOMContentLoaded', () => entry.init());
