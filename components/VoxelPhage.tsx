import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * UTILITY: Voxel Logic
 */
interface Voxel {
  x: number;
  y: number;
  z: number;
  id?: number; // For sorting/animation order
}

// 1. Generate the Icosahedral Capsid (Static Shell)
const generateCapsidVoxels = (radius: number, elongation: number): Voxel[] => {
  const voxels: Voxel[] = [];
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
const generateHeadDNAVoxels = (radius: number, elongation: number): Voxel[] => {
  const voxels: Voxel[] = [];
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
             // Sort key: Y height (top drains last)
             voxels.push({ x, y: y + 30, z });
           }
        }
      }
    }
  }
  // Sort top-down for draining effect (Index 0 = Top, Index N = Bottom)
  return voxels.sort((a, b) => b.y - a.y);
};

// 3. Generate Tail Assembly (Separated into Static and Dynamic parts)
const generateTailVoxels = () => {
  const sheath: Voxel[] = []; // Dynamic
  const core: Voxel[] = []; // Static
  const baseplate: Voxel[] = []; // Static
  const pins: Voxel[] = []; // Static

  const topY = 15;
  const bottomY = -25;
  
  // Collar (Static)
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
        // Outer tube (Sheath)
        if (dist <= radius && dist >= radius - 1.5) {
          if (y % 4 !== 0) { 
             sheath.push({ x, y, z });
          } else {
             core.push({x, y, z}); 
          }
        }
        // Inner hollow tube (Core)
        if (dist < 2) {
          core.push({ x, y, z });
        }
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

  // Whiskers (Static)
  const whiskers: Voxel[] = [];
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

  // Legs (Separated for animation)
  const legs: Voxel[] = [];
  const numLegs = 6;
  for (let i = 0; i < numLegs; i++) {
    const angle = (i / numLegs) * Math.PI * 2;
    const cos = Math.cos(angle); const sin = Math.sin(angle);
    for (let s = 0; s <= 20; s++) { // Segment 1
      const t = s / 20;
      const r = 6 + (25 - 6) * t;
      const y = -25 + (-15 - -25) * t;
      const px = Math.round(r * cos); const pz = Math.round(r * sin); const py = Math.round(y);
      legs.push({ x: px, y: py, z: pz });
      legs.push({ x: px, y: py+1, z: pz });
      legs.push({ x: px+1, y: py, z: pz });
    }
    for (let s = 0; s <= 25; s++) { // Segment 2
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

// 4. Injected DNA (Dynamic - Fills)
const generateInjectedDNAVoxels = (): Voxel[] => {
  const voxels: Voxel[] = [];
  const poolCenterY = -70; 
  const poolRadius = 14;
  const streamBottom = poolCenterY + poolRadius - 2; 

  // Stream - Double Helix for uncoiling look
  for (let y = 18; y >= streamBottom; y -= 0.3) {
      const angle = y * 1.2; 
      const r = 1.0;
      // Double Helix
      voxels.push({x: Math.cos(angle)*r, y, z: Math.sin(angle)*r});
      voxels.push({x: Math.cos(angle + Math.PI)*r, y, z: Math.sin(angle + Math.PI)*r});
      // Central axis density
      if (Math.abs(y - Math.round(y)) < 0.1) voxels.push({x:0, y, z:0});
  }

  // Pool
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

// 5. Bacterium Generation (Static Background)
const generateBacteriumVoxels = () => {
  const wall: Voxel[] = [];
  const membrane: Voxel[] = [];
  const cytoplasm: Voxel[] = [];
  const nucleoid: Voxel[] = [];
  const ribosomes: Voxel[] = [];
  const plasmids: Voxel[] = [];

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
        if (x > 5 && z > 5 && y > localSurfaceY - depth + 5) continue; // Cutaway
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


const VoxelPhage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const phageGroupRef = useRef<THREE.Group>(null);
  
  // Refs for Dynamic Meshes
  const sheathMeshRef = useRef<THREE.InstancedMesh>(null);
  const headDnaMeshRef = useRef<THREE.InstancedMesh>(null);
  const injectedDnaMeshRef = useRef<THREE.InstancedMesh>(null);
  const legsMeshRef = useRef<THREE.InstancedMesh>(null);

  // Data persistence for Animation
  const dynamicData = useMemo(() => {
    return {
      capsid: generateCapsidVoxels(14, 8),
      headDNA: generateHeadDNAVoxels(13, 8), 
      tail: generateTailVoxels(),
      injectedDNA: generateInjectedDNAVoxels(),
      bacterium: generateBacteriumVoxels(),
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1a1a'); 
    scene.fog = new THREE.FogExp2('#1a1a1a', 0.005); 

    const aspect = window.innerWidth / window.innerHeight;
    const d = 100; // Suspect #3 Fix: Increased from 75 to 100 to ensure full vertical coverage
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
    containerRef.current.appendChild(renderer.domElement);

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

    // --- MESH SETUP & GROUPING ---
    const dummy = new THREE.Object3D();
    
    // Create Phage Group to move it as a whole
    const phageGroup = new THREE.Group();
    phageGroupRef.current = phageGroup;
    scene.add(phageGroup);

    const setupMesh = (ref: any, data: Voxel[], mat: THREE.Material, parent: THREE.Object3D, shadow = true) => {
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
       parent.add(mesh); // Add to group or scene
       if (ref) ref.current = mesh;
       return mesh;
    };

    // 1. Phage Parts (Added to PhageGroup)
    setupMesh(null, dynamicData.capsid, capsidMaterial, phageGroup);
    
    // Combine static metal parts (Core, Baseplate, Pins, Whiskers) - EXCLUDE LEGS
    const staticMetal = [
        ...dynamicData.tail.core, 
        ...dynamicData.tail.baseplate, 
        ...dynamicData.tail.pins, 
        ...dynamicData.tail.whiskers,
    ];
    setupMesh(null, staticMetal, metalMaterial, phageGroup);
    
    // Dynamic Phage Parts
    setupMesh(sheathMeshRef, dynamicData.tail.sheath, metalMaterial, phageGroup);
    setupMesh(headDnaMeshRef, dynamicData.headDNA, dnaMaterial, phageGroup);
    setupMesh(legsMeshRef, dynamicData.tail.legs, metalMaterial, phageGroup); // Legs separate for animation

    // 2. Injected DNA (Added to SCENE, not Group)
    setupMesh(injectedDnaMeshRef, dynamicData.injectedDNA, dnaMaterial, scene);

    // 3. Bacterium Parts (Added to SCENE)
    setupMesh(null, dynamicData.bacterium.wall, cellWallMaterial, scene);
    setupMesh(null, dynamicData.bacterium.membrane, membraneMaterial, scene);
    const cytoMesh = setupMesh(null, dynamicData.bacterium.cytoplasm, cytoplasmMaterial, scene, false);
    cytoMesh.castShadow = false;
    setupMesh(null, dynamicData.bacterium.nucleoid, nucleoidMaterial, scene);
    setupMesh(null, dynamicData.bacterium.ribosomes, ribosomeMaterial, scene);
    setupMesh(null, dynamicData.bacterium.plasmids, plasmidMaterial, scene);


    // --- ANIMATION LOOP ---
    let frameId: number;
    let startTime = performance.now();
    const duration = 12000; // Increased to 12s to accommodate landing

    const animate = (now: number) => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // --- SEQUENCE LOGIC ---
      const elapsed = (now - startTime) % duration;
      const t = elapsed / duration; 

      // TIMELINE:
      // 0.00 - 0.20: LANDING (Descend + Legs)
      // 0.20 - 0.25: PAUSE (Lock in)
      // 0.25 - 0.45: CONTRACTION
      // 0.35 - 0.70: DRAINING
      // 0.40 - 0.90: FILLING + EMPTYING TAIL

      // A. LANDING
      const landingEnd = 0.20;
      if (phageGroupRef.current) {
        if (t < landingEnd) {
             const landP = t / landingEnd;
             const ease = 1 - Math.pow(1 - landP, 3); // Cubic ease out
             // Adjust landing to -3 so legs (at -45) touch surface (-48)
             phageGroupRef.current.position.y = 50 - (53 * ease); 
        } else {
             phageGroupRef.current.position.y = -3;
        }
      }

      // B. LEGS (Flare during landing)
      if (legsMeshRef.current) {
         if (t < landingEnd) {
             const landP = t / landingEnd;
             // Legs flare out slightly then snap in
             // Simple radial scaling based on progress
             const flare = 1.0 + (Math.sin(landP * Math.PI) * 0.2); // Bulge out to 1.2x
             
             const legsData = dynamicData.tail.legs;
             for(let i=0; i<legsData.length; i++) {
                 const v = legsData[i];
                 // Expand radially from center (0, y, 0)
                 dummy.position.set(v.x * flare, v.y, v.z * flare);
                 dummy.scale.set(1, 1, 1);
                 dummy.updateMatrix();
                 legsMeshRef.current.setMatrixAt(i, dummy.matrix);
             }
             legsMeshRef.current.instanceMatrix.needsUpdate = true;
         } else if (t < landingEnd + 0.02) {
             // Reset to exact positions
             const legsData = dynamicData.tail.legs;
             for(let i=0; i<legsData.length; i++) {
                 const v = legsData[i];
                 dummy.position.set(v.x, v.y, v.z);
                 dummy.scale.set(1, 1, 1);
                 dummy.updateMatrix();
                 legsMeshRef.current.setMatrixAt(i, dummy.matrix);
             }
             legsMeshRef.current.instanceMatrix.needsUpdate = true;
         }
      }

      // C. SHEATH CONTRACTION (0.25 -> 0.45)
      if (sheathMeshRef.current) {
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
              sheathMeshRef.current.setMatrixAt(i, dummy.matrix);
          }
          sheathMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // D. HEAD DNA DRAINING (0.35 -> 0.7)
      if (headDnaMeshRef.current) {
          const start = 0.35; const end = 0.7;
          let progress = 0;
          if (t > end) progress = 1;
          else if (t > start) progress = (t - start) / (end - start);

          const count = dynamicData.headDNA.length;
          
          // DRAIN LOGIC UPDATE: Drain from TOP (index 0) to BOTTOM (index N)
          // Data is sorted descending Y (0 is Top). 
          // We want to hide 0..X so the Top disappears first.
          const drainedCount = Math.floor(count * progress);
          
          for (let i = 0; i < count; i++) {
              if (i < drainedCount) {
                  // Hide Top voxels (indices 0 to drainedCount)
                  dummy.position.set(0, 10000, 0); 
                  dummy.scale.set(0, 0, 0);
              } else {
                  // Show Bottom voxels
                  const v = dynamicData.headDNA[i];
                  // Compress slightly downwards to simulate pressure
                  const pressure = progress * 2.0; 
                  dummy.position.set(v.x, v.y - pressure, v.z);
                  dummy.scale.set(1, 1, 1);
              }
              dummy.updateMatrix();
              headDnaMeshRef.current.setMatrixAt(i, dummy.matrix);
          }
          headDnaMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // E. INJECTED DNA ANIMATION (0.40 -> 0.95)
      // Implements a "sliding window" to empty the tail
      if (injectedDnaMeshRef.current) {
          
          // Front: Leading edge of DNA entering cell. Starts at top (15), goes to bottom (-85).
          const frontStart = 0.40; const frontEnd = 0.85;
          let frontProgress = 0;
          if (t > frontStart) frontProgress = Math.min(1, (t - frontStart) / (frontEnd - frontStart));
          const flowFrontY = 15 - (frontProgress * (15 - (-85))); // 15 to -85
          
          // Back: Trailing edge (after head empties). Starts at top (15), stays there, then drops to cell interior (-55).
          const backStart = 0.70; const backEnd = 0.95;
          let backProgress = 0;
          if (t > backStart) backProgress = Math.min(1, (t - backStart) / (backEnd - backStart));
          const flowBackY = 15 - (backProgress * (15 - (-55))); // 15 to -55 (Just inside cell)

          // Spin Calculation for Uncoiling Effect
          const spin = t * 100; // Continuous spin

          const count = dynamicData.injectedDNA.length;
          for (let i = 0; i < count; i++) {
               const v = dynamicData.injectedDNA[i];
               // Logic: Visible if below Top(Back) AND above Bottom(Front)
               // Since Y is descending, 'Front' is the lowest Y reached. 'Back' is the highest Y remaining.
               const isReached = v.y >= flowFrontY; 
               const isNotPassed = v.y <= flowBackY;
               
               if (isReached && isNotPassed) {
                   if (v.y > -55) { // Is in the Stream (Helix Section)
                       // Apply rotation around Y axis to create drilling/uncoiling effect
                       const cos = Math.cos(spin + v.y * 0.2); // v.y factor creates wave motion
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
               injectedDnaMeshRef.current.setMatrixAt(i, dummy.matrix);
          }
          injectedDnaMeshRef.current.instanceMatrix.needsUpdate = true;
      }

    };
    // Suspect #1 Fix: Explicit call to start the loop
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
    
    // Suspect #2 Fix: Ensure initial size is set correctly after append
    handleResize();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      capsidMaterial.dispose(); dnaMaterial.dispose(); metalMaterial.dispose(); coreMaterial.dispose();
      cellWallMaterial.dispose(); membraneMaterial.dispose(); cytoplasmMaterial.dispose();
      nucleoidMaterial.dispose(); ribosomeMaterial.dispose(); plasmidMaterial.dispose();
      voxelGeometry.dispose();
    };
  }, [dynamicData]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default VoxelPhage;