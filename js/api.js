const API = {
    BASE_URL: '/github/taskmasterjs/proxy.php?csurl=',

    async request(endpoint, options = {}) {
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

    async getTasks(page = 1) {
        return this.request(`tasks/page/${page}`);
    },

    async getTask(id) {
        return this.request(`tasks/${id}`);
    },

    async createTask(taskData) {
        const formattedData = {
            ...taskData,
            deadline: this.formatDateForAPI(taskData.deadline),
            completed: taskData.completed || 'N'
        };

        console.log('Creating task with data:', formattedData);

        return this.request('tasks', {
            method: 'POST',
            body: JSON.stringify(formattedData)
        });
    },

    async updateTask(id, taskData) {
        const formattedData = {
            ...taskData
        };
        if (taskData.deadline) {
            formattedData.deadline = this.formatDateForAPI(taskData.deadline);
        }

        return this.request(`tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(formattedData)
        });
    },

    async deleteTask(id) {
        return this.request(`tasks/${id}`, {
            method: 'DELETE'
        });
    },

    async register(username, password, fullname) {
        return this.request('users', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                fullname: fullname || username
            })
        });
    },

    async login(username, password) {
        try {
            const response = await this.request('sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            console.log('Login response:', response);
            if (response.success && response.data) {
                localStorage.setItem('accessToken', response.data.access_token);
                localStorage.setItem('refreshToken', response.data.refresh_token);
                localStorage.setItem('sessionId', response.data.session_id);
                localStorage.setItem('username', username);
            }
            return response;
        } catch (error) {
            console.error('🚫 Login error:', error);
            throw error;
        }
    },

    async logout() {
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
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
