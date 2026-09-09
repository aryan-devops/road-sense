// Path Planner — Predictive Spatio-Temporal Trajectory Generation
// For unstructured Indian roads: adaptive local planning against dynamic obstacles

import type {
  EgoVehicle,
  TrackedObject,
  PredictedTrajectory,
  RiskAssessment,
  PlannedPath,
  PathWaypoint,
  ScenarioConfig,
  SimulationConfig,
  Vector2,
} from '@/types/simulation';

const NUM_CANDIDATES = 7;
const WAYPOINT_COUNT = 15;
const WAYPOINT_SPACING = 4; // meters

interface Candidate {
  waypoints: PathWaypoint[];
  lateralOffset: number;
  collisionCost: number;
  clearanceCost: number;
  curvatureCost: number;
  progressCost: number;
  smoothnessCost: number;
  totalCost: number;
  isFeasible: boolean;
}

function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function generateReferenceHeading(ego: EgoVehicle, scenario: ScenarioConfig): number {
  const wps = scenario.waypoints;
  if (wps.length === 0) return ego.heading;

  // Find the first waypoint that is significantly ahead of the vehicle
  let targetWp = wps[wps.length - 1]; // Default to the final destination
  
  for (let i = 0; i < wps.length; i++) {
    const wp = wps[i];
    // Since all scenarios flow left-to-right (+X), this ensures we only target future waypoints
    if (wp.x > ego.position.x + 2) {
      targetWp = wp;
      break; // Stop at the first waypoint ahead of us
    }
  }

  // Calculate angle from current position to the target future waypoint
  return Math.atan2(targetWp.y - ego.position.y, targetWp.x - ego.position.x);
}

function generateCandidate(
  ego: EgoVehicle,
  refHeading: number,
  lateralOffset: number,
  targetSpeed: number
): PathWaypoint[] {
  const waypoints: PathWaypoint[] = [];
  let pos = { ...ego.position };

  // Apply initial lateral shift
  const perpX = -Math.sin(refHeading) * lateralOffset;
  const perpY = Math.cos(refHeading) * lateralOffset;
  pos = { x: pos.x + perpX * 0.3, y: pos.y + perpY * 0.3 };
  
  let cumTime = 0;

  for (let i = 0; i < WAYPOINT_COUNT; i++) {
    // IMPORTANT FIX: Maintain lateral offset. Do NOT force convergence to 0!
    // A slight smooth blend for the first 3 waypoints is fine, but it must hold the lane.
    const blendFactor = Math.min(1, (i + 1) / 3.0); 
    const currentOffset = lateralOffset * blendFactor;
    const perpOffX = -Math.sin(refHeading) * currentOffset;
    const perpOffY = Math.cos(refHeading) * currentOffset;

    const wpPos: Vector2 = {
      x: pos.x + Math.cos(refHeading) * WAYPOINT_SPACING + perpOffX * 0.1, // .1 dampener to smooth lateral move
      y: pos.y + Math.sin(refHeading) * WAYPOINT_SPACING + perpOffY * 0.1,
    };

    // Calculate time `t` to reach this waypoint
    const d = distance(pos, wpPos);
    // Avoid div by 0
    const spd = Math.max(1, targetSpeed);
    cumTime += d / spd;

    const prevAngle = i > 0 ? Math.atan2(waypoints[i-1].position.y - (i > 1 ? waypoints[i-2].position.y : pos.y),
                                          waypoints[i-1].position.x - (i > 1 ? waypoints[i-2].position.x : pos.x)) : refHeading;
    const curAngle = Math.atan2(wpPos.y - pos.y, wpPos.x - pos.x);
    const curvature = Math.abs(curAngle - prevAngle);

    waypoints.push({
      position: wpPos,
      speed: targetSpeed * (1 - curvature * 0.2),
      curvature,
      estimatedTime: cumTime,
    });
    pos = wpPos;
  }

  return waypoints;
}

function getPredictedPosition(track: TrackedObject, predictions: PredictedTrajectory[], timeOffset: number): Vector2 {
  const pred = predictions.find(p => p.agentId === track.agentId);
  if (!pred || pred.points.length === 0) {
    // Linear extrapolation fallback
    return {
      x: track.position.x + track.velocity.x * timeOffset,
      y: track.position.y + track.velocity.y * timeOffset
    };
  }
  
  // Predict trajectory resolution (20 steps over horizon)
  const dt = pred.horizon / pred.points.length;
  const index = Math.floor(timeOffset / dt);
  
  if (index >= pred.points.length) {
    // Beyond horizon, extrapolate from last point
    const last = pred.points[pred.points.length - 1];
    return last;
  }
  return pred.points[index];
}

function scoreCosts(
  waypoints: PathWaypoint[],
  ego: EgoVehicle,
  tracks: TrackedObject[],
  predictions: PredictedTrajectory[],
  risk: RiskAssessment
): Omit<Candidate, 'waypoints' | 'lateralOffset' | 'totalCost' | 'isFeasible'> {
  let collisionCost = 0;
  let clearanceCost = 0;
  let curvatureCost = 0;
  const progressCost = 0;
  let smoothnessCost = 0;

  for (const wp of waypoints) {
    const t = wp.estimatedTime ?? 0;

    // Check distance against PREDICTED positions at time `t`
    for (const track of tracks) {
      const futurePos = getPredictedPosition(track, predictions, t);
      const d = distance(wp.position, futurePos);
      
      if (d < 2.0) { // Ego size buffer
        collisionCost += 1000; // infeasible
      } else if (d < 5.0) {
        clearanceCost += (5.0 - d) * 15;
      }
    }

    // Check static risk zones
    for (const zone of risk.riskZones) {
      const d = distance(wp.position, zone.center);
      if (d < zone.radius) {
        const penalty = zone.risk === 'CRITICAL' ? 200 : zone.risk === 'HIGH' ? 100 : 40;
        collisionCost += (1 - d / zone.radius) * penalty;
      }
    }

    curvatureCost += wp.curvature * 10;
  }

  for (let i = 1; i < waypoints.length; i++) {
    const dc = Math.abs(waypoints[i].curvature - waypoints[i-1].curvature);
    smoothnessCost += dc * 5;
  }

  return { collisionCost, clearanceCost, curvatureCost, progressCost, smoothnessCost };
}

export function planPath(
  ego: EgoVehicle,
  scenario: ScenarioConfig,
  tracks: TrackedObject[],
  predictions: PredictedTrajectory[],
  risk: RiskAssessment,
  config: SimulationConfig
): PlannedPath {
  const refHeading = generateReferenceHeading(ego, scenario);
  const targetSpeed = Math.max(2, config.vehicleSpeed * 0.8);

  const offsets = [-4.5, -3, -1.5, 0, 1.5, 3, 4.5].slice(0, NUM_CANDIDATES);
  const candidates: Candidate[] = offsets.map(offset => {
    const waypoints = generateCandidate(ego, refHeading, offset, targetSpeed);
    const costs = scoreCosts(waypoints, ego, tracks, predictions, risk);
    const totalCost = costs.collisionCost + costs.clearanceCost + costs.curvatureCost +
                      costs.progressCost + costs.smoothnessCost;
    return {
      waypoints,
      lateralOffset: offset,
      ...costs,
      totalCost,
      isFeasible: costs.collisionCost < 500,
    };
  });

  const feasible = candidates.filter(c => c.isFeasible);
  const best = feasible.length > 0
    ? feasible.reduce((a, b) => a.totalCost < b.totalCost ? a : b)
    : candidates.reduce((a, b) => a.totalCost < b.totalCost ? a : b);

  return {
    waypoints: best.waypoints,
    totalCost: best.totalCost,
    collisionCost: best.collisionCost,
    clearanceCost: best.clearanceCost,
    curvatureCost: best.curvatureCost,
    progressCost: best.progressCost,
    smoothnessCost: best.smoothnessCost,
    isReplanned: false,
    candidateCount: candidates.length,
  };
}
