import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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
// 3. Post-Processing (Cinematic Bloom for Black Hole Glow)
// ==========================================
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // strength (intense glow)
    0.6,  // radius (wide spread)
    0.3   // threshold (only bright things glow)
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

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


// 4c. Accretion Disk (Swirling Fire Shader)
// We use a Ring Geometry placed around the sphere
const diskGeo = new THREE.RingGeometry(3.5, 9.0, 128, 64);
diskGeo.rotateX(-Math.PI / 2); // Lay it flat

// GLSL Shader for the swirling, fiery accretion disk
const diskVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const diskFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;

    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    void main() {
        // Calculate distance from center of the ring
        float dist = length(vPosition.xz);
        
        // Normalize distance (3.5 to 9.0) -> (0.0 to 1.0)
        float normalizedDist = (dist - 3.5) / (9.0 - 3.5);
        
        // Swirling angle based on position and time
        float angle = atan(vPosition.z, vPosition.x);
        
        // High speed rotation near the center, slower at the edges (Keplerian dynamics)
        float speed = 2.0 / (normalizedDist + 0.1);
        float swirledAngle = angle - time * speed;
        
        // Create fiery noise bands
        float noise = snoise(vec2(swirledAngle * 4.0, normalizedDist * 10.0 - time));
        float noise2 = snoise(vec2(swirledAngle * 8.0 + time, normalizedDist * 20.0));
        
        float fireIntensity = (noise * 0.5 + 0.5) * (noise2 * 0.5 + 0.5);
        
        // Smoothly fade out at the inner and outer edges
        float alpha = smoothstep(0.0, 0.1, normalizedDist) * smoothstep(1.0, 0.5, normalizedDist);
        
        // Colors: Intense white/blue at the inner edge, fading to deep orange/red at the outer edge
        vec3 innerColor = vec3(1.0, 0.9, 0.7); // Superheated white-hot core
        vec3 midColor = vec3(1.0, 0.4, 0.0);   // Vibrant fiery orange
        vec3 outerColor = vec3(0.5, 0.0, 0.1); // Deep red fading out
        
        vec3 color = mix(innerColor, midColor, smoothstep(0.0, 0.4, normalizedDist));
        color = mix(color, outerColor, smoothstep(0.4, 1.0, normalizedDist));
        
        // Boost brightness based on fire intensity
        color *= fireIntensity * 3.0;
        
        gl_FragColor = vec4(color, alpha * fireIntensity * 1.5);
    }
`;

const diskUniforms = { time: { value: 0.0 } };
const diskMat = new THREE.ShaderMaterial({
    vertexShader: diskVertexShader,
    fragmentShader: diskFragmentShader,
    uniforms: diskUniforms,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, // Makes the fire glow intensely against the background
    depthWrite: false
});

const accretionDisk = new THREE.Mesh(diskGeo, diskMat);
// Tilt the disk for a cinematic angle
accretionDisk.rotation.x = Math.PI / 2.2;
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
    
    // Update Shader Time for the Swirling Fire
    diskUniforms.time.value = elapsedTime * 0.4;
    
    // Subtle wobbling rotation of the entire black hole system
    blackHoleGroup.rotation.y = Math.sin(elapsedTime * 0.1) * 0.1;
    blackHoleGroup.rotation.z = Math.cos(elapsedTime * 0.15) * 0.05;

    // Slowly rotate the starfield
    starMesh.rotation.y += 0.0005;

    // Mouse parallax effect (Camera sways based on mouse movement)
    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 + 2 - camera.position.y) * 0.05; 
    camera.lookAt(0, 0, -5); // Always look at the black hole

    composer.render();
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
    composer.setSize(window.innerWidth, window.innerHeight);
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
