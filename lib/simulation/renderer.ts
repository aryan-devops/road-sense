// Canvas2D Renderer for RoadSense Simulation
// Draws the full simulation scene: road, ego vehicle, agents, paths, risk zones

import type { SimulationState, Vector2, RiskLevel, AgentType } from '@/types/simulation';

const SCALE = 2.5; // pixels per meter
const AGENT_COLORS: Record<AgentType, string> = {
  car: '#60a5fa',
  auto_rickshaw: '#a78bfa',
  motorcycle: '#34d399',
  bicycle: '#6ee7b7',
  bus: '#f59e0b',
  truck: '#ef4444',
  pedestrian: '#fbbf24',
  animal: '#fb923c',
  pushcart: '#94a3b8',
  obstacle: '#ef4444',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: 'rgba(52, 211, 153, 0.15)',
  LOW: 'rgba(163, 230, 53, 0.15)',
  MEDIUM: 'rgba(251, 191, 36, 0.2)',
  HIGH: 'rgba(249, 115, 22, 0.25)',
  CRITICAL: 'rgba(239, 68, 68, 0.3)',
};
const RISK_BORDERS: Record<RiskLevel, string> = {
  SAFE: 'rgba(52, 211, 153, 0.4)',
  LOW: 'rgba(163, 230, 53, 0.4)',
  MEDIUM: 'rgba(251, 191, 36, 0.5)',
  HIGH: 'rgba(249, 115, 22, 0.6)',
  CRITICAL: 'rgba(239, 68, 68, 0.7)',
};

export class SimulationRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(width: number, height: number) {
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  render(state: SimulationState) {
    const { ctx } = this;
    const W = this.canvas.width / devicePixelRatio;
    const H = this.canvas.height / devicePixelRatio;

    // Track ego vehicle with camera
    this.cameraX = W / 2 - state.vehicle.position.x * SCALE;
    this.cameraY = H / 2 - state.vehicle.position.y * SCALE;

    // ── Background ──────────────────────────────────────
    ctx.fillStyle = '#070d1a';
    ctx.fillRect(0, 0, W, H);

    // ── Grid ────────────────────────────────────────────
    this.drawGrid(W, H);

    // ── Save camera transform ────────────────────────────
    ctx.save();
    ctx.translate(this.cameraX, this.cameraY);

    // ── Road ────────────────────────────────────────────
    this.drawRoad(state);

    // ── Risk Zones ──────────────────────────────────────
    this.drawRiskZones(state);

    // ── Predicted Trajectories ──────────────────────────
    this.drawPredictions(state);

    // ── Planned Path ────────────────────────────────────
    this.drawPlannedPath(state);

    // ── Agent Trails ────────────────────────────────────
    this.drawTrails(state);

    // ── Agents ──────────────────────────────────────────
    this.drawAgents(state);

    // ── Obstacles ───────────────────────────────────────
    this.drawObstacles(state);

    // ── Ego Vehicle ─────────────────────────────────────
    this.drawEgoVehicle(state);

    // ── Waypoints ───────────────────────────────────────
    this.drawWaypoints(state);

    // ── Restore camera ──────────────────────────────────
    ctx.restore();

    // ── HUD (screen-space) ──────────────────────────────
    this.drawHUD(state, W, H);

    this.frameCount++;
  }

  private drawGrid(W: number, H: number) {
    const { ctx } = this;
    const gridSize = 40;
    const offsetX = this.cameraX % gridSize;
    const offsetY = this.cameraY % gridSize;

    ctx.strokeStyle = 'rgba(34, 197, 255, 0.04)';
    ctx.lineWidth = 1;

    for (let x = offsetX; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = offsetY; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  private drawRoad(state: SimulationState) {
    const { ctx } = this;
    const { scenario } = state;

    // Draw road surface from boundaries
    if (scenario.roadBoundaries.length >= 2) {
      const top = scenario.roadBoundaries[0];
      const bottom = scenario.roadBoundaries[1];

      if (top.length >= 2 && bottom.length >= 2) {
        ctx.fillStyle = '#141e2e';
        ctx.beginPath();
        ctx.moveTo(top[0].x * SCALE, top[0].y * SCALE);
        top.forEach(p => ctx.lineTo(p.x * SCALE, p.y * SCALE));
        bottom.slice().reverse().forEach(p => ctx.lineTo(p.x * SCALE, p.y * SCALE));
        ctx.closePath();
        ctx.fill();

        // Road borders
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(top[0].x * SCALE, top[0].y * SCALE);
        top.forEach(p => ctx.lineTo(p.x * SCALE, p.y * SCALE));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bottom[0].x * SCALE, bottom[0].y * SCALE);
        bottom.forEach(p => ctx.lineTo(p.x * SCALE, p.y * SCALE));
        ctx.stroke();

        // Center line (faded — unstructured road)
        ctx.setLineDash([15, 15]);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.lineWidth = 1;
        const midY = (top[0].y + bottom[0].y) / 2;
        ctx.beginPath();
        ctx.moveTo(top[0].x * SCALE, midY * SCALE);
        ctx.lineTo((top[top.length - 1]?.x ?? 1000) * SCALE, midY * SCALE);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private drawRiskZones(state: SimulationState) {
    const { ctx } = this;
    for (const zone of state.risk.riskZones) {
      const x = zone.center.x * SCALE;
      const y = zone.center.y * SCALE;
      const r = zone.radius * SCALE;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, RISK_COLORS[zone.risk]);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = RISK_BORDERS[zone.risk];
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawPredictions(state: SimulationState) {
    const { ctx } = this;
    for (const pred of state.predictions) {
      if (pred.points.length < 2) continue;
      const alpha = pred.confidence * 0.5;

      ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(pred.points[0].x * SCALE, pred.points[0].y * SCALE);
      pred.points.forEach(p => ctx.lineTo(p.x * SCALE, p.y * SCALE));
      ctx.stroke();
      ctx.setLineDash([]);

      // Endpoint dot
      const last = pred.points[pred.points.length - 1];
      ctx.fillStyle = `rgba(167, 139, 250, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(last.x * SCALE, last.y * SCALE, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlannedPath(state: SimulationState) {
    const { ctx } = this;
    if (!state.plannedPath || state.plannedPath.waypoints.length < 2) return;

    const color = state.plannedPath.isReplanned ? '#f59e0b' : '#22d3ee';
    const wps = state.plannedPath.waypoints;

    // Path line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(state.vehicle.position.x * SCALE, state.vehicle.position.y * SCALE);
    wps.forEach(wp => ctx.lineTo(wp.position.x * SCALE, wp.position.y * SCALE));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Waypoint dots
    ctx.fillStyle = color;
    wps.forEach((wp, i) => {
      if (i % 3 !== 0) return; // skip some for performance
      ctx.beginPath();
      ctx.arc(wp.position.x * SCALE, wp.position.y * SCALE, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawTrails(state: SimulationState) {
    const { ctx } = this;
    for (const agent of state.agents) {
      if (!agent.isActive || agent.trail.length < 2) continue;
      const color = AGENT_COLORS[agent.type];

      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(agent.trail[0].x * SCALE, agent.trail[0].y * SCALE);
      agent.trail.forEach(p => ctx.lineTo(p.x * SCALE, p.y * SCALE));
      ctx.stroke();
    }
  }

  private drawAgents(state: SimulationState) {
    const { ctx } = this;

    for (const agent of state.agents) {
      if (!agent.isActive) continue;

      const x = agent.position.x * SCALE;
      const y = agent.position.y * SCALE;
      const w = agent.width * SCALE;
      const h = agent.length * SCALE;
      const color = AGENT_COLORS[agent.type];

      // Check if tracked
      const tracked = state.trackedObjects.find(t => t.agentId === agent.id);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(agent.heading + Math.PI / 2);

      // Body
      ctx.fillStyle = `${color}cc`;
      ctx.shadowColor = color;
      ctx.shadowBlur = tracked ? 10 : 4;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 2);
      ctx.fill();

      // Direction indicator
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(-w / 4, -h / 2 + 4);
      ctx.lineTo(w / 4, -h / 2 + 4);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();

      // Tracking box overlay
      if (tracked) {
        const boxPad = 5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.rect(x - w / 2 - boxPad, y - h / 2 - boxPad, w + boxPad * 2, h + boxPad * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = color;
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        const shortType = {
          pedestrian: 'PED',
          auto_rickshaw: 'AUTO',
          motorcycle: 'MOTO',
          animal: 'ANML',
          pushcart: 'CART',
          car: 'CAR',
          bus: 'BUS',
          truck: 'TRK',
          bicycle: 'BIC',
          obstacle: 'OBS',
        }[agent.type] ?? agent.type.slice(0, 4).toUpperCase();

        ctx.fillText(`${shortType} ${(tracked.confidence * 100).toFixed(0)}%`, x, y - h / 2 - boxPad - 4);

        // TTC if relevant
        if (tracked.timeToCollision < 5 && tracked.timeToCollision !== Infinity) {
          const ttcColor = tracked.timeToCollision < 2 ? '#ef4444' : tracked.timeToCollision < 3.5 ? '#f59e0b' : '#34d399';
          ctx.fillStyle = ttcColor;
          ctx.font = 'bold 8px JetBrains Mono, monospace';
          ctx.fillText(`TTC ${tracked.timeToCollision.toFixed(1)}s`, x, y + h / 2 + boxPad + 10);
        }
      }

      // Emoji overlay for special types
      if (['pedestrian', 'animal'].includes(agent.type)) {
        ctx.font = `${Math.max(10, w)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(agent.type === 'pedestrian' ? '🚶' : '🐄', x, y);
      }
    }
  }

  private drawObstacles(state: SimulationState) {
    const { ctx } = this;
    for (const obs of state.obstacles) {
      const x = obs.position.x * SCALE;
      const y = obs.position.y * SCALE;
      const w = obs.width * SCALE;
      const h = obs.height * SCALE;

      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;

      // Hazard stripes
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 2);
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ef4444';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', 0, 3);
      ctx.restore();
    }
  }

  private drawEgoVehicle(state: SimulationState) {
    const { ctx } = this;
    const ego = state.vehicle;
    const x = ego.position.x * SCALE;
    const y = ego.position.y * SCALE;
    const w = ego.width * SCALE;
    const h = ego.length * SCALE;

    // Sensor range circle
    ctx.strokeStyle = 'rgba(34, 197, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 60 * SCALE, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ego.heading + Math.PI / 2);

    // Glow effect
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 20;

    // Body
    const bodyGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    bodyGrad.addColorStop(0, '#0ea5e9');
    bodyGrad.addColorStop(1, '#22d3ee');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();

    // Windshield
    ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 3, 2);
    ctx.fill();

    // Direction arrow
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 - 6);
    ctx.lineTo(-4, -h / 2 + 2);
    ctx.lineTo(4, -h / 2 + 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // "AV" label
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AV', x, y + h / 2 + 14);
  }

  private drawWaypoints(state: SimulationState) {
    const { ctx } = this;
    const wps = state.scenario.waypoints;

    wps.forEach((wp, i) => {
      const x = wp.x * SCALE;
      const y = wp.y * SCALE;

      ctx.strokeStyle = 'rgba(34, 197, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(wps[i - 1].x * SCALE, wps[i - 1].y * SCALE);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(34, 197, 255, 0.3)';
      ctx.fillStyle = 'rgba(34, 197, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Goal marker
      if (i === wps.length - 1) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏁', x, y + 5);
      }
    });
  }

  private drawHUD(state: SimulationState, W: number, H: number) {
    const { ctx } = this;

    // ── Speed indicator (bottom left) ───────────────────
    const speedKmh = (state.vehicle.speed * 3.6).toFixed(0);
    ctx.fillStyle = 'rgba(6, 11, 21, 0.7)';
    ctx.beginPath();
    ctx.roundRect(12, H - 70, 90, 60, 8);
    ctx.fill();

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(speedKmh, 57, H - 38);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('km/h', 57, H - 22);

    // ── Decision state (top center) ─────────────────────
    const decisionColors: Record<string, string> = {
      CRUISE: '#22d3ee', FOLLOW: '#60a5fa', SLOW_DOWN: '#fbbf24',
      STOP: '#f87171', OVERTAKE: '#c084fc', YIELD: '#fb923c',
      REPLAN: '#facc15', EMERGENCY_BRAKE: '#ef4444',
    };
    const decColor = decisionColors[state.decision.state] ?? '#94a3b8';

    ctx.fillStyle = `${decColor}20`;
    ctx.strokeStyle = `${decColor}50`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 90, 10, 180, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = decColor;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.decision.state.replace('_', ' '), W / 2, 33);

    // ── Risk level (top right) ──────────────────────────
    const riskColors: Record<string, string> = {
      SAFE: '#34d399', LOW: '#86efac', MEDIUM: '#fbbf24', HIGH: '#f97316', CRITICAL: '#ef4444',
    };
    const rColor = riskColors[state.risk.overallRisk] ?? '#94a3b8';

    ctx.fillStyle = `${rColor}20`;
    ctx.strokeStyle = `${rColor}50`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W - 110, 10, 100, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = rColor;
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.risk.overallRisk, W - 60, 33);

    // ── Time ────────────────────────────────────────────
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`T+${state.time.toFixed(1)}s`, 12, 22);

    // ── FPS / Status ────────────────────────────────────
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${state.trackedObjects.length} tracked`, W - 12, 22);
  }
}
