'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Star, Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ALL_SCENARIOS } from '@/lib/scenarios';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400 bg-green-500/10 border-green-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  hard: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  extreme: 'text-red-400 bg-red-500/10 border-red-500/30',
};
const DENSITY_LABELS: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', extreme: 'Extreme',
};
const SCENARIO_EMOJIS: Record<string, string> = {
  'sih-001-village-road': '🌾',
  'sih-002-urban-intersection': '🏙️',
  'sih-003-highway-merge': '🛣️',
  'sih-004-dense-market': '🏪',
  'sih-005-cattle-crossing': '🐄',
};

export default function ScenariosPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-white">Scenarios</h1>
        <p className="text-slate-400 text-sm mt-1">
          All 5 SIH 2026 evaluation scenarios for Indian road adaptive navigation.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ALL_SCENARIOS.map((sc, i) => (
          <motion.div
            key={sc.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rs-panel p-6 hover:border-cyan-500/30 transition-all group flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{SCENARIO_EMOJIS[sc.id] ?? '🛣️'}</div>
              <div className="flex gap-1.5">
                <Badge variant="outline" className={`text-[10px] ${DIFFICULTY_COLORS[sc.difficulty] ?? ''}`}>
                  {sc.difficulty.toUpperCase()}
                </Badge>
                {sc.tags.includes('SIH') && (
                  <Badge className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-400">SIH</Badge>
                )}
              </div>
            </div>

            {/* Name & description */}
            <h3 className="font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{sc.name}</h3>
            <p className="text-slate-400 text-xs leading-relaxed flex-1 mb-4">{sc.description}</p>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-slate-800/40 rounded-lg p-2.5">
                <div className="text-slate-500 mb-0.5">Traffic</div>
                <div className="text-slate-200 font-medium">{DENSITY_LABELS[sc.trafficDensity]}</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-2.5">
                <div className="text-slate-500 mb-0.5">Duration</div>
                <div className="text-slate-200 font-medium">{sc.duration}s</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-2.5">
                <div className="text-slate-500 mb-0.5">Weather</div>
                <div className="text-slate-200 font-medium capitalize">{sc.weather}</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-2.5">
                <div className="text-slate-500 mb-0.5">Agents</div>
                <div className="text-slate-200 font-medium">{sc.agents.length}</div>
              </div>
            </div>

            {/* Events list */}
            {sc.events.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-2">Scripted Events</div>
                <div className="space-y-1">
                  {sc.events.slice(0, 3).map(evt => (
                    <div key={evt.id} className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-slate-400 truncate">{evt.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {sc.tags.filter(t => t !== 'SIH').map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-500">{tag}</span>
              ))}
            </div>

            <Link href={`/simulation?scenario=${sc.id}`} className="mt-auto">
              <Button className="w-full bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/30 text-cyan-400 hover:text-slate-900 transition-all font-semibold gap-2">
                <Play className="w-3.5 h-3.5" />
                Run Scenario
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
