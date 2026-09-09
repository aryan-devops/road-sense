// Collision Avoidance Module — Risk assessment and threat quantification
import type {
  EgoVehicle,
  TrackedObject,
  RiskAssessment,
  RiskLevel,
  RiskZone,
  Vector2,
} from '@/types/simulation';

function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function riskLevelFromThreat(minClear: number, worstTTC: number, criticalCount: number): RiskLevel {
  if (criticalCount > 0 && (worstTTC < 1.5 || minClear < 2)) return 'CRITICAL';
  if (worstTTC < 2.5 || minClear < 4) return 'HIGH';
  if (worstTTC < 4 || minClear < 7) return 'MEDIUM';
  if (worstTTC < 6 || minClear < 12) return 'LOW';
  return 'SAFE';
}

export function assessRisk(
  ego: EgoVehicle,
  tracks: TrackedObject[],
  safetyDistance: number
): RiskAssessment {
  if (tracks.length === 0) {
    return {
      overallRisk: 'SAFE',
      criticalObjects: [],
      minClearance: 999,
      worstTTC: 999,
      riskZones: [],
    };
  }

  const riskZones: RiskZone[] = [];
  let minClearance = 999;
  let worstTTC = 999;
  const criticalObjects: string[] = [];

  for (const track of tracks) {
    const clearance = Math.max(0, track.distanceToEgo - (ego.length / 2 + 0.5));
    if (clearance < minClearance) minClearance = clearance;
    if (track.timeToCollision < worstTTC) worstTTC = track.timeToCollision;

    if (track.threatLevel === 'CRITICAL' || track.threatLevel === 'HIGH') {
      criticalObjects.push(track.id);
    }

    // Create risk zone around threatening objects
    if (track.threatLevel !== 'SAFE') {
      const radius = track.threatLevel === 'CRITICAL' ? 8 :
                     track.threatLevel === 'HIGH' ? 6 :
                     track.threatLevel === 'MEDIUM' ? 4 : 3;
      riskZones.push({
        center: track.position,
        radius,
        risk: track.threatLevel,
        agentId: track.agentId,
      });
    }
  }

  const criticalCount = tracks.filter(t => t.threatLevel === 'CRITICAL').length;
  const overallRisk = riskLevelFromThreat(minClearance, worstTTC, criticalCount);

  return {
    overallRisk,
    criticalObjects,
    minClearance,
    worstTTC,
    riskZones,
  };
}
