'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Download, FileCode, Layers, Search, Filter,
  HardDrive, Calendar, CheckCircle2, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface DatasetItem {
  id: string;
  name: string;
  category: string;
  size: string;
  frames: string;
  conditions: string;
  description: string;
  format: string;
}

const DATASETS: DatasetItem[] = [
  {
    id: 'idd-unstructured-v1',
    name: 'India Driving Dataset (IDD) — Unstructured Subset',
    category: 'Real-world Video & BBoxes',
    size: '14.2 GB',
    frames: '182,000 frames',
    conditions: 'Unmarked roads, village outskirts, heavy pedestrian mix',
    description: 'Annotated multimodal dataset containing 34 Indian traffic classes including auto-rickshaws, cattle, and pushcarts.',
    format: 'ROSbag / COCO JSON',
  },
  {
    id: 'sih-telemetry-bags-2026',
    name: 'RoadSense Synthetic Sensor Logs — SIH 2026',
    category: 'Synthetic Simulation Telemetry',
    size: '1.8 GB',
    frames: '45,000 timesteps',
    conditions: 'Dense market, cattle crossing, wrong-side driving scenarios',
    description: 'High-frequency 60Hz vehicle telemetry, collision near-miss recordings, and candidate trajectory evaluations.',
    format: 'Parquet / JSONL',
  },
  {
    id: 'lidar-pointcloud-rural-sample',
    name: 'Rural Road Surface Point Clouds',
    category: '3D LiDAR Point Cloud',
    size: '4.7 GB',
    frames: '12,500 scans',
    conditions: 'Potholes, unpaved shoulders, gravel transitions',
    description: '128-beam Velodyne LiDAR point-cloud recordings demonstrating laneless drivable area boundary detection.',
    format: 'PCD / LAS',
  },
  {
    id: 'trajectory-prediction-india-traffic',
    name: 'Indian Mixed Traffic Trajectory Benchmark',
    category: 'Motion Trajectories',
    size: '620 MB',
    frames: '96,000 agent tracks',
    conditions: 'Informal cut-ins, sudden crossing, erratic speed profiles',
    description: 'Ground-truth motion profiles of two-wheelers, pedestrians, and auto-rickshaws used for training prediction models.',
    format: 'CSV / HDF5',
  },
];

export default function DatasetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredDatasets = DATASETS.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (id: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
    }, 1500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Datasets & Sensor Logs</h1>
              <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                RESEARCH PORTAL
              </Badge>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Curated Indian autonomous navigation datasets, synthetic simulation rosbag exports, and benchmark annotations.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5" /> Export Current Sim Logs
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search datasets by scenario, sensor type, or keyword..."
            className="pl-9 bg-slate-900/60 border-slate-800 text-white placeholder:text-slate-600 focus:border-cyan-500/40"
          />
        </div>
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDatasets.map((dataset, idx) => (
          <motion.div
            key={dataset.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rs-panel p-6 flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    {dataset.format}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                    {dataset.size}
                  </Badge>
                </div>
              </div>

              <h3 className="font-bold text-white text-base mb-1 group-hover:text-cyan-400 transition-colors">
                {dataset.name}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                {dataset.description}
              </p>

              <div className="space-y-1.5 border-t border-slate-800/60 pt-3 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Samples / Volume:</span>
                  <span className="text-slate-300 font-mono">{dataset.frames}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Conditions:</span>
                  <span className="text-slate-300 truncate max-w-xs">{dataset.conditions}</span>
                </div>
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ground Truth Verified
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(dataset.id)}
                disabled={downloadingId === dataset.id}
                className="h-8 border-slate-700 text-slate-300 hover:text-white text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingId === dataset.id ? 'Generating Bundle...' : 'Download Sample'}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
