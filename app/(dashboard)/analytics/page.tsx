'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

// Synthetic demo data for analytics
const PIPELINE_PERF = [
  { module: 'Perception', latency: 12, accuracy: 94 },
  { module: 'Tracking', latency: 8, accuracy: 91 },
  { module: 'Prediction', latency: 18, accuracy: 87 },
  { module: 'Decision', latency: 5, accuracy: 96 },
  { module: 'Planning', latency: 22, accuracy: 93 },
  { module: 'Collision', latency: 6, accuracy: 99 },
];

const SCENARIO_COMPARISON = [
  { name: 'Village Road', safety: 92, smooth: 88, complete: 100 },
  { name: 'Intersection', safety: 88, smooth: 79, complete: 96 },
  { name: 'Highway', safety: 94, smooth: 91, complete: 100 },
  { name: 'Market', safety: 86, smooth: 75, complete: 94 },
  { name: 'Cattle', safety: 97, smooth: 82, complete: 100 },
];

const RISK_TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  t: `${i * 2}s`,
  risk: Math.max(0, Math.min(100, 20 + Math.sin(i * 0.7) * 30 + Math.random() * 15)),
  clearance: Math.max(0, 8 - Math.sin(i * 0.5) * 5 + Math.random() * 2),
}));

const DETECTION_BY_TYPE = [
  { type: 'Cars', count: 42, color: '#60a5fa' },
  { type: 'Motorcycles', count: 28, color: '#34d399' },
  { type: 'Pedestrians', count: 35, color: '#fbbf24' },
  { type: 'Auto-Rick.', count: 18, color: '#a78bfa' },
  { type: 'Animals', count: 12, color: '#fb923c' },
  { type: 'Cyclists', count: 8, color: '#6ee7b7' },
];

const RADAR_DATA = [
  { metric: 'Safety', value: 92 },
  { metric: 'Accuracy', value: 94 },
  { metric: 'Latency', value: 88 },
  { metric: 'Smoothness', value: 87 },
  { metric: 'Completion', value: 95 },
  { metric: 'Replanning', value: 91 },
];

const CHART_STYLE = {
  contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 },
};

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-white">{title}</h2>
      {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'scenario' | 'risk' | 'detection'>('pipeline');

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Performance' },
    { id: 'scenario', label: 'Scenario Comparison' },
    { id: 'risk', label: 'Risk Timeline' },
    { id: 'detection', label: 'Detection Stats' },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">
          Simulation performance metrics and pipeline analysis — <span className="text-amber-400">Demo data</span>
        </p>
      </motion.div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Avg Safety Score', value: '91.4', unit: '/100', color: 'text-cyan-400' },
          { label: 'Total Simulations', value: '5', unit: '', color: 'text-emerald-400' },
          { label: 'Avg Replan Latency', value: '82', unit: ' ms', color: 'text-violet-400' },
          { label: 'Pipeline Throughput', value: '62', unit: ' FPS', color: 'text-amber-400' },
          { label: 'Avg Completion', value: '98', unit: '%', color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="rs-panel p-4 text-center">
            <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}<span className="text-sm">{s.unit}</span></div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800/60 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {activeTab === 'pipeline' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rs-panel p-5">
              <SectionHeader title="Module Latency (ms)" subtitle="Time per pipeline step" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={PIPELINE_PERF}>
                  <XAxis dataKey="module" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="latency" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rs-panel p-5">
              <SectionHeader title="Module Accuracy (%)" subtitle="Detection & prediction precision" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={PIPELINE_PERF}>
                  <XAxis dataKey="module" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis domain={[80, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="accuracy" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {activeTab === 'scenario' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rs-panel p-5">
              <SectionHeader title="Scenario Safety vs. Smoothness" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={SCENARIO_COMPARISON}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                  <YAxis domain={[60, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="safety" fill="#22d3ee" radius={[3, 3, 0, 0]} name="Safety" />
                  <Bar dataKey="smooth" fill="#a78bfa" radius={[3, 3, 0, 0]} name="Smoothness" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rs-panel p-5">
              <SectionHeader title="Overall Performance Radar" />
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[60, 100]} tick={false} axisLine={false} />
                  <Radar name="Performance" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {activeTab === 'risk' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rs-panel p-5 lg:col-span-2">
              <SectionHeader title="Risk Score Over Time" subtitle="Collision risk score during simulation" />
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={RISK_TIMELINE}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 9 }} interval={4} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip {...CHART_STYLE} />
                  <Area type="monotone" dataKey="risk" stroke="#f97316" fill="url(#riskGrad)" strokeWidth={2} dot={false} name="Risk Score" />
                  <Line type="monotone" dataKey="clearance" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="Clearance (m)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {activeTab === 'detection' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rs-panel p-5">
              <SectionHeader title="Detected Objects by Type" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={DETECTION_BY_TYPE} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis dataKey="type" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={70} />
                  <Tooltip {...CHART_STYLE} />
                  <Bar dataKey="count" fill="#22d3ee" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rs-panel p-5">
              <SectionHeader title="Sensor Fusion Sources" />
              <div className="space-y-3 mt-4">
                {[
                  { label: 'Camera Only', value: 22, color: 'bg-blue-500' },
                  { label: 'LiDAR Only', value: 15, color: 'bg-emerald-500' },
                  { label: 'Radar Only', value: 8, color: 'bg-violet-500' },
                  { label: 'Camera + LiDAR', value: 35, color: 'bg-cyan-500' },
                  { label: 'All Three Fused', value: 20, color: 'bg-amber-500' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{s.label}</span>
                      <span className="text-slate-300 font-mono">{s.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full">
                      <div className={`h-1.5 ${s.color} rounded-full`} style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-4">Synthetic demonstration data. Fusion quality depends on scenario.</p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
