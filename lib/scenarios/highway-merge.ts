// SIH Scenario 3: Highway Merge
import type { ScenarioConfig } from '@/types/simulation';

export const highwayMergeScenario: ScenarioConfig = {
  id: 'sih-003-highway-merge',
  name: 'Highway Merge',
  description: 'Merge onto a highway with fast-moving vehicles, a slow truck, and an erratic motorcycle performing unsafe lane changes.',
  roadType: 'highway',
  trafficDensity: 'medium',
  weather: 'clear',
  visibility: 'good',
  difficulty: 'hard',
  egoStart: { x: 50, y: 340 },
  egoEnd: { x: 950, y: 300 },
  waypoints: [
    { x: 200, y: 335 },
    { x: 350, y: 325 },
    { x: 500, y: 310 },
    { x: 650, y: 302 },
    { x: 900, y: 300 },
  ],
  roadBoundaries: [
    // Main highway lanes
    [{ x: 0, y: 270 }, { x: 1000, y: 270 }],
    [{ x: 0, y: 360 }, { x: 1000, y: 360 }],
    // Merge lane marking
    [{ x: 0, y: 315 }, { x: 450, y: 315 }],
  ],
  agents: [
    // Fast car in main lane
    {
      id: 'fast-car',
      type: 'car',
      position: { x: 300, y: 295 },
      velocity: { x: 18, y: 0 },
      speed: 18,
      heading: 0,
      width: 2.0,
      length: 4.5,
      isActive: true,
      behavior: { type: 'straight', speed: 18 },
      trail: [],
    },
    // Slow truck blocking
    {
      id: 'slow-truck',
      type: 'truck',
      position: { x: 500, y: 298 },
      velocity: { x: 6, y: 0 },
      speed: 6,
      heading: 0,
      width: 2.6,
      length: 10,
      isActive: true,
      behavior: { type: 'straight', speed: 6 },
      trail: [],
    },
    // Motorcycle weaving
    {
      id: 'moto-weave',
      type: 'motorcycle',
      position: { x: 400, y: 305 },
      velocity: { x: 14, y: -1.5 },
      speed: 14.08,
      heading: -0.11,
      width: 0.9,
      length: 2.0,
      isActive: false,
      behavior: { type: 'turning', speed: 14 },
      trail: [],
    },
    // Wrong-side vehicle
    {
      id: 'wrong-side',
      type: 'car',
      position: { x: 800, y: 300 },
      velocity: { x: -15, y: 0 },
      speed: 15,
      heading: Math.PI,
      width: 2.0,
      length: 4.5,
      isActive: false,
      behavior: { type: 'straight', speed: 15 },
      trail: [],
    },
  ],
  obstacles: [],
  events: [
    {
      id: 'evt-moto',
      triggerTime: 33,
      eventType: 'vehicle_cut_in',
      agentId: 'moto-weave',
      description: 'Motorcycle making erratic lane change during merge',
    },
    {
      id: 'evt-wrong',
      triggerTime: 28,
      eventType: 'wrong_side_vehicle',
      agentId: 'wrong-side',
      description: 'Vehicle approaching on wrong side of highway',
    },
  ],
  duration: 70,
  tags: ['SIH', 'highway', 'merge', 'high-speed', 'wrong-side'],
};
