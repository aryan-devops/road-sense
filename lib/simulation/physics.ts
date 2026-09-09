// Physics module — kinematic bicycle model for ego vehicle and agents
import type { EgoVehicle, Agent, Decision, PlannedPath, SimulationConfig, ScenarioConfig, Vector2 } from '@/types/simulation';

export function updateVehiclePhysics(
  vehicle: EgoVehicle,
  decision: Decision,
  path: PlannedPath | null,
  dt: number,
  config: SimulationConfig
): EgoVehicle {
  let { speed, heading, acceleration, braking } = vehicle;
  const targetSpeed = decision.targetSpeed;

  // Speed control
  const speedError = targetSpeed - speed;
  if (speedError > 0) {
    acceleration = Math.min(speedError / dt, config.maxAcceleration);
    braking = 0;
  } else if (speedError < 0) {
    acceleration = Math.max(speedError / dt, -config.maxBraking);
    braking = Math.min(1, Math.abs(speedError) / config.maxBraking);
  } else {
    acceleration = 0;
    braking = 0;
  }

  speed = Math.max(0, speed + acceleration * dt);

  // Steering — follow planned path
  let targetHeading = heading;
  if (path && path.waypoints.length > 1) {
    // Look-ahead at 10m
    const lookAheadDist = Math.max(5, speed * 1.5);
    let cumDist = 0;
    let targetWP = path.waypoints[1];
    for (let i = 1; i < path.waypoints.length; i++) {
      const dx = path.waypoints[i].position.x - (i > 1 ? path.waypoints[i-1].position.x : vehicle.position.x);
      const dy = path.waypoints[i].position.y - (i > 1 ? path.waypoints[i-1].position.y : vehicle.position.y);
      cumDist += Math.sqrt(dx*dx + dy*dy);
      targetWP = path.waypoints[i];
      if (cumDist >= lookAheadDist) break;
    }
    targetHeading = Math.atan2(
      targetWP.position.y - vehicle.position.y,
      targetWP.position.x - vehicle.position.x
    );
  } else if (vehicle.position) {
    // Use decision heading
    targetHeading = decision.targetHeading;
  }

  // Smooth heading change (max turn rate based on speed)
  const maxTurnRate = speed > 0.1 ? Math.min(Math.PI / 4, 2.0 / Math.max(speed, 1)) : Math.PI / 2;
  const headingError = normalizeAngle(targetHeading - heading);
  const headingDelta = Math.sign(headingError) * Math.min(Math.abs(headingError), maxTurnRate * dt);
  heading = normalizeAngle(heading + headingDelta);

  const steeringAngle = headingError;

  // Update position
  const newPosition: Vector2 = {
    x: vehicle.position.x + Math.cos(heading) * speed * dt,
    y: vehicle.position.y + Math.sin(heading) * speed * dt,
  };

  return {
    ...vehicle,
    position: newPosition,
    velocity: { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed },
    speed,
    heading,
    acceleration,
    steeringAngle,
    braking,
  };
}

export function updateAgentPhysics(
  agent: Agent,
  dt: number,
  simTime: number,
  scenario: ScenarioConfig
): Agent {
  if (!agent.isActive) return agent;

  let { position, velocity, heading } = agent;
  const { speed } = agent;
  const behavior = agent.behavior;

  // Trigger time check
  if (behavior.triggerTime !== undefined && simTime < behavior.triggerTime) {
    return agent;
  }

  switch (behavior.type) {
    case 'straight':
      position = {
        x: position.x + Math.cos(heading) * speed * dt,
        y: position.y + Math.sin(heading) * speed * dt,
      };
      break;

    case 'crossing':
      // Move toward opposite side of road
      position = {
        x: position.x + velocity.x * dt,
        y: position.y + velocity.y * dt,
      };
      break;

    case 'turning': {
      // Simple arc turn
      const turnRate = 0.3;
      heading = normalizeAngle(heading + turnRate * dt);
      velocity = { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed };
      position = { x: position.x + velocity.x * dt, y: position.y + velocity.y * dt };
      break;
    }

    case 'scripted': {
      if (behavior.waypoints && behavior.waypoints.length > 0) {
        const target = behavior.waypoints[0];
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 2) {
          behavior.waypoints.shift();
        } else {
          heading = Math.atan2(dy, dx);
          velocity = { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed };
          position = { x: position.x + velocity.x * dt, y: position.y + velocity.y * dt };
        }
      }
      break;
    }

    case 'stationary':
    default:
      break;
  }

  // Update trail
  const trail = [...agent.trail, position].slice(-30); // keep last 30 positions

  return { ...agent, position, velocity, heading, trail };
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
