const HomeComponent = {
    async render() {
        document.getElementById('main-nav').classList.remove('hidden');
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="home-container">
                <!-- Hero Section -->
                <section class="hero">
                    <div class="hero-content">
                        <h1>Welcome to Taskmaster</h1>
                        <p class="hero-subtitle">Your professional task management solution for the financial sector</p>
                        <div class="hero-buttons">
                            <button class="btn-primary get-started">Get Started</button>
                            <button class="btn-secondary learn-more">Learn More</button>
                        </div>
                    </div>
                </section>

                <!-- Features Section -->
                <section class="features">
                    <h2>Key Features</h2>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">📱</div>
                            <h3>Work Offline</h3>
                            <p>Continue working without internet connection. All changes sync automatically when you're back online.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🔍</div>
                            <h3>Smart Filters</h3>
                            <p>Easily filter tasks by status, completion, or custom criteria to find exactly what you need.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">📊</div>
                            <h3>Task Analytics</h3>
                            <p>Get insights into your task completion rates and productivity patterns.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🔐</div>
                            <h3>Secure Access</h3>
                            <p>Enterprise-grade security with secure login and session management.</p>
                        </div>
                    </div>
                </section>

                <!-- About Section -->
                <section class="about">
                    <div class="about-content">
                        <h2>About Taskmaster</h2>
                        <p>Taskmaster is designed specifically for financial professionals who need a reliable, secure, and efficient way to manage their daily tasks. From client meetings to report deadlines, Taskmaster helps you stay organized and productive.</p>
                        <ul class="about-list">
                            <li>✓ Streamline your workflow</li>
                            <li>✓ Never miss a deadline</li>
                            <li>✓ Collaborate seamlessly</li>
                            <li>✓ Track progress effortlessly</li>
                        </ul>
                    </div>
                </section>

                <!-- CTA Section -->
                <section class="cta">
                    <h2>Ready to boost your productivity?</h2>
                    <p>Join thousands of professionals who trust Taskmaster for their task management needs.</p>
                    <button class="btn-primary start-now">Start Now</button>
                </section>
            </div>
        `;

        this.attachEventListeners();
    },

    attachEventListeners() {
        const buttons = document.querySelectorAll('.get-started, .start-now');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                if (API.isAuthenticated()) {
                    Router.navigate('/tasks');
                } else {
                    Router.navigate('/login');
                }
            });
        });

        const learnMore = document.querySelector('.learn-more');
        if (learnMore) {
            learnMore.addEventListener('click', () => {
                document.querySelector('.features').scrollIntoView({ behavior: 'smooth' });
            });
        }
    }
};