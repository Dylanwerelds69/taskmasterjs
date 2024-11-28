// app.js
class TaskmasterApp {
    constructor() {
        console.log('Initializing app');
        this.initializeApp();
    }

    async initializeApp() {
        console.log('Starting initialization');
        
        // Service Worker registratie
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/github/taskmasterjs/sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        // Initialize router
        Router.init();

        // Setup offline detection
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Setup logout handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await API.logout();
                Router.navigate('/login');
            });
        }

        // Update username display if logged in
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            const username = localStorage.getItem('username');
            if (username) {
                usernameDisplay.textContent = username;
            }
        }

        // Automatically sync when coming back online
        this.setupAutoSync();
    }

    setupAutoSync() {
        window.addEventListener('online', async () => {
            try {
                const offlineActions = await this.getOfflineActions();
                if (offlineActions.length > 0) {
                    console.log('Syncing offline actions:', offlineActions);
                    for (const action of offlineActions) {
                        await this.processOfflineAction(action);
                    }
                }
            } catch (error) {
                console.error('Error syncing offline actions:', error);
            }
        });
    }

    async getOfflineActions() {
        // Implementeer dit wanneer je IndexedDB toevoegt
        return [];
    }

    async processOfflineAction(action) {
        // Implementeer dit wanneer je offline functionaliteit toevoegt
        console.log('Processing offline action:', action);
    }

    async handleOffline() {
        console.log('App is offline');
        document.body.classList.add('offline-mode');
        this.showNotification('You are now offline. Changes will be saved locally.');
    }

    async handleOnline() {
        console.log('App is back online');
        document.body.classList.remove('offline-mode');
        this.showNotification('You are back online. Syncing changes...');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Verwijder na 3 seconden
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;

        try {
            // Voeg hier eventueel een API call toe om de token te valideren
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
}

// Start de app
window.addEventListener('load', () => {
    console.log('Window loaded');
    window.app = new TaskmasterApp();
});