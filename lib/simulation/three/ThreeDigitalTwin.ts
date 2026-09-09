/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
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
  Obstacle,
  DetectedObject,
  TrackedObject,
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
}

export class ThreeDigitalTwin {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
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

  // Dynamic Agent Meshes (Pool / Map by agent.id)
  private agentMeshMap: Map<string, { group: THREE.Group; type: string; limbs?: { leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh } }> = new Map();
  private obstacleMeshMap: Map<string, THREE.Group> = new Map();

  // Selection reticle
  private selectionReticle: THREE.Mesh;
  private selectedAgentId: string | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseVec: THREE.Vector2 = new THREE.Vector2();

  // Camera Management
  private cameraMode: CameraMode = 'follow';
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();

  // User Orbit / Pan controls
  private isMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;
  private mousePrevX: number = 0;
  private mousePrevY: number = 0;
  private manualPitch: number = 0;
  private manualYaw: number = 0;
  private manualZoom: number = 1.0;

  // Performance & Sensor Toggles
  public showLidar: boolean = true;
  public showRadar: boolean = true;
  public showCamera: boolean = true;
  public performanceMode: boolean = false;

  private onSelectObject?: (agent: Agent | null) => void;
  private lastTime: number = performance.now();
  private currentSimState: SimulationState | null = null;

  constructor(canvas: HTMLCanvasElement, options?: ThreeDigitalTwinOptions) {
    this.canvas = canvas;
    this.onSelectObject = options?.onSelectObject;

    const finalParams: THREE.WebGLRendererParameters = { canvas, antialias: true, alpha: false, powerPreference: 'high-performance' };
    let rendererInstance: THREE.WebGLRenderer | null = null;

    try {
      rendererInstance = new THREE.WebGLRenderer(finalParams);
    } catch (e) {
      // Fallback for less capable environments
      try {
        rendererInstance = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, precision: 'mediump' });
      } catch (innerE) {
        throw new Error('WebGLRenderer initialization failed: ' + (e instanceof Error ? e.message : String(e)));
      }
    }

    this.renderer = rendererInstance as THREE.WebGLRenderer;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(Math.max(canvas.clientWidth, 100), Math.max(canvas.clientHeight, 100), false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070e1b);

    // 3. Camera
    const aspect = canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 16 / 9;
    this.camera = new THREE.PerspectiveCamera(
      50,
      aspect,
      0.5,
      600
    );

    // 4. Subsystems
    this.envBuilder = new EnvironmentBuilder(this.scene);
    this.sensoryLayers = new SensoryLayers(this.scene);
    this.trajectoryLayers = new TrajectoryLayers(this.scene);

    // 5. Ego Vehicle
    const ego = createEgoVehicleModel();
    this.egoVehicleGroup = ego.group;
    this.lidarDome = ego.lidarDome;
    this.taillightMesh = ego.taillightMesh;
    this.wheels = ego.wheels;
    this.scene.add(this.egoVehicleGroup);

    // 6. Selection Reticle
    const reticleGeom = new THREE.RingGeometry(1.6, 1.8, 32);
    reticleGeom.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.selectionReticle = new THREE.Mesh(reticleGeom, reticleMat);
    this.selectionReticle.visible = false;
    this.scene.add(this.selectionReticle);

    // 7. Mouse and Raycasting Bindings
    this.setupInteractions();
  }

  private setupInteractions() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = true;
      } else {
        this.isMouseDown = true;
      }
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      this.isRightMouseDown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown && !this.isRightMouseDown) return;
      const dx = e.clientX - this.mousePrevX;
      const dy = e.clientY - this.mousePrevY;
      this.mousePrevX = e.clientX;
      this.mousePrevY = e.clientY;

      if (this.isMouseDown) {
        this.manualYaw -= dx * 0.006;
        this.manualPitch = Math.max(-0.4, Math.min(1.2, this.manualPitch + dy * 0.006));
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.manualZoom = Math.max(0.4, Math.min(3.0, this.manualZoom + e.deltaY * 0.0015));
    }, { passive: false });

    // Object Selection Raycaster
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseVec, this.camera);
      const interactables: THREE.Object3D[] = [];
      this.agentMeshMap.forEach((val) => interactables.push(val.group));

      const intersects = this.raycaster.intersectObjects(interactables, true);
      if (intersects.length > 0) {
        // Find parent group in agent map
        let curr: THREE.Object3D | null = intersects[0].object;
        let foundId: string | null = null;
        while (curr) {
          for (const [id, data] of this.agentMeshMap.entries()) {
            if (data.group === curr) {
              foundId = id;
              break;
            }
          }
          if (foundId) break;
          curr = curr.parent;
        }

        if (foundId && this.currentSimState) {
          this.selectAgent(foundId);
          return;
        }
      }

      // If clicked empty space, deselect
      this.selectAgent(null);
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public selectAgent(agentId: string | null) {
    this.selectedAgentId = agentId;
    if (!agentId || !this.currentSimState) {
      this.selectionReticle.visible = false;
      this.onSelectObject?.(null);
      return;
    }

    const agent = this.currentSimState.agents.find(a => a.id === agentId);
    if (agent) {
      this.selectionReticle.visible = true;
      this.selectionReticle.position.set(agent.position.x, 0.1, agent.position.y);
      this.onSelectObject?.(agent);
    }
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    this.manualPitch = 0;
    this.manualYaw = 0;
    this.manualZoom = 1.0;
  }

  public setWeather(weather: WeatherCondition) {
    this.envBuilder.setWeather(weather);
  }

  public render(state: SimulationState) {
    this.currentSimState = state;
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    const { vehicle, agents, obstacles, detectedObjects, trackedObjects, plannedPath, predictions, risk, time } = state;

    // ── 1. Update Ego Vehicle ──────────────────────────
    this.egoVehicleGroup.position.set(vehicle.position.x, 0, vehicle.position.y);
    // Add -Math.PI / 2 offset to align 3D +Z forward axis with 2D +X forward axis
    this.egoVehicleGroup.rotation.y = -vehicle.heading - Math.PI / 2;

    // Spin LiDAR dome
    this.lidarDome.rotation.y += delta * 18;

    // Rotate Wheels based on vehicle speed
    const wheelRoll = (vehicle.speed / 0.35) * delta;
    this.wheels.forEach(w => w.rotateX(wheelRoll));

    // Taillights turn bright red when braking
    const isBraking = vehicle.braking > 0.05;
    (this.taillightMesh.material as THREE.MeshBasicMaterial).color.setHex(
      isBraking ? 0xef4444 : 0x7f1d1d
    );

    // ── 2. Update Dynamic Traffic Agents ───────────────
    const activeAgentIds = new Set<string>();

    for (const agent of agents) {
      if (!agent.isActive) continue;
      activeAgentIds.add(agent.id);

      let agentEntry = this.agentMeshMap.get(agent.id);
      if (!agentEntry) {
        // Create 3D model for agent type
        let group: THREE.Group;
        let limbs: { leftLeg: THREE.Mesh; rightLeg: THREE.Mesh; leftArm: THREE.Mesh; rightArm: THREE.Mesh } | undefined;

        switch (agent.type) {
          case 'auto_rickshaw':
            group = createAutoRickshawModel();
            break;
          case 'motorcycle':
            group = createMotorcycleModel();
            break;
          case 'animal':
            group = createCattleModel();
            break;
          case 'pushcart':
            group = createPushcartModel();
            break;
          case 'pedestrian': {
            const ped = createPedestrianModel();
            group = ped.group;
            limbs = {
              leftLeg: ped.leftLeg,
              rightLeg: ped.rightLeg,
              leftArm: ped.leftArm,
              rightArm: ped.rightArm,
            };
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
        agentEntry = { group, type: agent.type, limbs };
        this.agentMeshMap.set(agent.id, agentEntry);
      }

      // Position and Orient Agent
      agentEntry.group.position.set(agent.position.x, 0, agent.position.y);
      // Align 3D +Z forward axis with 2D +X forward axis
      agentEntry.group.rotation.y = -agent.heading - Math.PI / 2;

      // Animate Pedestrian walking limbs
      if (agentEntry.limbs && agent.speed > 0.1) {
        const walkCycle = Math.sin(time * 8 * (agent.speed / 1.5));
        agentEntry.limbs.leftLeg.rotation.x = walkCycle * 0.6;
        agentEntry.limbs.rightLeg.rotation.x = -walkCycle * 0.6;
        agentEntry.limbs.leftArm.rotation.x = -walkCycle * 0.5;
        agentEntry.limbs.rightArm.rotation.x = walkCycle * 0.5;
      }
    }

    // Remove inactive agents
    for (const [id, entry] of this.agentMeshMap.entries()) {
      if (!activeAgentIds.has(id)) {
        this.scene.remove(entry.group);
        this.agentMeshMap.delete(id);
      }
    }

    // ── 3. Update Static Obstacles ─────────────────────
    for (const obs of obstacles) {
      if (!this.obstacleMeshMap.has(obs.id)) {
        const obsModel = createObstacleModel(obs.label);
        obsModel.position.set(obs.position.x, 0, obs.position.y);
        this.scene.add(obsModel);
        this.obstacleMeshMap.set(obs.id, obsModel);
      }
    }

    // ── 4. Update Selection Reticle ────────────────────
    if (this.selectedAgentId) {
      const selected = agents.find(a => a.id === this.selectedAgentId);
      if (selected && selected.isActive) {
        this.selectionReticle.position.set(selected.position.x, 0.1, selected.position.y);
        this.selectionReticle.rotation.z += delta * 2;
      } else {
        this.selectAgent(null);
      }
    }

    // ── 5. Update Sensory & Trajectory Subsystems ──────
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
      this.showCamera
    );

    this.trajectoryLayers.update(
      vehicle.position,
      plannedPath,
      predictions,
      risk,
      time,
      delta
    );

    // ── 6. Update Camera Views ─────────────────────────
    this.updateCamera(vehicle, delta, time);

    // ── 7. Render Frame ────────────────────────────────
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(vehicle: { position: Vector2; heading: number }, delta: number, time: number) {
    const vx = vehicle.position.x;
    const vz = vehicle.position.y;
    const heading = vehicle.heading;
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    switch (this.cameraMode) {
      case 'driver':
        // Inside cockpit looking ahead
        this.targetCameraPos.set(
          vx + cosH * 0.4,
          1.2,
          vz + sinH * 0.4
        );
        this.targetLookAt.set(
          vx + cosH * 40,
          1.0,
          vz + sinH * 40
        );
        break;

      case 'birds_eye':
        // High altitude tactical top-down
        this.targetCameraPos.set(
          vx + 15,
          48 * this.manualZoom,
          vz
        );
        this.targetLookAt.set(vx + 15, 0, vz);
        break;

      case 'follow':
        // Chase camera behind AV
        const followDist = 14 * this.manualZoom;
        const followHeight = 6.5 * this.manualZoom;
        this.targetCameraPos.set(
          vx - cosH * followDist + Math.sin(this.manualYaw) * 10,
          followHeight + this.manualPitch * 10,
          vz - sinH * followDist + Math.cos(this.manualYaw) * 10
        );
        this.targetLookAt.set(vx + cosH * 10, 1.2, vz + sinH * 10);
        break;

      case 'cinematic':
        // Orbiting dynamic camera
        const orbitAngle = time * 0.25 + this.manualYaw;
        const orbitDist = 18 * this.manualZoom;
        this.targetCameraPos.set(
          vx + Math.cos(orbitAngle) * orbitDist,
          7 + Math.sin(time * 0.2) * 2,
          vz + Math.sin(orbitAngle) * orbitDist
        );
        this.targetLookAt.set(vx, 1.2, vz);
        break;

      case 'sensor':
        // Isometric elevated sensor inspection angle
        this.targetCameraPos.set(
          vx - 12 * this.manualZoom,
          16 * this.manualZoom,
          vz - 12 * this.manualZoom
        );
        this.targetLookAt.set(vx + 8, 0, vz);
        break;

      case 'planning':
        // Low angled forward trajectory view
        this.targetCameraPos.set(
          vx - cosH * 6,
          3.2,
          vz - sinH * 6
        );
        this.targetLookAt.set(
          vx + cosH * 35,
          0.5,
          vz + sinH * 35
        );
        break;
    }

    // Smooth Lerp transitions
    const lerpRate = Math.min(1.0, delta * 5.0);
    this.camera.position.lerp(this.targetCameraPos, lerpRate);
    this.currentLookAt.lerp(this.targetLookAt, lerpRate);
    this.camera.lookAt(this.currentLookAt);
  }

  public dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.sensoryLayers.dispose();
    this.trajectoryLayers.dispose();
  }
}
