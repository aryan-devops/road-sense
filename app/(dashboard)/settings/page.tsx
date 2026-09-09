'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings2, Monitor, Cpu, Shield, Sparkles, Sliders,
  Gauge, Radio, Layers, CheckCircle2, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const [graphicsQuality, setGraphicsQuality] = useState('high');
  const [lidarDensity, setLidarDensity] = useState(128);
  const [motionBlur, setMotionBlur] = useState(false);
  const [shadows, setShadows] = useState(true);
  const [antialiasing, setAntialiasing] = useState(true);
  const [predictionHorizon, setPredictionHorizon] = useState(3.0);
  const [replanFrequency, setReplanFrequency] = useState(20);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">System & Simulation Settings</h1>
              <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                CLIENT ENGINE
              </Badge>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Configure 3D WebGL rendering fidelity, autonomous planner tick rates, and sensor simulation parameters.
            </p>
          </div>
          <Button
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs gap-1.5"
          >
            {savedFeedback ? <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" /> : <Save className="w-3.5 h-3.5" />}
            {savedFeedback ? 'Settings Saved' : 'Apply Configuration'}
          </Button>
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* 3D Graphics & Rendering */}
        <div className="rs-panel p-6 space-y-6">
          <div className="flex items-center gap-2 font-bold text-white text-base border-b border-slate-800/60 pb-3">
            <Monitor className="w-4 h-4 text-cyan-400" />
            3D Digital Twin Graphics Engine
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-200 text-sm">Rendering Preset</Label>
              <Select value={graphicsQuality} onValueChange={(v) => { if (v) setGraphicsQuality(v); }}>
                <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="ultra">Ultra (High particle density + Volumetric Fog)</SelectItem>
                  <SelectItem value="high">High (Standard automotive R&D configuration)</SelectItem>
                  <SelectItem value="performance">Performance (Optimized for laptops / battery)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">Affects shadow map resolution and dynamic road reflection passes.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-200 text-sm">Simulated LiDAR Beams</Label>
                <span className="font-mono text-cyan-400 text-xs">{lidarDensity} channels</span>
              </div>
              <Slider
                value={[lidarDensity]}
                min={16}
                max={128}
                step={16}
                onValueChange={(vals) => setLidarDensity((vals as number[])[0] ?? 64)}
                className="mt-3"
              />
              <p className="text-[11px] text-slate-500">Resolution of concentric point-cloud scanning rings.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Label className="text-xs text-slate-300">Dynamic Shadows</Label>
              <Switch checked={shadows} onCheckedChange={setShadows} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Label className="text-xs text-slate-300">FXAA Antialiasing</Label>
              <Switch checked={antialiasing} onCheckedChange={setAntialiasing} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <Label className="text-xs text-slate-300">Motion Blur Trailing</Label>
              <Switch checked={motionBlur} onCheckedChange={setMotionBlur} />
            </div>
          </div>
        </div>

        {/* Autonomous Core & Planner Parameters */}
        <div className="rs-panel p-6 space-y-6">
          <div className="flex items-center gap-2 font-bold text-white text-base border-b border-slate-800/60 pb-3">
            <Cpu className="w-4 h-4 text-violet-400" />
            Autonomous Decision & Planning Rates
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-200 text-sm">Prediction Horizon</Label>
                <span className="font-mono text-cyan-400 text-xs">{predictionHorizon.toFixed(1)} seconds</span>
              </div>
              <Slider
                value={[predictionHorizon]}
                min={1.0}
                max={5.0}
                step={0.5}
                onValueChange={(vals) => setPredictionHorizon((vals as number[])[0] ?? 3.0)}
                className="mt-3"
              />
              <p className="text-[11px] text-slate-500">Temporal lookahead for other road users' future trajectory cones.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-slate-200 text-sm">Planner Frequency Target</Label>
                <span className="font-mono text-cyan-400 text-xs">{replanFrequency} Hz</span>
              </div>
              <Slider
                value={[replanFrequency]}
                min={10}
                max={50}
                step={5}
                onValueChange={(vals) => setReplanFrequency((vals as number[])[0] ?? 20)}
                className="mt-3"
              />
              <p className="text-[11px] text-slate-500">Evaluation loop rate for candidate path splines and collision checking.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
