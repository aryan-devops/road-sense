import type { SimulationState, Agent, Obstacle, Vector2 } from '@/types/simulation';
import type { CameraMode } from './three/ThreeDigitalTwin';

export interface CanvasDigitalTwinOptions {
  onSelectObject?: (agent: Agent | null) => void;
}

export class CanvasDigitalTwin {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  public showLidar: boolean = true;
  public showRadar: boolean = true;
  public showCamera: boolean = true;
  public performanceMode: boolean = false;
  
  private cameraMode: CameraMode = 'follow';
  private zoom: number = 1.0;
  
  constructor(canvas: HTMLCanvasElement, options?: CanvasDigitalTwinOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas not supported');
    this.ctx = ctx;
  }
  
  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }
  
  public dispose() {}
  
  public render(state: SimulationState) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    
    // Clear background
    ctx.fillStyle = '#070e1b';
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    
    // Apply camera transform
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.translate(centerX, centerY);
    
    const scale = 20 * this.zoom;
    ctx.scale(scale, scale);
    
    let targetX = state.vehicle.position.x;
    const targetY = state.vehicle.position.y;
    
    if (this.cameraMode === 'birds_eye') {
        targetX += 15;
    }
    
    ctx.translate(-targetX, -targetY);
    
    // Draw Road (simple grey line)
    ctx.fillStyle = '#334155';
    ctx.fillRect(targetX - 50, -4, 100, 8);
    
    // Draw obstacles
    state.obstacles.forEach(obs => {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(obs.position.x, obs.position.y, 1, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw agents
    state.agents.forEach(agent => {
      if (!agent.isActive) return;
      ctx.save();
      ctx.translate(agent.position.x, agent.position.y);
      ctx.rotate(agent.heading);
      
      ctx.fillStyle = agent.type === 'pedestrian' ? '#fbbf24' : '#ef4444';
      ctx.fillRect(-1, -0.5, 2, 1);
      
      ctx.restore();
    });
    
    // Draw ego vehicle
    ctx.save();
    ctx.translate(state.vehicle.position.x, state.vehicle.position.y);
    ctx.rotate(state.vehicle.heading);
    
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-2, -1, 4, 2);
    
    // Draw radar/lidar ranges
    if (this.showRadar) {
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, -Math.PI/4, Math.PI/4);
      ctx.lineTo(0, 0);
      ctx.stroke();
    }
    
    ctx.restore();
    
    ctx.restore();
  }
}
