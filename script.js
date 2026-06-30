import * as THREE from 'three';
// Imports cleaned up, removed EffectComposer to guarantee rendering on all devices

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
camera.position.z = 15;
camera.position.y = 2; 
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
// Removed Post-Processing (Bloom) to ensure 100% compatibility and prevent black screen issues
// The glowing effect will be handled entirely by AdditiveBlending materials in the scene.

// ==========================================
// 4. Build the Cinematic Black Hole
// ==========================================
const blackHoleGroup = new THREE.Group();
scene.add(blackHoleGroup);

// 4a. Starfield (Deep Space Background)
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
// Push stars deep into the background behind the black hole
starMesh.position.z = -100;
scene.add(starMesh);


// 4b. Event Horizon (The perfectly black sphere)
const eventHorizonGeo = new THREE.SphereGeometry(3.0, 128, 128);
const eventHorizonMat = new THREE.MeshBasicMaterial({
    color: 0x000000 // Pure black absorbs all light
});
const eventHorizon = new THREE.Mesh(eventHorizonGeo, eventHorizonMat);
blackHoleGroup.add(eventHorizon);


// 4c. Accretion Disk (Particle System for robust, cinematic fire)
// We will use tens of thousands of glowing particles to form the swirling gas
const diskParticleCount = 40000;
const diskGeo = new THREE.BufferGeometry();
const diskPos = new Float32Array(diskParticleCount * 3);
const diskColors = new Float32Array(diskParticleCount * 3);

const innerColor = new THREE.Color(0xffffff); // White hot core
const midColor = new THREE.Color(0xff6600);   // Vibrant fiery orange
const outerColor = new THREE.Color(0xaa0000); // Deep red

for (let i = 0; i < diskParticleCount; i++) {
    // Random angle and distance (concentrated near the center, fading out)
    const angle = Math.random() * Math.PI * 2;
    const distance = 3.5 + Math.pow(Math.random(), 1.5) * 5.5; // Radius 3.5 to 9.0
    
    // Calculate position with slight vertical thickness based on distance
    const thickness = (Math.random() - 0.5) * (0.2 + (distance - 3.5) * 0.1);
    
    diskPos[i * 3] = Math.cos(angle) * distance;
    diskPos[i * 3 + 1] = thickness;
    diskPos[i * 3 + 2] = Math.sin(angle) * distance;
    
    // Calculate color based on distance
    const normalizedDist = (distance - 3.5) / 5.5;
    const pColor = new THREE.Color();
    if (normalizedDist < 0.4) {
        pColor.lerpColors(innerColor, midColor, normalizedDist / 0.4);
    } else {
        pColor.lerpColors(midColor, outerColor, (normalizedDist - 0.4) / 0.6);
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
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const accretionDisk = new THREE.Points(diskGeo, diskMat);
// Tilt the disk for a cinematic angle
accretionDisk.rotation.x = 0.2;
blackHoleGroup.add(accretionDisk);


// 4d. Photon Ring (Volumetric Glow around the Event Horizon)
// This simulates the light bending completely around the sphere
const photonRingGeo = new THREE.SphereGeometry(3.2, 64, 64);
const photonRingMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide // Render inside out to create a halo
});
const photonRing = new THREE.Mesh(photonRingGeo, photonRingMat);
blackHoleGroup.add(photonRing);

// 4e. Gravitational Lensing Halo (Extra atmospheric glow)
const haloGeo = new THREE.SphereGeometry(3.6, 64, 64);
const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffaa55,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
});
const halo = new THREE.Mesh(haloGeo, haloMat);
blackHoleGroup.add(halo);

// Initial position
blackHoleGroup.position.set(2, 0, -5);


// ==========================================
// 5. Animation Loop
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
    
    // Subtle wobbling rotation of the entire black hole system
    blackHoleGroup.rotation.y = Math.sin(elapsedTime * 0.1) * 0.1;
    blackHoleGroup.rotation.z = Math.cos(elapsedTime * 0.15) * 0.05;

    accretionDisk.rotation.y = elapsedTime * 0.2;

    // Slowly rotate the starfield
    starMesh.rotation.y += 0.0005;

    // Mouse parallax effect (Camera sways based on mouse movement)
    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 + 2 - camera.position.y) * 0.05; 
    camera.lookAt(0, 0, -5); // Always look at the black hole

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// ==========================================
// 6. GSAP ScrollTrigger Integration
// ==========================================
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

// As the user scrolls, the black hole subtly shifts scale and position for a deep parallax effect
const tl = gsap.timeline({
    scrollTrigger: { 
        trigger: "#scroll-container", 
        start: "top top", 
        end: "bottom bottom", 
        scrub: 1.5 
    }
});

tl.to(blackHoleGroup.position, { y: 3, z: -10, ease: "power1.inOut" }, 0);
tl.to(accretionDisk.rotation, { x: Math.PI / 1.8, ease: "none" }, 0); // Disk tilts up slightly as you scroll

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
