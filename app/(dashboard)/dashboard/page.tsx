'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play, Shield, RefreshCw, Clock, Route, CheckCircle, AlertTriangle,
  Activity, TrendingUp, Zap, BarChart3, Car, Eye, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

interface SimHistory {
  scenarioName: string; scenarioId: string; date: string;
  safetyScore: number; collisionCount: number; replanningCount: number;
  completionRate: number; duration: number;
}

const DEMO_METRICS_HISTORY = Array.from({ length: 20 }, (_, i) => ({
  t: i * 2,
  speed: 20 + Math.sin(i * 0.5) * 8 + Math.random() * 3,
  risk: Math.max(0, Math.sin(i * 0.8) * 40 + 20 + Math.random() * 10),
  smoothness: 90 + Math.sin(i * 0.3) * 5,
}));

const STAT_CARDS = [
  { label: 'Active Simulation', value: 'None', subtext: 'No simulation running', icon: Play, color: 'cyan', href: '/simulation' },
  { label: 'Safety Score', value: '94/100', subtext: 'Last simulation', icon: Shield, color: 'emerald', href: '/analytics' },
  { label: 'Replanning Count', value: '3', subtext: 'Last run', icon: RefreshCw, color: 'amber', href: '/simulation' },
  { label: 'Avg Plan Latency', value: '82 ms', subtext: 'Demo value', icon: Clock, color: 'violet', href: '/analytics' },
  { label: 'Path Smoothness', value: '91/100', subtext: 'Last simulation', icon: Route, color: 'blue', href: '/path-planning' },
  { label: 'Scenario Complete', value: '100%', subtext: 'Village Road', icon: CheckCircle, color: 'green', href: '/history' },
  { label: 'Min Clearance', value: '2.4 m', subtext: 'Last simulation', icon: AlertTriangle, color: 'orange', href: '/analytics' },
  { label: 'Traffic Density', value: 'HIGH', subtext: 'Market scenario', icon: Car, color: 'red', href: '/scenarios' },
];

const COLOR_MAP: Record<string, string> = {
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  green: 'text-green-400 bg-green-500/10 border-green-500/20',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export default function DashboardPage() {
  const [history, setHistory] = useState<SimHistory[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('roadsense_history');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              RoadSense Autonomous Navigation Platform — SIH 2026
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/simulation">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
                <Play className="w-4 h-4" /> New Simulation
              </Button>
            </Link>
          </div>
        </div>

        {/* Demo data notice */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400/80 text-xs flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span><strong>Synthetic Demonstration Data</strong> — Run a simulation to generate real metrics.</span>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={card.href} className="block rs-panel p-5 hover:border-slate-600 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${COLOR_MAP[card.color]}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 transition-colors" />
              </div>
              <div className="text-2xl font-black text-white mb-0.5">{card.value}</div>
              <div className="text-xs text-slate-500">{card.subtext}</div>
              <div className="text-xs text-slate-600 mt-2">{card.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Speed chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="rs-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">Vehicle Speed (Demo)</span>
            <span className="text-xs text-slate-600 ml-auto">km/h</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={DEMO_METRICS_HISTORY}>
              <defs>
                <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={[0, 40]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${Number(v).toFixed(1)} km/h`, 'Speed']}
              />
              <Area type="monotone" dataKey="speed" stroke="#22d3ee" fill="url(#speedGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Risk level chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="rs-panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-sm">Collision Risk Score (Demo)</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={DEMO_METRICS_HISTORY}>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${Number(v).toFixed(0)}`, 'Risk']}
              />
              <Line type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* SIH Scenarios quick access */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rs-panel p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="font-semibold">SIH Scenarios</span>
          </div>
          <Link href="/scenarios" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Unmarked Village Road', id: 'sih-001-village-road', emoji: '🌾', diff: 'HARD', score: 92 },
            { name: 'Busy Urban Intersection', id: 'sih-002-urban-intersection', emoji: '🏙️', diff: 'EXTREME', score: 88 },
            { name: 'Highway Merge', id: 'sih-003-highway-merge', emoji: '🛣️', diff: 'HARD', score: 94 },
            { name: 'Dense Market Area', id: 'sih-004-dense-market', emoji: '🏪', diff: 'EXTREME', score: 86 },
            { name: 'Sudden Cattle Crossing', id: 'sih-005-cattle-crossing', emoji: '🐄', diff: 'HARD', score: 97 },
          ].map(sc => (
            <div key={sc.id} className="flex items-center gap-4">
              <span className="text-xl">{sc.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300 truncate">{sc.name}</span>
                  <span className="text-xs font-mono text-cyan-400">{sc.score}/100</span>
                </div>
                <Progress value={sc.score} className="h-1.5" />
              </div>
              <Link href={`/simulation?scenario=${sc.id}`}>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500 hover:text-cyan-400 px-2">
                  <Play className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-4 text-center">⚠️ Synthetic Demonstration Data</p>
      </motion.div>

      {/* Recent history */}
      {history.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="rs-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">Recent Simulations</span>
            </div>
            <Link href="/history" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          <div className="space-y-3">
            {history.slice(0, 3).map((sim, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{sim.scenarioName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{new Date(sim.date).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-cyan-400">{sim.safetyScore}/100</div>
                  <div className="text-xs text-slate-500">{(sim.completionRate * 100).toFixed(0)}% complete</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
