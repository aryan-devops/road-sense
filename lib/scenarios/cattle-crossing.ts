// SIH Scenario 5: Sudden Cattle Crossing
// Tests: Fast perception-to-decision-to-braking response
import type { ScenarioConfig } from '@/types/simulation';

export const cattleCrossingScenario: ScenarioConfig = {
  id: 'sih-005-cattle-crossing',
  name: 'Sudden Cattle Crossing',
  description: 'A vehicle cruising at speed on a rural highway encounters cattle suddenly crossing the road. Tests emergency braking and replanning speed.',
  roadType: 'village_road',
  trafficDensity: 'low',
  weather: 'clear',
  visibility: 'good',
  difficulty: 'hard',
  egoStart: { x: 50, y: 300 },
  egoEnd: { x: 950, y: 300 },
  waypoints: [
    { x: 200, y: 300 },
    { x: 500, y: 300 },
    { x: 700, y: 300 },
    { x: 900, y: 300 },
  ],
  roadBoundaries: [
    [{ x: 0, y: 275 }, { x: 1000, y: 275 }],
    [{ x: 0, y: 325 }, { x: 1000, y: 325 }],
  ],
  agents: [
    // Lead cattle — visible early
    {
      id: 'cattle-lead',
      type: 'animal',
      position: { x: 440, y: 274 },
      velocity: { x: 0.8, y: 2.0 },
      speed: 2.15,
      heading: Math.PI / 2 - 0.3,
      width: 1.5, length: 2.5,
      isActive: false,
      behavior: { type: 'crossing', speed: 2.15 },
      trail: [],
    },
    // Second cattle — sudden
    {
      id: 'cattle-sudden',
      type: 'animal',
      position: { x: 450, y: 272 },
      velocity: { x: 0.3, y: 2.5 },
      speed: 2.52,
      heading: Math.PI / 2,
      width: 1.5, length: 2.5,
      isActive: false,
      behavior: { type: 'crossing', speed: 2.52 },
      trail: [],
    },
    // Third cattle follows
    {
      id: 'cattle-3',
      type: 'animal',
      position: { x: 460, y: 270 },
      velocity: { x: 1.0, y: 2.2 },
      speed: 2.4,
      heading: Math.PI / 2 - 0.2,
      width: 1.5, length: 2.5,
      isActive: false,
      behavior: { type: 'crossing', speed: 2.4 },
      trail: [],
    },
    // Slow auto ahead
    {
      id: 'slow-auto',
      type: 'auto_rickshaw',
      position: { x: 700, y: 300 },
      velocity: { x: 5, y: 0 },
      speed: 5,
      heading: 0,
      width: 1.5, length: 3.0,
      isActive: true,
      behavior: { type: 'straight', speed: 5 },
      trail: [],
    },
  ],
  obstacles: [],
  events: [
    {
      id: 'evt-cattle-1',
      triggerTime: 36,
      eventType: 'animal_enter',
      agentId: 'cattle-lead',
      description: 'Lead cattle entering highway from roadside',
    },
    {
      id: 'evt-cattle-2',
      triggerTime: 36.5,
      eventType: 'animal_enter',
      agentId: 'cattle-sudden',
      description: 'Second cattle entering road suddenly',
    },
    {
      id: 'evt-cattle-3',
      triggerTime: 37,
      eventType: 'animal_enter',
      agentId: 'cattle-3',
      description: 'Third cattle following herd',
    },
  ],
  duration: 60,
  tags: ['SIH', 'cattle', 'emergency', 'braking', 'rural', 'animal'],
};
