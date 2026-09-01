// Clock and Date functionality
function updateDateTime() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}:${seconds}`;
}

setInterval(updateDateTime, 1000);
updateDateTime();

// Set Current Year in Footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// Scroll Reveal Animation
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Trigger number counter if it's the stats section
            if (entry.target.classList.contains('stats-section')) {
                startCounters();
            }

            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.scroll-reveal').forEach(section => {
    observer.observe(section);
});

// Number Counter Animation for Stats
let countersStarted = false;

function startCounters() {
    if (countersStarted) return;
    countersStarted = true;

    const counters = document.querySelectorAll('.stat-number');
    const speed = 150; // lower = faster

    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText.replace(/[^\d]/g, ''); // strip formatting
            const inc = target / speed;

            if (count < target) {
                // Add dot separator for thousands
                counter.innerText = Math.ceil(count + inc).toLocaleString('id-ID');
                setTimeout(updateCount, 15);
            } else {
                counter.innerText = target.toLocaleString('id-ID') + '+';
            }
        };
        updateCount();
    });
}

// Advanced 3D Hover Effect for Cards
document.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Slightly rotate the card based on mouse position
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -3; // max 3deg
        const rotateY = ((x - centerX) / centerX) * 3; // max 3deg

        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)`;
    });
});

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
