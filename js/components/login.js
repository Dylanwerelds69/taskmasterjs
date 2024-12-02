const LoginComponent = {
    async render() {
        const mainContent = document.getElementById('main-content');
        document.getElementById('main-nav').classList.add('hidden');
        
        mainContent.innerHTML = `
            <div class="login-container">
                <div class="auth-tabs">
                    <button class="tab-btn active" data-tab="login">Login</button>
                    <button class="tab-btn" data-tab="register">Register</button>
                </div>
                
                <!-- Login Form -->
                <form id="login-form" class="auth-form">
                    <h2>Login</h2>
                    <div class="form-group">
                        <label for="login-username">Username</label>
                        <input type="text" id="login-username" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <div class="error-message hidden"></div>
                    <button type="submit" class="btn-primary">Login</button>
                </form>

                <!-- Register Form -->
                <form id="register-form" class="auth-form hidden">
                    <h2>Create Account</h2>
                    <div class="form-group">
                        <label for="register-username">Username</label>
                        <input type="text" id="register-username" required>
                    </div>
                    <div class="form-group">
                        <label for="register-password">Password</label>
                        <input type="password" id="register-password" required>
                    </div>
                    <div class="form-group">
                        <label for="register-confirm">Confirm Password</label>
                        <input type="password" id="register-confirm" required>
                    </div>
                    <div class="error-message hidden"></div>
                    <button type="submit" class="btn-primary">Create Account</button>
                </form>

                <div class="login-footer">
                    <button class="btn-secondary back-to-home">Back to Home</button>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    attachEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const forms = document.querySelectorAll('.auth-form');
                forms.forEach(form => form.classList.add('hidden'));
                const formToShow = tab.dataset.tab === 'login' ? 'login-form' : 'register-form';
                document.getElementById(formToShow).classList.remove('hidden');
            });
        });

        // Back to home button
        const backBtn = document.querySelector('.back-to-home');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                Router.navigate('/');
            });
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                console.log('👤 Login attempt:', { username });
                const response = await API.login(username, password);
                console.log('✅ Login success:', response);
                Router.navigate('/tasks');
            } catch (error) {
                console.error('❌ Login error:', error);
                const errorDiv = loginForm.querySelector('.error-message');
                errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
                errorDiv.classList.remove('hidden');
            }
        });

        // Register form
        const registerForm = document.getElementById('register-form');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-confirm').value;
            
            const errorDiv = registerForm.querySelector('.error-message');

            if (password !== confirm) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.classList.remove('hidden');
                return;
            }

            try {
                console.log('📝 Register attempt:', { username });
                const response = await API.register(username, password);
                console.log('✅ Register success:', response);
                // Auto login after registration
                await API.login(username, password);
                Router.navigate('/tasks');
            } catch (error) {
                console.error('❌ Register error:', error);
                errorDiv.textContent = error.message || 'Registration failed. Please try again.';
                errorDiv.classList.remove('hidden');
            }
        });
    }
};