const API = {
    BASE_URL: '/github/taskmasterjs/proxy.php?csurl=',

    async request(endpoint, options = {}) {
        if (!navigator.onLine) {
            throw new Error('No internet connection');
        }

        console.log('🌐 API Request:', {
            endpoint,
            method: options.method || 'GET',
            body: options.body
        });

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('accessToken')
        };

        try {
            const response = await fetch(`${this.BASE_URL}/${endpoint}`, {
                ...options,
                headers: { ...defaultHeaders, ...options.headers }
            });

            const responseData = await response.json();
            console.log('📥 API Response:', responseData);

            if (!responseData.success) {
                throw new Error(responseData.message || 'API request failed');
            }
            
            return responseData;
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    },

    async register(username, password) {
        try {
            if (navigator.onLine) {
                const response = await this.request('users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        username, 
                        password,
                        fullname: username
                    })
                });

                if (response.success) {
                    await DB.saveUser({
                        username,
                        accessToken: null,
                        refreshToken: null,
                        sessionId: null
                    });
                }
                return response;
            } else {
                throw new Error('Cannot register while offline');
            }
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },

    async login(username, password) {
        try {
            if (navigator.onLine) {
                const response = await this.request('sessions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.success && response.data) {
                    await DB.saveUser({
                        username,
                        accessToken: response.data.access_token,
                        refreshToken: response.data.refresh_token,
                        sessionId: response.data.session_id
                    });

                    localStorage.setItem('accessToken', response.data.access_token);
                    localStorage.setItem('refreshToken', response.data.refresh_token);
                    localStorage.setItem('sessionId', response.data.session_id);
                    localStorage.setItem('username', username);
                }
                return response;
            } else {
                const userData = await DB.getUser(username);
                if (userData && userData.accessToken) {
                    localStorage.setItem('accessToken', userData.accessToken);
                    localStorage.setItem('username', username);
                    return {
                        success: true,
                        data: {
                            access_token: userData.accessToken,
                            refresh_token: userData.refreshToken,
                            session_id: userData.sessionId,
                            offline: true
                        }
                    };
                }
                throw new Error('Cannot login offline without previous successful online login');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async logout() {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId && navigator.onLine) {
            try {
                await this.request(`sessions/${sessionId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('username');
    },

    async getTasks(page = 1, filter = 'all') {
        try {
            if (!navigator.onLine) {
                const tasks = await DB.getAllTasks();
                return {
                    success: true,
                    data: {
                        tasks: this.filterTasks(tasks, filter),
                        total_pages: 1,
                        has_next_page: false,
                        has_previous_page: false
                    }
                };
            }

            let endpoint;
            if (filter === 'complete') {
                endpoint = 'tasks/complete';
            } else if (filter === 'incomplete') {
                endpoint = 'tasks/incomplete';
            } else {
                endpoint = `tasks/page/${page}`;
            }
            
            const response = await this.request(endpoint);
            
            // Store tasks in IndexedDB for offline use
            if (response.success && response.data.tasks) {
                for (const task of response.data.tasks) {
                    await DB.saveTask(task);
                }
            }
            
            return response;
        } catch (error) {
            console.error('Failed to get tasks:', error);
            const tasks = await DB.getAllTasks();
            return {
                success: true,
                data: {
                    tasks: this.filterTasks(tasks, filter),
                    total_pages: 1,
                    has_next_page: false,
                    has_previous_page: false
                }
            };
        }
    },

    async getTask(id) {
        try {
            if (!navigator.onLine) {
                const task = await DB.getTask(id);
                return { 
                    success: true, 
                    data: { 
                        tasks: [task] 
                    } 
                };
            }

            return await this.request(`tasks/${id}`);
        } catch (error) {
            console.error('Failed to get task:', error);
            // Fallback to local storage
            const task = await DB.getTask(id);
            return { 
                success: true, 
                data: { 
                    tasks: [task] 
                } 
            };
        }
    },

    async createTask(taskData) {
        try {
            // Always save locally first
            const localSaveResult = await DB.saveTask(taskData);
            
            if (navigator.onLine) {
                try {
                    const response = await this.request('tasks', {
                        method: 'POST',
                        body: JSON.stringify(taskData)
                    });

                    if (response.success) {
                        // Update local task with server response
                        await DB.saveTask({
                            ...response.data.task,
                            syncStatus: 'synced'
                        });
                    }
                    return response;
                } catch (error) {
                    console.error('Failed to sync with server:', error);
                    return localSaveResult;
                }
            }

            return localSaveResult;
        } catch (error) {
            console.error('Create task error:', error);
            throw error;
        }
    },

    async updateTask(id, taskData) {
        try {
            // Always update locally first
            await DB.saveTask({ ...taskData, id });

            if (navigator.onLine) {
                return await this.request(`tasks/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(taskData)
                });
            }

            return {
                success: true,
                data: { message: 'Task updated locally' }
            };
        } catch (error) {
            console.error('Update task error:', error);
            throw error;
        }
    },

    async deleteTask(id) {
        try {
            // Always delete locally first
            await DB.deleteTask(id);

            if (navigator.onLine) {
                return await this.request(`tasks/${id}`, {
                    method: 'DELETE'
                });
            }

            return {
                success: true,
                data: { message: 'Task deleted locally' }
            };
        } catch (error) {
            console.error('Delete task error:', error);
            throw error;
        }
    },

    filterTasks(tasks, filter) {
        switch (filter) {
            case 'complete':
                return tasks.filter(task => task.completed === 'Y');
            case 'incomplete':
                return tasks.filter(task => task.completed === 'N');
            default:
                return tasks;
        }
    },

    formatDateForAPI(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');
    },

    isAuthenticated() {
        return !!localStorage.getItem('accessToken');
    }
};