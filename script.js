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

// 2. Initialize Three.js Scene with Shadows
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x010206, 0.04); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 2; 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Enable Shadows for intense realism
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// 3. Post-Processing (Bloom)
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.9,  // strength
    0.3,  // radius
    0.15  // threshold
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ==========================================
// 4. PROCEDURAL GRAPHICS GENERATION
// ==========================================

// A. Procedural Noise Texture Generator (Canvas-based)
function generateNoiseTexture(size, scale, seed, isGasGiant = false) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Simple pseudo-random hash function
    const hash = (x, y) => {
        let h = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
        return h - Math.floor(h);
    };

    // Very basic value noise generator
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            let nx = x / scale;
            let ny = y / scale;
            let val = hash(Math.floor(nx), Math.floor(ny));
            
            if (isGasGiant) {
                // Gas giant bands (stretch noise on Y axis)
                val = hash(Math.floor(nx * 0.1), Math.floor(ny * 2.0));
                // Add turbulence
                val += Math.sin(ny * 10) * 0.1; 
            }

            // Normalize and set grayscale color
            const color = Math.floor(Math.abs(val) * 255);
            const index = (x + y * size) * 4;
            data[index] = color;     // r
            data[index + 1] = color; // g
            data[index + 2] = color; // b
            data[index + 3] = 255;   // a
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// B. Sun GLSL Shader (Boiling Magma)
const sunVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
    // Simplex noise function
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) { 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i); 
        vec4 p = permute( permute( permute( 
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vUv = uv;
        
        // Displace vertices to create solar flares
        float noise = snoise(vec3(position.x * 2.0, position.y * 2.0, position.z * 2.0 + time * 0.5));
        vec3 displacedPosition = position + normal * (noise * 0.15);
        
        vPosition = displacedPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
`;

const sunFragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;

    void main() {
        // Create a heat map color based on height/noise
        float intensity = length(vPosition) - 1.8; // Base radius is 1.8
        
        vec3 colorDark = vec3(0.9, 0.2, 0.0); // Deep red magma
        vec3 colorLight = vec3(1.0, 0.8, 0.2); // Bright yellow/white heat
        
        vec3 finalColor = mix(colorDark, colorLight, intensity * 5.0);
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;


// ==========================================
// 5. 3D Solar System Construction
// ==========================================
const solarSystem = new THREE.Group();
scene.add(solarSystem);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0x111122, 0.5); 
scene.add(ambientLight);

// The Sun PointLight (Casts Shadows)
const sunLight = new THREE.PointLight(0xffeedd, 50, 300);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.bias = -0.001;
solarSystem.add(sunLight);

// The Sun (Shader Material for Magma)
const sunUniforms = { time: { value: 0.0 } };
const sunGeometry = new THREE.SphereGeometry(1.8, 128, 128); // Ultra high-res
const sunMaterial = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    wireframe: false
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystem.add(sunMesh);

// Create Planets with Procedural Surface Detail
const planets = [];
function createPlanet(color, distance, size, speed, isGasGiant, roughness) {
    const orbitGroup = new THREE.Group();
    solarSystem.add(orbitGroup);

    // Orbit Ring
    const ringGeometry = new THREE.RingGeometry(distance - 0.01, distance + 0.01, 128);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.03
    });
    const orbitRing = new THREE.Mesh(ringGeometry, ringMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.receiveShadow = true;
    orbitGroup.add(orbitRing);

    // Generate procedural bumps
    const textureSize = 512;
    const noiseScale = isGasGiant ? 5 : 20;
    const bumpMap = generateNoiseTexture(textureSize, noiseScale, Math.random() * 100, isGasGiant);

    // Planet Sphere
    const planetGeometry = new THREE.SphereGeometry(size, 64, 64);
    const planetMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness,
        metalness: 0.1,
        bumpMap: bumpMap,
        bumpScale: 0.05
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.position.x = distance;
    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;
    
    // Tilt the planet randomly for realism
    planetMesh.rotation.x = Math.random() * Math.PI;
    
    orbitGroup.add(planetMesh);

    planets.push({ mesh: planetMesh, group: orbitGroup, speed: speed });
}

// Earth-like Rocky World
createPlanet(0x1166aa, 4.0, 0.4, 0.015, false, 0.8);
// Mars-like Cratered World
createPlanet(0xc1440e, 6.5, 0.3, 0.009, false, 1.0);
// Jupiter-like Gas Giant
createPlanet(0xe3cca5, 10, 0.8, 0.005, true, 0.5);

// Starfield Background
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 3000; // More stars
const posArray = new Float32Array(particlesCount * 3);
for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 80; 
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05, // Slightly larger for distant stars
    color: 0xddddff, // Star color
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

solarSystem.rotation.x = 0.2; // Slight tilt

// ==========================================
// 6. Animation Loop
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

    // Update Sun Shader Time
    sunUniforms.time.value = elapsedTime;

    // Idle rotation of planets
    planets.forEach(p => {
        p.group.rotation.y += p.speed; 
        p.mesh.rotation.y += 0.01; // Day/night cycle spin
    });

    particlesMesh.rotation.y = elapsedTime * 0.005; // Slow galaxy spin

    // Mouse Parallax effect
    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 + 2 - camera.position.y) * 0.05; 
    camera.lookAt(scene.position);

    composer.render();
    requestAnimationFrame(animate);
}
animate();

// ==========================================
// 7. GSAP ScrollTrigger Integration
// ==========================================
gsap.registerPlugin(ScrollTrigger);
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0, 0);

const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5 
    }
});

tl.to(solarSystem.rotation, { y: Math.PI * 2, x: 0.6, ease: "none" }, 0);
tl.to(camera.position, { z: 4, y: 0, ease: "power1.inOut" }, 0);

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

const contentBlocks = document.querySelectorAll('.content-block');
contentBlocks.forEach((block) => {
    gsap.to(block, {
        y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
        scrollTrigger: { trigger: block, start: "top 85%", toggleActions: "play none none reverse" }
    });
});

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
            offset: 0, duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
    });
});
