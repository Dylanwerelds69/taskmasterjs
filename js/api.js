const API = {
    BASE_URL: 'http://taskmasterjs.localhost/proxy.php',
    tokenRefreshTimeout: null,

    async request(endpoint, options = {}, isRefreshing = false) {
        if (!endpoint.startsWith('/')) {
            endpoint = '/' + endpoint;
        }

        const accessToken = localStorage.getItem('accessToken');
        const isAuthRoute = endpoint === '/users' || 
                          endpoint.startsWith('/sessions') || 
                          endpoint === '/sessions/refresh';



        if (!accessToken && !isAuthRoute && !isRefreshing) {
            Router.navigate('/login');
            throw new Error('Not authenticated');
        }

        const url = `${this.BASE_URL}?csurl=${endpoint}`;
        console.log('Making request to:', url);
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (accessToken && !isAuthRoute) {
                headers['Authorization'] = accessToken;
            }

            const response = await fetch(url, {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            });

            console.log('response status is ' + response.status);
            console.log('is auth route ' + isAuthRoute);

            // If we get a 401 and it's not an auth route, try to refresh the token
            if (response.status === 401 && !isAuthRoute) {
                try {
                    const newToken = await this.refreshAccessToken();
                    // Retry the original request with the new token
                    headers['Authorization'] = newToken;
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers: {
                            ...headers,
                            ...options.headers
                        }
                    });
                    return await this.handleResponse(retryResponse);
                } catch (refreshError) {
                    localStorage.removeItem('accessToken');
                    Router.navigate('/login');
                    throw refreshError;
                }
            }

            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    async handleResponse(response) {
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse response:', responseText);
            throw new Error('Invalid JSON response from server');
        }

        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    },

    async refreshAccessToken() {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const sessionId = localStorage.getItem('sessionId');
        const username = localStorage.getItem('username');
    
        if (!refreshToken || !sessionId || !username) {
            throw new Error('Missing authentication data');
        }
    
        try {
            const url = `${this.BASE_URL}?csurl=/sessions/${sessionId}`;
            console.log('Refreshing session at:', url);
    
            const headers = {
                'Content-Type': 'application/json'
            };
    
            // if (accessToken && !isAuthRoute) {
                headers['Authorization'] = accessToken;
            // }
            // headers['Authorization'] = accessToken;
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    ...headers
                },
                body: JSON.stringify({ 
                    refresh_token: refreshToken
                })
            });
    
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse refresh response:', responseText);
                throw new Error('Invalid JSON response from server during refresh');
            }
    
            if (!response.ok) {
                // Clear the refresh timeout to prevent loops
                if (this.tokenRefreshTimeout) {
                    clearTimeout(this.tokenRefreshTimeout);
                    this.tokenRefreshTimeout = null;
                }
                await this.logout();
                throw new Error(responseData.message || `Refresh failed with status: ${response.status}`);
            }
    
            if (responseData.success) {
                // Save the new tokens from the response
                const newAccessToken = responseData.data.access_token;
                const newRefreshToken = responseData.data.refresh_token;
                
                // Update localStorage with new tokens
                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                
                // Update DB to ensure offline functionality remains intact
                await DB.saveUser({
                    username,
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    sessionId
                });
    
                // Schedule next refresh for 5 minutes
                this.scheduleTokenRefresh(300); // 5 minutes
    
                return newAccessToken;
            }else {
                await this.logout();
            }
            throw new Error('Failed to refresh session');
        } catch (error) {
            // Clear the refresh timeout to prevent loops
            if (this.tokenRefreshTimeout) {
                clearTimeout(this.tokenRefreshTimeout);
                this.tokenRefreshTimeout = null;
            }
            console.error('Session refresh failed:', error);
            await this.logout();
            throw error;
        }
    },
    
    scheduleTokenRefresh(expiresIn) {
        // Clear any existing timeout
        if (this.tokenRefreshTimeout) {
            clearTimeout(this.tokenRefreshTimeout);
            this.tokenRefreshTimeout = null;
        }
    
        // Ensure we have a valid time
        const refreshTime = Math.max(60, expiresIn) * 1000; // Minimum 1 minute, convert to milliseconds
        console.log(`Scheduling next refresh in ${refreshTime/1000} seconds`);
        
        this.tokenRefreshTimeout = setTimeout(async () => {
            try {
                await this.refreshAccessToken();
                console.log('Session refreshed successfully');
            } catch (error) {
                console.error('Failed to refresh session:', error);
                // Don't call logout here as refreshAccessToken already handles that
            }
        }, refreshTime);
    },
    async testRefreshToken() {
        console.log('Manually triggering token refresh...');
        try {
            const newToken = await this.refreshAccessToken();
            console.log('Manual refresh successful! New token received');
            return newToken;
        } catch (error) {
            console.error('Manual refresh failed:', error);
            throw error;
        }
    },
    
    scheduleTokenRefresh(expiresIn) {
        if (this.tokenRefreshTimeout) {
            clearTimeout(this.tokenRefreshTimeout);
        }
    
        // Schedule refresh 1 minute before expiration
        const refreshTime = (expiresIn - 60) * 1000;
        console.log('Scheduling next refresh in', refreshTime/1000, 'seconds');
        
        this.tokenRefreshTimeout = setTimeout(async () => {
            try {
                await this.refreshAccessToken();
                console.log('Session refreshed successfully');
            } catch (error) {
                console.error('Failed to refresh session:', error);
                await this.logout();
            }
        }, refreshTime);
    },

    async register(username, password) {
        try {
            const response = await this.request('/users', {
                method: 'POST',
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
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },

    async login(username, password) {
        try {
            const response = await this.request('/sessions', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            if (response.success && response.data) {
                const { access_token, refresh_token, session_id, expires_in } = response.data;

                await DB.saveUser({
                    username,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    sessionId: session_id
                });

                localStorage.setItem('accessToken', access_token);
                localStorage.setItem('refreshToken', refresh_token);
                localStorage.setItem('sessionId', session_id);
                localStorage.setItem('username', username);

                // Schedule token refresh
                if (expires_in) {
                    this.scheduleTokenRefresh(expires_in);
                }
            }
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async logout() {
        // Clear token refresh timeout
        if (this.tokenRefreshTimeout) {
            clearTimeout(this.tokenRefreshTimeout);
            this.tokenRefreshTimeout = null;
        }

        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            try {
                await this.request(`/sessions/${sessionId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        localStorage.clear();
        await DB.clearData();
        Router.navigate('/login');
    },

    async getTasks(page = 1, filter = 'all') {
        try {
            if (!navigator.onLine) {
                const tasks = await DB.getAllTasks();
                const filteredTasks = tasks.filter(task => !task.deleted);
                return {
                    success: true,
                    data: {
                        tasks: this.filterTasks(filteredTasks, filter),
                        total_pages: 1,
                        has_next_page: false,
                        has_previous_page: false
                    }
                };
            }

            let endpoint;
            switch (filter) {
                case 'complete':
                    endpoint = '/tasks/complete';
                    break;
                case 'incomplete':
                    endpoint = '/tasks/incomplete';
                    break;
                default:
                    endpoint = `/tasks/page/${page}`;
            }
            
            const response = await this.request(endpoint);
            
            if (response.success && response.data.tasks) {
                for (const task of response.data.tasks) {
                    await DB.saveTask({
                        ...task,
                        syncStatus: 'synced'
                    });
                }
            }
            
            return response;
        } catch (error) {
            console.error('Failed to get tasks:', error);
            const tasks = await DB.getAllTasks();
            const filteredTasks = tasks.filter(task => !task.deleted);
            return {
                success: true,
                data: {
                    tasks: this.filterTasks(filteredTasks, filter),
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
                if (!task) {
                    throw new Error('Task not found in local storage');
                }
                return { 
                    success: true, 
                    data: { 
                        tasks: [task] 
                    } 
                };
            }

            const response = await this.request(`/tasks/${id}`);
            if (response.success && response.data.tasks.length > 0) {
                await DB.saveTask({
                    ...response.data.tasks[0],
                    syncStatus: 'synced'
                });
            }
            return response;
        } catch (error) {
            console.error('Failed to get task:', error);
            const task = await DB.getTask(id);
            if (task) {
                return { 
                    success: true, 
                    data: { 
                        tasks: [task] 
                    } 
                };
            }
            throw error;
        }
    },

    async createTask(taskData) {
        const formattedTask = {
            ...taskData,
            deadline: this.formatDate(taskData.deadline)
        };

        try {
            if (!navigator.onLine) {
                console.log('Offline mode: Saving task locally');
                const savedTask = await DB.saveTask({
                    ...formattedTask,
                    syncStatus: 'pending'
                });

                return {
                    success: true,
                    data: { 
                        task: savedTask,
                        message: 'Task saved locally' 
                    }
                };
            }

            console.log('Online mode: Saving task to server');
            const response = await this.request('/tasks', {
                method: 'POST',
                body: JSON.stringify(formattedTask)
            });

            if (response.success) {
                await DB.saveTask({
                    ...response.data.task,
                    syncStatus: 'synced'
                });
            }
            return response;
        } catch (error) {
            console.error('Create task error:', error);
            
            if (error.message.includes("Couldn't resolve host") || error.message.includes('Failed to fetch')) {
                console.log('Network error, saving locally as fallback');
                const savedTask = await DB.saveTask({
                    ...formattedTask,
                    syncStatus: 'pending'
                });

                return {
                    success: true,
                    data: { 
                        task: savedTask,
                        message: 'Server unreachable, task saved locally' 
                    }
                };
            }
            
            throw error;
        }
    },

    async updateTask(id, taskData) {
        const formattedTask = {
            ...taskData,
            deadline: taskData.deadline ? this.formatDate(taskData.deadline) : undefined
        };
    
        try {
            if (!navigator.onLine) {
                console.log('Offline mode: Updating task locally');
                
                // First, mark the old version as deleted
                const existingTask = await DB.getTask(id);
                if (existingTask) {
                    await DB.markTaskAsDeleted(id);
                }
                
                // Then save the new version
                const savedTask = await DB.saveTask({
                    ...formattedTask,
                    id, // Keep the original ID
                    syncStatus: 'pending'
                });
    
                return {
                    success: true,
                    data: { 
                        task: savedTask,
                        message: 'Task updated locally' 
                    }
                };
            }
    
            console.log('Online mode: Updating task on server');
            const response = await this.request(`/tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(formattedTask)
            });
    
            if (response.success) {
                // Delete any existing local version first
                await DB.deleteTask(id);
                
                // Then save the server response
                await DB.saveTask({
                    ...response.data.task,
                    syncStatus: 'synced'
                });
            }
            return response;
        } catch (error) {
            console.error('Update task error:', error);
            
            if (error.message.includes("Couldn't resolve host") || error.message.includes('Failed to fetch')) {
                console.log('Network error, saving update locally as fallback');
                
                // First, mark the old version as deleted
                const existingTask = await DB.getTask(id);
                if (existingTask) {
                    await DB.markTaskAsDeleted(id);
                }
                
                // Then save the new version
                const savedTask = await DB.saveTask({
                    ...formattedTask,
                    id, // Keep the original ID
                    syncStatus: 'pending'
                });
    
                return {
                    success: true,
                    data: {
                        task: savedTask,
                        message: 'Server unreachable, task updated locally'
                    }
                };
            }
            
            throw error;
        }
    },

    async deleteTask(id) {
        try {
            if (!navigator.onLine) {
                console.log('Offline mode: Marking task for deletion locally');
                const task = await DB.getTask(id);
                if (task) {
                    await DB.saveTask({
                        ...task,
                        deleted: true,
                        syncStatus: 'pending'
                    });
                    
                    return {
                        success: true,
                        data: {
                            message: 'Task marked for deletion locally'
                        }
                    };
                }
            }

            console.log('Online mode: Deleting task from server');
            const response = await this.request(`/tasks/${id}`, {
                method: 'DELETE'
            });

            if (response.success) {
                await DB.deleteTask(id);
            }
            return response;
        } catch (error) {
            console.error('Delete task error:', error);
            
            if (error.message.includes("Couldn't resolve host") || error.message.includes('Failed to fetch')) {
                const task = await DB.getTask(id);
                if (task) {
                    await DB.saveTask({
                        ...task,
                        deleted: true,
                        syncStatus: 'pending'
                    });

                    return {
                        success: true,
                        data: {
                            message: 'Server unreachable, task marked for deletion locally'
                        }
                    };
                }
            }
            
            throw error;
        }
    },

    async toggleTaskComplete(id, currentStatus) {
        return await this.updateTask(id, {
            completed: currentStatus === 'Y' ? 'N' : 'Y'
        });
    },

    filterTasks(tasks, filter) {
        const activeTasks = tasks.filter(task => !task.deleted);
        switch (filter) {
            case 'complete':
                return activeTasks.filter(task => task.completed === 'Y');
            case 'incomplete':
                return activeTasks.filter(task => task.completed === 'N');
            default:
                return activeTasks;
        }
    },

    formatDate(dateString) {
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
        return Boolean(localStorage.getItem('accessToken'));
    },

    async syncOfflineActions() {
        if (!navigator.onLine) return;
    
        try {
            const unsynced = await DB.getUnsynedTasks();
            console.log('Starting sync process. Found unsynced tasks:', unsynced);
    
            // Get existing tasks from server first
            const existingTasksResponse = await this.request('/tasks/page/1');
            const existingTasks = existingTasksResponse.success ? existingTasksResponse.data.tasks : [];
    
            for (const task of unsynced) {
                try {
                    const isNewTask = String(task.id).startsWith('local_') || task.id > 999999;
                    console.log(`Processing task ${task.id}:`, { isNewTask, task });
    
                    // Check for duplicate before creating/updating
                    const duplicate = existingTasks.find(t => 
                        t.title === task.title && 
                        t.description === task.description &&
                        t.deadline === task.deadline
                    );
    
                    if (duplicate) {
                        console.log('Found duplicate task on server:', duplicate);
                        // Delete our local version
                        await DB.deleteTask(task.id);
                        continue;
                    }
    
                    if (task.deleted) {
                        if (!isNewTask) {
                            await this.request(`/tasks/${task.id}`, {
                                method: 'DELETE'
                            });
                        }
                        await DB.deleteTask(task.id);
                        continue;
                    }
    
                    let serverResponse;
                    const taskData = {
                        title: task.title,
                        description: task.description,
                        deadline: task.deadline,
                        completed: task.completed
                    };
    
                    if (isNewTask) {
                        console.log('Creating new task on server:', taskData);
                        serverResponse = await this.request('/tasks', {
                            method: 'POST',
                            body: JSON.stringify(taskData)
                        });
    
                        if (serverResponse.success) {
                            // Remove local version before saving server version
                            await DB.deleteTask(task.id);
                            // Save server version
                            await DB.saveTask({
                                ...serverResponse.data.tasks[0],
                                syncStatus: 'synced'
                            });
                        }
                    } else {
                        console.log('Updating existing task on server:', taskData);
                        serverResponse = await this.request(`/tasks/${task.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify(taskData)
                        });
    
                        if (serverResponse.success) {
                            await DB.saveTask({
                                ...serverResponse.data.tasks[0],
                                syncStatus: 'synced'
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Failed to sync task ${task.id}:`, error);
                }
            }
    
            // Final cleanup of any remaining duplicates
            const allTasks = await DB.getAllTasks();
            const seen = new Map();
            for (const task of allTasks) {
                const key = `${task.title}-${task.description}-${task.deadline}`;
                if (seen.has(key)) {
                    await DB.deleteTask(task.id);
                } else {
                    seen.set(key, task);
                }
            }
    
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }
};