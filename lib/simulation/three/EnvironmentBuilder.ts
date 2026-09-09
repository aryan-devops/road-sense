import * as THREE from 'three';
import type { ScenarioConfig, Vector2 } from '@/types/simulation';

export type WeatherCondition = 'clear' | 'night' | 'rainy' | 'foggy' | 'dusty';

export class EnvironmentBuilder {
  private scene: THREE.Scene;
  private roadMesh: THREE.Mesh | null = null;
  private shoulderMesh: THREE.Mesh | null = null;
  private terrainMesh: THREE.Mesh | null = null;
  private roadsideObjectsGroup: THREE.Group = new THREE.Group();
  private weatherParticles: THREE.Points | null = null;
  private rainVelocities: Float32Array | null = null;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(50, 80, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 250;
    const d = 60;
    this.directionalLight.shadow.camera.left = -d;
    this.directionalLight.shadow.camera.right = d;
    this.directionalLight.shadow.camera.top = d;
    this.directionalLight.shadow.camera.bottom = -d;

    this.hemisphereLight = new THREE.HemisphereLight(0x0ea5e9, 0x0f172a, 0.3);

    this.scene.add(this.ambientLight, this.directionalLight, this.hemisphereLight);
    this.scene.add(this.roadsideObjectsGroup);
  }

  /**
   * Builds the road surface and roadside environment from scenario boundaries and road type.
   * Applying a 'Pro Developer Realistic' aesthetic.
   */
  buildScenarioEnvironment(scenario: ScenarioConfig) {
    // Clear previous environment
    if (this.roadMesh) this.scene.remove(this.roadMesh);
    if (this.shoulderMesh) this.scene.remove(this.shoulderMesh);
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    this.roadsideObjectsGroup.clear();

    const roadWidth = 24; // Wider road for lane changes and merges
    const roadLength = 1200; // Road extent along X axis

    // 1. Terrain (Grass/Soil)
    const terrainGeom = new THREE.PlaneGeometry(roadLength * 1.5, 600, 32, 32);
    terrainGeom.rotateX(-Math.PI / 2);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x2d4c1e, // Realistic dark grass green
      roughness: 0.9,
      metalness: 0.05,
    });
    this.terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
    this.terrainMesh.position.set(500, -0.1, 300);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // 2. Realistic Asphalt Road
    const roadGeom = new THREE.PlaneGeometry(roadLength, roadWidth, 1, 1);
    roadGeom.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x333333, // Asphalt grey
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    this.roadMesh = new THREE.Mesh(roadGeom, roadMat);
    this.roadMesh.position.set(500, 0.01, 300);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    // Realistic Lane markings (White Dashed inside, Yellow Solid edge)
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    
    // Edges (Solid yellow/white)
    const topEdgeGeom = new THREE.PlaneGeometry(roadLength, 0.3);
    topEdgeGeom.rotateX(-Math.PI / 2);
    const topEdge = new THREE.Mesh(topEdgeGeom, whiteLineMat);
    topEdge.position.set(500, 0.02, 300 - roadWidth / 2 + 0.5);
    
    const bottomEdgeGeom = new THREE.PlaneGeometry(roadLength, 0.3);
    bottomEdgeGeom.rotateX(-Math.PI / 2);
    const bottomEdge = new THREE.Mesh(bottomEdgeGeom, yellowLineMat);
    bottomEdge.position.set(500, 0.02, 300 + roadWidth / 2 - 0.5);
    this.roadsideObjectsGroup.add(topEdge, bottomEdge);

    // Center Dashed Lanes
    const numDashes = 150;
    const dashLength = 3.5;
    const gapLength = 4.5;
    const linesGroup = new THREE.Group();
    
    for (const offset of [-4, 0, 4]) {
      for (let i = 0; i < numDashes; i++) {
        const dashGeom = new THREE.PlaneGeometry(dashLength, 0.15);
        dashGeom.rotateX(-Math.PI / 2);
        const dash = new THREE.Mesh(dashGeom, whiteLineMat);
        dash.position.set((i * (dashLength + gapLength)) - roadLength / 2 + 500, 0.02, 300 + offset);
        linesGroup.add(dash);
      }
    }
    this.roadsideObjectsGroup.add(linesGroup);

    // Concrete Shoulders/Curbs
    const curbGeom = new THREE.BoxGeometry(roadLength, 0.3, 2);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
    const topCurb = new THREE.Mesh(curbGeom, curbMat);
    topCurb.position.set(500, 0.15, 300 - roadWidth / 2 - 1);
    topCurb.receiveShadow = true;
    
    const bottomCurb = new THREE.Mesh(curbGeom, curbMat);
    bottomCurb.position.set(500, 0.15, 300 + roadWidth / 2 + 1);
    bottomCurb.receiveShadow = true;
    this.roadsideObjectsGroup.add(topCurb, bottomCurb);

    // 4. Generate Realistic Assets along the road
    this.generateRoadsideAssets(scenario, roadWidth);
  }

  private generateRoadsideAssets(scenario: ScenarioConfig, roadWidth: number) {
    // Realistic Streetlights
    for (let x = 60; x < 960; x += 80) {
      const zSide = 300 + (roadWidth / 2 + 3.0);
      const streetlight = this.createStreetlight();
      streetlight.position.set(x, 0, zSide);
      // alternate sides
      if (x % 160 === 0) {
        streetlight.position.z = 300 - (roadWidth / 2 + 3.0);
        streetlight.rotation.y = Math.PI;
      }
      this.roadsideObjectsGroup.add(streetlight);
    }

    // Procedural Buildings/Trees
    for (let x = 80; x < 900; x += 60) {
      const zSideTop = 300 - (roadWidth / 2 + 10);
      const zSideBottom = 300 + (roadWidth / 2 + 10);
      
      if (Math.random() > 0.5) {
        const building = this.createBuilding();
        building.position.set(x, 0, zSideTop - Math.random() * 5);
        this.roadsideObjectsGroup.add(building);
      } else {
        const tree = this.createTree();
        tree.position.set(x, 0, zSideTop);
        this.roadsideObjectsGroup.add(tree);
      }

      if (Math.random() > 0.3) {
        const tree = this.createTree();
        tree.position.set(x + 20, 0, zSideBottom);
        this.roadsideObjectsGroup.add(tree);
      }
    }
  }

  private createStreetlight(): THREE.Group {
    const group = new THREE.Group();
    
    // Pole
    const poleGeom = new THREE.CylinderGeometry(0.15, 0.2, 8, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6, metalness: 0.7 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 4;
    pole.castShadow = true;
    group.add(pole);

    // Arm
    const armGeom = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    armGeom.rotateZ(Math.PI / 2);
    const arm = new THREE.Mesh(armGeom, poleMat);
    arm.position.set(0, 7.8, -1.2);
    group.add(arm);

    // Lamp housing
    const lampGeom = new THREE.BoxGeometry(0.4, 0.15, 0.6);
    const lamp = new THREE.Mesh(lampGeom, poleMat);
    lamp.position.set(0, 7.8, -2.4);
    group.add(lamp);

    // Glowing bulb
    const bulbGeom = new THREE.PlaneGeometry(0.3, 0.5);
    bulbGeom.rotateX(Math.PI / 2);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbea });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.set(0, 7.72, -2.4);
    group.add(bulb);

    return group;
  }

  private createBuilding(): THREE.Group {
    const group = new THREE.Group();
    const height = 8 + Math.random() * 15;
    const width = 10 + Math.random() * 8;
    const depth = 8 + Math.random() * 5;
    
    const geom = new THREE.BoxGeometry(width, height, depth);
    const grayTones = [0x94a3b8, 0x64748b, 0x475569, 0xe2e8f0];
    const mat = new THREE.MeshStandardMaterial({
      color: grayTones[Math.floor(Math.random() * grayTones.length)],
      roughness: 0.8,
    });
    
    const block = new THREE.Mesh(geom, mat);
    block.position.y = height / 2;
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);

    return group;
  }

  private createTree(): THREE.Group {
    const group = new THREE.Group();
    
    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1.0 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage
    const leavesGeom = new THREE.SphereGeometry(2.5, 12, 12);
    // Add some random displacement
    const pos = leavesGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(i, pos.getX(i) + (Math.random() - 0.5) * 0.5, pos.getY(i) + (Math.random() - 0.5) * 0.5, pos.getZ(i) + (Math.random() - 0.5) * 0.5);
    }
    leavesGeom.computeVertexNormals();
    
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });
    const leaves = new THREE.Mesh(leavesGeom, leavesMat);
    leaves.position.y = 4.0;
    leaves.castShadow = true;
    group.add(leaves);

    return group;
  }

  /**
   * Sets dynamic weather and lighting.
   */
  setWeather(weather: WeatherCondition) {
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles = null;
    }

    switch (weather) {
      case 'clear':
        this.scene.background = new THREE.Color(0x070e1b);
        this.scene.fog = new THREE.FogExp2(0x070e1b, 0.0035);
        this.ambientLight.intensity = 0.45;
        this.ambientLight.color.setHex(0xffffff);
        this.directionalLight.intensity = 1.3;
        this.directionalLight.color.setHex(0xffffff);
        break;

      case 'night':
        this.scene.background = new THREE.Color(0x020617);
        this.scene.fog = new THREE.FogExp2(0x020617, 0.008);
        this.ambientLight.intensity = 0.12;
        this.ambientLight.color.setHex(0x38bdf8);
        this.directionalLight.intensity = 0.25;
        this.directionalLight.color.setHex(0x93c5fd);
        break;

      case 'rainy':
        this.scene.background = new THREE.Color(0x0f172a);
        this.scene.fog = new THREE.FogExp2(0x0f172a, 0.007);
        this.ambientLight.intensity = 0.3;
        this.ambientLight.color.setHex(0x64748b);
        this.directionalLight.intensity = 0.6;
        this.setupRainParticles();
        break;

      case 'foggy':
        this.scene.background = new THREE.Color(0x1e293b);
        this.scene.fog = new THREE.FogExp2(0x1e293b, 0.022); // Thick fog reduces perception distance
        this.ambientLight.intensity = 0.5;
        this.directionalLight.intensity = 0.4;
        break;

      case 'dusty':
        this.scene.background = new THREE.Color(0x291d12);
        this.scene.fog = new THREE.FogExp2(0x291d12, 0.015);
        this.ambientLight.intensity = 0.35;
        this.ambientLight.color.setHex(0xd97706);
        this.directionalLight.intensity = 0.8;
        this.directionalLight.color.setHex(0xf59e0b);
        break;
    }
  }

  private setupRainParticles() {
    const rainCount = 1800;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    this.rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160 + 500;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 + 300;
      this.rainVelocities[i] = 0.5 + Math.random() * 0.4;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
    });
    this.weatherParticles = new THREE.Points(geom, mat);
    this.scene.add(this.weatherParticles);
  }

  update(delta: number, egoX: number) {
    // Update rain positions
    if (this.weatherParticles && this.rainVelocities) {
      const pos = this.weatherParticles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      for (let i = 0; i < pos.count; i++) {
        arr[i * 3 + 1] -= this.rainVelocities[i] * 45 * delta;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 40;
          arr[i * 3] = egoX + (Math.random() - 0.5) * 140;
        }
      }
      pos.needsUpdate = true;
    }

    // Move directional sunlight with the ego vehicle
    this.directionalLight.position.x = egoX + 40;
    this.directionalLight.target.position.set(egoX, 0, 300);
    this.directionalLight.target.updateMatrixWorld();
  }
}
