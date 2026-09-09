'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { RefreshCw, Shield, Clock, Route, Trash2, Play, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface SimEntry {
  id: string; scenarioName: string; scenarioId: string; date: string;
  safetyScore: number; collisionCount: number; replanningCount: number;
  completionRate: number; duration: number;
  metrics?: { avgReplanLatency: number; pathSmoothness: number; nearMissCount: number; };
}

export default function HistoryPage() {
  const [history, setHistory] = useState<SimEntry[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('roadsense_history');
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('roadsense_history');
    setHistory([]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulation History</h1>
          <p className="text-slate-400 text-sm mt-1">{history.length} recorded simulation runs</p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2">
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </Button>
        )}
      </motion.div>

      {history.length === 0 ? (
        <div className="rs-panel p-12 text-center">
          <RefreshCw className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">No Simulations Yet</h3>
          <p className="text-slate-500 text-sm mb-6">
            Run a simulation to see your results here.
          </p>
          <Link href="/simulation">
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
              <Play className="w-4 h-4" /> Start Simulation
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((sim, i) => (
            <motion.div key={sim.id ?? i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rs-panel p-5 hover:border-slate-600 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{sim.scenarioName}</h3>
                    <Badge className={`text-[10px] ${
                      sim.safetyScore >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      sim.safetyScore >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {sim.safetyScore >= 90 ? 'EXCELLENT' : sim.safetyScore >= 70 ? 'GOOD' : 'NEEDS WORK'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(sim.date), 'MMM d, yyyy · HH:mm')} · {sim.duration?.toFixed(0) ?? '?'}s duration
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-black text-cyan-400">{sim.safetyScore}</div>
                    <div className="text-[10px] text-slate-500">Safety</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-emerald-400">{(sim.completionRate * 100).toFixed(0)}%</div>
                    <div className="text-[10px] text-slate-500">Complete</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-amber-400">{sim.replanningCount}</div>
                    <div className="text-[10px] text-slate-500">Replans</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-red-400">{sim.collisionCount}</div>
                    <div className="text-[10px] text-slate-500">Collisions</div>
                  </div>
                </div>

                <Link href={`/simulation?scenario=${sim.scenarioId}`}>
                  <Button size="sm" variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-2">
                    <Play className="w-3 h-3" /> Re-run
                  </Button>
                </Link>
              </div>

              {sim.metrics && (
                <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center">
                    <span className="text-slate-500">Avg Latency</span>
                    <div className="text-slate-300 font-mono">{sim.metrics.avgReplanLatency?.toFixed(0) ?? '?'} ms</div>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500">Path Smooth.</span>
                    <div className="text-slate-300 font-mono">{sim.metrics.pathSmoothness ?? '?'}/100</div>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500">Near Misses</span>
                    <div className="text-slate-300 font-mono">{sim.metrics.nearMissCount ?? 0}</div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
