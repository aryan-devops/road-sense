// Decision Engine — Finite State Machine for autonomous vehicle behavior
// Produces explainable decisions based on perception, tracking, and risk

import type {
  EgoVehicle,
  TrackedObject,
  RiskAssessment,
  PlannedPath,
  Decision,
  DecisionState,
  SimulationConfig,
} from '@/types/simulation';

export function evaluateDecision(
  ego: EgoVehicle,
  tracks: TrackedObject[],
  risk: RiskAssessment,
  path: PlannedPath | null,
  config: SimulationConfig
): Decision {
  // Emergency brake — CRITICAL risk with very low TTC
  if (risk.overallRisk === 'CRITICAL' && risk.worstTTC < 1.0) {
    return {
      state: 'EMERGENCY_BRAKE',
      reason: `Critical collision risk — TTC ${risk.worstTTC.toFixed(1)}s, clearance ${risk.minClearance.toFixed(1)}m`,
      targetSpeed: 0,
      targetHeading: ego.heading,
      confidence: 0.99,
      urgency: 1.0,
    };
  }

  // Stop — no path or completely blocked
  if (risk.overallRisk === 'CRITICAL' && (!path || path.collisionCost >= 500)) {
    const blockers = tracks.filter(t => t.distanceToEgo < 8 && t.threatLevel === 'CRITICAL');
    const reason = blockers.length > 0
      ? `${formatAgentType(blockers[0].type)} blocking path at ${blockers[0].distanceToEgo.toFixed(1)}m`
      : 'Path blocked — minimum clearance exceeded';
    return {
      state: 'STOP',
      reason,
      targetSpeed: 0,
      targetHeading: ego.heading,
      confidence: 0.97,
      urgency: 0.9,
    };
  }

  // Replan — HIGH risk
  if (risk.overallRisk === 'HIGH' || risk.overallRisk === 'CRITICAL') {
    const worstTrack = tracks.find(t => t.threatLevel === 'CRITICAL' || t.threatLevel === 'HIGH');
    const reason = worstTrack
      ? `${formatAgentType(worstTrack.type)} predicted to intersect trajectory in ${worstTrack.timeToCollision.toFixed(1)}s`
      : `High collision risk — replanning required`;
    return {
      state: 'REPLAN',
      reason,
      // Keep momentum to swerve, but cautiously
      targetSpeed: Math.max(ego.targetSpeed * 0.6, 2.0),
      targetHeading: ego.heading,
      confidence: 0.93,
      urgency: 0.8,
    };
  }

  // Slow down — MEDIUM risk
  if (risk.overallRisk === 'MEDIUM') {
    const closestThreat = tracks
      .filter(t => t.threatLevel !== 'SAFE' && t.threatLevel !== 'LOW')
      .sort((a, b) => a.distanceToEgo - b.distanceToEgo)[0];

    const reason = closestThreat
      ? `${formatAgentType(closestThreat.type)} detected at ${closestThreat.distanceToEgo.toFixed(0)}m, TTC ${closestThreat.timeToCollision.toFixed(1)}s`
      : `Medium risk — reducing speed for safety`;

    return {
      state: 'SLOW_DOWN',
      reason,
      targetSpeed: ego.targetSpeed * 0.6,
      targetHeading: ego.heading,
      confidence: 0.9,
      urgency: 0.5,
    };
  }

  // Follow — lead vehicle in path
  const leadVehicle = tracks
    .filter(t => {
      const inFront = t.position.x > ego.position.x; // simplified
      return inFront && t.distanceToEgo < config.safetyDistance * 2 && 
             (t.type === 'car' || t.type === 'bus' || t.type === 'truck' || t.type === 'auto_rickshaw' || t.type === 'motorcycle' || t.type === 'bicycle' || t.type === 'pushcart');
    })
    .sort((a, b) => a.distanceToEgo - b.distanceToEgo)[0];

  if (leadVehicle && leadVehicle.distanceToEgo < config.safetyDistance * 1.5) {
    return {
      state: 'FOLLOW',
      reason: `Following ${formatAgentType(leadVehicle.type)} at ${leadVehicle.distanceToEgo.toFixed(0)}m`,
      targetSpeed: Math.max(0, leadVehicle.speed - 0.5),
      targetHeading: ego.heading,
      confidence: 0.92,
      urgency: 0.2,
    };
  }

  // Yield — pedestrian/animal has right of way
  const crossingAgent = tracks.find(t =>
    (t.type === 'pedestrian' || t.type === 'animal') &&
    t.distanceToEgo < 20 &&
    t.threatLevel !== 'SAFE'
  );

  if (crossingAgent) {
    return {
      state: 'YIELD',
      reason: `${formatAgentType(crossingAgent.type)} crossing — yielding right of way`,
      targetSpeed: ego.targetSpeed * 0.3,
      targetHeading: ego.heading,
      confidence: 0.95,
      urgency: 0.6,
    };
  }

  // Overtake — slow moving obstacle with clear path
  if (risk.overallRisk === 'LOW' && risk.minClearance > config.safetyDistance * 1.5) {
    const slowLeader = tracks.find(t =>
      t.distanceToEgo < 25 && t.speed < ego.targetSpeed * 0.5 &&
      (t.type === 'car' || t.type === 'bus' || t.type === 'truck' || t.type === 'auto_rickshaw' || t.type === 'motorcycle' || t.type === 'bicycle' || t.type === 'pushcart')
    );
    if (slowLeader) {
      return {
        state: 'OVERTAKE',
        reason: `Overtaking slow ${formatAgentType(slowLeader.type)} — ${slowLeader.speed.toFixed(1)} m/s`,
        targetSpeed: ego.targetSpeed,
        targetHeading: ego.heading,
        confidence: 0.85,
        urgency: 0.1,
      };
    }
  }

  // Default — CRUISE
  return {
    state: 'CRUISE',
    reason: 'Path clear — cruising at target speed',
    targetSpeed: config.vehicleSpeed,
    targetHeading: ego.heading,
    confidence: 0.99,
    urgency: 0,
  };
}

function formatAgentType(type: string): string {
  const map: Record<string, string> = {
    car: 'Car',
    auto_rickshaw: 'Auto-rickshaw',
    motorcycle: 'Motorcycle',
    bicycle: 'Bicycle',
    bus: 'Bus',
    truck: 'Truck',
    pedestrian: 'Pedestrian',
    animal: 'Animal',
    pushcart: 'Pushcart',
    obstacle: 'Obstacle',
  };
  return map[type] ?? type;
}
