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
});
