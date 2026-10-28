document.addEventListener('DOMContentLoaded', () => {
    // 1. Hardware-Accelerated Scroll Reveal
    const revealElements = document.querySelectorAll('.reveal-up');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            let delay = 0;
            if (el.classList.contains('delay-100')) delay = 80;
            if (el.classList.contains('delay-200')) delay = 160;
            if (el.classList.contains('delay-300')) delay = 240;

            setTimeout(() => {
                el.classList.add('is-visible');
            }, delay);

            obs.unobserve(el);
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => observer.observe(el));

    // 2. Mobile Navigation Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            const isHidden = mobileMenu.classList.toggle('hidden');
            mobileBtn.setAttribute('aria-expanded', String(!isHidden));
        });
    }

    // 3. Blog Form Drawer Toggle
    const toggleBtn = document.getElementById('toggle-blog-form');
    const formContainer = document.getElementById('blog-form-container');
    const cancelBtn = document.getElementById('cancel-blog-form');
    const blogForm = document.getElementById('new-blog-form');
    const blogGrid = document.getElementById('blog-grid');

    if (toggleBtn && formContainer) {
        toggleBtn.addEventListener('click', () => {
            formContainer.classList.toggle('hidden');
        });
    }

    if (cancelBtn && formContainer) {
        cancelBtn.addEventListener('click', () => {
            formContainer.classList.add('hidden');
            if (blogForm) blogForm.reset();
        });
    }

    // 4. LocalStorage Blog Post Persistence
    const STORAGE_KEY = 'portfolio_blog_posts';

    function getReadMoreUrl(post) {
        const isSubfolder = window.location.pathname.includes('/blog/');
        const basePostPage = isSubfolder ? '../blog-post.html' : 'blog-post.html';
        const params = new URLSearchParams({
            post: 'custom',
            title: post.title,
            category: post.category
        });
        const fallbackUrl = `${basePostPage}?${params.toString()}`;

        if (!post.url || post.url === '#') return fallbackUrl;

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

    function appendPostToGrid(post) {
        if (!blogGrid) return;
        const safeCategory = escapeHtml(post.category);
        const safeTitle = escapeHtml(post.title);
        const safeImage = escapeHtml(post.imageUrl || `https://placehold.co/600x400/18181b/ffffff?text=${encodeURIComponent(post.title)}`);
        const safeUrl = escapeHtml(getReadMoreUrl(post));

        const wrapper = document.createElement('a');
        wrapper.href = safeUrl;
        wrapper.className = 'group block reveal-up is-visible';
        wrapper.innerHTML = `
            <div class="apple-card overflow-hidden h-full flex flex-col">
                <div class="h-48 w-full bg-zinc-800 relative overflow-hidden">
                    <img src="${safeImage}" alt="${safeTitle}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                </div>
                <div class="p-8 flex-grow flex flex-col justify-between">
                    <div>
                        <p class="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 eyebrow-label">${safeCategory}</p>
                        <h3 class="text-xl font-bold text-white mb-4 leading-snug group-hover:text-blue-400 transition-colors">${safeTitle}</h3>
                    </div>
                    <p class="text-[#86868b] text-sm mt-4 font-medium flex items-center">
                        Read article 
                        <svg class="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </p>
                </div>
            </div>
        `;
        blogGrid.appendChild(wrapper);
    }

    function loadStoredPosts() {
        if (!blogGrid) return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;
            JSON.parse(stored).forEach((post) => appendPostToGrid(post));
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

    if (blogForm) {
        blogForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('blog-title').value.trim();
            const category = document.getElementById('blog-category').value.trim();
            const imageUrl = document.getElementById('blog-image').value.trim();
            const url = document.getElementById('blog-url').value.trim();
            if (!title || !category) return;

            const newPost = { title, category, imageUrl, url };
            savePostToStorage(newPost);
            appendPostToGrid(newPost);
            if (formContainer) formContainer.classList.add('hidden');
            blogForm.reset();
        });
    }

    loadStoredPosts();
});
