'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AVOIDANCE_METHODS = [
  { name: 'Path Deviation', desc: 'Steer away from the collision zone while maintaining speed. Used for medium-range threats (TTC > 3s).', severity: 'MEDIUM', color: 'amber' },
  { name: 'Deceleration', desc: 'Reduce speed to increase TTC and clearance. Applied when path deviation is insufficient.', severity: 'HIGH', color: 'orange' },
  { name: 'Emergency Braking', desc: 'Maximum braking force applied. Activated when TTC < 1.5s and no lateral escape exists.', severity: 'CRITICAL', color: 'red' },
  { name: 'Yield & Wait', desc: 'Full stop + wait for obstacle to clear. For pedestrian/animal crossings with no alternate path.', severity: 'HIGH', color: 'orange' },
  { name: 'Overtake Maneuver', desc: 'Safe lane change to bypass slow-moving or stationary vehicle ahead.', severity: 'LOW', color: 'cyan' },
];

const TTC_THRESHOLDS = [
  { range: '> 5s', action: 'CRUISE', color: '#34d399' },
  { range: '3-5s', action: 'SLOW_DOWN', color: '#fbbf24' },
  { range: '2-3s', action: 'STOP', color: '#fb923c' },
  { range: '1-2s', action: 'EMERGENCY BRAKE', color: '#ef4444' },
  { range: '< 1s', action: 'UNAVOIDABLE', color: '#7f1d1d' },
];

const CHART_DATA = [
  { scenario: 'Village', nearMiss: 2, collisions: 0, replans: 4 },
  { scenario: 'Intersection', nearMiss: 5, collisions: 0, replans: 7 },
  { scenario: 'Highway', nearMiss: 1, collisions: 0, replans: 2 },
  { scenario: 'Market', nearMiss: 8, collisions: 1, replans: 11 },
  { scenario: 'Cattle', nearMiss: 3, collisions: 0, replans: 5 },
];

export default function CollisionAvoidancePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <Shield className="w-4 h-4 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold">Collision Avoidance</h1>
        </div>
        <p className="text-slate-400 text-sm">Multi-tiered risk assessment and real-time avoidance strategies.</p>
      </motion.div>

      {/* TTC bands */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Time-to-Collision Response Bands</h2>
        <div className="space-y-2">
          {TTC_THRESHOLDS.map(t => (
            <div key={t.range} className="flex items-center gap-4">
              <div className="text-xs font-mono text-slate-400 w-12 shrink-0">{t.range}</div>
              <div className="flex-1 h-8 rounded-lg flex items-center px-4" style={{ backgroundColor: `${t.color}20`, border: `1px solid ${t.color}40` }}>
                <span className="font-bold text-xs font-mono" style={{ color: t.color }}>{t.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Avoidance methods */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Avoidance Strategy Library</h2>
        <div className="space-y-3">
          {AVOIDANCE_METHODS.map(m => (
            <div key={m.name} className={`flex items-start gap-4 p-4 rounded-xl border bg-${m.color}-500/5 border-${m.color}-500/20`}>
              <div className={`w-2 h-2 rounded-full bg-${m.color}-400 mt-1.5 shrink-0`} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold text-sm text-${m.color}-400`}>{m.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono bg-${m.color}-500/10 text-${m.color}-400`}>{m.severity}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Avoidance Events by Scenario (Demo)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={CHART_DATA}>
            <XAxis dataKey="scenario" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="nearMiss" fill="#f59e0b" radius={[3, 3, 0, 0]} name="Near Misses" />
            <Bar dataKey="replans" fill="#22d3ee" radius={[3, 3, 0, 0]} name="Replanning" />
            <Bar dataKey="collisions" fill="#ef4444" radius={[3, 3, 0, 0]} name="Collisions" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-3 text-center">⚠️ Synthetic demonstration data</p>
      </div>
    </div>
  );
}
