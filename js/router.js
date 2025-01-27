// Router.js
const Router = {
    basePath: '',
    
    init() {
        this.handleNavigation();
        window.addEventListener('popstate', () => this.handleNavigation());
        
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href.startsWith(window.location.origin)) {
                e.preventDefault();
                const path = link.href.replace(window.location.origin, '');
                this.navigate(path);
            }
        });
    },

    navigate(path) {
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        history.pushState(null, '', path);
        this.handleNavigation();
    },

    async handleNavigation() {
        const path = window.location.pathname;
        const isAuthenticated = API.isAuthenticated();

        this.updateActiveNavigation(path);

        try {
            switch(path) {
                case '/':
                    await HomeComponent.render();
                    break;

                case '/login':
                    if (isAuthenticated) {
                        this.navigate('/tasks');
                        return;
                    }
                    await LoginComponent.render();
                    break;

                case '/register':
                    if (isAuthenticated) {
                        this.navigate('/tasks');
                        return;
                    }
                    await RegisterComponent.render();
                    break;

                case '/tasks':
                    if (!isAuthenticated) {
                        this.navigate('/login');
                        return;
                    }
                    await TasksComponent.render();
                    break;

                case '/add-task':
                    if (!isAuthenticated) {
                        this.navigate('/login');
                        return;
                    }
                    await AddTaskComponent.render();
                    break;

                case '/edit-task':
                    if (!isAuthenticated) {
                        this.navigate('/login');
                        return;
                    }
                    await EditTaskComponent.render();
                    break;

                case '/profile':
                    if (!isAuthenticated) {
                        this.navigate('/login');
                        return;
                    }
                    await ProfileComponent.render();
                    break;

                case '/home':
                    await HomeComponent.render();
                    break;

                default:
                    if (path.startsWith('/api/') || path.startsWith('/sessions/')) {
                        return;
                    }
                    await NotFoundComponent.render();
                    break;
            }
        } catch (error) {
            console.error('Navigation error:', error);
            this.navigate('/');
        }
    },

    updateActiveNavigation(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`.nav-link[href="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
};

export default Router;