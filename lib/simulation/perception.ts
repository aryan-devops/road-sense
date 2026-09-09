// Perception Module — Synthetic multi-sensor detection
// Simulates Camera + LiDAR + Radar detection of agents within sensor range

import type { EgoVehicle, Agent, Obstacle, DetectedObject, AgentType, Vector2 } from '@/types/simulation';

const SENSOR_NOISE = 0.05; // 5% noise on confidence

function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function toEgoFrame(worldPos: Vector2, ego: EgoVehicle): Vector2 {
  const dx = worldPos.x - ego.position.x;
  const dy = worldPos.y - ego.position.y;
  const cos = Math.cos(-ego.heading);
  const sin = Math.sin(-ego.heading);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function getBaseConfidence(type: AgentType, dist: number, sensorRange: number): number {
  const rangeFactor = 1 - (dist / sensorRange) * 0.3;
  const typeConf: Record<AgentType, number> = {
    car: 0.97,
    auto_rickshaw: 0.96,
    motorcycle: 0.94,
    bicycle: 0.92,
    bus: 0.98,
    truck: 0.98,
    pedestrian: 0.95,
    animal: 0.88,
    pushcart: 0.85,
    obstacle: 0.99,
  };
  const base = typeConf[type] ?? 0.90;
  const noise = (Math.random() - 0.5) * SENSOR_NOISE * 2;
  return Math.max(0.6, Math.min(1.0, base * rangeFactor + noise));
}

function getSensorSource(type: AgentType, dist: number): 'camera' | 'lidar' | 'radar' | 'fused' {
  if (dist > 60) return 'radar';
  if (dist < 20) return 'lidar';
  return 'fused';
}

export function runPerception(
  ego: EgoVehicle,
  agents: Agent[],
  obstacles: Obstacle[],
  sensorRange: number
): DetectedObject[] {
  const detected: DetectedObject[] = [];

  // Detect agents
  for (const agent of agents) {
    if (!agent.isActive) continue;

    const dist = distance(ego.position, agent.position);
    if (dist > sensorRange) continue;

    // Field of view check (simplified: 270° front sensor arc)
    const egoFramePos = toEgoFrame(agent.position, ego);
    const angle = Math.atan2(egoFramePos.y, egoFramePos.x);
    if (Math.abs(angle) > (3 * Math.PI) / 4) continue; // behind ego

    const confidence = getBaseConfidence(agent.type, dist, sensorRange);
    const sensorSource = getSensorSource(agent.type, dist);

    detected.push({
      agentId: agent.id,
      type: agent.type,
      position: egoFramePos,
      worldPosition: agent.position,
      distance: dist,
      relativeVelocity: {
        x: agent.velocity.x - ego.velocity.x,
        y: agent.velocity.y - ego.velocity.y,
      },
      confidence,
      sensorSource,
      boundingBox: {
        x: egoFramePos.x - agent.width / 2,
        y: egoFramePos.y - agent.length / 2,
        w: agent.width,
        h: agent.length,
      },
    });
  }

  // Detect static obstacles
  for (const obs of obstacles) {
    const dist = distance(ego.position, obs.position);
    if (dist > sensorRange * 0.8) continue;

    const egoFramePos = toEgoFrame(obs.position, ego);
    detected.push({
      agentId: obs.id,
      type: 'obstacle',
      position: egoFramePos,
      worldPosition: obs.position,
      distance: dist,
      relativeVelocity: { x: -ego.velocity.x, y: -ego.velocity.y },
      confidence: 0.99,
      sensorSource: 'lidar',
      boundingBox: {
        x: egoFramePos.x - obs.width / 2,
        y: egoFramePos.y - obs.height / 2,
        w: obs.width,
        h: obs.height,
      },
    });
  }

  return detected;
}
