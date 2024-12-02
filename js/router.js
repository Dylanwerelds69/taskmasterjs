const Router = {
    basePath: '/github/taskmasterjs',

    init() {
        this.handleNavigation();
        window.addEventListener('popstate', () => this.handleNavigation());
        
        // Add click event listener for navigation links
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
        const fullPath = `${this.basePath}${path}`;
        history.pushState(null, '', fullPath);
        this.handleNavigation();
    },

    async handleNavigation() {
        const currentPath = window.location.pathname;
        const path = currentPath.replace(this.basePath, '') || '/';
        const isAuthenticated = API.isAuthenticated();

        // Update active navigation state
        this.updateActiveNavigation(path);

        switch(path) {
            case '/':
                // Always show home page first when accessing root URL
                await HomeComponent.render();
                break;

            case '/login':
                if (isAuthenticated) {
                    this.navigate('/tasks');
                    return;
                }
                await LoginComponent.render();
                break;

            case '/tasks':
                if (!isAuthenticated) {
                    this.navigate('/login');
                    return;
                }
                await TasksComponent.render();
                break;

            case '/home':
                await HomeComponent.render();
                break;

            default:
                // For unknown routes, redirect to home instead of tasks
                this.navigate('/');
                break;
        }
    },

    updateActiveNavigation(path) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current path's link
        const activeLink = document.querySelector(`.nav-link[href="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
};