const TasksComponent = {
    currentPage: 1,

    async render() {
        document.getElementById('main-nav').classList.remove('hidden');
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="tasks-container">
                <h1>My Tasks</h1>
                <div class="task-filters">
                    <select id="status-filter">
                        <option value="all">All Tasks</option>
                        <option value="complete">Completed</option>
                        <option value="incomplete">Incomplete</option>
                    </select>
                </div>
                <div class="task-list"></div>
                <div class="pagination"></div>
                <button class="add-task-btn">+</button>
            </div>

            <!-- Add Task Modal -->
            <div id="task-modal" class="modal hidden">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2 id="modal-title">Add New Task</h2>
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
                        <button type="submit" class="btn-primary">Save Task</button>
                    </form>
                </div>
            </div>
        `;

        await this.loadTasks();
        this.attachEventListeners();
    },

    async loadTasks() {
        try {
            const response = await API.getTasks(this.currentPage);
            const taskList = document.querySelector('.task-list');
            
            if (!response.data.tasks.length) {
                taskList.innerHTML = '<p class="no-tasks">No tasks found</p>';
                return;
            }

            taskList.innerHTML = response.data.tasks.map(task => `
                <div class="task-item" data-id="${task.id}">
                    <div class="task-info">
                        <h3>${this.escapeHtml(task.title)}</h3>
                        <p>${this.escapeHtml(task.description)}</p>
                        <span class="deadline">Deadline: ${this.formatDate(task.deadline)}</span>
                    </div>
                    <div class="task-controls">
                        <button class="edit-task">Edit</button>
                        <button class="delete-task">Delete</button>
                        <label class="checkbox-container">
                            <input type="checkbox" class="task-complete" 
                                ${task.completed === 'Y' ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </div>
                </div>
            `).join('');

            this.renderPagination(response.data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
            if (!navigator.onLine) {
                const offlineTasks = await DB.getTasks();
                // Render offline tasks...
            }
        }
    },

    async showAddTaskModal() {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        form.reset();
        modal.classList.remove('hidden');
    },

    async showEditTaskModal(taskId) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        document.getElementById('modal-title').textContent = 'Edit Task';
        
        try {
            const task = await API.getTask(taskId);
            document.getElementById('task-title').value = task.data.title;
            document.getElementById('task-description').value = task.data.description;
            document.getElementById('task-deadline').value = this.formatDateForInput(task.data.deadline);
            
            form.dataset.taskId = taskId;
            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to load task:', error);
        }
    },

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await API.deleteTask(taskId);
            await this.loadTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
            if (!navigator.onLine) {
                await DB.saveOfflineAction({
                    type: 'delete',
                    taskId: taskId
                });
            }
        }
    },

    async toggleTaskComplete(taskId, completed) {
        try {
            await API.updateTask(taskId, { completed: completed ? 'Y' : 'N' });
        } catch (error) {
            console.error('Failed to update task:', error);
            if (!navigator.onLine) {
                await DB.saveOfflineAction({
                    type: 'update',
                    taskId: taskId,
                    data: { completed: completed ? 'Y' : 'N' }
                });
            }
        }
    },

    attachEventListeners() {
        // Add task button
        const addBtn = document.querySelector('.add-task-btn');
        addBtn.addEventListener('click', () => this.showAddTaskModal());

        // Modal close button
        const closeBtn = document.querySelector('.modal .close');
        closeBtn.addEventListener('click', () => {
            document.getElementById('task-modal').classList.add('hidden');
        });

        // Task form submission
        const form = document.getElementById('task-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskData = {
                title: document.getElementById('task-title').value,
                description: document.getElementById('task-description').value,
                deadline: document.getElementById('task-deadline').value,
            };

            try {
                if (form.dataset.taskId) {
                    await API.updateTask(form.dataset.taskId, taskData);
                } else {
                    await API.createTask(taskData);
                }
                document.getElementById('task-modal').classList.add('hidden');
                await this.loadTasks();
            } catch (error) {
                console.error('Failed to save task:', error);
                if (!navigator.onLine) {
                    await DB.saveOfflineAction({
                        type: form.dataset.taskId ? 'update' : 'create',
                        taskId: form.dataset.taskId,
                        data: taskData
                    });
                }
            }
        });

        // Task list event delegation
        document.querySelector('.task-list').addEventListener('click', async (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            const taskId = taskItem.dataset.id;

            if (e.target.classList.contains('edit-task')) {
                await this.showEditTaskModal(taskId);
            } else if (e.target.classList.contains('delete-task')) {
                await this.deleteTask(taskId);
            } else if (e.target.classList.contains('task-complete')) {
                await this.toggleTaskComplete(taskId, e.target.checked);
            }
        });

        // Status filter
        document.getElementById('status-filter').addEventListener('change', async (e) => {
            const status = e.target.value;
            if (status === 'complete') {
                const response = await API.getCompleteTasks();
                // Update task list with filtered tasks
            } else if (status === 'incomplete') {
                const response = await API.getIncompleteTasks();
                // Update task list with filtered tasks
            } else {
                await this.loadTasks();
            }
        });
    },

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    },

    formatDateForInput(dateString) {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    }
};