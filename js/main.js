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
});
