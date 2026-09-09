'use client';

import { motion } from 'framer-motion';
import { Route } from 'lucide-react';

const FSM_STATES = [
  { state: 'CRUISE', color: 'cyan', transitions: ['FOLLOW', 'SLOW_DOWN', 'STOP'], condition: 'Default. Risk = SAFE, road clear.' },
  { state: 'FOLLOW', color: 'blue', transitions: ['CRUISE', 'SLOW_DOWN', 'OVERTAKE'], condition: 'Vehicle within 15m ahead at lower speed.' },
  { state: 'SLOW_DOWN', color: 'amber', transitions: ['CRUISE', 'STOP', 'YIELD'], condition: 'Object in path, TTC < 4s or risk = MEDIUM.' },
  { state: 'STOP', color: 'red', transitions: ['CRUISE', 'YIELD'], condition: 'Imminent collision, TTC < 1.5s or CRITICAL risk.' },
  { state: 'OVERTAKE', color: 'purple', transitions: ['CRUISE', 'FOLLOW'], condition: 'Slow vehicle ahead, adjacent lane clear.' },
  { state: 'YIELD', color: 'orange', transitions: ['CRUISE', 'STOP'], condition: 'Pedestrian crossing, animal on road, right-of-way.' },
  { state: 'REPLAN', color: 'yellow', transitions: ['CRUISE', 'SLOW_DOWN'], condition: 'Path blocked, sudden obstacle, replanning triggered.' },
  { state: 'EMERGENCY_BRAKE', color: 'red', transitions: ['STOP'], condition: 'TTC < 1s, unavoidable collision imminent.' },
];

const COLOR_MAP: Record<string, string> = {
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
  blue: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  red: 'border-red-500/40 bg-red-500/10 text-red-400',
  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  orange: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  yellow: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
};

export default function PathPlanningPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
            <Route className="w-4 h-4 text-pink-400" />
          </div>
          <h1 className="text-2xl font-bold">Decision Making & Path Planning</h1>
        </div>
        <p className="text-slate-400 text-sm">Explainable FSM-based behavioral decisions + multi-candidate trajectory selection.</p>
      </motion.div>

      {/* Decision FSM */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Behavioral Finite State Machine</h2>
        <p className="text-slate-400 text-sm mb-5">
          RoadSense uses an <strong className="text-white">Explainable Finite State Machine</strong> (FSM) 
          with 8 states specifically tuned for Indian road scenarios. Every transition is logged with 
          a human-readable reason for full transparency.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {FSM_STATES.map(s => (
            <div key={s.state} className={`rounded-xl p-4 border ${COLOR_MAP[s.color]}`}>
              <div className="font-bold font-mono text-sm mb-1">{s.state}</div>
              <p className="text-slate-400 text-xs mb-2">{s.condition}</p>
              <div className="flex flex-wrap gap-1">
                {s.transitions.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-500">→ {t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Path Planner */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Cost-Based Trajectory Selection</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-5">
          The planner generates <strong className="text-white">N candidate trajectories</strong> (lateral offsets from the 
          reference line), evaluates each using a weighted cost function, and selects the lowest-cost feasible path.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/40">
            <h3 className="font-semibold text-white text-sm mb-3">Cost Function Components</h3>
            <div className="space-y-2">
              {[
                { label: 'Collision Cost', weight: 0.4, color: 'red', desc: 'Penalizes paths near detected objects' },
                { label: 'Clearance Cost', weight: 0.3, color: 'orange', desc: 'Rewards paths with maximum separation' },
                { label: 'Curvature Cost', weight: 0.15, color: 'amber', desc: 'Penalizes sharp/uncomfortable turns' },
                { label: 'Smoothness Cost', weight: 0.15, color: 'cyan', desc: 'Rewards heading consistency' },
              ].map(c => (
                <div key={c.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`text-${c.color}-400`}>{c.label}</span>
                    <span className="text-slate-400 font-mono">w = {c.weight}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full">
                    <div className={`h-1.5 bg-${c.color}-500 rounded-full`} style={{ width: `${c.weight * 250}%` }} />
                  </div>
                  <p className="text-slate-600 text-[10px] mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/40">
            <h3 className="font-semibold text-white text-sm mb-3">Dynamic Replanning</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Replanning is triggered when the current path's collision cost exceeds the threshold 
              (configurable, default 70%). This happens in closed-loop at simulation frequency, enabling:
            </p>
            <div className="space-y-2">
              {[
                'Response to sudden obstacles',
                'Adaptation to unexpected agent behavior',
                'Road narrowing (market/village)',
                'Emergency brake recovery',
                'Wrong-side vehicle avoidance',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <div className="text-cyan-400 font-mono text-lg font-black">{'<'}100 ms</div>
              <div className="text-xs text-slate-500">Target replan latency</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
