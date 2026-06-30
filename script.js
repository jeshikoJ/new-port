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
camera.position.z = 12;
camera.position.y = 3; 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
// 4. GUARANTEED REALISM (Procedural Generation & Textures)
// ==========================================

// A procedural noise generator to guarantee rocky realism
function generateBumpMap(size, scale, isGasGiant = false) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    const hash = (x, y) => {
        let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
        return h - Math.floor(h);
    };

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            let nx = x / scale;
            let ny = y / scale;
            let val = hash(Math.floor(nx), Math.floor(ny));
            
            // Add fractal noise loops for highly realistic craters/gas bands
            val += hash(Math.floor(nx * 2), Math.floor(ny * 2)) * 0.5;
            val += hash(Math.floor(nx * 4), Math.floor(ny * 4)) * 0.25;
            
            if (isGasGiant) {
                // Horizontal bands for gas giants
                val = Math.sin(ny * 10 + val * 2) * 0.5 + 0.5;
            } else {
                val = Math.abs(val);
            }
            
            let n = Math.max(0, Math.min(1, val));
            const bVal = Math.floor(n * 255);
            
            const index = (x + y * size) * 4;
            data[index] = bVal; data[index + 1] = bVal; data[index + 2] = bVal; data[index + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const proceduralRockBump = generateBumpMap(512, 10, false);
const proceduralGasBump = generateBumpMap(512, 5, true);

// Generate bulletproof colored procedural textures for every planet!
// (Removed complex color generator to use pure vibrant material colors)

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
        vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
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
        vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m; return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
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
// 6. 3D Solar System Construction (All 8 Planets + ASTEROID BELT)
// ==========================================
const solarSystem = new THREE.Group();
scene.add(solarSystem);

// Generate thousands of stars manually instead of external texture
const starGeo = new THREE.BufferGeometry();
const starCount = 4000;
const starPos = new Float32Array(starCount * 3);
for(let i=0; i < starCount*3; i++) {
    starPos[i] = (Math.random() - 0.5) * 200;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8});
const starMesh = new THREE.Points(starGeo, starMat);
scene.add(starMesh);


const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // BRIGHT ambient light so colors are always visible!
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffeedd, 5000, 1000); // Massive intensity for physically correct lighting
sunLight.decay = 1.0; 
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048; 
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.001;
solarSystem.add(sunLight);

// The Sun
const sunUniforms = { time: { value: 0.0 } };
const sunGeometry = new THREE.SphereGeometry(1.8, 128, 128); 
const sunMaterial = new THREE.ShaderMaterial({
    uniforms: sunUniforms, vertexShader: sunVertexShader, fragmentShader: sunFragmentShader, wireframe: false
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
solarSystem.add(sunMesh);

// Helper function to create orbit rings
function createOrbit(distance) {
    const ringGeometry = new THREE.RingGeometry(distance - 0.015, distance + 0.015, 128);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.1
    });
    const orbitRing = new THREE.Mesh(ringGeometry, ringMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.receiveShadow = true;
    return orbitRing;
}

const planets = [];

// Helper function to create standard planets with guaranteed vibrant colors
function buildPlanet(planetColor, distance, size, speed, hasRings = false, isGasGiant = false) {
    const group = new THREE.Group();
    solarSystem.add(group);
    group.add(createOrbit(distance));

    const geometry = new THREE.SphereGeometry(size, 64, 64);
    
    // Pure color + bump map guarantees vibrant planets
    const material = new THREE.MeshStandardMaterial({
        color: planetColor, 
        bumpMap: isGasGiant ? proceduralGasBump : proceduralRockBump,
        bumpScale: isGasGiant ? 0.02 : 0.08,
        roughnessMap: proceduralRockBump,
        roughness: 0.7,
        metalness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = distance;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.x = Math.random() * Math.PI; 
    group.add(mesh);

    if (hasRings) {
        const saturnRingGeo = new THREE.RingGeometry(size * 1.5, size * 2.2, 64);
        const saturnRingMat = new THREE.MeshStandardMaterial({
            color: 0xcca677, side: THREE.DoubleSide, transparent: true, opacity: 0.8, roughness: 0.6,
            bumpMap: proceduralGasBump, bumpScale: 0.05
        });
        const saturnRing = new THREE.Mesh(saturnRingGeo, saturnRingMat);
        saturnRing.rotation.x = Math.PI / 2 + 0.2; 
        saturnRing.position.x = distance;
        saturnRing.castShadow = true;
        saturnRing.receiveShadow = true;
        group.add(saturnRing);
    }

    planets.push({ mesh: mesh, group: group, speed: speed });
    return { mesh, group };
}

buildPlanet(0xaaaaaa, 2.5, 0.15, 0.025, false, false); // Mercury
buildPlanet(0xe3bb76, 3.5, 0.35, 0.02, false, false); // Venus

// Earth
const earthGroup = new THREE.Group();
solarSystem.add(earthGroup);
earthGroup.add(createOrbit(5.0));
const earthGeometry = new THREE.SphereGeometry(0.4, 64, 64);
const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b82c9, // Vibrant blue
    bumpMap: proceduralRockBump, 
    bumpScale: 0.05, 
    roughness: 0.6, 
    metalness: 0.1
});
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.position.x = 5.0;
earthMesh.castShadow = true;
earthMesh.receiveShadow = true;
earthMesh.rotation.x = 0.4;
earthGroup.add(earthMesh);
planets.push({ mesh: earthMesh, group: earthGroup, speed: 0.015 });

buildPlanet(0xc1440e, 6.5, 0.25, 0.012, false, false); // Mars

// ==========================================
// REALISTIC ASTEROID BELT (InstancedMesh)
// ==========================================
const asteroidBeltGroup = new THREE.Group();
solarSystem.add(asteroidBeltGroup);
const ASTEROID_COUNT = 1500;
const astGeometry = new THREE.DodecahedronGeometry(0.04, 1); // Irregular rocky shape
const astMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    bumpMap: proceduralRockBump,
    bumpScale: 0.2,
    roughnessMap: proceduralRockBump,
    roughness: 0.9,
    metalness: 0.1
});

const instancedAsteroids = new THREE.InstancedMesh(astGeometry, astMaterial, ASTEROID_COUNT);
instancedAsteroids.castShadow = true;
instancedAsteroids.receiveShadow = true;

const dummy = new THREE.Object3D();
const asteroidData = []; // Store rotation speeds

for (let i = 0; i < ASTEROID_COUNT; i++) {
    // Distance between Mars (6.5) and Jupiter (9.0)
    const distance = 7.2 + Math.random() * 1.2; 
    const angle = Math.random() * Math.PI * 2;
    const yOffset = (Math.random() - 0.5) * 0.5; // Slight vertical scatter

    dummy.position.set(Math.cos(angle) * distance, yOffset, Math.sin(angle) * distance);
    
    // Randomize shape slightly
    const scale = 0.5 + Math.random() * 1.5;
    dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
    
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.updateMatrix();
    instancedAsteroids.setMatrixAt(i, dummy.matrix);

    asteroidData.push({
        distance: distance,
        angle: angle,
        yOffset: yOffset,
        speed: (0.005 + Math.random() * 0.005),
        rotX: Math.random() * 0.02,
        rotY: Math.random() * 0.02
    });
}
asteroidBeltGroup.add(instancedAsteroids);


buildPlanet(0xd39c7e, 9.0, 1.0, 0.008, false, true); // Jupiter
buildPlanet(0xc5ab6e, 12.5, 0.8, 0.005, true, true); // Saturn
buildPlanet(0x4b70dd, 16.0, 0.6, 0.003, false, true); // Uranus
buildPlanet(0x274687, 19.0, 0.55, 0.002, false, true); // Neptune

solarSystem.rotation.x = 0.2; 

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
        if (p.hasClouds) { p.cloudMesh.rotation.y += 0.012; }
    });

    // Animate individual asteroids
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        const data = asteroidData[i];
        data.angle += data.speed * 0.5; // Orbit
        
        dummy.position.set(Math.cos(data.angle) * data.distance, data.yOffset, Math.sin(data.angle) * data.distance);
        
        // Retrieve original scale by getting it before rotation updates (or keep scale roughly consistent)
        // We will just do rotation and position
        dummy.rotation.x += data.rotX;
        dummy.rotation.y += data.rotY;
        
        // Re-apply a deterministic scale based on its index so it doesn't change
        const scale = 0.5 + (i % 10) / 10 * 1.5;
        dummy.scale.set(scale, scale * 0.9, scale);

        dummy.updateMatrix();
        instancedAsteroids.setMatrixAt(i, dummy.matrix);
    }
    instancedAsteroids.instanceMatrix.needsUpdate = true;
    
    asteroidBeltGroup.rotation.y += 0.001; // Entire belt drift

    camera.position.x += (mouseX * 0.002 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 0.002 + 3 - camera.position.y) * 0.05; 
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
    scrollTrigger: { trigger: "#scroll-container", start: "top top", end: "bottom bottom", scrub: 1.5 }
});

tl.to(solarSystem.rotation, { y: Math.PI * 4, x: 0.6, ease: "power1.inOut" }, 0);
tl.to(camera.position, { z: 6, y: 1, ease: "power2.inOut" }, 0);

gsap.to(solarSystem.position, { x: -3, scrollTrigger: { trigger: "#skills", start: "top center", end: "bottom center", scrub: 1 } });
gsap.to(solarSystem.position, { x: 2, scrollTrigger: { trigger: "#experience", start: "top center", end: "bottom center", scrub: 1 } });
gsap.to(solarSystem.position, { x: -2, scrollTrigger: { trigger: "#projects", start: "top center", end: "bottom center", scrub: 1 } });

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

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        lenis.scrollTo(this.getAttribute('href'), {
            offset: 0, duration: 1.5, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
    });
});
