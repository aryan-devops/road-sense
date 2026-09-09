'use client';

import { motion } from 'framer-motion';
import { TrendingUp, GitBranch } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PRED_DEMO = Array.from({ length: 25 }, (_, i) => ({
  t: i * 0.2,
  actual: 20 + Math.sin(i * 0.4) * 8 + (i > 12 ? i * 0.5 : 0),
  predicted: 20 + Math.sin((i + 2) * 0.4) * 8 + (i > 10 ? (i - 2) * 0.5 : 0),
  confidence: Math.max(0.3, 1 - i * 0.03),
}));

export default function PredictionPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold">Motion Prediction</h1>
        </div>
        <p className="text-slate-400 text-sm">Short-horizon trajectory forecasting for all tracked objects.</p>
      </motion.div>

      {/* Algorithm explanation */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Constant-Velocity Model with Decay</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">
          RoadSense uses a <strong className="text-white">Constant-Velocity (CV)</strong> kinematic model 
          with exponential confidence decay over the prediction horizon. For Indian roads, this is enhanced with:
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { title: 'Intent Estimation', desc: 'Based on current behavior type (straight, turning, crossing) from the tracker, the model biases predictions toward that intent.' },
            { title: 'Confidence Decay', desc: 'Prediction confidence decays exponentially with time horizon. At 3s, confidence is typically 40-60% — wide enough to trigger early planning.' },
            { title: 'TTC Calculation', desc: 'Time-to-Collision computed from predicted trajectories using minimum distance approach, accounting for vehicle extents.' },
          ].map(item => (
            <div key={item.title} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <div className="font-semibold text-white text-sm mb-2">{item.title}</div>
              <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction chart */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Actual vs. Predicted Position (Demo)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={PRED_DEMO}>
            <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Time (s)', fill: '#64748b', fontSize: 10, position: 'insideBottom', offset: -4 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="actual" stroke="#22d3ee" strokeWidth={2} dot={false} name="Actual" />
            <Line type="monotone" dataKey="predicted" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="5 4" name="Predicted" />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-3 text-center">Synthetic demonstration data</p>
      </div>

      {/* Uncertainty representation */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Uncertainty Cone Visualization</h2>
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/40">
          <div className="flex items-start gap-4">
            <GitBranch className="w-8 h-8 text-violet-400 shrink-0 mt-1" />
            <div>
              <p className="text-slate-300 text-sm leading-relaxed">
                For Indian road agents (cattle, pedestrians, motorcycles), the prediction cone is wider 
                than for structured road agents — reflecting higher behavioral uncertainty.
                The planner accounts for the full uncertainty cone when checking for collisions, 
                using the <strong className="text-white">worst-case edge of the cone</strong> for risk assessment.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <div className="text-violet-400 font-mono font-bold">±8°</div>
                  <div className="text-slate-500 mt-0.5">Car heading cone</div>
                </div>
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <div className="text-amber-400 font-mono font-bold">±25°</div>
                  <div className="text-slate-500 mt-0.5">Pedestrian cone</div>
                </div>
                <div className="text-center p-2 bg-slate-800/60 rounded-lg">
                  <div className="text-orange-400 font-mono font-bold">±35°</div>
                  <div className="text-slate-500 mt-0.5">Animal cone</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
