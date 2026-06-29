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
// 4. TEXTURE LOADING (Photorealism)
// ==========================================
const textureLoader = new THREE.TextureLoader();

// Reliable CDN URLs for photorealistic maps
const textures = {
    earthColor: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
    earthBump: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
    earthWater: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png'),
    earthClouds: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png'),
    nightSky: textureLoader.load('https://unpkg.com/three-globe/example/img/night-sky.png')
};

// Set photorealistic background
scene.background = textures.nightSky;

// ==========================================
// 5. THE LIVING SUN (GLSL Shaders)
// ==========================================
const sunVertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;
    
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
        float intensity = length(vPosition) - 1.8; 
        vec3 colorDark = vec3(0.9, 0.2, 0.0); 
        vec3 colorLight = vec3(1.0, 0.8, 0.2); 
        vec3 finalColor = mix(colorDark, colorLight, intensity * 5.0);
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;


// ==========================================
// 6. 3D Solar System Construction
// ==========================================
const solarSystem = new THREE.Group();
scene.add(solarSystem);

const ambientLight = new THREE.AmbientLight(0x111122, 0.8); 
scene.add(ambientLight);

// The Sun PointLight (Casts Shadows)
const sunLight = new THREE.PointLight(0xffeedd, 50, 300);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.bias = -0.001;
solarSystem.add(sunLight);

// The Sun
const sunUniforms = { time: { value: 0.0 } };
const sunGeometry = new THREE.SphereGeometry(1.8, 128, 128); 
const sunMaterial = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    vertexShader: sunVertexShader,
    fragmentShader: sunFragmentShader,
    wireframe: false
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystem.add(sunMesh);

// Function to create orbit rings
function createOrbit(distance) {
    const ringGeometry = new THREE.RingGeometry(distance - 0.01, distance + 0.01, 128);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.03
    });
    const orbitRing = new THREE.Mesh(ringGeometry, ringMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.receiveShadow = true;
    return orbitRing;
}

const planets = [];

// A. Photorealistic Earth
const earthGroup = new THREE.Group();
solarSystem.add(earthGroup);
earthGroup.add(createOrbit(5.0));

// Earth Surface
const earthGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const earthMaterial = new THREE.MeshStandardMaterial({
    map: textures.earthColor,
    bumpMap: textures.earthBump,
    bumpScale: 0.02,
    roughnessMap: textures.earthWater, // Water is shiny (low roughness where white)
    roughness: 1, 
    metalness: 0.1
});
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.position.x = 5.0;
earthMesh.castShadow = true;
earthMesh.receiveShadow = true;
earthMesh.rotation.x = 0.4; // Axial tilt
earthGroup.add(earthMesh);

// Earth Clouds (Multi-layer rendering)
const cloudGeometry = new THREE.SphereGeometry(0.51, 64, 64); // Slightly larger
const cloudMaterial = new THREE.MeshStandardMaterial({
    map: textures.earthClouds,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
cloudMesh.position.x = 5.0;
cloudMesh.rotation.x = 0.4;
earthGroup.add(cloudMesh);

planets.push({ mesh: earthMesh, group: earthGroup, speed: 0.012, hasClouds: true, cloudMesh: cloudMesh });

// B. Procedural Rocky Planet (Mars-like)
const marsGroup = new THREE.Group();
solarSystem.add(marsGroup);
marsGroup.add(createOrbit(3.0));

const marsGeometry = new THREE.SphereGeometry(0.3, 64, 64);
const marsMaterial = new THREE.MeshStandardMaterial({
    color: 0xc1440e, roughness: 0.9, bumpScale: 0.05
});
const marsMesh = new THREE.Mesh(marsGeometry, marsMaterial);
marsMesh.position.x = 3.0;
marsMesh.castShadow = true;
marsMesh.receiveShadow = true;
marsGroup.add(marsMesh);
planets.push({ mesh: marsMesh, group: marsGroup, speed: 0.018 });

// C. Procedural Gas Giant
const gasGroup = new THREE.Group();
solarSystem.add(gasGroup);
gasGroup.add(createOrbit(8.0));

const gasGeometry = new THREE.SphereGeometry(0.9, 64, 64);
const gasMaterial = new THREE.MeshStandardMaterial({
    color: 0xe3cca5, roughness: 0.4
});
const gasMesh = new THREE.Mesh(gasGeometry, gasMaterial);
gasMesh.position.x = 8.0;
gasMesh.castShadow = true;
gasMesh.receiveShadow = true;
gasGroup.add(gasMesh);
planets.push({ mesh: gasMesh, group: gasGroup, speed: 0.007 });

solarSystem.rotation.x = 0.2; // Tilt entire system

// ==========================================
// 7. Animation Loop
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

    sunUniforms.time.value = elapsedTime;

    planets.forEach(p => {
        p.group.rotation.y += p.speed; 
        p.mesh.rotation.y += 0.01; 
        
        // Rotate clouds slightly faster/independently if they exist
        if (p.hasClouds) {
            p.cloudMesh.rotation.y += 0.012; 
        }
    });

    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 + 2 - camera.position.y) * 0.05; 
    camera.lookAt(scene.position);

    composer.render();
    requestAnimationFrame(animate);
}
animate();

// ==========================================
// 8. GSAP ScrollTrigger Integration
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
    x: -3, scrollTrigger: { trigger: "#skills", start: "top center", end: "bottom center", scrub: 1 }
});
gsap.to(solarSystem.position, {
    x: 2, scrollTrigger: { trigger: "#experience", start: "top center", end: "bottom center", scrub: 1 }
});
gsap.to(solarSystem.position, {
    x: -2, scrollTrigger: { trigger: "#projects", start: "top center", end: "bottom center", scrub: 1 }
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

// Anchor scroll
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
