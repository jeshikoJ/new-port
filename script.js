// ==========================================
// 1. Initialize Lenis for smooth scrolling
// ==========================================
const lenis = new Lenis({
    duration: 1.5, 
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false, 
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ==========================================
// 2. GSAP ScrollTrigger Integration
// ==========================================
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

// Animate content blocks fading in and sliding up
const contentBlocks = document.querySelectorAll('.content-block');
contentBlocks.forEach((block) => {
    gsap.to(block, {
        y: 0, 
        opacity: 1, 
        duration: 1.2, 
        ease: "power3.out",
        scrollTrigger: { 
            trigger: block, 
            start: "top 85%", 
            toggleActions: "play none none reverse" 
        }
    });
});

// Smooth Anchor Linking
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        lenis.scrollTo(this.getAttribute('href'), {
            offset: 0, 
            duration: 1.5, 
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
    });
});

// ==========================================
// 3. 2D Interactive Black Hole Background
// ==========================================
const canvas = document.getElementById('bhCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

// Black Hole Parameters
const bh = {
    x: width / 2,
    y: height / 2,
    radius: 80 // Event horizon radius
};

// Generate Background Stars
const stars = [];
const starCount = 300;
for (let i = 0; i < starCount; i++) {
    stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        color: `hsl(${Math.random() * 60 + 200}, 100%, 80%)`
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    bh.x = width / 2;
    bh.y = height / 2;
});

// Track mouse position
let mouse = { x: width / 2, y: height / 2 };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Animation Loop
function animateBH() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Smooth black hole movement to follow mouse
    bh.x += (mouse.x - bh.x) * 0.05;
    bh.y += (mouse.y - bh.y) * 0.05;

    // Draw Stars with Lensing effect
    stars.forEach(star => {
        const dx = star.x - bh.x;
        const dy = star.y - bh.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Gravitational lensing calculation
        // The closer the star to the black hole, the more its light bends
        let newX = star.x;
        let newY = star.y;
        let size = star.size;

        if (distance < 400 && distance > 0) {
            const pullStrength = (bh.radius * bh.radius) / distance;
            newX -= (dx / distance) * pullStrength;
            newY -= (dy / distance) * pullStrength;
            size = Math.max(0.5, star.size * (distance / 400)); // Magnification / Dimming
        }

        // Draw Star
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(newX, newY, size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Event Horizon (Dark Core)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
    ctx.fill();

    // Event Horizon Glow (Accretion Disk approximation)
    const gradient = ctx.createRadialGradient(bh.x, bh.y, bh.radius, bh.x, bh.y, bh.radius * 1.5);
    gradient.addColorStop(0, 'rgba(255, 120, 0, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, bh.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(animateBH);
}

animateBH();
