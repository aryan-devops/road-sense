'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Square, Zap, ChevronDown, AlertTriangle,
  Activity, Shield, Clock, Route, Eye, Brain, RefreshCw, Settings2,
  Info, X, TrendingUp, Radio, Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimulationEngine } from '@/lib/simulation/engine';
import { ThreeDigitalTwin, type CameraMode } from '@/lib/simulation/three/ThreeDigitalTwin';
import { ALL_SCENARIOS, getScenarioById } from '@/lib/scenarios';
import { useSimulationStore, DEFAULT_CONFIG } from '@/store/simulationStore';
import type { SimulationState, InjectedEventType, SimulationConfig } from '@/types/simulation';

const INJECT_EVENTS: { type: InjectedEventType; label: string; icon: string; color: string }[] = [
  { type: 'pedestrian_cross', label: 'Pedestrian Crosses', icon: '🚶', color: 'amber' },
  { type: 'animal_enter', label: 'Animal Enters Road', icon: '🐄', color: 'orange' },
  { type: 'vehicle_cut_in', label: 'Vehicle Cuts In', icon: '🚗', color: 'blue' },
  { type: 'wrong_side_vehicle', label: 'Wrong-Side Vehicle', icon: '⚠️', color: 'red' },
  { type: 'pushcart_block', label: 'Pushcart Blocks', icon: '🛒', color: 'purple' },
  { type: 'sudden_obstacle', label: 'Sudden Obstacle', icon: '🪨', color: 'slate' },
];

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;

const DECISION_COLORS: Record<string, string> = {
  CRUISE: 'text-cyan-400', FOLLOW: 'text-blue-400', SLOW_DOWN: 'text-amber-400',
  STOP: 'text-red-400', OVERTAKE: 'text-purple-400', YIELD: 'text-orange-400',
  REPLAN: 'text-yellow-400', EMERGENCY_BRAKE: 'text-red-500',
};
const RISK_COLORS: Record<string, string> = {
  SAFE: 'text-emerald-400', LOW: 'text-green-400', MEDIUM: 'text-amber-400',
  HIGH: 'text-orange-500', CRITICAL: 'text-red-500',
};

function SimulationContent() {
  const searchParams = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine | null>(null);
  const rendererRef = useRef<ThreeDigitalTwin | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<SimulationState | null>(null);

  const { selectedScenario, config, setSelectedScenario, updateConfig } = useSimulationStore();

  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState(true);
  const [showExplain, setShowExplain] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [showLidar, setShowLidar] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showCameraView, setShowCameraView] = useState(true);
  const [perfMode, setPerfMode] = useState(false);

  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load scenario from URL param
  useEffect(() => {
    const id = searchParams.get('scenario');
    if (id) {
      const sc = getScenarioById(id);
      if (sc) setSelectedScenario(sc);
    }
  }, [searchParams, setSelectedScenario]);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const renderer = new ThreeDigitalTwin(canvas);
      rendererRef.current = renderer;

      const resize = () => {
        const parent = canvas.parentElement;
        if (parent) renderer.resize(parent.clientWidth, parent.clientHeight);
      };
      resize();
      window.addEventListener('resize', resize);
      return () => {
        window.removeEventListener('resize', resize);
        try {
          renderer.dispose();
        } catch {}
        rendererRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize 3D digital twin:', err);

    }
  }, []);

  // Sync settings to renderer
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setCameraMode(cameraMode);
      rendererRef.current.showLidar = showLidar;
      rendererRef.current.showRadar = showRadar;
      rendererRef.current.showCamera = showCameraView;
      rendererRef.current.performanceMode = perfMode;
    }
  }, [cameraMode, showLidar, showRadar, showCameraView, perfMode]);

  // Render loop (separate from simulation loop — just renders current state)
  const startRenderLoop = useCallback(() => {
    const renderFrame = () => {
      if (rendererRef.current && stateRef.current) {
        rendererRef.current.render(stateRef.current);
      }
      rafRef.current = requestAnimationFrame(renderFrame);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(renderFrame);
  }, []);

  useEffect(() => {
    startRenderLoop();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [startRenderLoop]);

  const saveSimulationResult = useCallback(async () => {
    // Save to localStorage for history (Supabase save would go here)
    if (!stateRef.current) return;
    const history = JSON.parse(localStorage.getItem('roadsense_history') || '[]');
    if (history.some((h: any) => h.id === stateRef.current!.id)) {
      return;
    }
    history.unshift({
      id: stateRef.current.id,
      scenarioName: selectedScenario.name,
      scenarioId: selectedScenario.id,
      date: new Date().toISOString(),
      duration: stateRef.current.metrics.elapsedTime,
      safetyScore: stateRef.current.metrics.safetyScore,
      collisionCount: stateRef.current.metrics.collisionCount,
      replanningCount: stateRef.current.metrics.replanningCount,
      completionRate: stateRef.current.metrics.completionRate,
      metrics: stateRef.current.metrics,
    });
    localStorage.setItem('roadsense_history', JSON.stringify(history.slice(0, 50)));
  }, [selectedScenario]);

  const handleStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
      setStatus('running');
      return;
    }

    const engine = new SimulationEngine(selectedScenario, config);
    engineRef.current = engine;
    (useSimulationStore.getState().engineRef as { current: unknown }).current = engine;

    // Sync state to React at ~15Hz
    let lastReactUpdate = 0;
    engine.on('stateUpdate', (state) => {
      // Always update stateRef for smooth 60fps Three.js rendering
      stateRef.current = state;
      
      // Throttle React state updates (expensive) to ~15Hz
      const now = performance.now();
      if (now - lastReactUpdate > 66 || state.status !== 'running') {
        lastReactUpdate = now;
        setSimState({ ...state });
        setStatus(state.status as 'running' | 'paused' | 'completed');
      }
    });

    engine.on('completed', () => {
      setStatus('completed');
      saveSimulationResult();
    });

    engine.start();
    setStatus('running');
  }, [selectedScenario, config, saveSimulationResult]);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
    setStatus('paused');
  }, []);

  const handleReset = useCallback(() => {
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    setDemoMode(false);
    engineRef.current?.stop();
    engineRef.current = null;
    stateRef.current = null;
    setSimState(null);
    setStatus('idle');
  }, []);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setStatus('completed');
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSimSpeed(speed);
    engineRef.current?.setSpeed(speed);
  }, []);

  const handleInjectEvent = useCallback((type: InjectedEventType) => {
    engineRef.current?.injectEvent(type);
  }, []);

  const handleScenarioChange = useCallback((id: string) => {
    handleReset();
    const sc = getScenarioById(id);
    if (sc) setSelectedScenario(sc);
  }, [handleReset, setSelectedScenario]);

  // Demo Mode: auto-runs complete demo sequence
  const handleDemoMode = useCallback(() => {
    setDemoMode(true);
    handleReset();
    setTimeout(() => {
      handleStart();
      // Inject events at timed intervals
      const schedule = [
        { delay: 3000, fn: () => handleInjectEvent('pedestrian_cross') },
        { delay: 6000, fn: () => handleInjectEvent('vehicle_cut_in') },
        { delay: 10000, fn: () => handleInjectEvent('animal_enter') },
        { delay: 15000, fn: () => handleInjectEvent('wrong_side_vehicle') },
      ];
      schedule.forEach(({ delay, fn }) => {
        demoTimerRef.current = setTimeout(fn, delay);
      });
    }, 300);
  }, [handleReset, handleStart, handleInjectEvent]);

  const events = simState?.events.slice(0, 8) ?? [];
  const metrics = simState?.metrics;
  const decision = simState?.decision;
  const risk = simState?.risk;

  return (
    <div className="h-full flex flex-col bg-[#060b15]">
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div className="h-12 border-b border-slate-800/60 flex items-center px-4 gap-3 bg-slate-900/40 shrink-0">
        <Select value={selectedScenario.id} onValueChange={(id) => { if (id) handleScenarioChange(id); }}>
          <SelectTrigger className="w-56 h-8 bg-slate-800/60 border-slate-700 text-sm text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700">
            {ALL_SCENARIOS.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-slate-300 hover:text-white">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="outline" className={`text-xs border-current ${
          status === 'running' ? 'text-emerald-400' :
          status === 'paused' ? 'text-amber-400' :
          status === 'completed' ? 'text-blue-400' : 'text-slate-500'
        }`}>
          {status.toUpperCase()}
        </Badge>

        <div className="flex-1" />

        {/* Demo Mode button */}
        <Button
          size="sm" variant="outline"
          onClick={handleDemoMode}
          disabled={status === 'running'}
          className="h-8 border-violet-500/40 text-violet-400 hover:bg-violet-500/10 text-xs gap-1"
        >
          <Zap className="w-3 h-3" />
          Hackathon Demo
        </Button>

        {/* Explain button */}
        <Button
          size="sm" variant="ghost"
          onClick={() => setShowExplain(!showExplain)}
          className="h-8 text-slate-400 hover:text-white text-xs gap-1"
        >
          <Info className="w-3 h-3" />
          Explain
        </Button>
      </div>

      {/* ── Main 3-column layout ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Controls Panel ─────────────────────── */}
        <div className="w-64 shrink-0 border-r border-slate-800/60 flex flex-col bg-slate-900/30 overflow-y-auto">
          {/* Simulation Controls */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="rs-label mb-3">Simulation Controls</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {status === 'idle' || status === 'completed' ? (
                <Button onClick={handleStart} size="sm"
                  className="col-span-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
                  <Play className="w-3.5 h-3.5" /> Start
                </Button>
              ) : status === 'running' ? (
                <Button onClick={handlePause} size="sm" variant="outline"
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </Button>
              ) : (
                <Button onClick={handleStart} size="sm"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
                  <Play className="w-3.5 h-3.5" /> Resume
                </Button>
              )}
              {status !== 'idle' && status !== 'completed' && (
                <Button onClick={handleStop} size="sm" variant="outline"
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2">
                  <Square className="w-3.5 h-3.5" /> Stop
                </Button>
              )}
              <Button onClick={handleReset} size="sm" variant="outline"
                className="col-span-2 border-slate-700 text-slate-400 hover:text-white gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>

            {/* Speed control */}
            <div>
              <div className="rs-label mb-2">Simulation Speed</div>
              <div className="flex gap-1">
                {SPEED_OPTIONS.map(s => (
                  <button key={s} onClick={() => handleSpeedChange(s)}
                    className={`flex-1 py-1 text-xs rounded font-mono transition-all ${
                      simSpeed === s
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-600'
                    }`}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="p-4 border-b border-slate-800/60">
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex items-center gap-2 w-full rs-label mb-3"
            >
              <Settings2 className="w-3 h-3" />
              Parameters
              <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showControls ? 'rotate-180' : ''}`} />
            </button>

            {showControls && (
              <div className="space-y-3">
                <ConfigSlider
                  label="Vehicle Speed" value={config.vehicleSpeed} min={2} max={15} step={0.5}
                  unit="m/s" onChange={v => updateConfig({ vehicleSpeed: v })}
                  disabled={status === 'running'}
                />
                <ConfigSlider
                  label="Sensor Range" value={config.sensorRange} min={20} max={100} step={5}
                  unit="m" onChange={v => updateConfig({ sensorRange: v })}
                  disabled={status === 'running'}
                />
                <ConfigSlider
                  label="Safety Distance" value={config.safetyDistance} min={2} max={15} step={0.5}
                  unit="m" onChange={v => updateConfig({ safetyDistance: v })}
                  disabled={status === 'running'}
                />
                <ConfigSlider
                  label="Prediction Horizon" value={config.predictionHorizon} min={1} max={6} step={0.5}
                  unit="s" onChange={v => updateConfig({ predictionHorizon: v })}
                  disabled={status === 'running'}
                />
              </div>
            )}
          </div>

          {/* 3D Engine Controls */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="rs-label mb-3">Camera Mode</div>
            <Select value={cameraMode} onValueChange={(m) => setCameraMode(m as CameraMode)}>
              <SelectTrigger className="w-full h-8 bg-slate-800/60 border-slate-700 text-xs mb-4 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-xs">
                <SelectItem value="driver">Driver (FPV)</SelectItem>
                <SelectItem value="follow">Chase Camera</SelectItem>
                <SelectItem value="birds_eye">Bird&apos;s Eye</SelectItem>
                <SelectItem value="cinematic">Cinematic Orbit</SelectItem>
                <SelectItem value="sensor">Sensor Inspection</SelectItem>
                <SelectItem value="planning">Path Planning</SelectItem>
              </SelectContent>
            </Select>

            <div className="rs-label mb-3">Sensor Visualization</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="lidar-toggle" className="text-xs text-slate-400">LiDAR Point Cloud</Label>
                <Switch id="lidar-toggle" checked={showLidar} onCheckedChange={setShowLidar} className="scale-75" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="radar-toggle" className="text-xs text-slate-400">Radar Frustums</Label>
                <Switch id="radar-toggle" checked={showRadar} onCheckedChange={setShowRadar} className="scale-75" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cam-toggle" className="text-xs text-slate-400">Camera FOV</Label>
                <Switch id="cam-toggle" checked={showCameraView} onCheckedChange={setShowCameraView} className="scale-75" />
              </div>
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-800/60">
                <Label htmlFor="perf-toggle" className="text-xs text-slate-400">Performance Mode</Label>
                <Switch id="perf-toggle" checked={perfMode} onCheckedChange={setPerfMode} className="scale-75" />
              </div>
            </div>
          </div>

          {/* Inject Events */}
          <div className="p-4">
            <div className="rs-label mb-3">Inject Event</div>
            <div className="space-y-1.5">
              {INJECT_EVENTS.map(evt => (
                <button key={evt.type}
                  onClick={() => handleInjectEvent(evt.type)}
                  disabled={status !== 'running'}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800/70 transition-all text-xs text-left disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="text-base">{evt.icon}</span>
                  {evt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER: Simulation Viewport ──────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 relative sim-viewport rounded-none">
            <canvas ref={canvasRef} className="w-full h-full block" />



            {/* Idle overlay */}
            {status === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                  <div className="text-6xl mb-4">🛣️</div>
                  <h3 className="text-xl font-bold text-white mb-2">Ready to Simulate</h3>
                  <p className="text-slate-400 text-sm mb-6">Select a scenario and press Start</p>
                  <Button onClick={handleStart} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
                    <Play className="w-4 h-4" /> Start Simulation
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Completed overlay */}
            {status === 'completed' && metrics && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rs-panel p-8 text-center max-w-sm">
                  <div className="text-5xl mb-4">🏁</div>
                  <h3 className="text-xl font-bold mb-1">Simulation Complete</h3>
                  <p className="text-slate-400 text-sm mb-5">{selectedScenario.name}</p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-black text-cyan-400">{metrics.safetyScore}</div>
                      <div className="text-xs text-slate-500">Safety Score</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-black text-emerald-400">{(metrics.completionRate * 100).toFixed(0)}%</div>
                      <div className="text-xs text-slate-500">Completion</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-black text-amber-400">{metrics.replanningCount}</div>
                      <div className="text-xs text-slate-500">Replanning</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-2xl font-black text-violet-400">{metrics.avgReplanLatency.toFixed(0)}ms</div>
                      <div className="text-xs text-slate-500">Avg Latency</div>
                    </div>
                  </div>
                  <Button onClick={handleReset} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
                    <RotateCcw className="w-4 h-4" /> Run Again
                  </Button>
                </motion.div>
              </div>
            )}

            {/* Explainability drawer */}
            <AnimatePresence>
              {showExplain && simState && (
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900/95 border-l border-slate-700/50 p-4 overflow-y-auto backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-semibold text-sm text-white">How It Works</div>
                    <button onClick={() => setShowExplain(false)} className="text-slate-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <ExplainSection title="WHAT THE VEHICLE SEES" icon={<Eye className="w-3 h-3" />}>
                    <p className="text-slate-400 text-xs mb-2">{simState.detectedObjects.length} objects detected</p>
                    {simState.detectedObjects.slice(0, 4).map((obj, i) => (
                      <div key={obj.agentId ?? `${obj.type}-${obj.worldPosition.x.toFixed(2)}-${obj.worldPosition.y.toFixed(2)}-${i}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                        <span className="text-slate-300 capitalize">{obj.type.replace('_', ' ')}</span>
                        <span className="text-cyan-400 font-mono">{(obj.confidence * 100).toFixed(0)}% @ {obj.distance.toFixed(0)}m</span>
                      </div>
                    ))}
                  </ExplainSection>

                  <ExplainSection title="WHAT IT PREDICTS" icon={<TrendingUp className="w-3 h-3" />}>
                    {simState.trackedObjects.slice(0, 3).map(t => (
                      <div key={t.id} className="text-xs py-1 border-b border-slate-800/60 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-slate-300 capitalize">{t.type.replace('_', ' ')}</span>
                          <span className={RISK_COLORS[t.threatLevel] ?? 'text-slate-400'}>{t.threatLevel}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          TTC: {t.timeToCollision === Infinity ? 'None' : `${t.timeToCollision.toFixed(1)}s`} · {t.distanceToEgo.toFixed(0)}m away
                        </div>
                      </div>
                    ))}
                    {simState.trackedObjects.length === 0 && <p className="text-slate-500 text-xs">No active tracks</p>}
                  </ExplainSection>

                  <ExplainSection title="WHY IT DECIDED" icon={<Brain className="w-3 h-3" />}>
                    <div className={`text-sm font-bold mb-1 ${DECISION_COLORS[simState.decision.state]}`}>
                      {simState.decision.state.replace('_', ' ')}
                    </div>
                    <p className="text-slate-400 text-xs">{simState.decision.reason}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      Confidence: {(simState.decision.confidence * 100).toFixed(0)}% · Urgency: {(simState.decision.urgency * 100).toFixed(0)}%
                    </div>
                  </ExplainSection>

                  {simState.plannedPath && (
                    <ExplainSection title="WHY THIS PATH" icon={<Route className="w-3 h-3" />}>
                      <div className="space-y-1 text-xs">
                        <CostRow label="Collision Cost" value={simState.plannedPath.collisionCost.toFixed(1)} />
                        <CostRow label="Clearance Cost" value={simState.plannedPath.clearanceCost.toFixed(1)} />
                        <CostRow label="Curvature Cost" value={simState.plannedPath.curvatureCost.toFixed(1)} />
                        <CostRow label="Smoothness Cost" value={simState.plannedPath.smoothnessCost.toFixed(1)} />
                        <div className="border-t border-slate-700/60 pt-1 mt-1 flex justify-between font-semibold">
                          <span className="text-slate-300">Total Cost</span>
                          <span className="text-cyan-400 font-mono">{simState.plannedPath.totalCost.toFixed(1)}</span>
                        </div>
                        <p className="text-slate-500 pt-1">From {simState.plannedPath.candidateCount} candidates</p>
                      </div>
                    </ExplainSection>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Event Timeline */}
          <div className="h-28 border-t border-slate-800/60 bg-slate-900/30 overflow-hidden flex flex-col">
            <div className="px-4 py-2 flex items-center gap-2">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="rs-label">Event Timeline</span>
              <span className="text-xs text-slate-600 font-mono">{events.length} events</span>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 px-4 pb-2 h-full items-start min-w-max">
                {events.length === 0 ? (
                  <p className="text-slate-600 text-xs self-center">Simulation events will appear here...</p>
                ) : (
                  events.map(evt => (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs max-w-48 ${
                        evt.severity === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                        evt.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                        'bg-slate-800/50 border-slate-700/40 text-slate-400'
                      }`}
                    >
                      <div className="font-mono text-[10px] opacity-60 mb-0.5">T+{evt.timestamp.toFixed(2)}s</div>
                      <div className="truncate">{evt.description}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Telemetry Panel ───────────────────── */}
        <div className="w-64 shrink-0 border-l border-slate-800/60 flex flex-col bg-slate-900/30 overflow-y-auto">
          {/* Vehicle Telemetry */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="rs-label mb-3 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3" /> Vehicle Telemetry
            </div>
            <div className="space-y-2">
              <TelemetryRow label="Speed" value={`${metrics?.egoSpeed.toFixed(1) ?? '0.0'} km/h`} />
              <TelemetryRow label="Acceleration" value={`${metrics?.egoAcceleration.toFixed(2) ?? '0.00'} m/s²`} />
              <TelemetryRow label="Min Clearance" value={`${metrics?.minClearance === 999 ? '∞' : metrics?.minClearance.toFixed(1) ?? '∞'} m`} />
              <TelemetryRow label="Distance" value={`${metrics?.distanceTraveled.toFixed(0) ?? '0'} m`} />
              <TelemetryRow label="Avg Speed" value={`${metrics?.avgSpeed.toFixed(1) ?? '0.0'} km/h`} />
            </div>
          </div>

          {/* Decision */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="rs-label mb-3 flex items-center gap-1.5">
              <Brain className="w-3 h-3" /> Decision Engine
            </div>
            <div className={`text-lg font-black mb-1 ${DECISION_COLORS[decision?.state ?? 'CRUISE']}`}>
              {decision?.state.replace('_', ' ') ?? 'IDLE'}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{decision?.reason ?? 'Awaiting simulation...'}</p>
          </div>

          {/* Risk Assessment */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="rs-label mb-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Risk Assessment
            </div>
            <div className={`text-lg font-black mb-2 ${RISK_COLORS[risk?.overallRisk ?? 'SAFE']}`}>
              {risk?.overallRisk ?? 'SAFE'}
            </div>
            <div className="space-y-1.5 text-xs">
              <TelemetryRow label="Clearance" value={`${risk?.minClearance === 999 ? '∞' : risk?.minClearance.toFixed(1) ?? '∞'} m`} />
              <TelemetryRow label="Worst TTC" value={risk?.worstTTC === 999 || risk?.worstTTC === Infinity ? '∞' : `${risk?.worstTTC.toFixed(1) ?? '∞'} s`} />
              <TelemetryRow label="Critical Objects" value={`${risk?.criticalObjects.length ?? 0}`} />
            </div>
          </div>

          {/* Perception */}
          <div className="p-4 border-b border-slate-800/60">
            <div className="rs-label mb-3 flex items-center gap-1.5">
              <Radio className="w-3 h-3" /> Perception
            </div>
            <div className="space-y-1.5">
              {simState?.detectedObjects.slice(0, 5).map(obj => (
                <div key={obj.agentId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 capitalize">{obj.type.replace('_', ' ')}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">{obj.distance.toFixed(0)}m</span>
                    <Badge className={`text-[9px] py-0 px-1 ${
                      obj.sensorSource === 'fused' ? 'bg-cyan-500/20 text-cyan-400' :
                      obj.sensorSource === 'lidar' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-violet-500/20 text-violet-400'
                    }`}>
                      {obj.sensorSource.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!simState || simState.detectedObjects.length === 0) && (
                <p className="text-slate-600 text-xs">No objects detected</p>
              )}
            </div>
          </div>

          {/* Planning Metrics */}
          <div className="p-4">
            <div className="rs-label mb-3 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> Planning Metrics
            </div>
            <div className="space-y-2">
              <TelemetryRow label="Replanning Count" value={`${metrics?.replanningCount ?? 0}`} highlight />
              <TelemetryRow label="Avg Latency" value={`${metrics?.avgReplanLatency.toFixed(0) ?? 0} ms`} />
              <TelemetryRow label="Path Smoothness" value={`${metrics?.pathSmoothness ?? 100}/100`} />
              <TelemetryRow label="Safety Score" value={`${metrics?.safetyScore ?? 100}/100`} highlight />
              <TelemetryRow label="Completion" value={`${((metrics?.completionRate ?? 0) * 100).toFixed(0)}%`} />
              <TelemetryRow label="Near Misses" value={`${metrics?.nearMissCount ?? 0}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function TelemetryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? 'text-cyan-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function ConfigSlider({
  label, value, min, max, step, unit, onChange, disabled
}: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono text-cyan-400">{value}{unit}</span>
      </div>
      <Slider
        value={[value]} min={min} max={max} step={step}
        onValueChange={(vals) => onChange((vals as number[])[0]!)}
        disabled={disabled}
        className="h-1"
      />
    </div>
  );
}

function ExplainSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4 pb-4 border-b border-slate-800/60 last:border-0">
      <div className="flex items-center gap-1.5 rs-label mb-2">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-mono">{value}</span>
    </div>
  );
}

export default function SimulationPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-slate-500">Loading Simulation...</div>}>
      <SimulationContent />
    </Suspense>
  );
}
