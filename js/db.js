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
                        keyPath: 'id'  // Use id as the key
                    });
                    taskStore.createIndex('completed', 'completed', { unique: false });
                    taskStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    taskStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    taskStore.createIndex('title', 'title', { unique: false });
                    taskStore.createIndex('deleted', 'deleted', { unique: false });
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

            // Ensure we have an ID for the task
            if (!task.id && task.id !== 0) {
                task.id = Date.now(); // Use timestamp as temporary ID for new tasks
            }

            const taskToSave = {
                ...task,
                deleted: task.deleted || false,
                syncStatus: task.syncStatus || 'pending',
                updatedAt: new Date().toISOString()
            };

            console.log('Saving task to IndexedDB:', taskToSave);

            const request = store.put(taskToSave);

            request.onsuccess = () => {
                resolve({
                    ...taskToSave,
                    id: request.result
                });
            };
            request.onerror = () => {
                console.error('Error saving task:', request.error);
                reject(request.error);
            };
        });
    },

    async getAllTasks() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            const request = store.getAll();

            request.onsuccess = () => {
                const tasks = request.result || [];
                const activeTasks = tasks.filter(task => !task.deleted);
                console.log('Retrieved active tasks from IndexedDB:', activeTasks);
                resolve(activeTasks);
            };
            request.onerror = () => {
                console.error('Error getting all tasks:', request.error);
                reject(request.error);
            };
        });
    },

    async getTask(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readonly');
            const store = transaction.objectStore('tasks');
            // Convert id to number if it's a string
            const taskId = typeof id === 'string' ? parseInt(id, 10) : id;
            const request = store.get(taskId);

            request.onsuccess = () => {
                const task = request.result;
                console.log('Retrieved task from IndexedDB:', task);
                resolve(task);
            };
            request.onerror = () => {
                console.error('Error getting task:', request.error);
                reject(request.error);
            };
        });
    },

    async markTaskAsDeleted(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            const taskId = typeof id === 'string' ? parseInt(id, 10) : id;
            
            // First get the task
            const getRequest = store.get(taskId);
            
            getRequest.onsuccess = () => {
                const task = getRequest.result;
                if (task) {
                    // Mark it as deleted and pending sync
                    task.deleted = true;
                    task.syncStatus = 'pending';
                    task.updatedAt = new Date().toISOString();
                    const updateRequest = store.put(task);
                    
                    updateRequest.onsuccess = () => {
                        console.log('Task marked as deleted:', taskId);
                        resolve(true);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve(false);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    async deleteTask(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            // Convert id to number if it's a string
            const taskId = typeof id === 'string' ? parseInt(id, 10) : id;
            const request = store.delete(taskId);

            request.onsuccess = () => {
                console.log('Task deleted from IndexedDB:', id);
                resolve(true);
            };
            request.onerror = () => {
                console.error('Error deleting task:', request.error);
                reject(request.error);
            };
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

            request.onsuccess = () => {
                const tasks = request.result || [];
                console.log('Retrieved unsynced tasks from IndexedDB:', tasks);
                resolve(tasks);
            };
            request.onerror = () => {
                console.error('Error getting unsynced tasks:', request.error);
                reject(request.error);
            };
        });
    },

    async markTaskSynced(id) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks'], 'readwrite');
            const store = transaction.objectStore('tasks');
            
            const taskId = typeof id === 'string' ? parseInt(id, 10) : id;
            const getRequest = store.get(taskId);

            getRequest.onsuccess = () => {
                const task = getRequest.result;
                if (task) {
                    task.syncStatus = 'synced';
                    const updateRequest = store.put(task);
                    updateRequest.onsuccess = () => {
                        console.log('Task marked as synced:', id);
                        resolve(true);
                    };
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve(false);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    async clearData() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['tasks', 'users'], 'readwrite');
            const taskStore = transaction.objectStore('tasks');
            const userStore = transaction.objectStore('users');

            taskStore.clear();
            userStore.clear();

            transaction.oncomplete = () => {
                console.log('All data cleared from IndexedDB');
                resolve(true);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }
};