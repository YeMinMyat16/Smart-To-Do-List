/**
 * Smart To-Do List
 * Core Application Logic
 */

class TaskStore {
    static getTasks() {
        return JSON.parse(localStorage.getItem('tasks')) || [];
    }

    static saveTasks(tasks) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    static getTheme() {
        return localStorage.getItem('theme') || 'light-mode';
    }

    static saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }
}

class App {
    constructor() {
        this.tasks = TaskStore.getTasks();
        this.currentFilter = 'all';
        this.currentSort = 'date-desc';
        this.editingTaskId = null;

        // Cache DOM elements
        this.elements = {
            taskList: document.getElementById('task-list'),
            taskForm: document.getElementById('task-form'),
            taskModal: document.getElementById('task-modal'),
            modalTitle: document.getElementById('modal-title'),
            addTaskBtn: document.getElementById('add-task-btn'),
            closeModalBtn: document.getElementById('close-modal'),
            themeToggle: document.getElementById('theme-toggle'),
            sunIcon: document.getElementById('sun-icon'),
            moonIcon: document.getElementById('moon-icon'),
            progressBar: document.getElementById('progress-bar'),
            progressText: document.getElementById('progress-text'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            sortSelect: document.getElementById('sort-select')
        };

        this.init();
    }

    init() {
        this.applyTheme(TaskStore.getTheme());
        this.render();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Modal triggers
        this.elements.addTaskBtn.addEventListener('click', () => this.openModal());
        this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());

        // Form submission
        this.elements.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Filters
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.render();
            });
        });

        // Sorting
        this.elements.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.render();
        });

        // Task actions (delegation)
        this.elements.taskList.addEventListener('click', (e) => {
            const taskId = e.target.closest('.task-item')?.dataset.id;
            if (!taskId) return;

            if (e.target.closest('.checkbox')) {
                this.toggleTaskComplete(taskId);
            } else if (e.target.closest('.edit-btn')) {
                this.openModal(taskId);
            } else if (e.target.closest('.delete-btn')) {
                this.deleteTask(taskId);
            }
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.taskModal) this.closeModal();
        });
    }

    applyTheme(theme) {
        document.body.className = theme;
        if (theme === 'dark-mode') {
            this.elements.sunIcon.classList.add('hidden');
            this.elements.moonIcon.classList.remove('hidden');
        } else {
            this.elements.sunIcon.classList.remove('hidden');
            this.elements.moonIcon.classList.add('hidden');
        }
    }

    toggleTheme() {
        const currentTheme = document.body.className;
        const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
        this.applyTheme(newTheme);
        TaskStore.saveTheme(newTheme);
    }

    openModal(taskId = null) {
        this.editingTaskId = taskId;
        this.elements.taskModal.classList.add('active');
        
        if (taskId) {
            this.elements.modalTitle.textContent = 'Edit Task';
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('task-title').value = task.title;
                document.getElementById('task-desc').value = task.description;
                document.getElementById('task-date').value = task.dueDate;
                document.getElementById('task-priority').value = task.priority;
            }
        } else {
            this.elements.modalTitle.textContent = 'Add Task';
            this.elements.taskForm.reset();
        }
    }

    closeModal() {
        this.elements.taskModal.classList.remove('active');
        this.editingTaskId = null;
        this.elements.taskForm.reset();
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-desc').value,
            dueDate: document.getElementById('task-date').value,
            priority: document.getElementById('task-priority').value,
        };

        if (this.editingTaskId) {
            this.tasks = this.tasks.map(t => 
                t.id === this.editingTaskId ? { ...t, ...taskData } : t
            );
        } else {
            const newTask = {
                id: Date.now().toString(),
                ...taskData,
                completed: false,
                createdAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
        }

        TaskStore.saveTasks(this.tasks);
        this.render();
        this.closeModal();
    }

    toggleTaskComplete(id) {
        this.tasks = this.tasks.map(t => 
            t.id === id ? { ...t, completed: !t.completed } : t
        );
        TaskStore.saveTasks(this.tasks);
        this.render();
    }

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            TaskStore.saveTasks(this.tasks);
            this.render();
        }
    }

    filterTasks(tasks) {
        if (this.currentFilter === 'pending') return tasks.filter(t => !t.completed);
        if (this.currentFilter === 'completed') return tasks.filter(t => t.completed);
        return tasks;
    }

    sortTasks(tasks) {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        
        return [...tasks].sort((a, b) => {
            switch (this.currentSort) {
                case 'date-asc':
                    return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
                case 'date-desc':
                    return new Date(b.dueDate || '0000-01-01') - new Date(a.dueDate || '0000-01-01');
                case 'priority-desc':
                    return priorityMap[b.priority] - priorityMap[a.priority];
                case 'priority-asc':
                    return priorityMap[a.priority] - priorityMap[b.priority];
                default:
                    return 0;
            }
        });
    }

    updateProgress() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${percentage}%`;
    }

    render() {
        const filteredTasks = this.filterTasks(this.tasks);
        const sortedTasks = this.sortTasks(filteredTasks);
        
        this.elements.taskList.innerHTML = '';
        
        if (sortedTasks.length === 0) {
            this.elements.taskList.innerHTML = `
                <div class="empty-state">
                    <p>No tasks found.</p>
                </div>
            `;
        } else {
            sortedTasks.forEach(task => {
                const taskEl = this.createTaskElement(task);
                this.elements.taskList.appendChild(taskEl);
            });
        }
        
        this.updateProgress();
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item ${task.completed ? 'completed' : ''}`;
        div.dataset.id = task.id;
        
        div.innerHTML = `
            <div class="checkbox-wrapper">
                <div class="checkbox ${task.completed ? 'checked' : ''}">
                    <svg class="${task.completed ? '' : 'hidden'}" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            </div>
            <div class="task-content">
                <span class="task-title">${task.title}</span>
                ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <span class="task-date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${task.dueDate || 'No date'}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="icon-btn edit-btn" aria-label="Edit Task">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="icon-btn delete-btn" aria-label="Delete Task">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        
        return div;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
