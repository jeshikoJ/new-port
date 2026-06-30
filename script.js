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
// 3. Gargantua Black Hole Background (2D Canvas)
// ==========================================
const canvas = document.getElementById('blackholeCanvas');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

let bhX = width / 2;
let bhY = height / 2;
const eventHorizonRadius = 45; 
const diskRadiusMax = 260;

// Starfield Configuration
const stars = [];
const numStars = 250;

class Star {
    constructor() {
        this.reset();
        // Randomize initial positions thoroughly
        this.x = Math.random() * width;
        this.y = Math.random() * height;
    }

    reset() {
        // Spawn stars outside the horizon
        let angle = Math.random() * Math.PI * 2;
        let distance = Math.max(width, height) * (0.5 + Math.random() * 0.5);
        this.x = bhX + Math.cos(angle) * distance;
        this.y = bhY + Math.sin(angle) * distance;
        this.size = Math.random() * 1.5 + 0.5;
        this.speed = Math.random() * 0.5 + 0.2;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
    }

    update() {
        let dx = bhX - this.x;
        let dy = bhY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < eventHorizonRadius + 5) {
            this.reset();
            return;
        }

        // Gravitational Pull / Gravitational Lensing effect simulation
        let pullForce = (eventHorizonRadius * 12) / (distance * 0.05 + 1);
        
        // Orbital vector (perpendicular to pull)
        let angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * this.speed + Math.sin(angle) * (pullForce * 0.05);
        this.y += Math.sin(angle) * this.speed - Math.cos(angle) * (pullForce * 0.05);

        // Basic directional drift
        this.x -= this.speed * 0.3;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize Starfield
for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
}

// Handle window resizing
window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    bhX = width / 2;
    bhY = height / 2;
});

// Mouse interaction to shift the Black Hole
window.addEventListener('mousemove', (e) => {
    // Smoothly ease towards pointer to look natural
    bhX += (e.clientX - bhX) * 0.05;
    bhY += (e.clientY - bhY) * 0.05;
});

function drawAccretionDisk() {
    ctx.save();
    
    // 1. Einstein Ring / Gravitational Lensing Halo (Backdrop)
    let lensGradient = ctx.createRadialGradient(bhX, bhY, eventHorizonRadius, bhX, bhY, eventHorizonRadius * 2.2);
    lensGradient.addColorStop(0, 'rgba(255, 130, 20, 0.9)');
    lensGradient.addColorStop(0.2, 'rgba(255, 90, 10, 0.4)');
    lensGradient.addColorStop(0.6, 'rgba(230, 50, 0, 0.15)');
    lensGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = lensGradient;
    ctx.beginPath();
    ctx.arc(bhX, bhY, eventHorizonRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Interstellar Horizontal Accretion Disk Cross-Section
    ctx.translate(bhX, bhY);
    ctx.scale(1, 0.18); // Flattens the circles into 3D isometric disks
    ctx.translate(-bhX, -bhY);

    let diskGradient = ctx.createRadialGradient(bhX, bhY, eventHorizonRadius * 1.1, bhX, bhY, diskRadiusMax);
    diskGradient.addColorStop(0, 'rgba(255, 230, 180, 0.95)');
    diskGradient.addColorStop(0.1, 'rgba(255, 150, 30, 0.8)');
    diskGradient.addColorStop(0.4, 'rgba(200, 60, 5, 0.3)');
    diskGradient.addColorStop(0.8, 'rgba(100, 20, 0, 0.05)');
    diskGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = diskGradient;
    ctx.beginPath();
    ctx.arc(bhX, bhY, diskRadiusMax, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 3. The Shadow (Event Horizon Dark Core)
    ctx.fillStyle = '#010103';
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 15; // Creates the intense edge-glow profile
    ctx.beginPath();
    ctx.arc(bhX, bhY, eventHorizonRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow settings for background components
    ctx.shadowBlur = 0; 
}

// Main Animation Loop
function animateBH() {
    // Subtle clear to allow trailing/blur mechanics if desired
    ctx.fillStyle = 'rgba(2, 2, 8, 0.3)'; 
    ctx.fillRect(0, 0, width, height);

    // Draw Background Elements
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Layer the Cinematic Black Hole
    drawAccretionDisk();

    requestAnimationFrame(animateBH);
}

animateBH();
