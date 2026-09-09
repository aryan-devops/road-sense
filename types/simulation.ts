// Core Simulation Types for RoadSense
// Synthetic Simulation — Not a real autonomous driving system

export type AgentType =
  | 'car'
  | 'auto_rickshaw'
  | 'motorcycle'
  | 'bicycle'
  | 'bus'
  | 'truck'
  | 'pedestrian'
  | 'animal'
  | 'pushcart'
  | 'obstacle';

export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DecisionState =
  | 'CRUISE'
  | 'FOLLOW'
  | 'SLOW_DOWN'
  | 'STOP'
  | 'OVERTAKE'
  | 'YIELD'
  | 'REPLAN'
  | 'EMERGENCY_BRAKE';

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export type InjectedEventType =
  | 'pedestrian_cross'
  | 'animal_enter'
  | 'vehicle_cut_in'
  | 'wrong_side_vehicle'
  | 'pushcart_block'
  | 'sudden_obstacle'
  | 'informal_merge'
  | 'traffic_congestion'
  | 'road_narrowing';

export interface Vector2 {
  x: number;
  y: number;
}

export interface EgoVehicle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  speed: number;         // m/s
  heading: number;       // radians
  acceleration: number;  // m/s²
  steeringAngle: number; // radians
  width: number;
  length: number;
  targetSpeed: number;
  braking: number;       // 0–1
}

export interface Agent {
  id: string;
  type: AgentType;
  position: Vector2;
  velocity: Vector2;
  speed: number;
  heading: number;
  width: number;
  length: number;
  isActive: boolean;
  behavior: AgentBehavior;
  trail: Vector2[];       // position history for rendering
}

export interface AgentBehavior {
  type: 'straight' | 'turning' | 'crossing' | 'stationary' | 'scripted';
  waypoints?: Vector2[];
  speed: number;
  triggerTime?: number;   // seconds into simulation when agent activates
  triggerCondition?: string;
}

export interface Obstacle {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  type: 'static' | 'dynamic';
  label: string;
}

export interface DetectedObject {
  agentId: string;
  type: AgentType;
  position: Vector2;        // in ego frame
  worldPosition: Vector2;   // in world frame
  distance: number;
  relativeVelocity: Vector2;
  confidence: number;       // 0–1
  sensorSource: 'camera' | 'lidar' | 'radar' | 'fused';
  boundingBox: { x: number; y: number; w: number; h: number };
}

export interface TrackedObject {
  id: string;
  agentId: string;
  type: AgentType;
  position: Vector2;
  velocity: Vector2;
  speed: number;
  heading: number;
  confidence: number;
  threatLevel: RiskLevel;
  timeToCollision: number; // seconds, Infinity if no risk
  distanceToEgo: number;
  trail: Vector2[];
  framesSinceDetected: number;
}

export interface PredictedTrajectory {
  agentId: string;
  points: Vector2[];        // predicted future positions
  horizon: number;          // seconds
  confidence: number;
  uncertainty: number;      // spread of prediction
}

export interface PathWaypoint {
  position: Vector2;
  speed: number;            // target speed at waypoint
  curvature: number;
  estimatedTime?: number;   // estimated time of arrival at waypoint
}

export interface PlannedPath {
  waypoints: PathWaypoint[];
  totalCost: number;
  collisionCost: number;
  clearanceCost: number;
  curvatureCost: number;
  progressCost: number;
  smoothnessCost: number;
  isReplanned: boolean;
  replanReason?: string;
  candidateCount: number;
}

export interface Decision {
  state: DecisionState;
  reason: string;
  targetSpeed: number;      // m/s
  targetHeading: number;
  confidence: number;
  urgency: number;          // 0–1
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  criticalObjects: string[]; // tracked object IDs
  minClearance: number;      // meters
  worstTTC: number;          // seconds
  riskZones: RiskZone[];
}

export interface RiskZone {
  center: Vector2;
  radius: number;
  risk: RiskLevel;
  agentId?: string;
}

export interface SimulationMetrics {
  elapsedTime: number;
  egoSpeed: number;
  egoAcceleration: number;
  collisionCount: number;
  nearMissCount: number;
  replanningCount: number;
  replanningLatencyMs: number;
  avgReplanLatency: number;
  pathSmoothness: number;       // 0–100
  minClearance: number;
  avgClearance: number;
  completionRate: number;       // 0–1
  safetyScore: number;          // 0–100
  planningFrequencyHz: number;
  distanceTraveled: number;
  avgSpeed: number;
  maxDeceleration: number;
}

export interface SimulationEvent {
  id: string;
  timestamp: number;    // seconds
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data?: Record<string, unknown>;
}

export interface SimulationState {
  id: string;
  status: SimulationStatus;
  time: number;           // seconds elapsed
  speed: number;          // simulation speed multiplier
  vehicle: EgoVehicle;
  agents: Agent[];
  obstacles: Obstacle[];
  detectedObjects: DetectedObject[];
  trackedObjects: TrackedObject[];
  predictions: PredictedTrajectory[];
  decision: Decision;
  plannedPath: PlannedPath | null;
  risk: RiskAssessment;
  metrics: SimulationMetrics;
  events: SimulationEvent[];
  scenario: ScenarioConfig;
}

export interface SimulationConfig {
  vehicleSpeed: number;         // m/s
  trafficDensity: number;       // 0–1
  pedestrianDensity: number;    // 0–1
  reactionTime: number;         // seconds
  sensorRange: number;          // meters
  predictionHorizon: number;    // seconds
  safetyDistance: number;       // meters
  maxAcceleration: number;      // m/s²
  maxBraking: number;           // m/s²
  planningHorizon: number;      // seconds
  replanningThreshold: number;  // risk level that triggers replan
  randomizationMode: boolean;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  roadType: string;
  trafficDensity: 'low' | 'medium' | 'high' | 'extreme';
  weather: 'clear' | 'foggy' | 'rainy' | 'dusty';
  visibility: 'good' | 'moderate' | 'poor';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  agents: Agent[];
  obstacles: Obstacle[];
  egoStart: Vector2;
  egoEnd: Vector2;
  waypoints: Vector2[];
  roadBoundaries: Vector2[][];
  events: ScenarioEvent[];
  duration: number;             // seconds
  tags: string[];
}

export interface ScenarioEvent {
  id: string;
  triggerTime: number;
  triggerCondition?: string;
  eventType: InjectedEventType;
  agentId?: string;
  position?: Vector2;
  description: string;
}

export type SimulationSpeed = 0.25 | 0.5 | 1 | 2 | 4;
