import { CubicalComponent } from '../cubical-core.js';

export class AuthStatusComponent extends CubicalComponent {
    constructor() {
        super('auth-status-bar', 'fixed top-4 right-4 px-4 py-2 bg-black/30 backdrop-blur-md rounded-full border border-white/20 text-sm z-50 flex items-center gap-3');
    }

    mount() {
        this.element.innerHTML = `
            <span id="auth-user-info" class="hidden">
                <span id="auth-user-name" class="font-semibold"></span>
            </span>
            <button id="auth-button" class="px-4 py-1.5 bg-white text-pkc-primary rounded-full font-semibold hover:bg-white/90 transition-colors">
                Login
            </button>
        `;

        // Bind global app.login if available, otherwise dispatch event
        const btn = this.element.querySelector('#auth-button');
        btn.addEventListener('click', () => {
            if (window.app && window.app.login) {
                window.app.login();
            }
        });
    }

    updateUser(user) {
        const userInfo = this.element.querySelector('#auth-user-info');
        const userName = this.element.querySelector('#auth-user-name');
        const authBtn = this.element.querySelector('#auth-button');

        if (user) {
            userInfo.classList.remove('hidden');
            userName.textContent = user.name || user.email;
            authBtn.textContent = 'Logout';
            authBtn.onclick = () => window.app.logout();
        } else {
            userInfo.classList.add('hidden');
            userName.textContent = '';
            authBtn.textContent = 'Login';
            authBtn.onclick = () => window.app.login();
        }
    }
}
