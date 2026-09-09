'use client';

import { motion } from 'framer-motion';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const REPORT_SECTIONS = [
  { title: 'Executive Summary', status: 'ready', desc: 'Overview of system capabilities, SIH compliance, and key metrics.' },
  { title: 'System Architecture', status: 'ready', desc: 'Full pipeline diagram, module descriptions, and data flow.' },
  { title: 'Scenario Analysis', status: 'ready', desc: 'Per-scenario results with safety scores and observations.' },
  { title: 'Performance Metrics', status: 'ready', desc: 'Replanning latency, collision avoidance rate, path smoothness.' },
  { title: 'Indian Road Adaptations', status: 'ready', desc: 'How the system handles unstructured road conditions.' },
  { title: 'MATLAB Integration Guide', status: 'draft', desc: 'Adapter API contract for MATLAB/Simulink integration.' },
  { title: 'Limitations & Future Work', status: 'ready', desc: 'Honest assessment of demo-mode limitations vs. real system.' },
];

export default function ReportsPage() {
  const handleDownload = () => {
    // Generate simple text report
    const report = `
RoadSense — SIH 2026 Technical Report
========================================
Generated: ${new Date().toLocaleString()}
System: Adaptive Autonomous Navigation for Unstructured Indian Roads

SUMMARY
-------
RoadSense is a browser-based synthetic simulation platform demonstrating
the complete autonomous driving pipeline for Indian road conditions.

SIH SCENARIOS
-------------
1. Unmarked Village Road    — Safety: 92/100
2. Busy Urban Intersection  — Safety: 88/100
3. Highway Merge            — Safety: 94/100
4. Dense Market Area        — Safety: 86/100
5. Sudden Cattle Crossing   — Safety: 97/100

PIPELINE MODULES
-----------------
Environment Perception → Object Tracking → Motion Prediction
→ Decision Making (FSM) → Path Planning → Collision Avoidance
→ Real-Time Replanning → Vehicle Control

COMPLIANCE NOTICE
------------------
⚠️ All results are synthetic simulation data for demonstration purposes only.
This system does not represent a certified autonomous driving system.
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roadsense-sih2026-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-slate-400 text-sm mt-1">SIH 2026 technical documentation and evaluation reports.</p>
          </div>
          <Button onClick={handleDownload} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2">
            <Download className="w-4 h-4" /> Download Report
          </Button>
        </div>
      </motion.div>

      <div className="rs-panel p-4 flex gap-3 border-amber-500/30 bg-amber-500/5">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-300/80 text-sm">
          <strong>Disclaimer:</strong> All metrics in this report are generated from synthetic simulations.
          They do not represent real-world autonomous driving performance.
        </p>
      </div>

      <div className="space-y-3">
        {REPORT_SECTIONS.map((section, i) => (
          <motion.div key={section.title}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rs-panel p-5 hover:border-slate-600 transition-colors flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white">{section.title}</h3>
                <Badge variant="outline" className={section.status === 'ready' ? 'border-emerald-500/40 text-emerald-400 text-[10px]' : 'border-amber-500/40 text-amber-400 text-[10px]'}>
                  {section.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-slate-400 text-xs">{section.desc}</p>
            </div>
            <Button size="sm" variant="ghost" className="text-slate-500 hover:text-white">
              <Download className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
