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

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.directionalLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    this.directionalLight.position.set(100, 150, 50);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 4096;
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.near = 10;
    this.directionalLight.shadow.camera.far = 400;
    this.directionalLight.shadow.bias = -0.0005;
    const d = 100;
    this.directionalLight.shadow.camera.left = -d;
    this.directionalLight.shadow.camera.right = d;
    this.directionalLight.shadow.camera.top = d;
    this.directionalLight.shadow.camera.bottom = -d;

    // Realistic sky illumination
    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x5b4d3c, 0.6);

    this.scene.add(this.ambientLight, this.directionalLight, this.hemisphereLight);
    this.scene.add(this.roadsideObjectsGroup);
  }

  /**
   * Builds the road surface and roadside environment from scenario boundaries and road type.
   * Applying a Realistic Indian Road aesthetic.
   */
  buildScenarioEnvironment(scenario: ScenarioConfig) {
    // Clear previous environment
    if (this.roadMesh) this.scene.remove(this.roadMesh);
    if (this.shoulderMesh) this.scene.remove(this.shoulderMesh);
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    this.roadsideObjectsGroup.clear();

    const roadWidth = 24; 
    const roadLength = 1600;

    // 1. Terrain (Dry/Patchy Soil & Grass typical of Indian highways)
    const terrainGeom = new THREE.PlaneGeometry(roadLength * 1.5, 800, 64, 64);
    terrainGeom.rotateX(-Math.PI / 2);
    
    // Add subtle noise to terrain vertices
    const positions = terrainGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i);
      const pz = positions.getZ(i);
      const noise = Math.sin(px * 0.05) * Math.cos(pz * 0.05) * 2.0;
      positions.setY(i, noise - 0.2); // slightly below road
    }
    terrainGeom.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x827354, // Dry earth / dusty grass color
      roughness: 1.0,
      metalness: 0.0,
    });
    this.terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
    this.terrainMesh.position.set(500, 0, 300);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // 2. Realistic Asphalt Road
    const roadGeom = new THREE.PlaneGeometry(roadLength, roadWidth, 32, 4);
    roadGeom.rotateX(-Math.PI / 2);
    
    // Slight crown to the road
    const roadPos = roadGeom.attributes.position;
    for (let i = 0; i < roadPos.count; i++) {
      const z = roadPos.getZ(i);
      const distFromCenter = Math.abs(z);
      const crown = Math.max(0, (roadWidth / 2 - distFromCenter) * 0.02);
      roadPos.setY(i, crown);
    }
    roadGeom.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x4a4f54, // Weathered asphalt
      roughness: 0.85,
      metalness: 0.1,
    });
    this.roadMesh = new THREE.Mesh(roadGeom, roadMat);
    this.roadMesh.position.set(500, 0.01, 300);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    // 3. Realistic Lane markings
    const fadedWhiteMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.9 });
    const fadedYellowMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.9 });
    
    // Edges (Solid white/yellow, slightly broken)
    const edgeThickness = 0.25;
    const topEdgeGeom = new THREE.PlaneGeometry(roadLength, edgeThickness);
    topEdgeGeom.rotateX(-Math.PI / 2);
    const topEdge = new THREE.Mesh(topEdgeGeom, fadedWhiteMat);
    topEdge.position.set(500, 0.05, 300 - roadWidth / 2 + 0.5);
    topEdge.receiveShadow = true;
    
    const bottomEdgeGeom = new THREE.PlaneGeometry(roadLength, edgeThickness);
    bottomEdgeGeom.rotateX(-Math.PI / 2);
    const bottomEdge = new THREE.Mesh(bottomEdgeGeom, fadedYellowMat);
    bottomEdge.position.set(500, 0.05, 300 + roadWidth / 2 - 0.5);
    bottomEdge.receiveShadow = true;
    this.roadsideObjectsGroup.add(topEdge, bottomEdge);

    // Center Dashed Lanes
    const numDashes = 180;
    const dashLength = 3.0;
    const gapLength = 6.0;
    const linesGroup = new THREE.Group();
    
    for (const offset of [-4, 0, 4]) {
      for (let i = 0; i < numDashes; i++) {
        // Skip some dashes to simulate worn Indian roads
        if (Math.random() > 0.85) continue;

        const dashGeom = new THREE.PlaneGeometry(dashLength, 0.15);
        dashGeom.rotateX(-Math.PI / 2);
        const dash = new THREE.Mesh(dashGeom, fadedWhiteMat);
        dash.position.set((i * (dashLength + gapLength)) - roadLength / 2 + 500, 0.06, 300 + offset);
        dash.receiveShadow = true;
        linesGroup.add(dash);
      }
    }
    this.roadsideObjectsGroup.add(linesGroup);

    // Concrete Shoulders/Dirt Edges
    const curbGeom = new THREE.BoxGeometry(roadLength, 0.2, 3);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 1.0 }); // Dusty dirt shoulder
    const topCurb = new THREE.Mesh(curbGeom, curbMat);
    topCurb.position.set(500, 0.0, 300 - roadWidth / 2 - 1.5);
    topCurb.receiveShadow = true;
    
    const bottomCurb = new THREE.Mesh(curbGeom, curbMat);
    bottomCurb.position.set(500, 0.0, 300 + roadWidth / 2 + 1.5);
    bottomCurb.receiveShadow = true;
    this.roadsideObjectsGroup.add(topCurb, bottomCurb);

    // Add road patches/pothole decals
    for (let i = 0; i < 40; i++) {
      const patchGeom = new THREE.PlaneGeometry(1 + Math.random() * 3, 1 + Math.random() * 2);
      patchGeom.rotateX(-Math.PI / 2);
      const patchMat = new THREE.MeshStandardMaterial({
        color: 0x333638,
        roughness: 0.95,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      });
      const patch = new THREE.Mesh(patchGeom, patchMat);
      patch.position.set(
        Math.random() * roadLength - roadLength/2 + 500,
        0.03, // just above road
        300 + (Math.random() * roadWidth - roadWidth/2) * 0.8
      );
      patch.rotation.y = Math.random() * Math.PI;
      patch.receiveShadow = true;
      this.roadsideObjectsGroup.add(patch);
    }

    // 4. Generate Realistic Assets along the road
    this.generateRoadsideAssets(scenario, roadWidth);
  }

  private generateRoadsideAssets(scenario: ScenarioConfig, roadWidth: number) {
    // Realistic Streetlights
    for (let x = 0; x < 1200; x += 60) {
      const zSide = 300 + (roadWidth / 2 + 2.5);
      const streetlight = this.createStreetlight();
      streetlight.position.set(x, 0, zSide);
      // alternate sides
      if (x % 120 === 0) {
        streetlight.position.z = 300 - (roadWidth / 2 + 2.5);
        streetlight.rotation.y = Math.PI;
      }
      this.roadsideObjectsGroup.add(streetlight);
    }

    // Realistic Trees, Utility Poles, and Buildings
    for (let x = -100; x < 1300; x += 35) {
      const zSideTop = 300 - (roadWidth / 2 + 4 + Math.random() * 15);
      const zSideBottom = 300 + (roadWidth / 2 + 4 + Math.random() * 15);
      
      const rand = Math.random();
      
      if (rand > 0.8) {
        const building = this.createBuilding();
        building.position.set(x, 0, zSideTop);
        this.roadsideObjectsGroup.add(building);
      } else if (rand > 0.3) {
        const tree = this.createTree();
        tree.position.set(x, 0, zSideTop);
        this.roadsideObjectsGroup.add(tree);
      } else if (rand > 0.2) {
        const pole = this.createUtilityPole();
        pole.position.set(x, 0, zSideTop);
        this.roadsideObjectsGroup.add(pole);
      }

      if (Math.random() > 0.4) {
        const tree = this.createTree();
        tree.position.set(x + 15, 0, zSideBottom);
        // Random rotation for variety
        tree.rotation.y = Math.random() * Math.PI;
        this.roadsideObjectsGroup.add(tree);
      }
    }
  }

  private createUtilityPole(): THREE.Group {
    const group = new THREE.Group();
    const poleGeom = new THREE.CylinderGeometry(0.15, 0.2, 9, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4d41, roughness: 0.9 }); // Wood/Concrete
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 4.5;
    pole.castShadow = true;
    
    const crossArmGeom = new THREE.BoxGeometry(2, 0.15, 0.15);
    const crossArm = new THREE.Mesh(crossArmGeom, poleMat);
    crossArm.position.set(0, 8, 0);
    crossArm.castShadow = true;
    
    group.add(pole, crossArm);
    return group;
  }

  private createStreetlight(): THREE.Group {
    const group = new THREE.Group();
    
    // Pole (Galvanized Steel)
    const poleGeom = new THREE.CylinderGeometry(0.12, 0.18, 9, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.y = 4.5;
    pole.castShadow = true;
    group.add(pole);

    // Arching Arm
    const armGeom = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 8);
    armGeom.rotateZ(Math.PI / 2.5);
    const arm = new THREE.Mesh(armGeom, poleMat);
    arm.position.set(0, 8.8, -1.2);
    group.add(arm);

    // Lamp housing
    const lampGeom = new THREE.BoxGeometry(0.3, 0.1, 0.8);
    const lamp = new THREE.Mesh(lampGeom, poleMat);
    lamp.position.set(0, 9.3, -2.8);
    lamp.rotation.x = Math.PI / 12;
    group.add(lamp);

    // Glowing bulb
    const bulbGeom = new THREE.PlaneGeometry(0.2, 0.6);
    bulbGeom.rotateX(Math.PI / 2);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.set(0, 9.24, -2.8);
    bulb.rotation.x = Math.PI / 12;
    group.add(bulb);

    return group;
  }

  private createBuilding(): THREE.Group {
    const group = new THREE.Group();
    // Typical Indian roadside shop / structure
    const isShop = Math.random() > 0.5;
    const height = isShop ? 4 + Math.random() * 3 : 8 + Math.random() * 12;
    const width = 6 + Math.random() * 8;
    const depth = 6 + Math.random() * 6;
    
    const geom = new THREE.BoxGeometry(width, height, depth);
    // Weathered plaster colors
    const colors = [0xe5e7eb, 0xfef08a, 0xfecaca, 0xbfdbfe, 0xffedd5, 0xd1d5db];
    const mat = new THREE.MeshStandardMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      roughness: 0.95,
    });
    
    const block = new THREE.Mesh(geom, mat);
    block.position.y = height / 2;
    block.castShadow = true;
    block.receiveShadow = true;
    group.add(block);

    // Add a shop awning or flat roof detail
    if (isShop) {
      const awningGeom = new THREE.PlaneGeometry(width, depth * 0.5);
      awningGeom.rotateX(-Math.PI / 2);
      awningGeom.rotateX(-0.2); // tilt
      const awningMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8, side: THREE.DoubleSide });
      const awning = new THREE.Mesh(awningGeom, awningMat);
      awning.position.set(0, height - 0.2, depth / 2 + 1);
      awning.castShadow = true;
      group.add(awning);
    }

    return group;
  }

  private createTree(): THREE.Group {
    const group = new THREE.Group();
    
    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.2 + Math.random()*0.3, 0.4 + Math.random()*0.4, 3 + Math.random()*2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = trunkGeom.parameters.height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // Foliage (Neem/Mango style broad canopy)
    const leavesMat = new THREE.MeshStandardMaterial({ 
      color: Math.random() > 0.5 ? 0x2e7d32 : 0x388e3c, 
      roughness: 0.8 
    });
    
    const numClusters = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numClusters; i++) {
      const leavesGeom = new THREE.SphereGeometry(1.5 + Math.random() * 2, 8, 8);
      // Rough up the sphere
      const pos = leavesGeom.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setXYZ(
          j, 
          pos.getX(j) * (0.8 + Math.random() * 0.4), 
          pos.getY(j) * (0.8 + Math.random() * 0.4), 
          pos.getZ(j) * (0.8 + Math.random() * 0.4)
        );
      }
      leavesGeom.computeVertexNormals();
      const cluster = new THREE.Mesh(leavesGeom, leavesMat);
      cluster.position.set(
        (Math.random() - 0.5) * 2,
        trunkGeom.parameters.height + 0.5 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      cluster.castShadow = true;
      cluster.receiveShadow = true;
      group.add(cluster);
    }

    // Scale whole tree slightly
    const scale = 0.8 + Math.random() * 0.6;
    group.scale.setScalar(scale);

    return group;
  }

  /**
   * Sets dynamic weather and lighting with realistic color temperatures.
   */
  setWeather(weather: WeatherCondition) {
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles = null;
    }

    switch (weather) {
      case 'clear':
        // Bright Indian Daylight
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);
        this.ambientLight.intensity = 0.7;
        this.ambientLight.color.setHex(0xffffff);
        this.directionalLight.intensity = 2.0;
        this.directionalLight.color.setHex(0xfff5e6); // Warm sunlight
        this.hemisphereLight.color.setHex(0x87ceeb);
        this.hemisphereLight.groundColor.setHex(0x827354);
        break;

      case 'night':
        // Nighttime with streetlamp ambient
        this.scene.background = new THREE.Color(0x050a12);
        this.scene.fog = new THREE.FogExp2(0x050a12, 0.006);
        this.ambientLight.intensity = 0.15;
        this.ambientLight.color.setHex(0x38bdf8); // Moonlight blue tint
        this.directionalLight.intensity = 0.1;
        this.directionalLight.color.setHex(0x93c5fd);
        this.hemisphereLight.color.setHex(0x050a12);
        this.hemisphereLight.groundColor.setHex(0x0a0a0a);
        break;

      case 'rainy':
        // Overcast, diffuse light
        this.scene.background = new THREE.Color(0x64748b);
        this.scene.fog = new THREE.FogExp2(0x64748b, 0.005);
        this.ambientLight.intensity = 0.8;
        this.ambientLight.color.setHex(0x94a3b8);
        this.directionalLight.intensity = 0.4;
        this.directionalLight.color.setHex(0xe2e8f0);
        this.hemisphereLight.color.setHex(0x64748b);
        this.hemisphereLight.groundColor.setHex(0x475569);
        this.setupRainParticles();
        break;

      case 'foggy':
        // Dense white/grey fog
        this.scene.background = new THREE.Color(0xd1d5db);
        this.scene.fog = new THREE.FogExp2(0xd1d5db, 0.015); 
        this.ambientLight.intensity = 0.9;
        this.ambientLight.color.setHex(0xffffff);
        this.directionalLight.intensity = 0.2;
        this.hemisphereLight.color.setHex(0xd1d5db);
        break;

      case 'dusty':
        // Northern India dusty summer day
        this.scene.background = new THREE.Color(0xc2b280);
        this.scene.fog = new THREE.FogExp2(0xc2b280, 0.008);
        this.ambientLight.intensity = 0.6;
        this.ambientLight.color.setHex(0xfcd34d);
        this.directionalLight.intensity = 1.2;
        this.directionalLight.color.setHex(0xf59e0b);
        this.hemisphereLight.color.setHex(0xc2b280);
        this.hemisphereLight.groundColor.setHex(0x78350f);
        break;
    }
  }

  private setupRainParticles() {
    const rainCount = 3000;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    this.rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200 + 500;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150 + 300;
      this.rainVelocities[i] = 0.8 + Math.random() * 0.5;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
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
        arr[i * 3 + 1] -= this.rainVelocities[i] * 60 * delta;
        if (arr[i * 3 + 1] < 0) {
          arr[i * 3 + 1] = 60;
          arr[i * 3] = egoX + (Math.random() - 0.5) * 180;
        }
      }
      pos.needsUpdate = true;
    }

    // Move directional sunlight to follow ego vehicle ensuring sharp shadows locally
    this.directionalLight.position.x = egoX + 60;
    this.directionalLight.target.position.set(egoX, 0, 300);
    this.directionalLight.target.updateMatrixWorld();
  }
}
