'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Activity, Server, Cpu, Radio, RefreshCw,
  Sliders, AlertTriangle, CheckCircle2, Lock, Terminal, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AdminPage() {
  const [sensorLogging, setSensorLogging] = useState(true);
  const [debugOverlay, setDebugOverlay] = useState(true);
  const [telemetrySync, setTelemetrySync] = useState(true);
  const [failSafeTrigger, setFailSafeTrigger] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Admin & Command Console</h1>
              <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">
                LEVEL 4 ACCESS
              </Badge>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Low-level simulation engine overrides, hardware diagnostics, and sensor pipeline telemetry.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recalibrate Sensors
            </Button>
            <Button
              size="sm"
              className="bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-xs font-semibold gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Emergency Brake Override
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Perception Core', status: 'OPERATIONAL', latency: '12ms', health: 99.4, icon: Radio, color: 'emerald' },
          { name: 'Sensor Fusion', status: 'OPERATIONAL', latency: '8ms', health: 98.9, icon: Cpu, color: 'cyan' },
          { name: 'Trajectory Planner', status: 'NOMINAL', latency: '42ms', health: 97.2, icon: Activity, color: 'blue' },
          { name: 'Collision Watchdog', status: 'ARMED', latency: '4ms', health: 100, icon: ShieldAlert, color: 'violet' },
        ].map((sys) => (
          <div key={sys.name} className="rs-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400">
                <sys.icon className="w-4 h-4" />
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                {sys.status}
              </Badge>
            </div>
            <div className="text-sm font-bold text-white">{sys.name}</div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span>Avg Latency: <span className="font-mono text-slate-300">{sys.latency}</span></span>
              <span>Health: <span className="font-mono text-emerald-400">{sys.health}%</span></span>
            </div>
          </div>
        ))}
      </div>

      {/* Control Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware & Diagnostics */}
        <div className="rs-panel p-6 space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Server className="w-4 h-4 text-cyan-400" />
              Sensor Pipeline Overrides
            </div>
            <span className="text-xs font-mono text-slate-500">CAN Bus 2.0B / ROS2 Micro-node</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div>
                <Label className="text-slate-200 text-sm font-medium">Raw LiDAR Point-Cloud Stream</Label>
                <p className="text-slate-400 text-xs mt-0.5">Stream 128-beam Velodyne simulation points to telemetry log</p>
              </div>
              <Switch checked={sensorLogging} onCheckedChange={setSensorLogging} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div>
                <Label className="text-slate-200 text-sm font-medium">Laneless Navigation Debug Meshes</Label>
                <p className="text-slate-400 text-xs mt-0.5">Render raw candidate Frenet path evaluations and drivable cost fields</p>
              </div>
              <Switch checked={debugOverlay} onCheckedChange={setDebugOverlay} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div>
                <Label className="text-slate-200 text-sm font-medium">Sub-second Telemetry Replay Buffer</Label>
                <p className="text-slate-400 text-xs mt-0.5">Record rolling 120-second snapshot for time-travel crash investigation</p>
              </div>
              <Switch checked={telemetrySync} onCheckedChange={setTelemetrySync} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div>
                <Label className="text-slate-200 text-sm font-medium text-amber-300">Simulate Vision Dropout Event</Label>
                <p className="text-slate-400 text-xs mt-0.5">Inject severe optical occlusion to test radar-primary failover</p>
              </div>
              <Switch checked={failSafeTrigger} onCheckedChange={setFailSafeTrigger} />
            </div>
          </div>
        </div>

        {/* Security & Audit Log */}
        <div className="rs-panel p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-white text-sm border-b border-slate-800/60 pb-3">
            <Terminal className="w-4 h-4 text-violet-400" />
            Security & Audit Trail
          </div>

          <div className="space-y-3 font-mono text-[11px]">
            {[
              { time: '10:14:02', user: 'root', action: 'EKF filter covariance matrix updated', status: 'OK' },
              { time: '10:11:45', user: 'sim_daemon', action: 'Scenario 005 loaded with 14 agents', status: 'OK' },
              { time: '10:08:12', user: 'planner', action: 'Replanning triggered: 82ms cycle', status: 'INFO' },
              { time: '10:02:30', user: 'root', action: 'Auth token verified for session 2026', status: 'AUTH' },
            ].map((log, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
                <div className="flex justify-between text-slate-500 text-[10px] mb-1">
                  <span>{log.time}</span>
                  <span className="text-cyan-400">[{log.status}]</span>
                </div>
                <div>{log.action}</div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" className="w-full border-slate-700 text-slate-400 hover:text-white text-xs">
              Download Audit Dump (.json)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
