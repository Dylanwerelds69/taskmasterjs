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
                
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('completed', 'completed', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('offlineActions')) {
                    db.createObjectStore('offlineActions', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }
            };
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