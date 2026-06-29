import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// 1. Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    duration: 1.5, 
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false, // Let native scrolling handle touch for better mobile responsiveness
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// 2. Initialize Three.js Scene
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02050e, 0.03); // Deep space blue fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 2; // Look slightly down
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 3. Post-Processing (Intense Bloom for Vibrant Cyberpunk Solar System)
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.8,  // strength (intense glow)
    0.6,  // radius
    0.1   // threshold (low threshold makes everything glow easily)
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 4. 3D Solar System Setup
const solarSystem = new THREE.Group();
scene.add(solarSystem);

// The Sun (Neon Orange)
const sunGeometry = new THREE.IcosahedronGeometry(1.8, 2); // More detail for a smoother sphere
const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5500, // Vibrant Neon Orange
    wireframe: true,
    transparent: true,
    opacity: 0.9
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystem.add(sunMesh);

// Function to create planets and their orbits
const planets = [];
function createPlanet(color, distance, size, speed) {
    const orbitGroup = new THREE.Group();
    solarSystem.add(orbitGroup);

    // Orbit Ring
    const ringGeometry = new THREE.RingGeometry(distance - 0.02, distance + 0.02, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.15
    });
    const orbitRing = new THREE.Mesh(ringGeometry, ringMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    orbitGroup.add(orbitRing);

    // Planet Sphere
    const planetGeometry = new THREE.IcosahedronGeometry(size, 1);
    const planetMaterial = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.position.x = distance;
    orbitGroup.add(planetMesh);

    planets.push({ mesh: planetMesh, group: orbitGroup, speed: speed });
}

// Planet 1: Cyan
createPlanet(0x00ffff, 3.5, 0.4, 0.02);
// Planet 2: Magenta
createPlanet(0xff00ff, 5.5, 0.6, 0.012);
// Planet 3: Electric Blue
createPlanet(0x0055ff, 8, 0.5, 0.008);

// Space Dust (Stars)
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1500;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 50; 
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.03,
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Tilt the solar system for a better 3D perspective
solarSystem.rotation.x = 0.3;

// 5. Mouse Interactivity (Parallax)
let mouseX = 0;
let mouseY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// 6. Animation Loop (Idle Rotations)
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Idle rotation of the Sun
    sunMesh.rotation.y = elapsedTime * 0.1;
    sunMesh.rotation.z = elapsedTime * 0.05;

    // Idle rotation of planets (independent of scroll)
    planets.forEach(p => {
        p.group.rotation.y += p.speed; // Orbit
        p.mesh.rotation.y += 0.05;     // Spin
        p.mesh.rotation.x += 0.02;
    });

    particlesMesh.rotation.y = elapsedTime * 0.01;

    // Mouse Parallax effect
    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 + 2 - camera.position.y) * 0.05; // maintain base y=2
    camera.lookAt(scene.position);

    composer.render();
    requestAnimationFrame(animate);
}
animate();

// 7. GSAP ScrollTrigger - Solar System Majestic Journey
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5 // Majestic and smooth
    }
});

// As we scroll down, the entire solar system rotates dramatically
tl.to(solarSystem.rotation, {
    y: Math.PI * 2, // Full rotation
    x: 0.8, // Tilt down slightly
    ease: "none"
}, 0);

// Camera dives into the solar system
tl.to(camera.position, {
    z: 3,
    y: 0,
    ease: "power1.inOut"
}, 0);

// Specific section highlights (shift solar system to the side)
gsap.to(solarSystem.position, {
    x: -3,
    scrollTrigger: { trigger: "#skills", start: "top center", end: "bottom center", scrub: 1 }
});

gsap.to(solarSystem.position, {
    x: 2,
    scrollTrigger: { trigger: "#experience", start: "top center", end: "bottom center", scrub: 1 }
});

gsap.to(solarSystem.position, {
    x: -2,
    scrollTrigger: { trigger: "#projects", start: "top center", end: "bottom center", scrub: 1 }
});

// 8. Scroll Animations for HTML Content Blocks
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

// 9. Handle Window Resize (Responsive)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(window.innerWidth, window.innerHeight);
});

// 10. Make anchor buttons work smoothly with Lenis
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = this.getAttribute('href');
        lenis.scrollTo(target, {
            offset: 0,
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
    });
});
