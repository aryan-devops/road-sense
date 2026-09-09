'use client';

import { motion } from 'framer-motion';
import { Eye, Radio, Layers, Cpu, ScanLine, Aperture } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const SENSOR_DATA = [
  { sensor: 'Camera', range: 70, accuracy: 94, failInRain: true, failAtNight: true },
  { sensor: 'LiDAR', range: 100, accuracy: 97, failInRain: false, failAtNight: false },
  { sensor: 'Radar', range: 150, accuracy: 88, failInRain: false, failAtNight: false },
  { sensor: 'Fused', range: 100, accuracy: 98, failInRain: false, failAtNight: false },
];

const FUSION_RADAR = [
  { metric: 'Range', Camera: 70, LiDAR: 100, Radar: 90 },
  { metric: 'Accuracy', Camera: 94, LiDAR: 97, Radar: 88 },
  { metric: 'Rain Resist.', Camera: 30, LiDAR: 70, Radar: 95 },
  { metric: 'Night Perf.', Camera: 40, LiDAR: 95, Radar: 90 },
  { metric: 'Speed Det.', Camera: 60, LiDAR: 75, Radar: 95 },
  { metric: 'Shape Det.', Camera: 95, LiDAR: 92, Radar: 40 },
];

export default function PerceptionPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Eye className="w-4 h-4 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold">Environment Perception</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Multi-modal sensor fusion using synthetic Camera + LiDAR + Radar models.
        </p>
      </motion.div>

      {/* Architecture */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Sensor Fusion Architecture</h2>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: '📷', name: 'Camera', color: 'cyan', desc: 'RGB visual detection, object classification, lane marking analysis. 70m range. Affected by rain, night.' },
            { icon: '🔵', name: 'LiDAR', color: 'emerald', desc: '360° point cloud scan, precise 3D positioning, shape detection. 100m range. Weather resistant.' },
            { icon: '📡', name: 'Radar', color: 'violet', desc: 'Velocity measurement, long-range detection, highly weather resistant. 150m range.' },
          ].map(s => (
            <div key={s.name} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <div className="text-3xl mb-3">{s.icon}</div>
              <div className={`font-bold text-${s.color}-400 mb-2`}>{s.name}</div>
              <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/30 rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-cyan-400">Fusion Strategy</span>
          </div>
          <p className="text-slate-300 text-sm">
            RoadSense uses <strong>Late Fusion</strong>: each sensor independently detects objects,
            then detections are merged using a confidence-weighted voting scheme. Objects detected by
            multiple sensors are assigned <code className="text-cyan-400">source: 'fused'</code>
            and receive a confidence boost. This is robust to single-sensor failures.
          </p>
        </div>
      </div>

      {/* Sensor comparison chart */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Sensor Capability Comparison</h2>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={FUSION_RADAR}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Camera" dataKey="Camera" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} />
            <Radar name="LiDAR" dataKey="LiDAR" stroke="#34d399" fill="#34d399" fillOpacity={0.15} />
            <Radar name="Radar" dataKey="Radar" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center mt-2 text-xs">
          {[{ c: 'cyan', n: 'Camera' }, { c: 'emerald', n: 'LiDAR' }, { c: 'violet', n: 'Radar' }].map(l => (
            <div key={l.n} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full bg-${l.c}-400`} />
              <span className="text-slate-400">{l.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Indian Road Challenges */}
      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Indian Road Adaptations</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: 'Low-Confidence Objects', desc: 'Animals, pushcarts, and bicycles receive reduced detection ranges to model real-world unpredictability.' },
            { title: 'Unstructured Road Handling', desc: 'No lane markings detected on rural roads — planner operates in free-space mode.' },
            { title: 'Dynamic Confidence Decay', desc: 'Confidence decreases with distance. Near-field objects get camera priority; far-field gets LiDAR.' },
            { title: 'Occlusion Modeling', desc: 'Agents behind large vehicles (buses, trucks) are flagged with reduced confidence.' },
          ].map(item => (
            <div key={item.title} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/40">
              <div className="font-semibold text-white text-sm mb-1">{item.title}</div>
              <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
