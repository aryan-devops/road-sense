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

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const scaleX = targetDimensions.width / size.x;
    const scaleY = targetDimensions.height / size.y;
    const scaleZ = targetDimensions.length / size.z;
    const uniformScale = Math.min(scaleX, scaleY, scaleZ);

    model.scale.setScalar(uniformScale);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);

    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y = (model.position.y - scaledBox.min.y) + yOffset;

    // Enhance materials for realism
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    fallbackMeshes.forEach(mesh => targetGroup.remove(mesh));
    targetGroup.add(model);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, undefined, (error: any) => {
    // Silently fall back to our high-quality procedurals if the GLB is missing
  });
}

// Highly Realistic Procedural Material Cache
const MATERIALS = {
  carPaintWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.1 }),
  carPaintSilver: new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.2 }),
  carPaintBlack: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.2 }),
  carGlass: new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.1, envMapIntensity: 1.0, transparent: true, opacity: 0.85 }),
  carPlastic: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.8 }),
  wheelRubber: new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.9 }),
  wheelRim: new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9, roughness: 0.2 }),

  headlightGlow: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  taillightNormal: new THREE.MeshBasicMaterial({ color: 0xaa0000 }),
  taillightBraking: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  indicatorAmber: new THREE.MeshBasicMaterial({ color: 0xff9900 }),

  autoTop: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 }), // iconic yellow
  autoBody: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }), // iconic green
  autoFrame: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 }),

  motorcycleBody: new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.2 }),

  cattleBodyWhite: new THREE.MeshStandardMaterial({ color: 0xebebe4, roughness: 1.0 }),
  cattleBodyBrown: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 }),
  cattleDetails: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }), // hooves/nose
  cattleHorns: new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.6 }),

  pushcartWood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }),
  pushcartGoods: new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.8 }),

  pedestrianSkin: new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.7 }),
  pedestrianShirt: new THREE.MeshStandardMaterial({ color: 0x2e86c1, roughness: 0.9 }),
  pedestrianPants: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }),

  busBody: new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.2, roughness: 0.3 }),
  truckCab: new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.4, roughness: 0.4 }),
  truckTrailer: new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.7, roughness: 0.5 }),

  barrierYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 }),
  barrierBlack: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }),
};

export function createEgoVehicleModel(): { group: THREE.Group; lidarDome: THREE.Mesh; taillightMesh: THREE.Mesh; wheels: THREE.Mesh[] } {
  const group = new THREE.Group();
  group.name = 'EgoVehicle';

  // Realistic Sedan Shape
  // Lower chassis
  const chassisGeom = new THREE.BoxGeometry(1.9, 0.45, 4.4);
  const chassis = new THREE.Mesh(chassisGeom, MATERIALS.carPaintWhite);
  chassis.position.set(0, 0.45, 0);
  chassis.castShadow = true;
  group.add(chassis);

  // Cabin
  const cabinGeom = new THREE.BoxGeometry(1.6, 0.55, 2.4);
  const pos = cabinGeom.attributes.position;
  // Slope front and rear windshields
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 0 && z > 0) pos.setZ(i, z - 0.4); // front slope
    if (y > 0 && z < 0) pos.setZ(i, z + 0.5); // rear slope
  }
  cabinGeom.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeom, MATERIALS.carPaintWhite);
  cabin.position.set(0, 0.95, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  // Windows (Black Glass wrap)
  const windowGeom = new THREE.BoxGeometry(1.65, 0.4, 2.2);
  const winPos = windowGeom.attributes.position;
  for (let i = 0; i < winPos.count; i++) {
    const y = winPos.getY(i);
    const z = winPos.getZ(i);
    if (y > 0 && z > 0) winPos.setZ(i, z - 0.35);
    if (y > 0 && z < 0) winPos.setZ(i, z + 0.45);
  }
  windowGeom.computeVertexNormals();
  const windows = new THREE.Mesh(windowGeom, MATERIALS.carGlass);
  windows.position.set(0, 0.95, -0.2);
  group.add(windows);

  // Bumpers
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.2), MATERIALS.carPlastic);
  frontBumper.position.set(0, 0.3, 2.2);
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.2), MATERIALS.carPlastic);
  rearBumper.position.set(0, 0.3, -2.2);
  group.add(frontBumper, rearBumper);

  // Headlights
  const headlightGeom = new THREE.BoxGeometry(0.35, 0.15, 0.05);
  const leftHeadlight = new THREE.Mesh(headlightGeom, MATERIALS.headlightGlow);
  leftHeadlight.position.set(-0.65, 0.5, 2.22);
  const rightHeadlight = new THREE.Mesh(headlightGeom, MATERIALS.headlightGlow);
  rightHeadlight.position.set(0.65, 0.5, 2.22);
  group.add(leftHeadlight, rightHeadlight);

  // Taillights
  const taillightGeom = new THREE.BoxGeometry(1.7, 0.15, 0.05);
  const taillightMesh = new THREE.Mesh(taillightGeom, MATERIALS.taillightNormal);
  taillightMesh.position.set(0, 0.5, -2.22);
  group.add(taillightMesh);

  // Sensor array (Roof rack)
  const roofRack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), MATERIALS.carPlastic);
  roofRack.position.set(0, 1.25, -0.2);
  group.add(roofRack);

  // LiDAR
  const lidarDome = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16), MATERIALS.carPlastic);
  lidarDome.position.set(0, 1.35, -0.2);
  group.add(lidarDome);

  // Wheels
  const wheels: THREE.Mesh[] = [];
  const wheelGeom = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 24);
  wheelGeom.rotateZ(Math.PI / 2);
  const rimGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.24, 16);
  rimGeom.rotateZ(Math.PI / 2);

  const wPositions = [[-0.85, 0.33, 1.4], [0.85, 0.33, 1.4], [-0.85, 0.33, -1.3], [0.85, 0.33, -1.3]];
  wPositions.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, y, z);
    const tire = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeom, MATERIALS.wheelRim);
    wheelGroup.add(tire, rim);
    group.add(wheelGroup);
    wheels.push(tire);
  });

  loadAndNormalizeGLB('/models/ego_car.glb', group, [chassis, cabin, windows, frontBumper, rearBumper, roofRack, leftHeadlight, rightHeadlight, taillightMesh, ...wheels], { length: 4.4, width: 2.0, height: 1.4 });

  return { group, lidarDome, taillightMesh, wheels };
}

export function createAutoRickshawModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'AutoRickshaw';

  // Bottom chassis (Green)
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 2.6), MATERIALS.autoBody);
  body.position.set(0, 0.45, 0);
  body.castShadow = true;
  group.add(body);

  // Top canopy (Yellow)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.8), MATERIALS.autoTop);
  canopy.position.set(0, 1.1, -0.4);
  canopy.castShadow = true;
  group.add(canopy);

  // Pillars (Black Frame)
  const pillarGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
  const flPillar = new THREE.Mesh(pillarGeom, MATERIALS.autoFrame);
  flPillar.position.set(-0.6, 1.1, 0.45);
  const frPillar = new THREE.Mesh(pillarGeom, MATERIALS.autoFrame);
  frPillar.position.set(0.6, 1.1, 0.45);
  group.add(flPillar, frPillar);

  // Windshield
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), MATERIALS.carGlass);
  glass.position.set(0, 1.1, 0.5);
  group.add(glass);

  // Wheels (1 front, 2 rear)
  const wheelGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const w1 = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber); w1.position.set(0, 0.25, 1.1);
  const w2 = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber); w2.position.set(-0.6, 0.25, -0.9);
  const w3 = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber); w3.position.set(0.6, 0.25, -0.9);
  group.add(w1, w2, w3);

  loadAndNormalizeGLB('/models/auto_rickshaw.glb', group, [body, canopy, flPillar, frPillar, glass, w1, w2, w3], { length: 2.8, width: 1.4, height: 1.7 });
  return group;
}

export function createMotorcycleModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Motorcycle';

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.6), MATERIALS.motorcycleBody);
  frame.position.set(0, 0.55, 0);
  frame.castShadow = true;
  group.add(frame);

  // Rider block
  const rider = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.4), MATERIALS.pedestrianShirt);
  rider.position.set(0, 1.15, -0.2);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22), MATERIALS.carPaintBlack);
  helmet.position.set(0, 1.6, -0.1);
  group.add(rider, helmet);

  const wheelGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24);
  wheelGeom.rotateZ(Math.PI / 2);
  const w1 = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber); w1.position.set(0, 0.3, 0.8);
  const w2 = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber); w2.position.set(0, 0.3, -0.8);
  group.add(w1, w2);

  loadAndNormalizeGLB('/models/motorcycle.glb', group, [frame, rider, helmet, w1, w2], { length: 2.0, width: 0.7, height: 1.5 });
  return group;
}

export function createCattleModel(): { group: THREE.Group; legs: THREE.Mesh[] } {
  const group = new THREE.Group();
  group.name = 'Cattle';

  const mat = Math.random() > 0.5 ? MATERIALS.cattleBodyWhite : MATERIALS.cattleBodyBrown;

  // Main Torso
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.6), mat);
  body.position.set(0, 1.05, 0);
  body.castShadow = true;
  group.add(body);

  // Neck and Head
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.5), mat);
  neck.position.set(0, 1.2, 0.8);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.5), mat);
  head.position.set(0, 1.3, 1.2);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.2), MATERIALS.cattleDetails);
  snout.position.set(0, 1.2, 1.5);
  group.add(neck, head, snout);

  // Horns
  const hornGeom = new THREE.ConeGeometry(0.04, 0.3, 8);
  const leftHorn = new THREE.Mesh(hornGeom, MATERIALS.cattleHorns);
  leftHorn.position.set(-0.2, 1.55, 1.1);
  leftHorn.rotation.z = Math.PI / 6;
  const rightHorn = new THREE.Mesh(hornGeom, MATERIALS.cattleHorns);
  rightHorn.position.set(0.2, 1.55, 1.1);
  rightHorn.rotation.z = -Math.PI / 6;
  group.add(leftHorn, rightHorn);

  // Tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.6), mat);
  tail.position.set(0, 0.9, -0.85);
  tail.rotation.x = -Math.PI / 8;
  group.add(tail);

  // Legs (Thicker)
  const legGeom = new THREE.BoxGeometry(0.15, 0.7, 0.15);
  const legs = [
    [-0.2, 0.35, 0.6], [0.2, 0.35, 0.6],
    [-0.2, 0.35, -0.6], [0.2, 0.35, -0.6]
  ].map(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeom, mat);
    leg.position.set(x, y, z);

    // Hoof
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), MATERIALS.cattleDetails);
    hoof.position.set(0, -0.3, 0);
    leg.add(hoof);

    group.add(leg);
    return leg;
  });

  loadAndNormalizeGLB('/models/cattle.glb', group, [body, neck, head, snout, leftHorn, rightHorn, tail, ...legs], { length: 2.2, width: 0.8, height: 1.6 });
  return { group, legs };
}

export function createPushcartModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Pushcart';

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 2.2), MATERIALS.pushcartWood);
  bed.position.set(0, 0.8, 0);
  bed.castShadow = true;
  group.add(bed);

  const goods = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.8), MATERIALS.pushcartGoods);
  goods.position.set(0, 1.25, 0);
  group.add(goods);

  // Large spoked wheels
  const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const w1 = new THREE.Mesh(wheelGeom, MATERIALS.carPlastic); w1.position.set(-0.65, 0.5, 0.2);
  const w2 = new THREE.Mesh(wheelGeom, MATERIALS.carPlastic); w2.position.set(0.65, 0.5, 0.2);
  group.add(w1, w2);

  // Handles
  const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0), MATERIALS.pushcartWood);
  h1.position.set(-0.5, 0.8, -1.3); h1.rotation.x = Math.PI / 2;
  const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0), MATERIALS.pushcartWood);
  h2.position.set(0.5, 0.8, -1.3); h2.rotation.x = Math.PI / 2;
  group.add(h1, h2);

  return group;
}

export function createPedestrianModel(): { group: THREE.Group; leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh } {
  const group = new THREE.Group();
  group.name = 'Pedestrian';

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), MATERIALS.pedestrianShirt);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), MATERIALS.pedestrianSkin);
  head.position.y = 1.52;
  group.add(head);

  const limbGeom = new THREE.BoxGeometry(0.14, 0.55, 0.14);
  limbGeom.translate(0, -0.275, 0);

  const leftLeg = new THREE.Mesh(limbGeom, MATERIALS.pedestrianPants); leftLeg.position.set(-0.11, 0.8, 0);
  const rightLeg = new THREE.Mesh(limbGeom, MATERIALS.pedestrianPants); rightLeg.position.set(0.11, 0.8, 0);

  const leftArm = new THREE.Mesh(limbGeom, MATERIALS.pedestrianSkin); leftArm.position.set(-0.28, 1.35, 0);
  const rightArm = new THREE.Mesh(limbGeom, MATERIALS.pedestrianSkin); rightArm.position.set(0.28, 1.35, 0);

  group.add(leftLeg, rightLeg, leftArm, rightArm);

  loadAndNormalizeGLB('/models/pedestrian.glb', group, [torso, head, leftLeg, rightLeg, leftArm, rightArm], { length: 0.4, width: 0.6, height: 1.75 });
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function createVehicleModel(type: 'car' | 'bus' | 'truck'): THREE.Group {
  const group = new THREE.Group();
  const isBus = type === 'bus';
  const isTruck = type === 'truck';

  const length = isBus ? 9.5 : isTruck ? 8.0 : 4.4;
  const height = isBus ? 3.0 : isTruck ? 3.5 : 1.4;
  const width = isBus ? 2.5 : isTruck ? 2.5 : 1.8;

  if (isTruck) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.8, 2.5), MATERIALS.truckCab);
    cab.position.set(0, height * 0.4 + 0.5, length / 2 - 1.25);
    cab.castShadow = true;

    const trailer = new THREE.Mesh(new THREE.BoxGeometry(width, height, length - 3), MATERIALS.truckTrailer);
    trailer.position.set(0, height * 0.5 + 0.5, -1.5);
    trailer.castShadow = true;

    group.add(cab, trailer);
  } else if (isBus) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), MATERIALS.busBody);
    body.position.set(0, height / 2 + 0.4, 0);
    body.castShadow = true;

    const windows = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, height * 0.4, length * 0.95), MATERIALS.carGlass);
    windows.position.set(0, height / 2 + 0.6, 0);
    group.add(body, windows);
  } else {
    // Generic NPC Car
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.4, length), MATERIALS.carPaintSilver);
    body.position.set(0, 0.5, 0);
    body.castShadow = true;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.5, length * 0.6), MATERIALS.carPaintBlack);
    cabin.position.set(0, 1.0, -0.2);
    group.add(body, cabin);
  }

  // Generic wheels
  const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const zOffset = length / 2 - 1.0;
  const wPos = [[-width / 2, 0.4, zOffset], [width / 2, 0.4, zOffset], [-width / 2, 0.4, -zOffset], [width / 2, 0.4, -zOffset]];
  const wheels = wPos.map(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeom, MATERIALS.wheelRubber);
    w.position.set(x, y, z);
    group.add(w);
    return w;
  });

  const url = isBus ? '/models/bus.glb' : isTruck ? '/models/truck.glb' : '/models/car.glb';
  loadAndNormalizeGLB(url, group, [], { length, width, height });

  return group;
}

export function createObstacleModel(label: string): THREE.Group {
  const group = new THREE.Group();

  // Highly realistic striped barricade
  const frameGeom = new THREE.BoxGeometry(1.5, 1.0, 0.1);
  const frame = new THREE.Mesh(frameGeom, MATERIALS.barrierYellow);
  frame.position.y = 0.5;
  frame.castShadow = true;

  // Black stripes
  const stripeGeom = new THREE.PlaneGeometry(1.5, 1.0);
  const stripeTex = createStripeTexture();
  const stripeMat = new THREE.MeshBasicMaterial({ map: stripeTex, transparent: true });

  const frontStripe = new THREE.Mesh(stripeGeom, stripeMat);
  frontStripe.position.set(0, 0.5, 0.051);
  const backStripe = new THREE.Mesh(stripeGeom, stripeMat);
  backStripe.position.set(0, 0.5, -0.051);
  backStripe.rotation.y = Math.PI;

  const legGeom = new THREE.BoxGeometry(0.1, 1.0, 0.4);
  const leftLeg = new THREE.Mesh(legGeom, MATERIALS.barrierBlack); leftLeg.position.set(-0.7, 0.5, 0);
  const rightLeg = new THREE.Mesh(legGeom, MATERIALS.barrierBlack); rightLeg.position.set(0.7, 0.5, 0);

  group.add(frame, frontStripe, backStripe, leftLeg, rightLeg);
  return group;
}

function createStripeTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#00000000'; // clear
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#111111';
    for (let i = -256; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 32, 0);
      ctx.lineTo(i + 256 + 32, 256);
      ctx.lineTo(i + 256, 256);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
