const DB = {
    DB_NAME: 'taskmaster_db',
    DB_VERSION: 1,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create tasks store
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('completed', 'completed', { unique: false });
                    taskStore.createIndex('pendingSync', 'pendingSync', { unique: false });
                }

                // Create offline actions store
                if (!db.objectStoreNames.contains('offlineActions')) {
                    db.createObjectStore('offlineActions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                }
            };
        });
    },

    async saveTaskLocally(task) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');

            const request = store.add({
                ...task,
                pendingSync: true,
                timestamp: new Date().toISOString()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getOfflineTasks() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('pendingSync');

            const request = index.getAll(true);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async markTaskSynced(taskId) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');

            const request = store.get(taskId);
            request.onsuccess = () => {
                const task = request.result;
                task.pendingSync = false;
                store.put(task);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    async saveOfflineAction(action) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['offlineActions'], 'readwrite');
            const store = transaction.objectStore('offlineActions');

            const request = store.add({
                timestamp: new Date().toISOString(),
                ...action
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};