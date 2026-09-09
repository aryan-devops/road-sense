// Trajectory Prediction Module
// Short-horizon linear + behavioral prediction for unstructured road agents

import type { TrackedObject, PredictedTrajectory, EgoVehicle, Vector2 } from '@/types/simulation';

const PREDICTION_STEPS = 20;

export function predictTrajectories(
  tracks: TrackedObject[],
  horizon: number // seconds
): PredictedTrajectory[] {
  return tracks.map(track => predictSingle(track, horizon));
}

function predictSingle(track: TrackedObject, horizon: number): PredictedTrajectory {
  const dt = horizon / PREDICTION_STEPS;
  const points: Vector2[] = [];

  let pos = { ...track.position };
  let vx = track.velocity.x;
  let vy = track.velocity.y;

  // Add slight deceleration for pedestrians/animals (they might stop)
  const decayFactor = ['pedestrian', 'animal', 'bicycle'].includes(track.type) ? 0.98 : 1.0;

  for (let i = 0; i < PREDICTION_STEPS; i++) {
    // Add behavioral noise for uncertainty
    const noiseFactor = 0.02 * (i / PREDICTION_STEPS); // grows with time
    const noiseX = (Math.random() - 0.5) * noiseFactor * track.speed;
    const noiseY = (Math.random() - 0.5) * noiseFactor * track.speed;

    vx = vx * decayFactor + noiseX;
    vy = vy * decayFactor + noiseY;

    pos = { x: pos.x + vx * dt, y: pos.y + vy * dt };
    points.push({ ...pos });
  }

  const uncertainty = Math.min(0.8, (track.speed * horizon) / 50);

  return {
    agentId: track.agentId,
    points,
    horizon,
    confidence: track.confidence * (1 - uncertainty * 0.5),
    uncertainty,
  };
}

export function calculateTTC(ego: EgoVehicle, track: TrackedObject): number {
  // Relative position and velocity
  const relPos: Vector2 = {
    x: track.position.x - ego.position.x,
    y: track.position.y - ego.position.y,
  };
  const relVel: Vector2 = {
    x: track.velocity.x - ego.velocity.x,
    y: track.velocity.y - ego.velocity.y,
  };

  const dist = Math.sqrt(relPos.x * relPos.x + relPos.y * relPos.y);
  const closingSpeed = -(relPos.x * relVel.x + relVel.y * relPos.y) / Math.max(dist, 0.1);

  if (closingSpeed <= 0) return Infinity; // not closing
  
  const ttc = dist / closingSpeed;
  return Math.max(0, ttc);
}
