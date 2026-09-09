/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as THREE from 'three';
import { EnvironmentBuilder, type WeatherCondition } from './EnvironmentBuilder';
import {
  createEgoVehicleModel,
  createAutoRickshawModel,
  createMotorcycleModel,
  createCattleModel,
  createPushcartModel,
  createPedestrianModel,
  createVehicleModel,
  createObstacleModel,
} from './Agent3DModels';
import { SensoryLayers } from './SensoryLayers';
import { TrajectoryLayers } from './TrajectoryLayers';
import type {
  SimulationState,
  Agent,
  Vector2,
} from '@/types/simulation';

export type CameraMode =
  | 'driver'
  | 'birds_eye'
  | 'follow'
  | 'cinematic'
  | 'sensor'
  | 'planning';

export interface ThreeDigitalTwinOptions {
  onSelectObject?: (agent: Agent | null) => void;
  onWebGLError?: (message: string) => void;
}

type PedestrianLimbs = {
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
};

type AgentMeshEntry = {
  group: THREE.Group;
  type: string;
  limbs?: PedestrianLimbs;
  legs?: THREE.Object3D[];
};

export class ThreeDigitalTwin {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Subsystems
  private envBuilder: EnvironmentBuilder;
  private sensoryLayers: SensoryLayers;
  private trajectoryLayers: TrajectoryLayers;

  // Ego Vehicle 3D
  private egoVehicleGroup: THREE.Group;
  private lidarDome: THREE.Mesh;
  private taillightMesh: THREE.Mesh;
  private wheels: THREE.Mesh[];

  // Dynamic Agent Meshes
  private agentMeshMap: Map<string, AgentMeshEntry> = new Map();
  private obstacleMeshMap: Map<string, THREE.Group> = new Map();

  // Selection reticle
  private selectionReticle: THREE.Mesh;
  private selectedAgentId: string | null = null;
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();

  // Camera Management
  private cameraMode: CameraMode = 'follow';
  private targetCameraPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  // User Orbit / Pan controls
  private isMouseDown = false;
  private isRightMouseDown = false;
  private mousePrevX = 0;
  private mousePrevY = 0;
  private manualPitch = 0;
  private manualYaw = 0;
  private manualZoom = 1;

  // Performance & Sensor Toggles
  public showLidar = true;
  public showRadar = true;
  public showCamera = true;
  public performanceMode = false;

  private onSelectObject?: (agent: Agent | null) => void;
  private onWebGLError?: (message: string) => void;

  private lastTime = performance.now();
  private currentSimState: SimulationState | null = null;
  private disposed = false;
  private webglAvailable = false;

  // Bound listeners so they can always be removed.
  private readonly handleMouseDown = (e: MouseEvent) => {
    if (this.disposed) return;

    if (e.button === 2) {
      this.isRightMouseDown = true;
    } else {
      this.isMouseDown = true;
    }

    this.mousePrevX = e.clientX;
    this.mousePrevY = e.clientY;
  };

  private readonly handleMouseUp = () => {
    this.isMouseDown = false;
    this.isRightMouseDown = false;
  };

  private readonly handleMouseMove = (e: MouseEvent) => {
    if (this.disposed) return;
    if (!this.isMouseDown && !this.isRightMouseDown) return;

    const dx = e.clientX - this.mousePrevX;
    const dy = e.clientY - this.mousePrevY;

    this.mousePrevX = e.clientX;
    this.mousePrevY = e.clientY;

    if (this.isMouseDown) {
      this.manualYaw -= dx * 0.006;
      this.manualPitch = THREE.MathUtils.clamp(
        this.manualPitch + dy * 0.006,
        -0.4,
        1.2,
      );
    }
  };

  private readonly handleWheel = (e: WheelEvent) => {
    if (this.disposed) return;

    e.preventDefault();

    this.manualZoom = THREE.MathUtils.clamp(
      this.manualZoom + e.deltaY * 0.0015,
      0.4,
      3.0,
    );
  };

  private readonly handleClick = (e: MouseEvent) => {
    if (this.disposed || !this.webglAvailable) return;

    const rect = this.canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVec, this.camera);

    const interactables: THREE.Object3D[] = [];

    this.agentMeshMap.forEach((value) => {
      interactables.push(value.group);
    });

    const intersects = this.raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      let foundId: string | null = null;

      while (current) {
        for (const [id, data] of this.agentMeshMap.entries()) {
          if (data.group === current) {
            foundId = id;
            break;
          }
        }

        if (foundId) break;
        current = current.parent;
      }

      if (foundId && this.currentSimState) {
        this.selectAgent(foundId);
        return;
      }
    }

    this.selectAgent(null);
  };

  private readonly handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private readonly handleWebGLContextLost = (event: Event) => {
    event.preventDefault();

    this.webglAvailable = false;

    const message =
      'WebGL context was lost. The 3D renderer has been paused. Reload the simulation to restore the graphics context.';

    console.error('[ThreeDigitalTwin]', message);
    this.onWebGLError?.(message);
  };

  constructor(
    canvas: HTMLCanvasElement,
    options?: ThreeDigitalTwinOptions,
  ) {
    if (!canvas) {
      throw new Error('ThreeDigitalTwin requires a valid HTMLCanvasElement.');
    }

    this.canvas = canvas;
    this.onSelectObject = options?.onSelectObject;
    this.onWebGLError = options?.onWebGLError;

    // Always build the scene/camera first. WebGL failure must not crash the page.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070e1b);

    const initialWidth = Math.max(canvas.clientWidth || canvas.width || 1, 1);
    const initialHeight = Math.max(canvas.clientHeight || canvas.height || 1, 1);
    const aspect = initialWidth / initialHeight;

    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 600);
    this.camera.position.set(0, 6, 14);

    this.envBuilder = new EnvironmentBuilder(this.scene);
    this.sensoryLayers = new SensoryLayers(this.scene);
    this.trajectoryLayers = new TrajectoryLayers(this.scene);

    const ego = createEgoVehicleModel();

    this.egoVehicleGroup = ego.group;
    this.lidarDome = ego.lidarDome;
    this.taillightMesh = ego.taillightMesh;
    this.wheels = ego.wheels;

    this.scene.add(this.egoVehicleGroup);

    const reticleGeom = new THREE.RingGeometry(1.6, 1.8, 32);
    reticleGeom.rotateX(-Math.PI / 2);

    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.selectionReticle = new THREE.Mesh(reticleGeom, reticleMat);
    this.selectionReticle.visible = false;
    this.scene.add(this.selectionReticle);

    this.setupInteractions();

    // Renderer creation is strictly client-side and guarded.
    this.initializeRenderer(initialWidth, initialHeight);
  }

  private initializeRenderer(width: number, height: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.canvas.isConnected) {
      // The canvas may be mounted immediately after construction.
      // Do not throw; the caller can call resize/render once mounted.
    }

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        precision: 'highp',
      });

      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio || 1, 1), 2),
      );
      renderer.setSize(
        Math.max(width, 1),
        Math.max(height, 1),
        false,
      );

      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Correct modern color management for Three.js.
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      
      // Create a basic realistic skybox for reflections
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x87ceeb);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({color: 0x827354}));
      ground.rotation.x = -Math.PI / 2;
      envScene.add(ground);
      
      this.scene.environment = pmremGenerator.fromScene(envScene).texture;

      this.renderer = renderer;
      this.webglAvailable = true;

      this.canvas.addEventListener(
        'webglcontextlost',
        this.handleWebGLContextLost,
        false,
      );
    } catch (error) {
      // Retry with a lower-cost configuration.
      console.warn(
        '[ThreeDigitalTwin] High-quality WebGL renderer failed. Retrying with fallback settings.',
        error,
      );

      try {
        const fallbackRenderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: false,
          alpha: false,
          powerPreference: 'default',
          precision: 'mediump',
        });

        fallbackRenderer.setPixelRatio(1);
        fallbackRenderer.setSize(
          Math.max(width, 1),
          Math.max(height, 1),
          false,
        );
        fallbackRenderer.shadowMap.enabled = false;
        fallbackRenderer.outputColorSpace = THREE.SRGBColorSpace;

        this.renderer = fallbackRenderer;
        this.webglAvailable = true;

        this.canvas.addEventListener(
          'webglcontextlost',
          this.handleWebGLContextLost,
          false,
        );
      } catch (fallbackError) {
        this.renderer = null;
        this.webglAvailable = false;

        const message =
          'The browser exposed WebGL but Three.js could not initialize the renderer. Try enabling hardware acceleration, closing other GPU-heavy tabs, or reloading the page.';

        console.error(
          '[ThreeDigitalTwin] Renderer initialization failed.',
          {
            originalError: error,
            fallbackError,
          },
        );

        this.onWebGLError?.(message);
      }
    }
  }

  private setupInteractions(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('wheel', this.handleWheel, {
      passive: false,
    });
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  public selectAgent(agentId: string | null): void {
    if (this.disposed) return;

    this.selectedAgentId = agentId;

    if (!agentId || !this.currentSimState) {
      this.selectionReticle.visible = false;
      this.onSelectObject?.(null);
      return;
    }

    const agent = this.currentSimState.agents.find(
      (a) => a.id === agentId,
    );

    if (agent) {
      this.selectionReticle.visible = true;
      this.selectionReticle.position.set(
        agent.position.x,
        0.1,
        agent.position.y,
      );
      this.onSelectObject?.(agent);
    } else {
      this.selectedAgentId = null;
      this.selectionReticle.visible = false;
      this.onSelectObject?.(null);
    }
  }

  public resize(width: number, height: number): void {
    if (this.disposed) return;

    const safeWidth = Math.max(Number.isFinite(width) ? width : 1, 1);
    const safeHeight = Math.max(
      Number.isFinite(height) ? height : 1,
      1,
    );

    this.camera.aspect = safeWidth / safeHeight;
    this.camera.updateProjectionMatrix();

    this.renderer?.setSize(safeWidth, safeHeight, false);
  }

  public setCameraMode(mode: CameraMode): void {
    if (this.disposed) return;

    this.cameraMode = mode;
    this.manualPitch = 0;
    this.manualYaw = 0;
    this.manualZoom = 1;
  }

  public setWeather(weather: WeatherCondition): void {
    if (this.disposed) return;
    this.envBuilder.setWeather(weather);
  }

  public render(state: SimulationState): void {
    if (this.disposed) return;

    this.currentSimState = state;

    const now = performance.now();
    const rawDelta = (now - this.lastTime) / 1000;
    const delta = THREE.MathUtils.clamp(
      Number.isFinite(rawDelta) ? rawDelta : 0,
      0,
      0.1,
    );

    this.lastTime = now;

    const {
      vehicle,
      agents,
      obstacles,
      detectedObjects,
      trackedObjects,
      plannedPath,
      predictions,
      risk,
      time,
    } = state;

    // ── 1. Update Ego Vehicle ─────────────────────────────
    this.egoVehicleGroup.position.set(
      vehicle.position.x,
      0,
      vehicle.position.y,
    );

    this.egoVehicleGroup.rotation.y =
      -vehicle.heading - Math.PI / 2;

    this.lidarDome.rotation.y += delta * 18;

    const safeSpeed = Number.isFinite(vehicle.speed)
      ? vehicle.speed
      : 0;

    const wheelRoll = (safeSpeed / 0.35) * delta;

    this.wheels.forEach((wheel) => {
      wheel.rotateX(wheelRoll);
    });

    const isBraking =
      Number.isFinite(vehicle.braking) &&
      vehicle.braking > 0.05;

    const taillightMaterial = this.taillightMesh
      .material as THREE.MeshBasicMaterial;

    taillightMaterial.color.setHex(
      isBraking ? 0xef4444 : 0x7f1d1d,
    );

    // ── 2. Update Dynamic Traffic Agents ──────────────────
    const activeAgentIds = new Set<string>();

    for (const agent of agents) {
      if (!agent.isActive) continue;

      activeAgentIds.add(agent.id);

      let agentEntry = this.agentMeshMap.get(agent.id);

      if (!agentEntry) {
        let group: THREE.Group;
        let limbs: PedestrianLimbs | undefined;
        let legs: THREE.Object3D[] | undefined;

        switch (agent.type) {
          case 'auto_rickshaw':
            group = createAutoRickshawModel();
            break;

          case 'motorcycle':
            group = createMotorcycleModel();
            break;

          case 'animal': {
            const cat = createCattleModel();
            group = cat.group;
            legs = cat.legs;
            break;
          }

          case 'pushcart':
            group = createPushcartModel();
            break;

          case 'pedestrian': {
            const ped = createPedestrianModel();

            group = ped.group;
            legs = [ped.leftLeg, ped.rightLeg, ped.leftArm, ped.rightArm];

            break;
          }

          case 'bus':
          case 'truck':
            group = createVehicleModel(agent.type);
            break;

          default:
            group = createVehicleModel('car');
            break;
        }

        this.scene.add(group);

        agentEntry = {
          group,
          type: agent.type,
          legs,
        };

        this.agentMeshMap.set(agent.id, agentEntry);
      }

      agentEntry.group.position.set(
        agent.position.x,
        0,
        agent.position.y,
      );

      agentEntry.group.rotation.y =
        -agent.heading - Math.PI / 2;

      if (agentEntry.legs && agent.speed > 0.1) {
        const walkCycle = Math.sin(
          time * 8 * (agent.speed / 1.5),
        );

        agentEntry.legs.forEach((leg, index) => {
          // Alternate leg swinging forward and backward
          const dir = index % 2 === 0 ? 1 : -1;
          // Scale down arm swing slightly if there are 4 limbs and it's index 2/3 (arms)
          const isArm = index > 1;
          const amplitude = isArm ? 0.5 : 0.6;
          leg.rotation.x = walkCycle * dir * amplitude;
        });
      }
    }

    // Remove inactive agents and release their resources.
    for (const [id, entry] of this.agentMeshMap.entries()) {
      if (!activeAgentIds.has(id)) {
        this.scene.remove(entry.group);
        this.disposeObject3D(entry.group);
        this.agentMeshMap.delete(id);
      }
    }

    // ── 3. Update Static Obstacles ────────────────────────
    const activeObstacleIds = new Set<string>();

    for (const obs of obstacles) {
      activeObstacleIds.add(obs.id);

      let obstacleModel = this.obstacleMeshMap.get(obs.id);

      if (!obstacleModel) {
        obstacleModel = createObstacleModel(obs.label);
        this.scene.add(obstacleModel);
        this.obstacleMeshMap.set(obs.id, obstacleModel);
      }

      obstacleModel.position.set(
        obs.position.x,
        0,
        obs.position.y,
      );
    }

    // Also remove obstacles that disappeared from simulation state.
    for (const [id, obstacleModel] of this.obstacleMeshMap.entries()) {
      if (!activeObstacleIds.has(id)) {
        this.scene.remove(obstacleModel);
        this.disposeObject3D(obstacleModel);
        this.obstacleMeshMap.delete(id);
      }
    }

    // ── 4. Update Selection Reticle ───────────────────────
    if (this.selectedAgentId) {
      const selected = agents.find(
        (agent) => agent.id === this.selectedAgentId,
      );

      if (selected && selected.isActive) {
        this.selectionReticle.position.set(
          selected.position.x,
          0.1,
          selected.position.y,
        );

        this.selectionReticle.rotation.z += delta * 2;
      } else {
        this.selectAgent(null);
      }
    }

    // ── 5. Update Sensory & Trajectory Subsystems ─────────
    this.envBuilder.update(delta, vehicle.position.x);

    this.sensoryLayers.update(
      vehicle.position,
      vehicle.heading,
      detectedObjects,
      trackedObjects,
      delta,
      time,
      this.showLidar && !this.performanceMode,
      this.showRadar,
      this.showCamera,
    );

    this.trajectoryLayers.update(
      vehicle.position,
      plannedPath,
      predictions,
      risk,
      time,
      delta,
    );

    // ── 6. Update Camera ──────────────────────────────────
    this.updateCamera(vehicle, delta, time);

    // ── 7. Render ─────────────────────────────────────────
    // A WebGL failure must never crash React.
    if (this.renderer && this.webglAvailable) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.error(
          '[ThreeDigitalTwin] Frame rendering failed.',
          error,
        );

        this.webglAvailable = false;

        this.onWebGLError?.(
          'The 3D renderer encountered a WebGL error. Reload the simulation if the graphics do not recover.',
        );
      }
    }
  }

  private updateCamera(
    vehicle: { position: Vector2; heading: number },
    delta: number,
    time: number,
  ): void {
    const vx = vehicle.position.x;
    const vz = vehicle.position.y;
    const heading = vehicle.heading;

    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    switch (this.cameraMode) {
      case 'driver':
        this.targetCameraPos.set(
          vx + cosH * 0.4,
          1.2,
          vz + sinH * 0.4,
        );

        this.targetLookAt.set(
          vx + cosH * 40,
          1.0,
          vz + sinH * 40,
        );
        break;

      case 'birds_eye':
        this.targetCameraPos.set(
          vx + 15,
          48 * this.manualZoom,
          vz,
        );

        this.targetLookAt.set(vx + 15, 0, vz);
        break;

      case 'follow': {
        const followDist = 14 * this.manualZoom;
        const followHeight = 6.5 * this.manualZoom;

        this.targetCameraPos.set(
          vx -
          cosH * followDist +
          Math.sin(this.manualYaw) * 10,
          followHeight + this.manualPitch * 10,
          vz -
          sinH * followDist +
          Math.cos(this.manualYaw) * 10,
        );

        this.targetLookAt.set(
          vx + cosH * 10,
          1.2,
          vz + sinH * 10,
        );
        break;
      }

      case 'cinematic': {
        const orbitAngle = time * 0.25 + this.manualYaw;
        const orbitDist = 18 * this.manualZoom;

        this.targetCameraPos.set(
          vx + Math.cos(orbitAngle) * orbitDist,
          7 + Math.sin(time * 0.2) * 2,
          vz + Math.sin(orbitAngle) * orbitDist,
        );

        this.targetLookAt.set(vx, 1.2, vz);
        break;
      }

      case 'sensor':
        this.targetCameraPos.set(
          vx - 12 * this.manualZoom,
          16 * this.manualZoom,
          vz - 12 * this.manualZoom,
        );

        this.targetLookAt.set(vx + 8, 0, vz);
        break;

      case 'planning':
        this.targetCameraPos.set(
          vx - cosH * 6,
          3.2,
          vz - sinH * 6,
        );

        this.targetLookAt.set(
          vx + cosH * 35,
          0.5,
          vz + sinH * 35,
        );
        break;
    }

    const lerpRate = THREE.MathUtils.clamp(delta * 5, 0, 1);

    this.camera.position.lerp(
      this.targetCameraPos,
      lerpRate,
    );

    this.currentLookAt.lerp(
      this.targetLookAt,
      lerpRate,
    );

    this.camera.lookAt(this.currentLookAt);
  }

  private disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      const material = mesh.material;

      if (!material) return;

      const materials = Array.isArray(material)
        ? material
        : [material];

      for (const mat of materials) {
        // Dispose textures referenced by the material.
        for (const key of [
          'map',
          'alphaMap',
          'aoMap',
          'bumpMap',
          'clearcoatMap',
          'clearcoatNormalMap',
          'clearcoatRoughnessMap',
          'displacementMap',
          'emissiveMap',
          'envMap',
          'lightMap',
          'metalnessMap',
          'normalMap',
          'roughnessMap',
          'sheenColorMap',
          'sheenRoughnessMap',
          'specularColorMap',
          'specularIntensityMap',
          'transmissionMap',
        ]) {
          const texture = (mat as unknown as Record<string, unknown>)[
            key
          ];

          if (texture instanceof THREE.Texture) {
            texture.dispose();
          }
        }

        mat.dispose();
      }
    });
  }

  public dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // Stop input handling.
    this.canvas.removeEventListener(
      'mousedown',
      this.handleMouseDown,
    );
    window.removeEventListener(
      'mouseup',
      this.handleMouseUp,
    );
    this.canvas.removeEventListener(
      'mousemove',
      this.handleMouseMove,
    );
    this.canvas.removeEventListener(
      'wheel',
      this.handleWheel,
    );
    this.canvas.removeEventListener(
      'click',
      this.handleClick,
    );
    this.canvas.removeEventListener(
      'contextmenu',
      this.handleContextMenu,
    );
    this.canvas.removeEventListener(
      'webglcontextlost',
      this.handleWebGLContextLost,
    );

    // Dispose dynamic objects.
    for (const entry of this.agentMeshMap.values()) {
      this.scene.remove(entry.group);
      this.disposeObject3D(entry.group);
    }

    this.agentMeshMap.clear();

    for (const obstacle of this.obstacleMeshMap.values()) {
      this.scene.remove(obstacle);
      this.disposeObject3D(obstacle);
    }

    this.obstacleMeshMap.clear();

    // Dispose all scene resources, including the ego vehicle and reticle.
    this.disposeObject3D(this.scene);

    this.sensoryLayers.dispose();
    this.trajectoryLayers.dispose();

    if (this.renderer) {
      try {
        this.renderer.renderLists.dispose();
        this.renderer.dispose();
      } catch (error) {
        console.warn(
          '[ThreeDigitalTwin] Renderer cleanup warning.',
          error,
        );
      }

      this.renderer = null;
    }

    this.webglAvailable = false;
    this.currentSimState = null;
    this.selectedAgentId = null;
  }
}
