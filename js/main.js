document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Trigger when 15% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add the active class to trigger the CSS transition
                entry.target.classList.add('active');
                // Stop observing once the animation has triggered
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select all elements with the reveal-up class
    const revealElements = document.querySelectorAll('.reveal-up');

    // Start observing each element
    revealElements.forEach(el => {
        observer.observe(el);
    });

    // Blog Form Toggle & LocalStorage Management
    const toggleBtn = document.getElementById('toggle-blog-form');
    const formContainer = document.getElementById('blog-form-container');
    const cancelBtn = document.getElementById('cancel-blog-form');
    const blogForm = document.getElementById('new-blog-form');
    const blogGrid = document.getElementById('blog-grid');

    if (toggleBtn && formContainer) {
        toggleBtn.addEventListener('click', () => {
            formContainer.classList.toggle('hidden');
            if (!formContainer.classList.contains('hidden')) {
                document.getElementById('blog-title').focus();
            }
        });
    }

    if (cancelBtn && formContainer) {
        cancelBtn.addEventListener('click', () => {
            formContainer.classList.add('hidden');
            blogForm.reset();
        });
    }

    // Load stored blog posts
    const STORAGE_KEY = 'portfolio_blog_posts';
    
    function loadStoredPosts() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;
            const posts = JSON.parse(stored);
            posts.forEach(post => {
                appendPostToGrid(post, false);
            });
        } catch (e) {
            console.error('Failed to load blog posts from storage', e);
        }
    }

    function savePostToStorage(post) {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const posts = stored ? JSON.parse(stored) : [];
            posts.push(post);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        } catch (e) {
            console.error('Failed to save blog post', e);
        }
    }

    function getReadMoreUrl(post) {
        const params = new URLSearchParams({
            post: 'custom',
            title: post.title,
            category: post.category
        });
        const fallbackUrl = `blog-post.html?${params.toString()}`;
        if (!post.url) return fallbackUrl;

        try {
            const parsed = new URL(post.url, window.location.href);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.origin === window.location.origin) {
                return parsed.href;
            }
        } catch (e) {
            return fallbackUrl;
        }

        return fallbackUrl;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function appendPostToGrid(post, animate = true) {
        const safeCategory = escapeHtml(post.category);
        const safeTitle = escapeHtml(post.title);
        const safeImage = escapeHtml(post.imageUrl || `https://placehold.co/600x400/18181b/ffffff?text=${encodeURIComponent(post.title)}`);
        const safeUrl = escapeHtml(getReadMoreUrl(post));
        const cardHtml = `
            <a href="${safeUrl}" class="group block ${animate ? 'reveal-up active' : ''}">
                <div class="apple-card overflow-hidden h-full flex flex-col">
                    <div class="h-48 w-full bg-zinc-800 relative overflow-hidden">
                        <img src="${safeImage}" alt="${safeTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                    </div>
                    <div class="p-8 flex-grow flex flex-col justify-between">
                        <div>
                            <p class="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">${safeCategory}</p>
                            <h3 class="text-xl font-bold text-white mb-4 leading-snug group-hover:text-blue-400 transition-colors">${safeTitle}</h3>
                        </div>
                        <p class="text-[#86868b] text-sm mt-4 font-medium flex items-center">
                            Read article 
                            <svg class="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </p>
                    </div>
                </div>
            </a>
        `;
        blogGrid.insertAdjacentHTML('beforeend', cardHtml);
    }

    if (blogForm) {
        blogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('blog-title').value.trim();
            const category = document.getElementById('blog-category').value.trim();
            let imageUrl = document.getElementById('blog-image').value.trim();
            const url = document.getElementById('blog-url').value.trim();

            if (!title || !category) return;

            const newPost = { title, category, imageUrl, url };
            savePostToStorage(newPost);
            appendPostToGrid(newPost, true);

            blogForm.reset();
            formContainer.classList.add('hidden');
        });
    }

    loadStoredPosts();
});
