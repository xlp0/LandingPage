import { CubicalApp } from './cubical-core.js';
import { AuthStatusComponent } from './components/AuthStatusComponent.js';
import { HeroContentComponent } from './components/HeroContentComponent.js';
import { P2PStatusComponent } from './components/P2PStatusComponent.js';
import { WSStatusComponent } from './components/WSStatusComponent.js';
import { BasicTextComponent } from './components/BasicTextComponent.js';
import { WelcomeComponent } from './components/WelcomeComponent.js';
import { PKC } from './pkc-core.js';
import { AuthManager } from './modules/auth-manager.js';

export class AppEntry {
    constructor(options = {}) {
        this.rootId = options.rootId || 'app-root';
        this.pkc = options.pkc || PKC;
        this.app = new CubicalApp(this.rootId);
        this.modules = null;
        this.authManager = options.authManager || new AuthManager();
        this._loaderTimer = null;
        this._onAuthStatusChanged = null;
        this._appBinding = null;
        this.loader = new BasicTextComponent(
            'system-loader',
            'System initializing...',
            'fixed bottom-12 left-0 w-full text-center text-xs font-mono text-white/40 pointer-events-none z-40'
        );
    }

    async init() {
        this.app.addComponent(this.loader);

        this.loader.setState({ text: 'Establishing identity context...' });
        await this.authManager.init();

        this.loader.setState({ text: 'Constructing reality...' });
        this.setupStage();

        this.loader.setState({ text: 'Booting logic engine...' });
        await this.startEngine();

        this.bindInteractions();

        if (this._loaderTimer) {
            clearTimeout(this._loaderTimer);
        }
        this._loaderTimer = setTimeout(() => {
            this._loaderTimer = null;
            this.loader.setState({ text: '' });
            if (typeof document !== 'undefined') {
                const loaderEl = document.getElementById('system-loader');
                if (loaderEl) loaderEl.style.opacity = '0';
            }
        }, 500);
    }

    setupStage() {
        this.app.addComponent(new WelcomeComponent());
        this.app.addComponent(new HeroContentComponent());
        this.app.addComponent(new P2PStatusComponent());
        this.app.addComponent(new WSStatusComponent());
        this.app.addComponent(new AuthStatusComponent());

        const authComp = this.app.components.get('auth-status-bar');
        const user = this.authManager.store.getState().auth.user;
        if (authComp) authComp.updateUser(user);
    }

    async startEngine() {
        try {
            this.modules = await this.pkc.init({
                modules: [
                    {
                        id: 'markdown-renderer',
                        owner: 'Product Manager',
                        required: false,
                        entry: './modules/markdown-renderer/index.js'
                    },
                    {
                        id: 'net-gateway',
                        owner: 'Architect',
                        required: false,
                        entry: './modules/net-gateway/index.js',
                        config: { wsUrl: 'ws://localhost:3000/ws/' }
                    },
                    {
                        id: 'p2p-serverless',
                        owner: 'Architect',
                        required: false,
                        entry: './modules/p2p-serverless/index.js',
                        config: { announceInterval: 15000 }
                    }
                ]
            });
        } catch (error) {
            console.error('[App] Engine failure:', error);
            this.loader.setState({ text: 'Engine Failure: ' + error.message });
        }
    }

    bindInteractions() {
        if (typeof window !== 'undefined') {
            this._appBinding = {
                login: () => this.authManager.login(),
                logout: () => this.authManager.logout()
            };
            window.app = this._appBinding;
        }

        if (typeof document !== 'undefined') {
            if (this._onAuthStatusChanged) {
                document.removeEventListener('auth:status-changed', this._onAuthStatusChanged);
            }
            this._onAuthStatusChanged = (e) => {
                const { user } = e.detail || {};
                const authComp = this.app.components.get('auth-status-bar');
                if (authComp) {
                    authComp.updateUser(user);
                }
            };
            document.addEventListener('auth:status-changed', this._onAuthStatusChanged);
        }
    }

    async destroy() {
        if (this._loaderTimer) {
            clearTimeout(this._loaderTimer);
            this._loaderTimer = null;
        }
        if (typeof document !== 'undefined' && this._onAuthStatusChanged) {
            document.removeEventListener('auth:status-changed', this._onAuthStatusChanged);
            this._onAuthStatusChanged = null;
        }
        if (typeof window !== 'undefined' && this._appBinding && window.app === this._appBinding) {
            delete window.app;
            this._appBinding = null;
        }
        this.app.clear();
        await this.pkc.stop();
        this.modules = null;
    }
}

function bootDefaultAppEntry() {
    if (typeof document === 'undefined' || !document.getElementById('app-root')) return null;
    const entry = new AppEntry();
    void entry.init();
    return entry;
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', bootDefaultAppEntry, { once: true });
}
