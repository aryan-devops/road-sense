// RoadSense Simulation Engine
// Browser-based deterministic simulation of autonomous vehicle behavior
// NOTE: This is a synthetic simulation for demonstration purposes.
// It does not represent a real autonomous driving system.

import type {
  SimulationState,
  SimulationConfig,
  ScenarioConfig,
  EgoVehicle,
  Agent,
  DetectedObject,
  TrackedObject,
  PredictedTrajectory,
  Decision,
  PlannedPath,
  RiskAssessment,
  SimulationMetrics,
  SimulationEvent,
  Vector2,
  AgentType,
  RiskLevel,
  DecisionState,
  SimulationStatus,
  InjectedEventType,
} from '@/types/simulation';
import { runPerception } from './perception';
import { updateTracks } from './tracking';
import { predictTrajectories, calculateTTC } from './prediction';
import { evaluateDecision } from './decision';
import { planPath } from './planner';
import { assessRisk } from './collision';
import { updateVehiclePhysics, updateAgentPhysics } from './physics';

type EventCallback = (state: SimulationState) => void;

export class SimulationEngine {
  private state: SimulationState;
  private config: SimulationConfig;
  private animationFrameId: number | null = null;
  private lastTimestamp: number | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private planningCooldown: number = 0;
  private replanLatencies: number[] = [];
  private totalDistanceTraveled: number = 0;
  private speedHistory: number[] = [];
  private decelerationHistory: number[] = [];

  constructor(scenario: ScenarioConfig, config: SimulationConfig) {
    this.config = config;
    this.state = this.initState(scenario, config);
  }

  private initState(scenario: ScenarioConfig, config: SimulationConfig): SimulationState {
    const ego: EgoVehicle = {
      id: 'ego',
      position: { ...scenario.egoStart },
      velocity: { x: 0, y: 0 },
      speed: 0,
      heading: this.computeHeading(scenario.egoStart, scenario.waypoints[0] ?? scenario.egoEnd),
      acceleration: 0,
      steeringAngle: 0,
      width: 2.0,
      length: 4.5,
      targetSpeed: config.vehicleSpeed,
      braking: 0,
    };

    return {
      id: `sim-${Date.now()}`,
      status: 'idle',
      time: 0,
      speed: 1,
      vehicle: ego,
      agents: scenario.agents.map(a => ({ ...a, trail: [] })),
      obstacles: [...scenario.obstacles],
      detectedObjects: [],
      trackedObjects: [],
      predictions: [],
      decision: { state: 'CRUISE', reason: 'System ready', targetSpeed: config.vehicleSpeed, targetHeading: ego.heading, confidence: 1, urgency: 0 },
      plannedPath: null,
      risk: { overallRisk: 'SAFE', criticalObjects: [], minClearance: 999, worstTTC: 999, riskZones: [] },
      metrics: this.initMetrics(),
      events: [],
      scenario,
    };
  }

  private initMetrics(): SimulationMetrics {
    return {
      elapsedTime: 0,
      egoSpeed: 0,
      egoAcceleration: 0,
      collisionCount: 0,
      nearMissCount: 0,
      replanningCount: 0,
      replanningLatencyMs: 0,
      avgReplanLatency: 0,
      pathSmoothness: 100,
      minClearance: 999,
      avgClearance: 999,
      completionRate: 0,
      safetyScore: 100,
      planningFrequencyHz: 0,
      distanceTraveled: 0,
      avgSpeed: 0,
      maxDeceleration: 0,
    };
  }

  private computeHeading(from: Vector2, to: Vector2): number {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  start() {
    if (this.state.status === 'idle' || this.state.status === 'paused') {
      this.state.status = 'running';
      this.addEvent('simulation_start', 'Simulation started', 'info');
      this.loop();
    }
  }

  pause() {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.lastTimestamp = null;
      this.addEvent('simulation_pause', 'Simulation paused', 'info');
      this.emit('stateUpdate', this.state);
    }
  }

  resume() {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.addEvent('simulation_resume', 'Simulation resumed', 'info');
      this.loop();
    }
  }

  stop() {
    this.state.status = 'completed';
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTimestamp = null;
    this.finalizeMetrics();
    this.addEvent('simulation_complete', 'Simulation completed', 'info');
    this.emit('stateUpdate', this.state);
    this.emit('completed', this.state);
  }

  reset(scenario?: ScenarioConfig) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTimestamp = null;
    this.replanLatencies = [];
    this.totalDistanceTraveled = 0;
    this.speedHistory = [];
    this.decelerationHistory = [];
    this.state = this.initState(scenario ?? this.state.scenario, this.config);
    this.emit('stateUpdate', this.state);
  }

  setSpeed(speed: number) {
    this.state.speed = speed;
  }

  updateConfig(config: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...config };
    this.state.vehicle.targetSpeed = this.config.vehicleSpeed;
  }

  injectEvent(type: InjectedEventType, position?: Vector2) {
    this.handleInjectedEvent(type, position);
  }

  getState(): SimulationState {
    return this.state;
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
  }

  // ─── Main Loop ──────────────────────────────────────────────────────────────

  private loop() {
    this.animationFrameId = requestAnimationFrame((timestamp) => {
      if (this.state.status !== 'running') return;

      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
        this.loop();
        return;
      }

      // Real time delta * speed multiplier
      const wallDt = (timestamp - this.lastTimestamp) / 1000;
      const simDt = Math.min(wallDt * this.state.speed, 0.1); // cap at 100ms
      this.lastTimestamp = timestamp;

      this.tick(simDt);
      this.loop();
    });
  }

  private tick(dt: number) {
    const s = this.state;
    s.time += dt;

    // 1. Check scenario triggers
    this.checkScenarioTriggers();

    // 2. Update agent positions
    s.agents = s.agents.map(agent => updateAgentPhysics(agent, dt, s.time, s.scenario));

    // 3. Perception — detect objects in sensor range
    s.detectedObjects = runPerception(s.vehicle, s.agents, s.obstacles, this.config.sensorRange);

    // 4. Tracking — associate detections
    s.trackedObjects = updateTracks(s.trackedObjects, s.detectedObjects, s.vehicle, dt);

    // 5. Prediction — forecast trajectories
    s.predictions = predictTrajectories(s.trackedObjects, this.config.predictionHorizon);

    // 6. Calculate TTC for all tracked objects
    s.trackedObjects = s.trackedObjects.map(t => ({
      ...t,
      timeToCollision: calculateTTC(s.vehicle, t),
    }));

    // 7. Risk assessment
    const prevRisk = s.risk.overallRisk;
    s.risk = assessRisk(s.vehicle, s.trackedObjects, this.config.safetyDistance);

    // Fire risk events
    if (prevRisk !== s.risk.overallRisk) {
      const sev = s.risk.overallRisk === 'CRITICAL' || s.risk.overallRisk === 'HIGH' ? 'critical' :
                  s.risk.overallRisk === 'MEDIUM' ? 'warning' : 'info';
      this.addEvent('risk_level_change', `Collision risk: ${s.risk.overallRisk}`, sev);
      this.planningCooldown = 0; // force immediate replan on risk change
    }

    // 8. Decision engine
    const prevDecision = s.decision.state;
    s.decision = evaluateDecision(s.vehicle, s.trackedObjects, s.risk, s.plannedPath, this.config);

    if (prevDecision !== s.decision.state) {
      const sev = s.decision.state === 'EMERGENCY_BRAKE' ? 'critical' :
                  s.decision.state === 'STOP' || s.decision.state === 'REPLAN' ? 'warning' : 'info';
      this.addEvent('decision_change', `Decision: ${s.decision.state} — ${s.decision.reason}`, sev);
      this.planningCooldown = 0; // force immediate replan on decision change
    }

    // 9. Path planning (throttled, run every ~200ms sim time or when replanning needed)
    this.planningCooldown -= dt;
    const needsReplan = s.risk.overallRisk === 'HIGH' || s.risk.overallRisk === 'CRITICAL' ||
                        s.decision.state === 'REPLAN';
    
    if (this.planningCooldown <= 0 || s.plannedPath === null) {
      const planStart = performance.now();
      const prevPath = s.plannedPath;
      s.plannedPath = planPath(s.vehicle, s.scenario, s.trackedObjects, s.predictions, s.risk, this.config);
      const planLatency = performance.now() - planStart;

      if (prevPath && needsReplan && s.decision.state !== 'CRUISE') {
        // Replanning event
        this.replanLatencies.push(planLatency);
        s.metrics.replanningCount++;
        s.metrics.replanningLatencyMs = planLatency;
        s.metrics.avgReplanLatency = this.replanLatencies.reduce((a, b) => a + b, 0) / this.replanLatencies.length;
        this.addEvent('replan', `Replanning triggered — ${s.decision.reason} (${planLatency.toFixed(0)}ms)`, 'warning');
        if (s.plannedPath) s.plannedPath.isReplanned = true;
      }

      this.planningCooldown = 0.2; // replan every 200ms max
    }

    // 10. Apply vehicle command
    const prevPos = { ...s.vehicle.position };
    s.vehicle = updateVehiclePhysics(s.vehicle, s.decision, s.plannedPath, dt, this.config);

    // 11. Update metrics
    const moveDist = Math.sqrt(
      Math.pow(s.vehicle.position.x - prevPos.x, 2) +
      Math.pow(s.vehicle.position.y - prevPos.y, 2)
    );
    this.totalDistanceTraveled += moveDist;
    this.speedHistory.push(s.vehicle.speed);
    if (s.vehicle.acceleration < 0) {
      this.decelerationHistory.push(Math.abs(s.vehicle.acceleration));
    }

    const prevClearance = s.metrics.avgClearance;

    s.metrics = this.updateMetrics(s.metrics, s);

    // 12. Check near-miss (clearance < 2m)
    if (s.risk.minClearance < 2.0 && s.risk.minClearance > 0.5 && prevClearance >= 2.0) {
      s.metrics.nearMissCount++;
      this.addEvent('near_miss', `Near miss! Clearance: ${s.risk.minClearance.toFixed(1)}m`, 'critical');
    }

    // 13. Check completion
    const toGoal = Math.sqrt(
      Math.pow(s.vehicle.position.x - s.scenario.egoEnd.x, 2) +
      Math.pow(s.vehicle.position.y - s.scenario.egoEnd.y, 2)
    );
    if (toGoal < 20 || s.time >= s.scenario.duration) {
      this.stop();
      return;
    }

    s.metrics.completionRate = Math.min(1, this.calculateCompletionRate(s));

    // 14. Emit state to UI
    this.emit('stateUpdate', s);
  }

  // ─── Helper Methods ─────────────────────────────────────────────────────────

  private checkScenarioTriggers() {
    const s = this.state;
    for (const event of s.scenario.events) {
      if (s.time >= event.triggerTime && !this.hasEventFired(event.id)) {
        this.handleScenarioEvent(event);
      }
    }
  }

  private hasEventFired(eventId: string): boolean {
    return this.state.events.some(e => e.data?.scenarioEventId === eventId);
  }

  private handleScenarioEvent(event: { id: string; eventType: InjectedEventType; agentId?: string; position?: Vector2; description: string }) {
    if (event.agentId) {
      const agent = this.state.agents.find(a => a.id === event.agentId);
      if (agent) agent.isActive = true;
    }
    this.addEvent(event.eventType, event.description, 'critical', { scenarioEventId: event.id });
    
    if (!event.agentId) {
      this.handleInjectedEvent(event.eventType, event.position);
    }
  }

  private handleInjectedEvent(type: InjectedEventType, position?: Vector2) {
    const s = this.state;

    switch (type) {
      case 'pedestrian_cross': {
        const ped: Agent = {
          id: `ped-inject-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          type: 'pedestrian',
          position: position ?? { x: s.vehicle.position.x + 30, y: s.vehicle.position.y + 8 },
          velocity: { x: -1.2, y: 0 },
          speed: 1.2,
          heading: Math.PI,
          width: 0.5,
          length: 0.5,
          isActive: true,
          behavior: { type: 'crossing', speed: 1.2 },
          trail: [],
        };
        s.agents.push(ped);
        this.addEvent('pedestrian_detected', 'Pedestrian suddenly crossing road', 'critical');
        break;
      }
      case 'animal_enter': {
        const animal: Agent = {
          id: `animal-inject-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          type: 'animal',
          position: position ?? { x: s.vehicle.position.x + 25, y: s.vehicle.position.y - 5 },
          velocity: { x: 0.5, y: 0.8 },
          speed: 0.95,
          heading: Math.PI / 4,
          width: 1.5,
          length: 2.5,
          isActive: true,
          behavior: { type: 'crossing', speed: 0.95 },
          trail: [],
        };
        s.agents.push(animal);
        this.addEvent('animal_detected', 'Animal entered road', 'critical');
        break;
      }
      case 'vehicle_cut_in': {
        const car: Agent = {
          id: `car-inject-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          type: 'car',
          position: position ?? { x: s.vehicle.position.x + 40, y: s.vehicle.position.y + 4 },
          velocity: { x: -s.vehicle.speed * 0.7, y: -1.5 },
          speed: s.vehicle.speed * 0.7,
          heading: Math.PI + 0.3,
          width: 2.0,
          length: 4.5,
          isActive: true,
          behavior: { type: 'turning', speed: s.vehicle.speed * 0.7 },
          trail: [],
        };
        s.agents.push(car);
        this.addEvent('vehicle_cut_in', 'Vehicle cut in from adjacent lane', 'critical');
        break;
      }
      case 'sudden_obstacle': {
        s.obstacles.push({
          id: `obs-inject-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          position: position ?? { x: s.vehicle.position.x + 20, y: s.vehicle.position.y },
          width: 2,
          height: 2,
          type: 'static',
          label: 'Obstacle',
        });
        this.addEvent('obstacle_detected', 'Sudden obstacle appeared on road', 'critical');
        break;
      }
      case 'pushcart_block': {
        const cart: Agent = {
          id: `cart-inject-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          type: 'pushcart',
          position: position ?? { x: s.vehicle.position.x + 22, y: s.vehicle.position.y },
          velocity: { x: 0.3, y: 0 },
          speed: 0.3,
          heading: 0,
          width: 1.5,
          length: 2.0,
          isActive: true,
          behavior: { type: 'straight', speed: 0.3 },
          trail: [],
        };
        s.agents.push(cart);
        this.addEvent('pushcart_block', 'Pushcart blocking path', 'warning');
        break;
      }
      case 'wrong_side_vehicle': {
        const wrongCar: Agent = {
          id: `wrong-inject-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          type: 'car',
          position: position ?? { x: s.vehicle.position.x + 80, y: s.vehicle.position.y },
          velocity: { x: -12, y: 0 },
          speed: 12,
          heading: Math.PI,
          width: 2.0,
          length: 4.5,
          isActive: true,
          behavior: { type: 'straight', speed: 12 },
          trail: [],
        };
        s.agents.push(wrongCar);
        this.addEvent('wrong_side_vehicle', 'Wrong-side vehicle detected', 'critical');
        break;
      }
      default:
        this.addEvent(type, `Event injected: ${type}`, 'warning');
    }
  }

  private updateMetrics(prev: SimulationMetrics, s: SimulationState): SimulationMetrics {
    const avgSpeed = this.speedHistory.length > 0
      ? this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length
      : 0;
    const maxDecel = this.decelerationHistory.length > 0
      ? Math.max(...this.decelerationHistory)
      : 0;
    const minClear = Math.min(prev.minClearance, s.risk.minClearance);

    const safetyScore = this.calculateSafetyScore(s, minClear, maxDecel);
    const smoothness = this.calculatePathSmoothness(s);

    return {
      ...prev,
      elapsedTime: s.time,
      egoSpeed: s.vehicle.speed * 3.6, // m/s → km/h
      egoAcceleration: s.vehicle.acceleration,
      distanceTraveled: this.totalDistanceTraveled,
      avgSpeed: avgSpeed * 3.6,
      maxDeceleration: maxDecel,
      minClearance: minClear === 999 ? s.risk.minClearance : minClear,
      avgClearance: s.risk.minClearance,
      pathSmoothness: smoothness,
      safetyScore,
      planningFrequencyHz: 1 / 0.2, // 5 Hz
    };
  }

  private calculateSafetyScore(s: SimulationState, minClear: number, maxDecel: number): number {
    let score = 100;
    score -= s.metrics.collisionCount * 25;
    score -= s.metrics.nearMissCount * 5;
    score -= Math.max(0, (5 - minClear) * 2);
    score -= Math.max(0, (maxDecel - 4) * 3);
    if (s.decision.state === 'EMERGENCY_BRAKE') score -= 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculatePathSmoothness(s: SimulationState): number {
    if (!s.plannedPath || s.plannedPath.waypoints.length < 3) return 95;
    const wps = s.plannedPath.waypoints;
    let totalCurvature = 0;
    for (let i = 1; i < wps.length - 1; i++) {
      const dx1 = wps[i].position.x - wps[i-1].position.x;
      const dy1 = wps[i].position.y - wps[i-1].position.y;
      const dx2 = wps[i+1].position.x - wps[i].position.x;
      const dy2 = wps[i+1].position.y - wps[i].position.y;
      const angle = Math.abs(Math.atan2(dy2, dx2) - Math.atan2(dy1, dx1));
      totalCurvature += Math.min(angle, Math.PI);
    }
    const avgCurv = totalCurvature / (wps.length - 2);
    return Math.max(0, Math.min(100, Math.round(100 - avgCurv * 30)));
  }

  private calculateCompletionRate(s: SimulationState): number {
    const totalDist = Math.sqrt(
      Math.pow(s.scenario.egoEnd.x - s.scenario.egoStart.x, 2) +
      Math.pow(s.scenario.egoEnd.y - s.scenario.egoStart.y, 2)
    );
    return Math.min(1, this.totalDistanceTraveled / totalDist);
  }

  private finalizeMetrics() {
    const s = this.state;
    s.metrics.completionRate = this.calculateCompletionRate(s);
    s.metrics.distanceTraveled = this.totalDistanceTraveled;
  }

  addEvent(type: string, description: string, severity: 'info' | 'warning' | 'critical', data?: Record<string, unknown>) {
    const event: SimulationEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      timestamp: this.state.time,
      type,
      description,
      severity,
      data,
    };
    this.state.events = [event, ...this.state.events].slice(0, 100); // keep last 100
    this.emit('event', this.state);
  }

  private emit(event: string, state: SimulationState) {
    const cbs = this.listeners.get(event);
    if (cbs) cbs.forEach(cb => cb(state));
  }
}
