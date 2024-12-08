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
                
                // Create tasks store if it doesn't exist
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    taskStore.createIndex('completed', 'completed', { unique: false });
                    taskStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                // Create users store for offline login
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'username' });
                    userStore.createIndex('lastLogin', 'lastLogin', { unique: false });
                }
            };
        });
    },

    async saveTask(task) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');

            const taskToSave = {
                ...task,
                syncStatus: 'pending',
                updatedAt: new Date().toISOString()
            };

            const request = taskToSave.id ? store.put(taskToSave) : store.add(taskToSave);

            request.onsuccess = () => {
                resolve({
                    success: true,
                    data: {
                        task: { ...taskToSave, id: request.result },
                        message: 'Task saved offline'
                    }
                });
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getAllTasks() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []); // Return empty array if no tasks found
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getTask(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteTask(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const request = store.delete(id);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    async saveUser(userData) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');

            const user = {
                ...userData,
                lastLogin: new Date().toISOString()
            };

            const request = store.put(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getUser(username) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(username);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getUnsynedTasks() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const index = store.index('syncStatus');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result || []); // Return empty array if no tasks found
            request.onerror = () => reject(request.error);
        });
    }
};