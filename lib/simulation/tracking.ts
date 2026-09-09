// Object Tracking Module — Nearest-neighbor association + Kalman-style smoothing
import type { TrackedObject, DetectedObject, EgoVehicle, Vector2, RiskLevel } from '@/types/simulation';

const MAX_MISS_FRAMES = 15; // drop track after 15 frames without detection
const MAX_ASSOCIATION_DIST = 8; // meters

function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function getThreatLevel(dist: number, ttc: number): RiskLevel {
  if (ttc < 1.5 || dist < 3) return 'CRITICAL';
  if (ttc < 2.5 || dist < 5) return 'HIGH';
  if (ttc < 4 || dist < 10) return 'MEDIUM';
  if (ttc < 6 || dist < 20) return 'LOW';
  return 'SAFE';
}

let nextTrackId = 1;

export function updateTracks(
  existingTracks: TrackedObject[],
  detections: DetectedObject[],
  ego: EgoVehicle,
  dt: number
): TrackedObject[] {
  const updatedTracks: TrackedObject[] = [];
  const matchedDetections = new Set<string>();

  // Update existing tracks
  for (const track of existingTracks) {
    // Find closest detection that matches this track
    let bestDetection: DetectedObject | null = null;
    let bestDist = MAX_ASSOCIATION_DIST;

    for (const det of detections) {
      if (matchedDetections.has(det.agentId)) continue;
      if (det.type !== track.type && track.type !== 'obstacle') continue;

      const d = distance(det.worldPosition, track.position);
      if (d < bestDist) {
        bestDist = d;
        bestDetection = det;
      }
    }

    if (bestDetection) {
      // Kalman-style position smoothing (alpha = 0.7 new, 0.3 old)
      const alpha = 0.7;
      const newPos: Vector2 = {
        x: alpha * bestDetection.worldPosition.x + (1 - alpha) * track.position.x,
        y: alpha * bestDetection.worldPosition.y + (1 - alpha) * track.position.y,
      };

      // Velocity estimation from position change
      const newVel: Vector2 = {
        x: dt > 0 ? (newPos.x - track.position.x) / dt : track.velocity.x,
        y: dt > 0 ? (newPos.y - track.position.y) / dt : track.velocity.y,
      };

      const speed = Math.sqrt(newVel.x * newVel.x + newVel.y * newVel.y);
      const heading = Math.atan2(newVel.y, newVel.x);
      const distToEgo = distance(newPos, ego.position);
      const ttc = distToEgo / Math.max(0.1, speed);
      const threat = getThreatLevel(distToEgo, ttc);

      updatedTracks.push({
        ...track,
        position: newPos,
        velocity: newVel,
        speed,
        heading,
        confidence: bestDetection.confidence,
        distanceToEgo: distToEgo,
        timeToCollision: ttc,
        threatLevel: threat,
        framesSinceDetected: 0,
        trail: [...track.trail, newPos].slice(-25),
      });

      matchedDetections.add(bestDetection.agentId);
    } else {
      // Track not matched — increment miss counter
      const missFrames = track.framesSinceDetected + 1;
      if (missFrames < MAX_MISS_FRAMES) {
        // Dead-reckon position
        const newPos: Vector2 = {
          x: track.position.x + track.velocity.x * dt,
          y: track.position.y + track.velocity.y * dt,
        };
        updatedTracks.push({
          ...track,
          position: newPos,
          framesSinceDetected: missFrames,
          confidence: Math.max(0.4, track.confidence - 0.05),
          trail: [...track.trail, newPos].slice(-25),
        });
      }
      // else: drop track (don't add to updatedTracks)
    }
  }

  // Create new tracks for unmatched detections
  for (const det of detections) {
    if (matchedDetections.has(det.agentId)) continue;

    const distToEgo = distance(det.worldPosition, ego.position);
    const relSpeed = Math.sqrt(
      Math.pow(det.relativeVelocity.x, 2) +
      Math.pow(det.relativeVelocity.y, 2)
    );

    const track: TrackedObject = {
      id: `trk-${nextTrackId++}`,
      agentId: det.agentId,
      type: det.type,
      position: det.worldPosition,
      velocity: det.relativeVelocity,
      speed: relSpeed,
      heading: Math.atan2(det.relativeVelocity.y, det.relativeVelocity.x),
      confidence: det.confidence,
      threatLevel: getThreatLevel(distToEgo, distToEgo / Math.max(0.1, relSpeed)),
      timeToCollision: distToEgo / Math.max(0.1, relSpeed),
      distanceToEgo: distToEgo,
      trail: [det.worldPosition],
      framesSinceDetected: 0,
    };
    updatedTracks.push(track);
  }

  return updatedTracks;
}
