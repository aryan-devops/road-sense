import * as THREE from 'three';
// @ts-expect-error GLTFLoader types may not be fully resolved in this setup
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import type { Agent, AgentType, EgoVehicle } from '@/types/simulation';

// --- GLTF Loader Singleton ---
let gltfLoader: GLTFLoader | null = null;
function getLoader() {
  if (typeof window === 'undefined') return null; // Prevent SSR crash
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
  }
  return gltfLoader;
}

/**
 * Absolute Bounding Box Normalization Algorithm.
 * Loads an external 3D model, scales it uniformly to fit EXACTLY within the
 * requested simulation parameters, centers its pivot, and smoothly replaces the fallback.
 */
function loadAndNormalizeGLB(
  url: string,
  targetGroup: THREE.Group,
  fallbackMeshes: THREE.Object3D[],
  targetDimensions: { length: number; width: number; height: number },
  yOffset: number = 0
) {
  const loader = getLoader();
  if (!loader) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader.load(url, (gltf: any) => {
    const model = gltf.scene;
    
    // 1. Calculate raw bounding box
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // 2. Compute precise uniform scale to prevent "odd" distortions
    // We scale uniformly based on the most restrictive dimension to ensure it never exceeds parameters.
    const scaleX = targetDimensions.width / size.x;
    const scaleY = targetDimensions.height / size.y;
    const scaleZ = targetDimensions.length / size.z;
    const uniformScale = Math.min(scaleX, scaleY, scaleZ);
    
    model.scale.setScalar(uniformScale);
    
    // 3. Center pivot and align to ground plane
    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y = (model.position.y - scaledBox.min.y) + yOffset;

    // Enhance materials for the Cyber-Physical Aesthetic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Subtle cyber-enhancement to standard materials
        if (child.material && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.metalness = Math.max(0.6, child.material.metalness);
          child.material.roughness = Math.min(0.4, child.material.roughness);
        }
      }
    });

    // 4. Swap out fallbacks seamlessly
    fallbackMeshes.forEach(mesh => targetGroup.remove(mesh));
    targetGroup.add(model);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, undefined, (error: any) => {
    // Silently fall back to our high-quality procedurals if the GLB is missing
  });
}

// Stylized Material Cache for 60FPS Performance (Fallbacks)
const MATERIALS = {
  egoBody: new THREE.MeshStandardMaterial({
    color: 0x0ea5e9, metalness: 0.8, roughness: 0.2, emissive: 0x0284c7, emissiveIntensity: 0.2,
  }),
  egoGlass: new THREE.MeshPhysicalMaterial({
    color: 0x0369a1, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.6,
  }),
  egoLidar: new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 }),
  egoLidarGlow: new THREE.MeshBasicMaterial({ color: 0x22d3ee }),
  headlightGlow: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  taillightNormal: new THREE.MeshBasicMaterial({ color: 0x7f1d1d }),
  taillightBraking: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  wheelRubber: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }),
  wheelRim: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }),
  autoTop: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }),
  autoBody: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 }),
  motorcycleBody: new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.6, roughness: 0.3 }),
  riderSkin: new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 }),
  riderHelmet: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }),
  riderShirt: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 }),
  cattleBody: new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 }),
  cattleHorns: new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.6 }),
  pushcartWood: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }),
  pushcartGoods: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.7 }),
  pedestrianSkin: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }),
  pedestrianCloth: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 }),
  busBody: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 }),
  obstacleBarricade: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 }),
};

export function createEgoVehicleModel(): { group: THREE.Group; lidarDome: THREE.Mesh; taillightMesh: THREE.Mesh; wheels: THREE.Mesh[] } {
  const group = new THREE.Group();
  group.name = 'EgoVehicle';

  // High Quality Procedural Car
  const chassisGeom = new THREE.BoxGeometry(2.0, 0.6, 4.4);
  const chassis = new THREE.Mesh(chassisGeom, MATERIALS.egoBody);
  chassis.position.y = 0.5;
  chassis.castShadow = true;
  group.add(chassis);

  // Aerodynamic Cabin
  const cabinGeom = new THREE.BoxGeometry(1.6, 0.6, 2.2);
  // Add some slope
  const positionAttribute = cabinGeom.attributes.position;
  for ( let i = 0; i < positionAttribute.count; i ++ ) {
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);
    if (y > 0 && z > 0) positionAttribute.setZ(i, z - 0.3); // slope front
    if (y > 0 && z < 0) positionAttribute.setZ(i, z + 0.2); // slope back
  }
  cabinGeom.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeom, MATERIALS.egoGlass);
  cabin.position.set(0, 1.1, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Mirrors
  const mirrorGeom = new THREE.BoxGeometry(0.15, 0.1, 0.08);
  const leftMirror = new THREE.Mesh(mirrorGeom, MATERIALS.egoBody);
  leftMirror.position.set(-0.85, 0.9, 0.5);
  const rightMirror = new THREE.Mesh(mirrorGeom, MATERIALS.egoBody);
  rightMirror.position.set(0.85, 0.9, 0.5);
  group.add(leftMirror, rightMirror);

  const roofRackGeom = new THREE.BoxGeometry(0.8, 0.08, 1.0);
  const roofRack = new THREE.Mesh(roofRackGeom, MATERIALS.egoLidar);
  roofRack.position.set(0, 1.44, -0.2);
  group.add(roofRack);

  const lidarGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 32);
  const lidarDome = new THREE.Mesh(lidarGeom, MATERIALS.egoLidarGlow);
  lidarDome.position.set(0, 1.58, -0.2);
  group.add(lidarDome);

  const headlightGeom = new THREE.BoxGeometry(0.4, 0.15, 0.05);
  const leftHeadlight = new THREE.Mesh(headlightGeom, MATERIALS.headlightGlow);
  leftHeadlight.position.set(-0.7, 0.6, 2.2);
  const rightHeadlight = new THREE.Mesh(headlightGeom, MATERIALS.headlightGlow);
  rightHeadlight.position.set(0.7, 0.6, 2.2);
  group.add(leftHeadlight, rightHeadlight);

  const taillightGeom = new THREE.BoxGeometry(1.8, 0.15, 0.05);
  const taillightMesh = new THREE.Mesh(taillightGeom, MATERIALS.taillightNormal);
  taillightMesh.position.set(0, 0.65, -2.2);
  group.add(taillightMesh);

  const wheels: THREE.Mesh[] = [];
  const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelPositions = [[-0.95, 0.35, 1.3], [0.95, 0.35, 1.3], [-0.95, 0.35, -1.3], [0.95, 0.35, -1.3]];
  
  wheelPositions.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);
    const tire = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
    tire.castShadow = true;
    
    // Detailed rim
    const rimGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.27, 16);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, MATERIALS.wheelRim);
    
    wheelGroup.add(tire, rim);
    group.add(wheelGroup);
    wheels.push(tire); // return tire for rotation
  });

  loadAndNormalizeGLB('/models/ego_car.glb', group, [chassis, cabin, roofRack, leftMirror, rightMirror, leftHeadlight, rightHeadlight, taillightMesh, ...wheels], { length: 4.4, width: 2.0, height: 1.4 });

  return { group, lidarDome, taillightMesh, wheels };
}

export function createAutoRickshawModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'AutoRickshaw';

  const bodyGeom = new THREE.BoxGeometry(1.2, 0.6, 2.4);
  const body = new THREE.Mesh(bodyGeom, MATERIALS.autoBody);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  const canopyGeom = new THREE.BoxGeometry(1.25, 0.8, 1.8);
  const positionAttribute = canopyGeom.attributes.position;
  for ( let i = 0; i < positionAttribute.count; i ++ ) {
    if (positionAttribute.getY(i) > 0 && positionAttribute.getZ(i) > 0) positionAttribute.setZ(i, positionAttribute.getZ(i) - 0.4);
  }
  canopyGeom.computeVertexNormals();
  const canopy = new THREE.Mesh(canopyGeom, MATERIALS.autoTop);
  canopy.position.set(0, 1.2, -0.3);
  canopy.castShadow = true;
  group.add(canopy);
  
  // Single front wheel, two rear wheels
  const wheelGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 24);
  wheelGeom.rotateZ(Math.PI / 2);
  const frontWheel = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
  frontWheel.position.set(0, 0.25, 1.0);
  const leftRear = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
  leftRear.position.set(-0.55, 0.25, -0.8);
  const rightRear = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
  rightRear.position.set(0.55, 0.25, -0.8);
  group.add(frontWheel, leftRear, rightRear);

  loadAndNormalizeGLB('/models/auto_rickshaw.glb', group, [body, canopy, frontWheel, leftRear, rightRear], { length: 2.6, width: 1.3, height: 1.7 });
  return group;
}

export function createMotorcycleModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Motorcycle';
  
  const frameGeom = new THREE.BoxGeometry(0.35, 0.5, 1.6);
  const frame = new THREE.Mesh(frameGeom, MATERIALS.motorcycleBody);
  frame.position.y = 0.5;
  frame.castShadow = true;
  group.add(frame);

  const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 24);
  wheelGeom.rotateZ(Math.PI / 2);
  const frontWheel = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
  frontWheel.position.set(0, 0.3, 0.8);
  const rearWheel = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
  rearWheel.position.set(0, 0.3, -0.8);
  group.add(frontWheel, rearWheel);

  loadAndNormalizeGLB('/models/motorcycle.glb', group, [frame, frontWheel, rearWheel], { length: 1.8, width: 0.7, height: 1.1 });
  return group;
}

export function createCattleModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Cattle';

  const bodyGeom = new THREE.BoxGeometry(0.7, 0.8, 1.7);
  const body = new THREE.Mesh(bodyGeom, MATERIALS.cattleBody);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.5);
  const head = new THREE.Mesh(headGeom, MATERIALS.cattleBody);
  head.position.set(0, 1.3, 1.0);
  group.add(head);

  // Legs
  const legGeom = new THREE.BoxGeometry(0.15, 0.6, 0.15);
  const legPositions = [[-0.25, 0.3, 0.7], [0.25, 0.3, 0.7], [-0.25, 0.3, -0.7], [0.25, 0.3, -0.7]];
  const legs = legPositions.map(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeom, MATERIALS.cattleBody);
    leg.position.set(x, y, z);
    group.add(leg);
    return leg;
  });

  loadAndNormalizeGLB('/models/cattle.glb', group, [body, head, ...legs], { length: 2.2, width: 0.8, height: 1.6 });
  return group;
}

export function createPushcartModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Pushcart';

  const bedGeom = new THREE.BoxGeometry(1.2, 0.1, 2.0);
  const bed = new THREE.Mesh(bedGeom, MATERIALS.pushcartWood);
  bed.position.y = 0.8;
  bed.castShadow = true;
  group.add(bed);

  const goodsGeom = new THREE.BoxGeometry(1.0, 0.6, 1.8);
  const goods = new THREE.Mesh(goodsGeom, MATERIALS.pushcartGoods);
  goods.position.y = 1.15;
  group.add(goods);

  const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 24);
  wheelGeom.rotateZ(Math.PI / 2);
  const leftWheel = new THREE.Mesh(wheelGeom, MATERIALS.wheelRim);
  leftWheel.position.set(-0.65, 0.4, 0);
  const rightWheel = new THREE.Mesh(wheelGeom, MATERIALS.wheelRim);
  rightWheel.position.set(0.65, 0.4, 0);
  group.add(leftWheel, rightWheel);

  return group;
}

export function createPedestrianModel(): { group: THREE.Group; leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'Pedestrian';

  const torsoGeom = new THREE.BoxGeometry(0.4, 0.6, 0.25);
  const torso = new THREE.Mesh(torsoGeom, MATERIALS.pedestrianCloth);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);

  const headGeom = new THREE.SphereGeometry(0.15, 16, 16);
  const head = new THREE.Mesh(headGeom, MATERIALS.pedestrianSkin);
  head.position.y = 1.55;
  group.add(head);

  const limbGeom = new THREE.BoxGeometry(0.12, 0.55, 0.12);
  limbGeom.translate(0, -0.275, 0);

  const leftLeg = new THREE.Mesh(limbGeom, MATERIALS.wheelRubber);
  leftLeg.position.set(-0.11, 0.8, 0);
  const rightLeg = new THREE.Mesh(limbGeom, MATERIALS.wheelRubber);
  rightLeg.position.set(0.11, 0.8, 0);

  const leftArm = new THREE.Mesh(limbGeom, MATERIALS.pedestrianSkin);
  leftArm.position.set(-0.26, 1.3, 0);
  const rightArm = new THREE.Mesh(limbGeom, MATERIALS.pedestrianSkin);
  rightArm.position.set(0.26, 1.3, 0);

  group.add(leftLeg, rightLeg, leftArm, rightArm);

  loadAndNormalizeGLB('/models/pedestrian.glb', group, [torso, head, leftLeg, rightLeg, leftArm, rightArm], { length: 0.3, width: 0.5, height: 1.75 });
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function createVehicleModel(type: 'car' | 'bus' | 'truck'): THREE.Group {
  const group = new THREE.Group();
  const isBus = type === 'bus';
  const isTruck = type === 'truck';
  
  const length = isBus ? 8.5 : isTruck ? 7.0 : 4.4;
  const height = isBus ? 2.5 : isTruck ? 2.8 : 1.4;
  const width = isBus ? 2.4 : isTruck ? 2.4 : 1.8;

  // Detailed procedural vehicle
  const chassisGeom = new THREE.BoxGeometry(width, height * 0.4, length);
  const bodyMat = isBus ? MATERIALS.busBody : isTruck ? MATERIALS.pushcartWood : MATERIALS.wheelRim;
  const body = new THREE.Mesh(chassisGeom, bodyMat);
  body.position.y = height * 0.2 + 0.4;
  body.castShadow = true;
  group.add(body);

  const cabinGeom = new THREE.BoxGeometry(width * 0.9, height * 0.5, length * 0.8);
  const positionAttribute = cabinGeom.attributes.position;
  if (!isBus && !isTruck) {
    for ( let i = 0; i < positionAttribute.count; i ++ ) {
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);
      if (y > 0 && z > 0) positionAttribute.setZ(i, z - 0.5); 
      if (y > 0 && z < 0) positionAttribute.setZ(i, z + 0.3); 
    }
    cabinGeom.computeVertexNormals();
  }
  const cabin = new THREE.Mesh(cabinGeom, MATERIALS.egoGlass);
  cabin.position.set(0, height * 0.7 + 0.4, isTruck ? 1.0 : 0);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24);
  wheelGeom.rotateZ(Math.PI / 2);
  const zOffset = length / 2 - 0.8;
  const xOffset = width / 2;
  const wheelPositions = [[-xOffset, 0.4, zOffset], [xOffset, 0.4, zOffset], [-xOffset, 0.4, -zOffset], [xOffset, 0.4, -zOffset]];
  const wheels = wheelPositions.map(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
    wheel.position.set(x, y, z);
    group.add(wheel);
    return wheel;
  });

  if (type === 'car') {
    loadAndNormalizeGLB('/models/car.glb', group, [body, cabin, ...wheels], { length: 4.5, width: 1.8, height: 1.5 });
  } else if (type === 'bus') {
    loadAndNormalizeGLB('/models/bus.glb', group, [body, cabin, ...wheels], { length: 11.0, width: 2.5, height: 3.2 });
  } else {
    loadAndNormalizeGLB('/models/truck.glb', group, [body, cabin, ...wheels], { length: 8.0, width: 2.5, height: 3.5 });
  }

  return group;
}

export function createObstacleModel(label: string): THREE.Group {
  const group = new THREE.Group();
  
  // Traffic Cone style procedural obstacle
  const geom = new THREE.ConeGeometry(0.3, 0.8, 16);
  const mesh = new THREE.Mesh(geom, MATERIALS.obstacleBarricade);
  mesh.position.y = 0.4;
  mesh.castShadow = true;
  
  const baseGeom = new THREE.BoxGeometry(0.7, 0.05, 0.7);
  const base = new THREE.Mesh(baseGeom, MATERIALS.wheelRubber);
  base.position.y = 0.025;
  
  group.add(mesh, base);
  return group;
}
