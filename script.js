// 1. Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    duration: 1.5, // slightly slower for smoother feel
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

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 8;
camera.position.y = 0;

// Renderer setup
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 3. 3D Automation & Objects
const objectsGroup = new THREE.Group();
scene.add(objectsGroup);

// Object 1: Wireframe Torus Knot (Represents complex logic/DevOps pipelines)
const torusGeometry = new THREE.TorusKnotGeometry(2, 0.5, 128, 16);
const wireframeMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x64ffda, 
    wireframe: true,
    transparent: true,
    opacity: 0.15
});
const torusKnot = new THREE.Mesh(torusGeometry, wireframeMaterial);
torusKnot.position.set(3, 0, -2);
objectsGroup.add(torusKnot);

// Object 2: Icosahedron (Represents data/cloud nodes)
const icoGeometry = new THREE.IcosahedronGeometry(1.5, 1);
const solidMaterial = new THREE.MeshBasicMaterial({
    color: 0x0f3325,
    wireframe: true,
    transparent: true,
    opacity: 0.3
});
const icosahedron = new THREE.Mesh(icoGeometry, solidMaterial);
icosahedron.position.set(-4, -5, -4);
objectsGroup.add(icosahedron);

// Object 3: Floating Particle System (Data dust)
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 3000;
const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 30; // Spread wide
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.015,
    color: '#64ffda',
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// 4. Mouse Interactivity (Raycasting / Parallax)
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

// 5. Animation Loop
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Subtle idle animations for objects
    torusKnot.rotation.x += 0.002;
    torusKnot.rotation.y += 0.003;
    
    icosahedron.rotation.x -= 0.002;
    icosahedron.rotation.z += 0.002;

    particlesMesh.rotation.y = elapsedTime * 0.02;

    // Mouse Parallax effect
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    objectsGroup.rotation.y += 0.05 * (targetX - objectsGroup.rotation.y);
    objectsGroup.rotation.x += 0.05 * (targetY - objectsGroup.rotation.x);
    
    // Slight camera sway based on mouse
    camera.position.x += (mouseX * 0.001 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.001 - camera.position.y) * 0.05;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// 6. GSAP ScrollTrigger Integration
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

// 7. Scroll Animations for 3D Objects (Automation)

// Scene rotation and zoom on scroll
gsap.to(objectsGroup.rotation, {
    y: Math.PI * 2,
    x: Math.PI / 2,
    ease: "none",
    scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5
    }
});

gsap.to(camera.position, {
    z: 3, // Zoom in as we scroll down
    ease: "power1.inOut",
    scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 2
    }
});

// Animate specific objects based on sections
// When reaching skills, move Torus to the left
gsap.to(torusKnot.position, {
    x: -3,
    y: 2,
    z: 1,
    scale: 1.5,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#skills",
        start: "top center",
        end: "bottom center",
        scrub: 1
    }
});

// When reaching experience, bring Icosahedron into view
gsap.to(icosahedron.position, {
    x: 3,
    y: 0,
    z: 2,
    scale: 1.2,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#experience",
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
});
