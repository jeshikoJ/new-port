import * as THREE from 'three';

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
// 2. Initialize Three.js Scene
// ==========================================
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

// Far clipping plane pushed back for the vast starfield
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 18;
camera.position.y = 3; 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ==========================================
// 3. Build the Cinematic 3D Black Hole
// ==========================================
const blackHoleGroup = new THREE.Group();
scene.add(blackHoleGroup);

// 3a. Deep Space Starfield
const starGeo = new THREE.BufferGeometry();
const starCount = 8000;
const starPos = new Float32Array(starCount * 3);
for(let i = 0; i < starCount * 3; i++) {
    // Spread stars very far in the background
    starPos[i] = (Math.random() - 0.5) * 600;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6
});
const starMesh = new THREE.Points(starGeo, starMat);
starMesh.position.z = -100;
scene.add(starMesh);


// 3b. Event Horizon (The perfectly black sphere)
const eventHorizonGeo = new THREE.SphereGeometry(3.0, 64, 64);
const eventHorizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
blackHoleGroup.add(eventHorizon);


// 3c. Accretion Disk (Highly Realistic Dense Particle System)
// Reduced to 25,000 for mobile GPU safety, still looks incredibly dense and cinematic
const diskParticleCount = 25000;
const diskGeo = new THREE.BufferGeometry();
const diskPos = new Float32Array(diskParticleCount * 3);
const diskColors = new Float32Array(diskParticleCount * 3);

const innerColor = new THREE.Color(0xffeebb); // White hot core
const midColor = new THREE.Color(0xff6600);   // Vibrant fiery orange
const outerColor = new THREE.Color(0xaa0000); // Deep red

for (let i = 0; i < diskParticleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    // Concentrate particles near the center using power function
    const distance = 3.5 + Math.pow(Math.random(), 2.0) * 8.5; // Radius 3.5 to 12.0
    
    // Calculate position with slight vertical thickness based on distance
    const thickness = (Math.random() - 0.5) * (0.1 + (distance - 3.5) * 0.05);
    
    diskPos[i * 3] = Math.cos(angle) * distance;
    diskPos[i * 3 + 1] = thickness;
    diskPos[i * 3 + 2] = Math.sin(angle) * distance;
    
    // Color gradient based on distance
    const normalizedDist = (distance - 3.5) / 8.5;
    const pColor = new THREE.Color();
    if (normalizedDist < 0.3) {
        pColor.lerpColors(innerColor, midColor, normalizedDist / 0.3);
    } else {
        pColor.lerpColors(midColor, outerColor, (normalizedDist - 0.3) / 0.7);
    }
    
    diskColors[i * 3] = pColor.r;
    diskColors[i * 3 + 1] = pColor.g;
    diskColors[i * 3 + 2] = pColor.b;
}

diskGeo.setAttribute('position', new THREE.BufferAttribute(diskPos, 3));
diskGeo.setAttribute('color', new THREE.BufferAttribute(diskColors, 3));

const diskMat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending, // Key for glowing effect without Bloom Pass
    depthWrite: false
});

const accretionDisk = new THREE.Points(diskGeo, diskMat);
// Initial cinematic tilt
accretionDisk.rotation.x = Math.PI / 2.2;
blackHoleGroup.add(accretionDisk);


// 3d. Photon Ring & Gravitational Lensing Halos
const photonRingGeo = new THREE.SphereGeometry(3.3, 64, 64);
const photonRingMat = new THREE.MeshBasicMaterial({
    color: 0xff7700,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
});
const photonRing = new THREE.Mesh(photonRingGeo, photonRingMat);
blackHoleGroup.add(photonRing);

const outerHaloGeo = new THREE.SphereGeometry(4.0, 64, 64);
const outerHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffaa55,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
});
const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
blackHoleGroup.add(outerHalo);

// Mobile Responsiveness
const isMobile = window.innerWidth <= 768;

// Initial position (centered and scaled down on mobile)
if (isMobile) {
    blackHoleGroup.position.set(0, 0, -5);
    blackHoleGroup.scale.set(0.6, 0.6, 0.6);
} else {
    blackHoleGroup.position.set(3, 0, -5);
}


// ==========================================
// 4. Animation Loop
// ==========================================
let mouseX = 0, mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();
    
    // Core rotation
    blackHoleGroup.rotation.y = Math.sin(elapsedTime * 0.1) * 0.05;
    
    // Fast accretion disk spin
    accretionDisk.rotation.z -= 0.005;

    // Slowly rotate the starfield
    starMesh.rotation.y += 0.0005;

    // Mouse parallax effect
    camera.position.x += (mouseX * 0.003 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.003 + 3 - camera.position.y) * 0.05; 
    camera.lookAt(0, 0, -5);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// ==========================================
// 5. GSAP ScrollTrigger Integration
// ==========================================
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

// DRAMATIC ROTATION ON SCROLL
const tl = gsap.timeline({
    scrollTrigger: { 
        trigger: "#scroll-container", 
        start: "top top", 
        end: "bottom bottom", 
        scrub: 1.5 
    }
});

// As you scroll down, the camera dives slightly, and the accretion disk tilts aggressively
// Less aggressive vertical movement on mobile so it stays on screen
tl.to(blackHoleGroup.position, { 
    y: isMobile ? 3 : 6, 
    z: -15, 
    ease: "power1.inOut" 
}, 0);
// Tilt the disk almost flat while rotating it around its axis to simulate orbital motion
tl.to(accretionDisk.rotation, { 
    x: Math.PI / 1.5, // Tilts aggressively
    y: Math.PI * 2,   // Full dramatic rotation on scroll
    ease: "power2.inOut" 
}, 0);

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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
