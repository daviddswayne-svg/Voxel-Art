import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DATA GENERATION FUNCTIONS ---

// 1. Generate the Icosahedral Capsid (Static Shell)
const generateCapsidVoxels = (radius, elongation) => {
  const voxels = [];
  const r2 = radius * radius;
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius - elongation; y <= radius + elongation; y++) {
      for (let z = -radius; z <= radius; z++) {
        let dy = y;
        if (y > 0) dy = Math.max(0, y - elongation);
        if (y < 0) dy = Math.min(0, y + elongation);
        const distSq = x*x + dy*dy + z*z;
        const sphereCheck = distSq < r2;
        const octaCheck = (Math.abs(x) + Math.abs(dy) + Math.abs(z)) < (radius * 1.6); 
        if (sphereCheck && octaCheck) {
          const innerR = radius - 1.5;
          const innerDistSq = x*x + dy*dy + z*z;
          const isSurface = innerDistSq >= (innerR * innerR) || (Math.abs(x)+Math.abs(dy)+Math.abs(z)) >= (radius * 1.6 - 2);
          if (isSurface) voxels.push({ x, y: y + 30, z }); 
        }
      }
    }
  }
  return voxels;
};

// 2. Generate Head DNA (Dynamic - Drains)
const generateHeadDNAVoxels = (radius, elongation) => {
  const voxels = [];
  const r2 = (radius - 2) * (radius - 2); 
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius - elongation; y <= radius + elongation; y++) {
      for (let z = -radius; z <= radius; z++) {
         let dy = y;
        if (y > 0) dy = Math.max(0, y - elongation);
        if (y < 0) dy = Math.min(0, y + elongation);
        const distSq = x*x + dy*dy + z*z;
        const octaCheck = (Math.abs(x) + Math.abs(dy) + Math.abs(z)) < (radius * 1.6);
        if (distSq < r2 && octaCheck) {
           const frequency = 0.4;
           const noise = Math.sin(x * frequency) + Math.sin(y * frequency) + Math.sin(z * frequency);
           if (noise > 0.1 || Math.random() > 0.9) {
             voxels.push({ x, y: y + 30, z });
           }
        }
      }
    }
  }
  return voxels.sort((a, b) => b.y - a.y);
};

// 3. Generate Tail Assembly
const generateTailVoxels = () => {
  const sheath = []; 
  const core = []; 
  const baseplate = []; 
  const pins = []; 
  const whiskers = [];
  const legs = [];

  const topY = 15;
  const bottomY = -25;
  
  // Collar
  for (let x = -6; x <= 6; x++) {
    for (let z = -6; z <= 6; z++) {
       if (x*x + z*z < 36 && x*x + z*z > 16) {
         core.push({ x, y: 16, z }); 
         core.push({ x, y: 17, z }); 
       }
    }
  }

  // Helical Sheath & Inner Core
  for (let y = topY; y >= bottomY; y--) {
    const radius = 4.5;
    for (let x = -6; x <= 6; x++) {
      for (let z = -6; z <= 6; z++) {
        const dist = Math.sqrt(x*x + z*z);
        if (dist <= radius && dist >= radius - 1.5) {
          if (y % 4 !== 0) sheath.push({ x, y, z });
          else core.push({x, y, z}); 
        }
        if (dist < 2) core.push({ x, y, z });
      }
    }
  }

  // Baseplate
  for (let y = bottomY - 2; y <= bottomY; y++) {
    for (let x = -8; x <= 8; x++) {
      for (let z = -8; z <= 8; z++) {
         const hexDist = Math.max(Math.abs(x), Math.abs(x)*0.5 + Math.abs(z)*0.866);
         if (hexDist < 8) {
           baseplate.push({ x, y, z });
           if (y === bottomY - 2 && hexDist > 6.5) {
               pins.push({x, y: y-1, z});
               pins.push({x, y: y-2, z});
           }
         }
      }
    }
  }

  // Whiskers
  const numWhiskers = 6;
  for (let i = 0; i < numWhiskers; i++) {
    const angle = (i / numWhiskers) * Math.PI * 2 + (Math.PI / 6); 
    const startR = 6; const endR = 18;
    for (let s = 0; s < 15; s++) {
        const t = s / 15;
        const r = startR + (endR - startR) * t;
        const drop = t * 4; 
        const px = Math.round(r * Math.cos(angle));
        const pz = Math.round(r * Math.sin(angle));
        const py = Math.round(16 - drop);
        whiskers.push({ x: px, y: py, z: pz });
    }
  }

  // Legs
  const numLegs = 6;
  for (let i = 0; i < numLegs; i++) {
    const angle = (i / numLegs) * Math.PI * 2;
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    for (let s = 0; s <= 20; s++) { 
      const t = s / 20;
      const r = 6 + (25 - 6) * t;
      const y = -25 + (-15 - -25) * t;
      const px = Math.round(r * cos); const pz = Math.round(r * sin); const py = Math.round(y);
      legs.push({ x: px, y: py, z: pz });
      legs.push({ x: px, y: py+1, z: pz });
      legs.push({ x: px+1, y: py, z: pz });
    }
    for (let s = 0; s <= 25; s++) { 
        const t = s / 25;
        const r = 25 + (45 - 25) * t;
        const y = -15 + (-45 - -15) * t;
        const px = Math.round(r * cos); const pz = Math.round(r * sin); const py = Math.round(y);
        legs.push({ x: px, y: py, z: pz });
        legs.push({ x: px, y: py+1, z: pz });
        legs.push({ x: px+1, y: py, z: pz });
    }
  }

  return { sheath, core, baseplate, pins, whiskers, legs };
};

// 4. Injected DNA
const generateInjectedDNAVoxels = () => {
  const voxels = [];
  const poolCenterY = -70; 
  const poolRadius = 14;
  const streamBottom = poolCenterY + poolRadius - 2; 

  for (let y = 18; y >= streamBottom; y -= 0.3) {
      const angle = y * 1.2; 
      const r = 1.0;
      voxels.push({x: Math.cos(angle)*r, y, z: Math.sin(angle)*r});
      voxels.push({x: Math.cos(angle + Math.PI)*r, y, z: Math.sin(angle + Math.PI)*r});
      if (Math.abs(y - Math.round(y)) < 0.1) voxels.push({x:0, y, z:0});
  }

  for (let x = -poolRadius; x <= poolRadius; x++) {
    for (let y = -poolRadius; y <= poolRadius; y++) {
      for (let z = -poolRadius; z <= poolRadius; z++) {
          const dist = x*x + y*y + z*z;
          if (dist < poolRadius * poolRadius) {
             const noise = Math.sin(x*0.3) * Math.cos(y*0.3) * Math.sin(z*0.3);
             if (noise > 0 || Math.random() > 0.8) {
                voxels.push({ x, y: y + poolCenterY, z });
             }
          }
      }
    }
  }
  return voxels.sort((a, b) => b.y - a.y);
};

// 5. Bacterium Generation
const generateBacteriumVoxels = () => {
  const wall = [];
  const membrane = [];
  const cytoplasm = [];
  const nucleoid = [];
  const ribosomes = [];
  const plasmids = [];

  const surfaceY = -48;
  const depth = 32; const width = 50;
  
  const plasmidCenters = [
    { x: -30, y: -65, z: 10 }, { x: 20, y: -70, z: -25 }, { x: -15, y: -55, z: -30 },
  ];

  for (let x = -width; x <= width; x++) {
    for (let z = -width; z <= width; z++) {
      const distFromCenter = Math.sqrt(x*x + z*z);
      if (distFromCenter > width) continue;
      const curvature = (distFromCenter * distFromCenter) / 150;
      const localSurfaceY = Math.floor(surfaceY - curvature);
      
      for (let y = localSurfaceY; y >= localSurfaceY - depth; y--) {
        if (x > 5 && z > 5 && y > localSurfaceY - depth + 5) continue; 
        const depthVal = localSurfaceY - y;
        if (depthVal < 2) { wall.push({ x, y, z }); continue; }
        if (depthVal < 3) { membrane.push({ x, y, z }); continue; }
        let isPlasmid = false;
        for (const pc of plasmidCenters) {
           const pd = Math.sqrt((x-pc.x)**2 + (y-pc.y)**2 + (z-pc.z)**2);
           if (pd > 4 && pd < 6) { plasmids.push({x, y, z}); isPlasmid = true; break; }
        }
        if (isPlasmid) continue;
        const scale = 0.2;
        const nVal = Math.sin(x*scale) * Math.cos(y*scale) * Math.sin(z*scale) + Math.sin(x*scale*0.5 + z*scale*0.5);
        const distFromNucleoidCenter = Math.sqrt(x*x + (y-(surfaceY-15))**2 + z*z);
        if (distFromNucleoidCenter < 25 && nVal > 0.2) { nucleoid.push({x, y, z}); continue; }
        if (Math.random() > 0.96) { ribosomes.push({x, y, z}); continue; }
        if (Math.random() > 0.7) { cytoplasm.push({x, y, z}); }
      }
    }
  }
  return { wall, membrane, cytoplasm, nucleoid, ribosomes, plasmids };
};


// --- INITIALIZATION ---
function init() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a1a'); 
    scene.fog = new THREE.FogExp2('#1a1a1a', 0.005); 

    const aspect = window.innerWidth / window.innerHeight;
    const d = 100;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(100, 100, 100); 
    camera.lookAt(0, -20, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.minZoom = 0.5;
    controls.maxZoom = 2;
    controls.target.set(0, -20, 0);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(50, 80, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 4096;
    keyLight.shadow.mapSize.height = 4096;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 500;
    const shadowSize = 120;
    keyLight.shadow.camera.left = -shadowSize;
    keyLight.shadow.camera.right = shadowSize;
    keyLight.shadow.camera.top = shadowSize;
    keyLight.shadow.camera.bottom = -shadowSize;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.8);
    fillLight.position.set(-50, 40, 20);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    rimLight.position.set(0, 20, -60);
    scene.add(rimLight);

    // --- MATERIALS ---
    const voxelGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.95); 
    const capsidMaterial = new THREE.MeshPhysicalMaterial({ color: 0xaaddff, metalness: 0.1, roughness: 0.2, transmission: 0.8, thickness: 1.5, opacity: 0.4, transparent: true, envMapIntensity: 1.0, side: THREE.DoubleSide });
    const dnaMaterial = new THREE.MeshStandardMaterial({ color: 0xff0022, emissive: 0xdd0000, emissiveIntensity: 0.8, roughness: 0.4 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.4 });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
    const cellWallMaterial = new THREE.MeshStandardMaterial({ color: 0x1a4d1a, roughness: 0.9, metalness: 0.1 });
    const membraneMaterial = new THREE.MeshStandardMaterial({ color: 0x88aa00, roughness: 0.6, emissive: 0x223300, emissiveIntensity: 0.2 });
    const cytoplasmMaterial = new THREE.MeshPhysicalMaterial({ color: 0xccffcc, transmission: 0, opacity: 0.15, transparent: true, roughness: 1, depthWrite: false });
    const nucleoidMaterial = new THREE.MeshStandardMaterial({ color: 0x6633cc, roughness: 0.4, emissive: 0x330066, emissiveIntensity: 0.5 });
    const ribosomeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffaaaa, emissiveIntensity: 0.5 });
    const plasmidMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff4400, emissiveIntensity: 0.8, metalness: 0.5 });

    // --- DATA ---
    const dynamicData = {
        capsid: generateCapsidVoxels(14, 8),
        headDNA: generateHeadDNAVoxels(13, 8), 
        tail: generateTailVoxels(),
        injectedDNA: generateInjectedDNAVoxels(),
        bacterium: generateBacteriumVoxels(),
    };

    // --- MESH SETUP ---
    const dummy = new THREE.Object3D();
    const phageGroup = new THREE.Group();
    scene.add(phageGroup);

    const setupMesh = (data, mat, parent, shadow = true) => {
       const mesh = new THREE.InstancedMesh(voxelGeometry, mat, data.length);
       mesh.castShadow = shadow;
       mesh.receiveShadow = shadow;
       mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
       for (let i = 0; i < data.length; i++) {
         dummy.position.set(data[i].x, data[i].y, data[i].z);
         dummy.scale.set(1, 1, 1);
         dummy.updateMatrix();
         mesh.setMatrixAt(i, dummy.matrix);
       }
       mesh.instanceMatrix.needsUpdate = true;
       parent.add(mesh);
       return mesh;
    };

    setupMesh(dynamicData.capsid, capsidMaterial, phageGroup);
    
    const staticMetal = [
        ...dynamicData.tail.core, 
        ...dynamicData.tail.baseplate, 
        ...dynamicData.tail.pins, 
        ...dynamicData.tail.whiskers,
    ];
    setupMesh(staticMetal, metalMaterial, phageGroup);
    
    const sheathMesh = setupMesh(dynamicData.tail.sheath, metalMaterial, phageGroup);
    const headDnaMesh = setupMesh(dynamicData.headDNA, dnaMaterial, phageGroup);
    const legsMesh = setupMesh(dynamicData.tail.legs, metalMaterial, phageGroup);
    const injectedDnaMesh = setupMesh(dynamicData.injectedDNA, dnaMaterial, scene);

    setupMesh(dynamicData.bacterium.wall, cellWallMaterial, scene);
    setupMesh(dynamicData.bacterium.membrane, membraneMaterial, scene);
    const cytoMesh = setupMesh(dynamicData.bacterium.cytoplasm, cytoplasmMaterial, scene, false);
    cytoMesh.castShadow = false;
    setupMesh(dynamicData.bacterium.nucleoid, nucleoidMaterial, scene);
    setupMesh(dynamicData.bacterium.ribosomes, ribosomeMaterial, scene);
    setupMesh(dynamicData.bacterium.plasmids, plasmidMaterial, scene);

    // --- ANIMATION LOOP ---
    const duration = 12000;
    const startTime = performance.now();

    function animate(now) {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      const elapsed = (now - startTime) % duration;
      const t = elapsed / duration; 
      const landingEnd = 0.20;

      // A. LANDING
      if (t < landingEnd) {
           const landP = t / landingEnd;
           const ease = 1 - Math.pow(1 - landP, 3);
           phageGroup.position.y = 50 - (53 * ease); 
      } else {
           phageGroup.position.y = -3;
      }

      // B. LEGS
      if (legsMesh) {
         if (t < landingEnd) {
             const landP = t / landingEnd;
             const flare = 1.0 + (Math.sin(landP * Math.PI) * 0.2); 
             const legsData = dynamicData.tail.legs;
             for(let i=0; i<legsData.length; i++) {
                 const v = legsData[i];
                 dummy.position.set(v.x * flare, v.y, v.z * flare);
                 dummy.scale.set(1, 1, 1);
                 dummy.updateMatrix();
                 legsMesh.setMatrixAt(i, dummy.matrix);
             }
             legsMesh.instanceMatrix.needsUpdate = true;
         } else if (t < landingEnd + 0.02) {
             const legsData = dynamicData.tail.legs;
             for(let i=0; i<legsData.length; i++) {
                 const v = legsData[i];
                 dummy.position.set(v.x, v.y, v.z);
                 dummy.scale.set(1, 1, 1);
                 dummy.updateMatrix();
                 legsMesh.setMatrixAt(i, dummy.matrix);
             }
             legsMesh.instanceMatrix.needsUpdate = true;
         }
      }

      // C. SHEATH
      if (sheathMesh) {
          const start = 0.25; const end = 0.45;
          let progress = 0;
          if (t > end) progress = 1;
          else if (t > start) progress = (t - start) / (end - start);
          const ease = progress * (2 - progress);
          const sheathData = dynamicData.tail.sheath;
          const baseY = -25;
          for (let i = 0; i < sheathData.length; i++) {
              const v = sheathData[i];
              const currentY = v.y - (v.y - baseY) * (0.5 * ease);
              dummy.position.set(v.x, currentY, v.z);
              dummy.scale.set(1, 1 + (0.2 * ease), 1); 
              dummy.updateMatrix();
              sheathMesh.setMatrixAt(i, dummy.matrix);
          }
          sheathMesh.instanceMatrix.needsUpdate = true;
      }

      // D. HEAD DNA
      if (headDnaMesh) {
          const start = 0.35; const end = 0.7;
          let progress = 0;
          if (t > end) progress = 1;
          else if (t > start) progress = (t - start) / (end - start);
          const count = dynamicData.headDNA.length;
          const drainedCount = Math.floor(count * progress);
          for (let i = 0; i < count; i++) {
              if (i < drainedCount) {
                  dummy.position.set(0, 10000, 0); 
                  dummy.scale.set(0, 0, 0);
              } else {
                  const v = dynamicData.headDNA[i];
                  const pressure = progress * 2.0; 
                  dummy.position.set(v.x, v.y - pressure, v.z);
                  dummy.scale.set(1, 1, 1);
              }
              dummy.updateMatrix();
              headDnaMesh.setMatrixAt(i, dummy.matrix);
          }
          headDnaMesh.instanceMatrix.needsUpdate = true;
      }

      // E. INJECTED DNA
      if (injectedDnaMesh) {
          const frontStart = 0.40; const frontEnd = 0.85;
          let frontProgress = 0;
          if (t > frontStart) frontProgress = Math.min(1, (t - frontStart) / (frontEnd - frontStart));
          const flowFrontY = 15 - (frontProgress * (15 - (-85))); 
          
          const backStart = 0.70; const backEnd = 0.95;
          let backProgress = 0;
          if (t > backStart) backProgress = Math.min(1, (t - backStart) / (backEnd - backStart));
          const flowBackY = 15 - (backProgress * (15 - (-55))); 

          const spin = t * 100;
          const count = dynamicData.injectedDNA.length;
          for (let i = 0; i < count; i++) {
               const v = dynamicData.injectedDNA[i];
               const isReached = v.y >= flowFrontY; 
               const isNotPassed = v.y <= flowBackY;
               if (isReached && isNotPassed) {
                   if (v.y > -55) { 
                       const cos = Math.cos(spin + v.y * 0.2); 
                       const sin = Math.sin(spin + v.y * 0.2);
                       const rx = v.x * cos - v.z * sin;
                       const rz = v.x * sin + v.z * cos;
                       dummy.position.set(rx, v.y, rz);
                   } else {
                       dummy.position.set(v.x, v.y, v.z);
                   }
                   dummy.scale.set(1, 1, 1);
               } else {
                   dummy.position.set(0, -10000, 0);
                   dummy.scale.set(0, 0, 0);
               }
               dummy.updateMatrix();
               injectedDnaMesh.setMatrixAt(i, dummy.matrix);
          }
          injectedDnaMesh.instanceMatrix.needsUpdate = true;
      }
    }
    
    animate(performance.now());

    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = -d * aspect;
      camera.right = d * aspect;
      camera.top = d;
      camera.bottom = -d;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
}

// Start app
init();