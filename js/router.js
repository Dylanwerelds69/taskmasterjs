const Router = {
    basePath: '/github/taskmasterjs',

    init() {
        this.handleNavigation();
        window.addEventListener('popstate', () => this.handleNavigation());
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

        if (!isAuthenticated && path !== '/login') {
            this.navigate('/login');
            return;
        }

        switch(path) {
            case '/':
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
            default:
                this.navigate(isAuthenticated ? '/tasks' : '/login');
                break;
        }
    }
};