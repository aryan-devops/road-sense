import * as THREE from 'three';
import type { DetectedObject, TrackedObject, Vector2 } from '@/types/simulation';

export class SensoryLayers {
  private scene: THREE.Scene;
  private lidarPoints: THREE.Points;
  private lidarPositions: Float32Array;
  private lidarColors: Float32Array;
  private radarMesh: THREE.Mesh;
  private cameraFrustum: THREE.LineSegments;
  private boundingBoxesGroup: THREE.Group = new THREE.Group();
  private fusionLinesGroup: THREE.Group = new THREE.Group();

  private pointCount = 2400;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. LiDAR Point-Cloud
    const lidarGeom = new THREE.BufferGeometry();
    this.lidarPositions = new Float32Array(this.pointCount * 3);
    this.lidarColors = new Float32Array(this.pointCount * 3);

    lidarGeom.setAttribute('position', new THREE.BufferAttribute(this.lidarPositions, 3));
    lidarGeom.setAttribute('color', new THREE.BufferAttribute(this.lidarColors, 3));

    const lidarMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.lidarPoints = new THREE.Points(lidarGeom, lidarMat);
    this.scene.add(this.lidarPoints);

    // 2. Radar Fan Sweep
    const radarGeom = new THREE.RingGeometry(0.5, 45, 32, 1, -Math.PI / 6, Math.PI / 3);
    radarGeom.rotateX(-Math.PI / 2);
    radarGeom.rotateY(Math.PI / 2);
    const radarMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7, // Violet radar frequency
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    this.radarMesh = new THREE.Mesh(radarGeom, radarMat);
    this.radarMesh.position.y = 0.2;
    this.scene.add(this.radarMesh);

    // 3. Camera Frustum Wireframe
    const camGeom = new THREE.ConeGeometry(30, 50, 4, 1, true);
    camGeom.rotateX(Math.PI / 2);
    const wireGeom = new THREE.WireframeGeometry(camGeom);
    const camMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // Cyan camera cone
      transparent: true,
      opacity: 0.18,
    });
    this.cameraFrustum = new THREE.LineSegments(wireGeom, camMat);
    this.scene.add(this.cameraFrustum);

    // 4. Bounding Boxes and Fusion Lines
    this.scene.add(this.boundingBoxesGroup);
    this.scene.add(this.fusionLinesGroup);
  }

  /**
   * Updates sensory overlays based on Ego position, heading, and detected objects.
   */
  update(
    egoPos: Vector2,
    egoHeading: number,
    detectedObjects: DetectedObject[],
    trackedObjects: TrackedObject[],
    delta: number,
    time: number,
    showLidar: boolean = true,
    showRadar: boolean = true,
    showCamera: boolean = true
  ) {
    this.lidarPoints.visible = showLidar;
    this.radarMesh.visible = showRadar;
    this.cameraFrustum.visible = showCamera;

    const cosH = Math.cos(egoHeading);
    const sinH = Math.sin(egoHeading);

    // ── Update Radar Mesh ───────────────────────────────
    if (showRadar) {
      this.radarMesh.position.set(egoPos.x, 0.2, egoPos.y);
      this.radarMesh.rotation.y = -egoHeading;
      // Radar pulse effect
      const pulse = (Math.sin(time * 6) + 1) * 0.08 + 0.08;
      (this.radarMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    // ── Update Camera Frustum ───────────────────────────
    if (showCamera) {
      this.cameraFrustum.position.set(egoPos.x, 1.4, egoPos.y);
      this.cameraFrustum.rotation.y = -egoHeading;
    }

    // ── Update LiDAR Point Cloud ────────────────────────
    if (showLidar) {
      let pIdx = 0;
      const numRings = 24;
      const pointsPerRing = Math.floor(this.pointCount / (numRings + detectedObjects.length * 15));

      // Ground concentric reflection rings
      for (let r = 1; r <= numRings; r++) {
        const radius = r * 2.2;
        const ringOffset = (time * 8 + r * 0.3) % (Math.PI * 2);

        for (let i = 0; i < pointsPerRing && pIdx < this.pointCount; i++) {
          const angle = (i / pointsPerRing) * Math.PI * 2 + ringOffset;
          const px = egoPos.x + Math.cos(angle) * radius;
          const pz = egoPos.y + Math.sin(angle) * radius;
          const py = 0.05 + Math.sin(angle * 4 + time * 3) * 0.03; // slight terrain ripple

          this.lidarPositions[pIdx * 3] = px;
          this.lidarPositions[pIdx * 3 + 1] = py;
          this.lidarPositions[pIdx * 3 + 2] = pz;

          // Color by range: cyan (near) to violet (far)
          const normDist = radius / 55;
          this.lidarColors[pIdx * 3] = 0.1 + normDist * 0.7;     // R
          this.lidarColors[pIdx * 3 + 1] = 0.9 - normDist * 0.6; // G
          this.lidarColors[pIdx * 3 + 2] = 1.0;                 // B

          pIdx++;
        }
      }

      // Hit-points on detected objects
      for (const obj of detectedObjects) {
        for (let k = 0; k < 20 && pIdx < this.pointCount; k++) {
          const spreadX = (Math.random() - 0.5) * 1.5;
          const spreadZ = (Math.random() - 0.5) * 1.5;
          const spreadY = Math.random() * 1.6;

          this.lidarPositions[pIdx * 3] = obj.worldPosition.x + spreadX;
          this.lidarPositions[pIdx * 3 + 1] = spreadY;
          this.lidarPositions[pIdx * 3 + 2] = obj.worldPosition.y + spreadZ;

          // Intense green/cyan hit-points
          this.lidarColors[pIdx * 3] = 0.2;
          this.lidarColors[pIdx * 3 + 1] = 1.0;
          this.lidarColors[pIdx * 3 + 2] = 0.4;

          pIdx++;
        }
      }

      // Hide remaining unused points
      while (pIdx < this.pointCount) {
        this.lidarPositions[pIdx * 3] = 0;
        this.lidarPositions[pIdx * 3 + 1] = -1000;
        this.lidarPositions[pIdx * 3 + 2] = 0;
        pIdx++;
      }

      this.lidarPoints.geometry.attributes.position.needsUpdate = true;
      this.lidarPoints.geometry.attributes.color.needsUpdate = true;
    }

    // ── Update 3D Bounding Boxes & Fusion Lines ─────────
    this.boundingBoxesGroup.clear();
    this.fusionLinesGroup.clear();

    for (const obj of detectedObjects) {
      const tracked = trackedObjects.find(t => t.agentId === obj.agentId);
      const isCritical = tracked?.threatLevel === 'HIGH' || tracked?.threatLevel === 'CRITICAL';

      // 3D Wireframe Bounding Box
      const boxW = Math.max(1.4, obj.boundingBox.w);
      const boxH = Math.max(1.2, obj.boundingBox.h);
      const boxD = 2.0;

      const boxGeom = new THREE.BoxGeometry(boxW, boxH, boxD);
      const wireGeom = new THREE.WireframeGeometry(boxGeom);
      const boxMat = new THREE.LineBasicMaterial({
        color: isCritical ? 0xef4444 : obj.sensorSource === 'fused' ? 0x22d3ee : 0x10b981,
        linewidth: 2,
      });
      const boxMesh = new THREE.LineSegments(wireGeom, boxMat);
      boxMesh.position.set(obj.worldPosition.x, boxH / 2, obj.worldPosition.y);
      this.boundingBoxesGroup.add(boxMesh);

      // Sensor Fusion Line connecting Ego sensor origin to detected object
      const points = [
        new THREE.Vector3(egoPos.x, 1.4, egoPos.y),
        new THREE.Vector3(obj.worldPosition.x, boxH / 2, obj.worldPosition.y),
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineDashedMaterial({
        color: obj.sensorSource === 'fused' ? 0x06b6d4 : 0x8b5cf6,
        dashSize: 1.2,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.45,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.computeLineDistances();
      this.fusionLinesGroup.add(line);
    }
  }

  dispose() {
    this.lidarPoints.geometry.dispose();
    (this.lidarPoints.material as THREE.Material).dispose();
    this.radarMesh.geometry.dispose();
    (this.radarMesh.material as THREE.Material).dispose();
    this.cameraFrustum.geometry.dispose();
    (this.cameraFrustum.material as THREE.Material).dispose();
  }
}
