import * as THREE from 'three';
import type { PlannedPath, PredictedTrajectory, RiskAssessment, Vector2 } from '@/types/simulation';

export class TrajectoryLayers {
  private scene: THREE.Scene;
  private drivableAreaMesh: THREE.Mesh;
  private plannedPathLine: THREE.Line;
  private candidatePathsGroup: THREE.Group = new THREE.Group();
  private predictionsGroup: THREE.Group = new THREE.Group();
  private riskZonesGroup: THREE.Group = new THREE.Group();
  private replanShockwave: THREE.Mesh;
  private replanShockwaveTime: number = -1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Drivable Area Mesh ("LANELESS NAVIGATION")
    const drivableGeom = new THREE.PlaneGeometry(60, 10, 1, 1);
    drivableGeom.rotateX(-Math.PI / 2);
    const drivableMat = new THREE.MeshBasicMaterial({
      color: 0x7a8a9a, // Muted slate gray
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    this.drivableAreaMesh = new THREE.Mesh(drivableGeom, drivableMat);
    this.drivableAreaMesh.position.y = 0.04;
    this.scene.add(this.drivableAreaMesh);

    // 2. Main Planned Path Line
    const pathGeom = new THREE.BufferGeometry();
    const pathMat = new THREE.LineBasicMaterial({
      color: 0x8fb397, // Subtle safe green
      linewidth: 3,
    });
    this.plannedPathLine = new THREE.Line(pathGeom, pathMat);
    this.scene.add(this.plannedPathLine);

    // 3. Replanning Shockwave Ripple
    const shockGeom = new THREE.RingGeometry(0.2, 1.0, 32);
    shockGeom.rotateX(-Math.PI / 2);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0xd98d26, // Muted amber
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    this.replanShockwave = new THREE.Mesh(shockGeom, shockMat);
    this.replanShockwave.position.y = 0.08;
    this.scene.add(this.replanShockwave);

    this.scene.add(this.candidatePathsGroup);
    this.scene.add(this.predictionsGroup);
    this.scene.add(this.riskZonesGroup);
  }

  triggerReplanEvent(position: Vector2) {
    this.replanShockwave.position.set(position.x, 0.08, position.y);
    this.replanShockwaveTime = 0;
  }

  update(
    egoPos: Vector2,
    plannedPath: PlannedPath | null,
    predictions: PredictedTrajectory[],
    risk: RiskAssessment,
    time: number,
    delta: number
  ) {
    // ── 1. Update Drivable Area Ribbon ────────────────
    // Corridor extends 45 meters forward from ego position with safe lateral bounds
    this.drivableAreaMesh.position.set(egoPos.x + 22.5, 0.04, egoPos.y);
    // Subtle breathing pulse on drivable area
    const drivablePulse = 0.10 + Math.sin(time * 3) * 0.03;
    (this.drivableAreaMesh.material as THREE.MeshBasicMaterial).opacity = drivablePulse;

    // ── 2. Update Planned Path ────────────────────────
    if (plannedPath && plannedPath.waypoints.length > 1) {
      const points = [
        new THREE.Vector3(egoPos.x, 0.12, egoPos.y),
        ...plannedPath.waypoints.map(wp => new THREE.Vector3(wp.position.x, 0.12, wp.position.y)),
      ];
      this.plannedPathLine.geometry.setFromPoints(points);

      const pathColor = plannedPath.isReplanned ? 0xd98d26 : 0x8fb397;
      (this.plannedPathLine.material as THREE.LineBasicMaterial).color.setHex(pathColor);

      if (plannedPath.isReplanned && this.replanShockwaveTime < 0) {
        this.triggerReplanEvent(egoPos);
      }
    } else {
      this.plannedPathLine.geometry.setFromPoints([]);
    }

    // ── 3. Candidate Path Generation (Paths A through E) ──
    this.candidatePathsGroup.clear();
    if (plannedPath && plannedPath.waypoints.length > 2) {
      const candidates = [-3.0, -1.5, 0, 1.5, 3.0]; // Lateral offsets
      candidates.forEach((offset, idx) => {
        if (Math.abs(offset) < 0.1) return; // Selected path already drawn above

        const candidatePoints: THREE.Vector3[] = [
          new THREE.Vector3(egoPos.x, 0.09, egoPos.y),
        ];

        plannedPath.waypoints.forEach((wp, wIdx) => {
          const lateralDecay = Math.sin((wIdx / plannedPath.waypoints.length) * Math.PI);
          candidatePoints.push(
            new THREE.Vector3(
              wp.position.x,
              0.09,
              wp.position.y + offset * lateralDecay
            )
          );
        });

        const lineGeom = new THREE.BufferGeometry().setFromPoints(candidatePoints);
        const lineMat = new THREE.LineDashedMaterial({
          color: idx % 2 === 0 ? 0x64748b : 0x94a3b8,
          dashSize: 1.5,
          gapSize: 1.0,
          transparent: true,
          opacity: 0.35,
        });
        const candLine = new THREE.Line(lineGeom, lineMat);
        candLine.computeLineDistances();
        this.candidatePathsGroup.add(candLine);
      });
    }

    // ── 4. Replanning Shockwave Animation ─────────────
    if (this.replanShockwaveTime >= 0) {
      this.replanShockwaveTime += delta;
      const progress = this.replanShockwaveTime / 0.8; // 800ms ripple
      if (progress > 1.0) {
        this.replanShockwaveTime = -1;
        (this.replanShockwave.material as THREE.MeshBasicMaterial).opacity = 0;
      } else {
        const scale = 1.0 + progress * 16.0;
        this.replanShockwave.scale.set(scale, scale, scale);
        (this.replanShockwave.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress) * 0.8;
      }
    }

    // ── 5. Predicted Trajectories with Uncertainty Corridors ──
    this.predictionsGroup.clear();
    for (const pred of predictions) {
      if (pred.points.length < 2) continue;

      const points = pred.points.map(p => new THREE.Vector3(p.x, 0.15, p.y));
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0xc9a063, // Muted amber prediction
        dashSize: 1.0,
        gapSize: 0.8,
        transparent: true,
        opacity: Math.max(0.4, pred.confidence * 0.8),
      });
      const predLine = new THREE.Line(lineGeom, lineMat);
      predLine.computeLineDistances();
      this.predictionsGroup.add(predLine);

      // Uncertainty Cone at endpoint
      const lastPoint = points[points.length - 1];
      const coneGeom = new THREE.CircleGeometry(1.2 + pred.uncertainty * 2.0, 16);
      coneGeom.rotateX(-Math.PI / 2);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xb58c4e,
        transparent: true,
        opacity: 0.18,
      });
      const coneMesh = new THREE.Mesh(coneGeom, coneMat);
      coneMesh.position.copy(lastPoint);
      this.predictionsGroup.add(coneMesh);
    }

    // ── 6. Collision Risk Heatmap Halos ───────────────
    this.riskZonesGroup.clear();
    for (const zone of risk.riskZones) {
      const radius = Math.max(2.5, zone.radius);
      const ringGeom = new THREE.RingGeometry(0.2, radius, 24);
      ringGeom.rotateX(-Math.PI / 2);

      const riskColorMap = {
        SAFE: 0x7da885,
        LOW: 0x9db574,
        MEDIUM: 0xcca654,
        HIGH: 0xc9753c,
        CRITICAL: 0xc94c4c,
      };

      const color = riskColorMap[zone.risk] ?? 0x10b981;
      const opacity = zone.risk === 'CRITICAL' ? 0.65 : zone.risk === 'HIGH' ? 0.45 : 0.2;

      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
      });

      const halo = new THREE.Mesh(ringGeom, ringMat);
      halo.position.set(zone.center.x, 0.06, zone.center.y);
      this.riskZonesGroup.add(halo);
    }
  }

  dispose() {
    this.drivableAreaMesh.geometry.dispose();
    (this.drivableAreaMesh.material as THREE.Material).dispose();
    this.plannedPathLine.geometry.dispose();
    (this.plannedPathLine.material as THREE.Material).dispose();
    this.replanShockwave.geometry.dispose();
    (this.replanShockwave.material as THREE.Material).dispose();
  }
}
