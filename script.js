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
    smoothTouch: false,
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
scene.fog = new THREE.FogExp2(0x030a08, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 8;
camera.position.y = 0;

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 3. Post-Processing (Bloom for that neon glow effect)
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, // strength
    0.4, // radius
    0.85 // threshold
);
// Adjust bloom for intense tech look
bloomPass.threshold = 0;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// 4. 3D Automation & Objects (The "Core" Journey)
const objectsGroup = new THREE.Group();
scene.add(objectsGroup);

// The Core Object (Icosahedron)
const coreGeometry = new THREE.IcosahedronGeometry(1.5, 0);
const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x64ffda,
    wireframe: true,
    transparent: true,
    opacity: 0.8
});
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
objectsGroup.add(coreMesh);

// Outer Cage (Torus Knot)
const cageGeometry = new THREE.TorusKnotGeometry(2.2, 0.1, 100, 16);
const cageMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0f3325, 
    wireframe: true,
    transparent: true,
    opacity: 0.3
});
const cageMesh = new THREE.Mesh(cageGeometry, cageMaterial);
objectsGroup.add(cageMesh);

// Particle Data Dust
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000;
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 40; 
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.02,
    color: '#64ffda',
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// 5. Mouse Interactivity (Parallax)
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// 6. Animation Loop
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Idle core pulsating animations
    coreMesh.rotation.x = elapsedTime * 0.2;
    coreMesh.rotation.y = elapsedTime * 0.3;
    
    cageMesh.rotation.x = -elapsedTime * 0.1;
    cageMesh.rotation.z = -elapsedTime * 0.15;

    particlesMesh.rotation.y = elapsedTime * 0.03;

    // Mouse Parallax effect
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    objectsGroup.rotation.y += 0.05 * (targetX - objectsGroup.rotation.y);
    objectsGroup.rotation.x += 0.05 * (targetY - objectsGroup.rotation.x);
    
    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    // Use composer instead of renderer for Bloom
    composer.render();
    requestAnimationFrame(animate);
}
animate();

// 7. GSAP ScrollTrigger - The Core's Journey
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

// Global Scene scroll journey
const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5
    }
});

// Animate the camera moving deeper into the scene over the whole scroll
tl.to(camera.position, {
    z: 2,
    ease: "none"
}, 0);

// Rotate the entire group aggressively on scroll
tl.to(objectsGroup.rotation, {
    z: Math.PI * 4,
    ease: "none"
}, 0);

// Morph the core when reaching Skills
gsap.to(coreMesh.scale, {
    x: 2, y: 2, z: 2,
    scrollTrigger: {
        trigger: "#skills",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
});
gsap.to(coreMaterial.color, {
    r: 0.1, g: 0.8, b: 0.9, // Shifts color slightly
    scrollTrigger: {
        trigger: "#skills",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
});

// Push the core left for Experience section
gsap.to(objectsGroup.position, {
    x: -3,
    scrollTrigger: {
        trigger: "#experience",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
});

// Pull core right and morph cage for Education section
gsap.to(objectsGroup.position, {
    x: 3,
    scrollTrigger: {
        trigger: "#education",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
});
gsap.to(cageMesh.scale, {
    x: 1.5, y: 1.5, z: 1.5,
    scrollTrigger: {
        trigger: "#education",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
});

// Explode view for Projects
gsap.to(coreMesh.scale, {
    x: 3, y: 3, z: 3,
    scrollTrigger: {
        trigger: "#projects",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
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

// 9. Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(window.innerWidth, window.innerHeight);
});
