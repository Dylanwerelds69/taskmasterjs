window.TasksComponent = {
    currentPage: 1,
    currentFilter: 'all',

    async render() {
        document.getElementById('main-nav').classList.remove('hidden');
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="tasks-container">
                <h1>My Tasks</h1>
                <div class="task-filters">
                    <select id="status-filter" class="filter-select">
                        <option value="all">All Tasks</option>
                        <option value="complete">Completed</option>
                        <option value="incomplete">Incomplete</option>
                    </select>
                </div>
                <div class="task-list"></div>
                <div class="pagination"></div>
                <button class="add-task-btn">+</button>
            </div>

            <!-- Add/Edit Task Modal -->
            <div id="task-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modal-title">Add New Task</h2>
                        <span class="close">&times;</span>
                    </div>
                    <form id="task-form">
                        <div class="form-group">
                            <label for="task-title">Title</label>
                            <input type="text" id="task-title" required>
                        </div>
                        <div class="form-group">
                            <label for="task-description">Description</label>
                            <textarea id="task-description" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="task-deadline">Deadline</label>
                            <input type="datetime-local" id="task-deadline" required>
                        </div>
                        <div class="form-group checkbox-group">
                            <label class="checkbox-container">
                                <input type="checkbox" id="task-completed">
                                <span class="checkmark"></span>
                                Mark as completed
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                            <button type="submit" class="btn-primary">Save Task</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        await this.loadTasks();
        this.attachEventListeners();

        // Add online/offline event listeners
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
    },

    async loadTasks() {
        try {
            const response = await API.getTasks(this.currentPage, this.currentFilter);
            const taskList = document.querySelector('.task-list');
            if (!taskList) return;
    
            if (!response.data.tasks.length) {
                taskList.innerHTML = '<p class="no-tasks">No tasks found. Click the + button to create your first task!</p>';
                return;
            }
    
            // Get active tasks only
            const activeTasks = response.data.tasks.filter(task => !task.deleted);
            
            // Remove duplicates based on content
            const uniqueTasks = activeTasks.reduce((acc, current) => {
                const exists = acc.find(item => 
                    item.title === current.title && 
                    item.description === current.description &&
                    item.deadline === current.deadline
                );
                if (!exists) {
                    return [...acc, current];
                }
                return acc;
            }, []);
    
            // Sort tasks by deadline
            uniqueTasks.sort((a, b) => {
                const dateA = new Date(a.deadline.split(' ')[0].split('/').reverse().join('/'));
                const dateB = new Date(b.deadline.split(' ')[0].split('/').reverse().join('/'));
                return dateA - dateB;
            });
    
            taskList.innerHTML = uniqueTasks.map(task => this.createTaskHTML(task)).join('');
    
            if (this.currentFilter === 'all' && navigator.onLine) {
                this.renderPagination(response.data);
            } else {
                const pagination = document.querySelector('.pagination');
                if (pagination) {
                    pagination.innerHTML = '';
                }
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
            const taskList = document.querySelector('.task-list');
            if (taskList) {
                taskList.innerHTML = '<p class="error">Failed to load tasks. Please try again.</p>';
            }
        }
    },

    async showAddTaskModal() {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        document.getElementById('modal-title').textContent = 'Add New Task';
        form.reset();
        
        // Set default date to current date and time
        const now = new Date();
        const defaultDate = now.toISOString().slice(0, 16);
        document.getElementById('task-deadline').value = defaultDate;
        
        document.getElementById('task-completed').checked = false;
        form.removeAttribute('data-task-id');
        modal.classList.remove('hidden');
    },

    async showEditTaskModal(taskId) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        document.getElementById('modal-title').textContent = 'Edit Task';
        
        try {
            const response = await API.getTask(taskId);
            if (response && response.success && response.data && response.data.tasks && response.data.tasks[0]) {
                const task = response.data.tasks[0];

                document.getElementById('task-title').value = task.title || '';
                document.getElementById('task-description').value = task.description || '';
                
                if (task.deadline) {
                    const [datePart, timePart] = task.deadline.split(' ');
                    const [day, month, year] = datePart.split('/');
                    const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`;
                    document.getElementById('task-deadline').value = formattedDate;
                }
                
                document.getElementById('task-completed').checked = task.completed === 'Y';
                form.dataset.taskId = taskId;
                modal.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Failed to load task:', error);
            if (window.app) {
                window.app.showNotification('Failed to load task. Please try again.', 'error');
            }
        }
    },

    async handleOnlineStatus(isOnline) {
        if (isOnline) {
            await this.syncAndRefresh();
        }
    },

    async syncAndRefresh() {
        try {
            await API.syncOfflineActions();
            await this.loadTasks();
        } catch (error) {
            console.error('Failed to sync tasks:', error);
        }
    },

    attachEventListeners() {
        // Add task button
        const addBtn = document.querySelector('.add-task-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddTaskModal());
        }

        // Modal close button
        const closeBtn = document.querySelector('.modal .close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('task-modal').classList.add('hidden');
            });
        }

        // Cancel button
        const cancelBtn = document.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('task-modal').classList.add('hidden');
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', async (e) => {
                this.currentFilter = e.target.value;
                this.currentPage = 1;
                await this.loadTasks();
            });
        }

        // Task form submission
        const form = document.getElementById('task-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const taskId = form.dataset.taskId;
                const taskData = {
                    title: document.getElementById('task-title').value.trim(),
                    description: document.getElementById('task-description').value.trim(),
                    deadline: document.getElementById('task-deadline').value,
                    completed: document.getElementById('task-completed').checked ? 'Y' : 'N'
                };

                try {
                    if (taskId) {
                        // Get existing task first
                        const existingTask = await DB.getTask(taskId);
                        if (existingTask) {
                            // Update while preserving the original ID
                            await API.updateTask(taskId, {
                                ...taskData,
                                id: taskId
                            });
                        }
                    } else {
                        await API.createTask(taskData);
                    }
                    document.getElementById('task-modal').classList.add('hidden');
                    await this.loadTasks();
                } catch (error) {
                    console.error('Failed to save task:', error);
                }
            });
        }

        // Task list event delegation
        const taskList = document.querySelector('.task-list');
        if (taskList) {
            taskList.addEventListener('click', async (e) => {
                const taskItem = e.target.closest('.task-item');
                if (!taskItem) return;
                
                const taskId = taskItem.dataset.id;
                
                if (e.target.closest('.edit-task')) {
                    await this.showEditTaskModal(taskId);
                } else if (e.target.closest('.delete-task')) {
                    if (confirm('Are you sure you want to delete this task?')) {
                        try {
                            await API.deleteTask(taskId);
                            await this.loadTasks();
                        } catch (error) {
                            console.error('Failed to delete task:', error);
                        }
                    }
                } else if (e.target.classList.contains('task-complete')) {
                    try {
                        const task = await DB.getTask(taskId);
                        if (task) {
                            await API.updateTask(taskId, {
                                ...task,
                                completed: e.target.checked ? 'Y' : 'N'
                            });
                            await this.loadTasks();
                        }
                    } catch (error) {
                        console.error('Failed to update task:', error);
                        e.target.checked = !e.target.checked;
                    }
                }
            });
        }
    },

    createTaskHTML(task) {
        return `
            <div class="task-item ${task.completed === 'Y' ? 'completed' : ''} ${task.syncStatus === 'pending' ? 'pending-sync' : ''}" data-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <h3>${this.escapeHtml(task.title)}</h3>
                        <span class="deadline ${this.isOverdue(task.deadline) ? 'overdue' : ''}">
                            ${task.deadline}
                        </span>
                    </div>
                    <p class="task-description">${this.escapeHtml(task.description)}</p>
                    ${task.syncStatus === 'pending' ? '<span class="sync-status">Pending sync</span>' : ''}
                </div>
                <div class="task-controls">
                    <button class="edit-task" title="Edit">Edit</button>
                    <button class="delete-task" title="Delete">Delete</button>
                    <label class="checkbox-container" title="${task.completed === 'Y' ? 'Mark as incomplete' : 'Mark as complete'}">
                        <input type="checkbox" class="task-complete" ${task.completed === 'Y' ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    isOverdue(deadline) {
        const [datePart, timePart] = deadline.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute] = timePart.split(':');
        const deadlineDate = new Date(year, month - 1, day, hour, minute);
        return deadlineDate < new Date();
    },

    renderPagination(data) {
        const pagination = document.querySelector('.pagination');
        if (!pagination) return;

        let html = '';
        
        if (data.has_previous_page) {
            html += `<button class="btn-secondary" onclick="TasksComponent.currentPage--; TasksComponent.loadTasks();">Previous</button>`;
        }
        
        html += `<span>Page ${this.currentPage} of ${data.total_pages}</span>`;
        
        if (data.has_next_page) {
            html += `<button class="btn-secondary" onclick="TasksComponent.currentPage++; TasksComponent.loadTasks();">Next</button>`;
        }
        
        pagination.innerHTML = html;
    }
};