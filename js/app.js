class TaskmasterApp {
    constructor() {
        console.log('Initializing app');
        this.initializeApp();
    }

    async initializeApp() {
        console.log('Starting initialization');
        
        // Initialize IndexedDB
        try {
            await DB.init();
            console.log('IndexedDB initialized');
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
        }

        // Service Worker registration
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);

                // Request notification permission
                if ('Notification' in window) {
                    Notification.requestPermission();
                }
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }

        // Initialize router
        Router.init();

        // Setup offline/online handling
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
        this.updateUsernameDisplay();

        // Check initial online status
        if (!navigator.onLine) {
            this.handleOffline();
        } else {
            this.handleOnline();
        }
    }

    updateUsernameDisplay() {
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            const username = localStorage.getItem('username');
            if (username) {
                usernameDisplay.textContent = username;
            }
        }
    }

    async handleOffline() {
        console.log('App is offline');
        document.body.classList.add('offline-mode');
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.classList.add('visible');
        }
        this.showNotification('You are now offline. Changes will be saved locally.', 'warning');
    }

    async handleOnline() {
        console.log('App is back online');
        document.body.classList.remove('offline-mode');
        const offlineIndicator = document.getElementById('offline-indicator');
        if (offlineIndicator) {
            offlineIndicator.classList.remove('visible');
        }

        try {
            await API.syncOfflineActions();
            this.showNotification('Back online! Changes have been synchronized.', 'success');
            
            if (window.location.pathname.includes('/tasks')) {
                await TasksComponent.loadTasks();
            }
        } catch (error) {
            console.error('Failed to sync changes:', error);
            this.showNotification('Failed to sync some changes. Will try again later.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => notification.remove();
        notification.appendChild(closeButton);

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);

        // Show system notification if app is in background
        if ('Notification' in window && 
            Notification.permission === 'granted' && 
            document.hidden) {
            new Notification('Taskmaster', {
                body: message,
                icon: '/assets/icons/icon-192.png'
            });
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('accessToken');
        if (!token) return false;

        try {
            // Add token validation if needed
            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
}

// Start the app
window.addEventListener('load', () => {
    console.log('Window loaded');
    window.app = new TaskmasterApp();
});

// Add some basic error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    const app = window.app;
    if (app) {
        app.showNotification('An error occurred. Please try again.', 'error');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    const app = window.app;
    if (app) {
        app.showNotification('An error occurred. Please try again.', 'error');
    }
});