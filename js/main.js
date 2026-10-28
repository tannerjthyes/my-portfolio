/**
 * Apple Fluid Interface Spring Engine
 * Parameterized by Damping Ratio (overshoot control) & Response (speed in seconds).
 * Always animates from the live presentation value and preserves velocity on interruption.
 */
class FluidSpring {
    constructor(initialValue = 0, { damping = 1.0, response = 0.38, precision = 0.001 } = {}) {
        this.value = initialValue;
        this.target = initialValue;
        this.velocity = 0;
        this.damping = damping;
        this.response = response;
        this.precision = precision;
        this.rafId = null;
        this.lastTime = null;
        this.onUpdate = null;
        this.onComplete = null;
    }

    setConfig({ damping, response }) {
        if (damping !== undefined) this.damping = damping;
        if (response !== undefined) this.response = response;
    }

    // Set immediate presentation value (1:1 direct manipulation)
    set(value, velocity = 0) {
        this.cancel();
        this.value = value;
        this.target = value;
        this.velocity = velocity;
        if (this.onUpdate) this.onUpdate(this.value);
    }

    // Re-target mid-flight while inheriting current velocity
    to(target, { velocity = null, damping, response, onUpdate, onComplete } = {}) {
        if (onUpdate) this.onUpdate = onUpdate;
        if (onComplete !== undefined) this.onComplete = onComplete;
        if (damping !== undefined) this.damping = damping;
        if (response !== undefined) this.response = response;
        if (velocity !== null) this.velocity = velocity;

        this.target = target;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.set(target, 0);
            if (this.onComplete) this.onComplete();
            return;
        }

        if (!this.rafId) {
            this.lastTime = performance.now();
            this.rafId = requestAnimationFrame((t) => this.step(t));
        }
    }

    step(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.064); // Cap delta for background tabs
        this.lastTime = now;

        // Convert Apple (dampingRatio, response) -> physical stiffness & damping
        const omega = (2 * Math.PI) / this.response;
        const stiffness = omega * omega;
        const dampingCoeff = 2 * this.damping * omega;

        const displacement = this.value - this.target;
        const springForce = -stiffness * displacement;
        const dampingForce = -dampingCoeff * this.velocity;
        const acceleration = springForce + dampingForce;

        this.velocity += acceleration * dt;
        this.value += this.velocity * dt;

        if (this.onUpdate) this.onUpdate(this.value);

        const isSettled =
            Math.abs(this.velocity) < this.precision &&
            Math.abs(this.target - this.value) < this.precision;

        if (isSettled) {
            this.value = this.target;
            this.velocity = 0;
            this.rafId = null;
            if (this.onUpdate) this.onUpdate(this.value);
            if (this.onComplete) this.onComplete();
        } else {
            this.rafId = requestAnimationFrame((t) => this.step(t));
        }
    }

    cancel() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
}

// Apple's rubber-banding equation for soft boundaries
function rubberband(overshoot, dimension, constant = 0.55) {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Apple's exponential decay momentum projection
function projectMomentum(initialVelocity, decelerationRate = 0.996) {
    return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ==========================================================================
       1. Critically Damped Scroll Reveal (damping: 1.0, response: 0.45)
       ========================================================================== */
    const revealElements = document.querySelectorAll('.reveal-up');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            obs.unobserve(el);

            if (prefersReducedMotion) {
                el.style.opacity = '1';
                el.style.transform = 'none';
                return;
            }

            // Parse optional stagger delay from classes (delay-100, delay-200, delay-300)
            let delayMs = 0;
            if (el.classList.contains('delay-100')) delayMs = 80;
            if (el.classList.contains('delay-200')) delayMs = 160;
            if (el.classList.contains('delay-300')) delayMs = 240;

            setTimeout(() => {
                const ySpring = new FluidSpring(44, { damping: 1.0, response: 0.52 });
                const opacitySpring = new FluidSpring(0, { damping: 1.0, response: 0.42 });

                ySpring.to(0, {
                    onUpdate: (y) => {
                        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
                    }
                });
                opacitySpring.to(1, {
                    onUpdate: (o) => {
                        el.style.opacity = Math.min(1, Math.max(0, o)).toFixed(3);
                    }
                });
            }, delayMs);
        });
    }, { threshold: 0.12 });

    revealElements.forEach((el) => observer.observe(el));

    /* ==========================================================================
       2. Interruptible Card Physics (Independent Scale, X & Y Springs)
       ========================================================================== */
    function attachCardPhysics(card) {
        if (card.dataset.springAttached) return;
        card.dataset.springAttached = 'true';

        const scaleSpring = new FluidSpring(1, { damping: 1.0, response: 0.35 });
        const xSpring = new FluidSpring(0, { damping: 1.0, response: 0.4 });
        const ySpring = new FluidSpring(0, { damping: 1.0, response: 0.4 });

        const render = () => {
            card.style.transform = `translate3d(${xSpring.value.toFixed(2)}px, ${ySpring.value.toFixed(2)}px, 0) scale(${scaleSpring.value.toFixed(4)})`;
        };

        scaleSpring.onUpdate = render;
        xSpring.onUpdate = render;
        ySpring.onUpdate = render;

        card.addEventListener('pointerenter', () => {
            scaleSpring.to(1.018, { damping: 1.0, response: 0.35 });
        });

        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
            const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
            // Subtle 1:1 magnetic tracking toward pointer
            xSpring.to(relX * 3.5, { damping: 1.0, response: 0.32 });
            ySpring.to(relY * 3.5, { damping: 1.0, response: 0.32 });
        });

        // Instant response on pointer-down (kill latency)
        card.addEventListener('pointerdown', (e) => {
            if (e.target.closest('input, textarea, button, select')) return;
            scaleSpring.to(0.982, { damping: 1.0, response: 0.18 });
        });

        card.addEventListener('pointerup', () => {
            scaleSpring.to(1.018, { damping: 0.82, response: 0.34 });
        });

        card.addEventListener('pointerleave', () => {
            scaleSpring.to(1, { damping: 1.0, response: 0.38 });
            xSpring.to(0, { damping: 1.0, response: 0.42 });
            ySpring.to(0, { damping: 1.0, response: 0.42 });
        });
    }

    document.querySelectorAll('.apple-card').forEach(attachCardPhysics);

    /* ==========================================================================
       3. Spatial Sheet Materialization & 1:1 Rubber-Band Drag-to-Dismiss
       ========================================================================== */
    function createInteractiveSheet(container, triggerBtn, onDismissCallback) {
        if (!container || !triggerBtn) return null;

        let isOpen = !container.classList.contains('hidden');
        const progressSpring = new FluidSpring(isOpen ? 1 : 0, { damping: 0.86, response: 0.34 });
        const dragYSpring = new FluidSpring(0, { damping: 0.82, response: 0.32 });

        const updateVisuals = () => {
            const p = progressSpring.value;
            const dragY = dragYSpring.value;
            const scale = 0.94 + 0.06 * p;
            const yOffset = (1 - p) * -18 + dragY;
            const blurPx = Math.max(0, (1 - p) * 10);

            container.style.opacity = Math.max(0, Math.min(1, p)).toFixed(3);
            container.style.transform = `translate3d(0, ${yOffset.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
            container.style.filter = blurPx > 0.2 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
        };

        progressSpring.onUpdate = updateVisuals;
        dragYSpring.onUpdate = updateVisuals;

        const open = (initialVelocity = 0) => {
            isOpen = true;
            container.classList.remove('hidden');
            triggerBtn.setAttribute('aria-expanded', 'true');
            dragYSpring.to(0, { velocity: initialVelocity, damping: 0.85, response: 0.32 });
            progressSpring.to(1, {
                damping: 0.86,
                response: 0.34,
                onComplete: () => {
                    const firstInput = container.querySelector('input');
                    if (firstInput) firstInput.focus();
                }
            });
        };

        const close = (initialVelocity = 0) => {
            isOpen = false;
            triggerBtn.setAttribute('aria-expanded', 'false');
            dragYSpring.to(0, { velocity: initialVelocity, damping: 1.0, response: 0.28 });
            progressSpring.to(0, {
                damping: 1.0,
                response: 0.28,
                onComplete: () => {
                    if (!isOpen) {
                        container.classList.add('hidden');
                        if (onDismissCallback) onDismissCallback();
                    }
                }
            });
        };

        const toggle = () => (isOpen ? close() : open());

        // 1:1 Direct Manipulation with Pointer Capture & Velocity History
        let isDragging = false;
        let startY = 0;
        let history = [];

        container.addEventListener('pointerdown', (e) => {
            if (e.target.closest('input, textarea, button, a, select')) return;
            isDragging = true;
            startY = e.clientY - dragYSpring.value;
            history = [{ y: e.clientY, t: performance.now() }];
            container.setPointerCapture(e.pointerId);
        });

        container.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const rawDelta = e.clientY - startY;
            const height = container.offsetHeight || 300;
            // Rubber-band resistance in both directions
            const dampedDelta = rubberband(rawDelta, height, 0.45);
            dragYSpring.set(dampedDelta);

            const now = performance.now();
            history.push({ y: e.clientY, t: now });
            history = history.filter((pt) => now - pt.t < 100);
        });

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            if (container.hasPointerCapture(e.pointerId)) {
                container.releasePointerCapture(e.pointerId);
            }

            // Compute release velocity (px/s) for seamless handoff
            let velocity = 0;
            if (history.length >= 2) {
                const first = history[0];
                const last = history[history.length - 1];
                const dt = (last.t - first.t) / 1000;
                if (dt > 0.005) velocity = (last.y - first.y) / dt;
            }

            const projectedY = dragYSpring.value + projectMomentum(velocity, 0.994);
            if (projectedY < -75 || velocity < -450) {
                close(velocity);
            } else {
                dragYSpring.to(0, { velocity, damping: 0.8, response: 0.35 });
            }
        };

        container.addEventListener('pointerup', endDrag);
        container.addEventListener('pointercancel', endDrag);

        return { open, close, toggle };
    }

    /* ==========================================================================
       4. Wire Up Blog Form Drawer & Mobile Navigation Sheet
       ========================================================================== */
    const toggleBtn = document.getElementById('toggle-blog-form');
    const formContainer = document.getElementById('blog-form-container');
    const cancelBtn = document.getElementById('cancel-blog-form');
    const blogForm = document.getElementById('new-blog-form');
    const blogGrid = document.getElementById('blog-grid');

    if (formContainer) formContainer.classList.add('sheet-origin-top');

    const blogSheet = createInteractiveSheet(formContainer, toggleBtn, () => {
        if (blogForm) blogForm.reset();
    });

    if (toggleBtn && blogSheet) {
        toggleBtn.addEventListener('click', () => blogSheet.toggle());
    }
    if (cancelBtn && blogSheet) {
        cancelBtn.addEventListener('click', () => blogSheet.close());
    }

    // Mobile Menu Sheet
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.add('sheet-origin-top');
    const mobileSheet = createInteractiveSheet(mobileMenu, mobileBtn);

    if (mobileBtn && mobileSheet) {
        mobileBtn.addEventListener('click', () => mobileSheet.toggle());
    }

    /* ==========================================================================
       5. LocalStorage Blog Post Management with Spring Entry
       ========================================================================== */
    const STORAGE_KEY = 'portfolio_blog_posts';

    function loadStoredPosts() {
        if (!blogGrid) return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;
            const posts = JSON.parse(stored);
            posts.forEach((post) => appendPostToGrid(post, false));
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

    function appendPostToGrid(post, animate = true) {
        if (!blogGrid) return;
        const safeCategory = escapeHtml(post.category);
        const safeTitle = escapeHtml(post.title);
        const safeImage = escapeHtml(post.imageUrl || `https://placehold.co/600x400/18181b/ffffff?text=${encodeURIComponent(post.title)}`);
        const safeUrl = escapeHtml(getReadMoreUrl(post));

        const wrapper = document.createElement('a');
        wrapper.href = safeUrl;
        wrapper.className = 'group block';
        wrapper.innerHTML = `
            <div class="apple-card overflow-hidden h-full flex flex-col">
                <div class="h-48 w-full bg-zinc-800 relative overflow-hidden">
                    <img src="${safeImage}" alt="${safeTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
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
        const cardEl = wrapper.querySelector('.apple-card');
        if (cardEl) attachCardPhysics(cardEl);

        if (animate && !prefersReducedMotion) {
            const entrySpring = new FluidSpring(0, { damping: 0.82, response: 0.4 });
            entrySpring.to(1, {
                onUpdate: (p) => {
                    wrapper.style.opacity = Math.min(1, p).toFixed(3);
                    wrapper.style.transform = `translate3d(0, ${((1 - p) * 28).toFixed(1)}px, 0) scale(${(0.92 + 0.08 * p).toFixed(3)})`;
                }
            });
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
            appendPostToGrid(newPost, true);
            if (blogSheet) blogSheet.close();
        });
    }

    loadStoredPosts();
});
