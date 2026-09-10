'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Car, Eye, Brain, Map, Shield, RefreshCw, ChevronRight,
  AlertTriangle, Activity, Zap, Target, BarChart3, Cpu,
  Navigation, Radio, Layers, Clock, ArrowRight, Play,
  ExternalLink, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const PIPELINE_STEPS = [
  { icon: Eye, label: 'PERCEPTION', color: 'text-cyan-400', desc: 'Camera + LiDAR + Radar sensor fusion', delay: 0 },
  { icon: Layers, label: 'TRACKING', color: 'text-blue-400', desc: 'Multi-object tracking with Kalman filtering', delay: 0.1 },
  { icon: Activity, label: 'PREDICTION', color: 'text-violet-400', desc: 'Short-horizon trajectory forecasting', delay: 0.2 },
  { icon: Brain, label: 'DECISION', color: 'text-fuchsia-400', desc: 'Explainable behavioral state machine', delay: 0.3 },
  { icon: Map, label: 'PATH PLANNING', color: 'text-pink-400', desc: 'Unstructured road adaptive planner', delay: 0.4 },
  { icon: Shield, label: 'COLLISION AVOID', color: 'text-orange-400', desc: 'Real-time risk assessment', delay: 0.5 },
  { icon: RefreshCw, label: 'REPLANNING', color: 'text-red-400', desc: 'Closed-loop dynamic re-routing', delay: 0.6 },
];

const CHALLENGES = [
  { icon: '🛣️', title: 'Missing Lane Markings', desc: 'No painted lanes on 70% of Indian rural roads' },
  { icon: '🐄', title: 'Animals on Roads', desc: 'Cattle, dogs, and stray animals appear without warning' },
  { icon: '🛺', title: 'Mixed Traffic', desc: 'Cars, autos, cycles, pedestrians share the same space' },
  { icon: '↕️', title: 'Wrong-Side Driving', desc: 'Informal overtaking behavior common across India' },
  { icon: '🏪', title: 'Market Congestion', desc: 'Dense pedestrian zones with no clear right-of-way' },
  { icon: '⚡', title: 'Sudden Movements', desc: 'Pedestrians, cyclists, and animals appear unexpectedly' },
];

const SCENARIOS = [
  { id: 'sih-001-village-road', name: 'Unmarked Village Road', tag: 'SIH-1', color: 'cyan', emoji: '🌾' },
  { id: 'sih-002-urban-intersection', name: 'Busy Urban Intersection', tag: 'SIH-2', color: 'violet', emoji: '🏙️' },
  { id: 'sih-003-highway-merge', name: 'Highway Merge', tag: 'SIH-3', color: 'blue', emoji: '🛣️' },
  { id: 'sih-004-dense-market', name: 'Dense Market Area', tag: 'SIH-4', color: 'orange', emoji: '🏪' },
  { id: 'sih-005-cattle-crossing', name: 'Sudden Cattle Crossing', tag: 'SIH-5', color: 'red', emoji: '🐄' },
];

const METRICS = [
  { value: '82ms', label: 'Avg Replan Latency', icon: Clock },
  { value: '94/100', label: 'Safety Score', icon: Shield },
  { value: '5', label: 'SIH Scenarios', icon: Target },
  { value: '100%', label: 'Completion Rate', icon: Award },
];

const TECH_STACK = [
  { name: 'Next.js 14', role: 'Full-Stack Framework' },
  { name: 'TypeScript', role: 'Type-Safe Simulation' },
  { name: 'Canvas2D', role: 'Simulation Renderer' },
  { name: 'Supabase', role: 'Auth + Database' },
  { name: 'Recharts', role: 'Analytics & Metrics' },
  { name: 'Framer Motion', role: 'UI Animations' },
];

function AnimatedRoadBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Animated particles (simulate sensor data points)
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: Math.random() * 100,
        maxLife: 100,
      });
    }

    let frame = 0;
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw road
      ctx.fillStyle = 'rgba(242, 239, 231, 0.95)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'rgba(51, 104, 160, 0.15)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Road lanes (horizontal sweep animation)
      const roadY = canvas.height / 2;
      const laneW = 80;

      // Road surface
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(0, roadY - laneW, canvas.width, laneW * 2);

      // Dashed center line (fading out — no lane markings)
      const dashPhase = (frame * 0.5) % 40;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = dashPhase;
      ctx.strokeStyle = 'rgba(217, 160, 54, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(canvas.width * 0.4, roadY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving ego vehicle
      const egoX = ((frame * 1.2) % (canvas.width + 60)) - 30;
      const egoY = roadY - 8;

      // Sensor ring
      const ringPhase = (Math.sin(frame * 0.05) + 1) / 2;
      const gradient = ctx.createRadialGradient(egoX, egoY, 0, egoX, egoY, 80);
      gradient.addColorStop(0, 'rgba(208, 97, 72, 0.15)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(egoX, egoY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Ego vehicle body
      ctx.fillStyle = '#3368A0';
      ctx.shadowColor = '#3368A0';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(egoX - 18, egoY - 8, 36, 16, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Path ahead
      ctx.strokeStyle = 'rgba(81, 158, 114, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(egoX + 18, egoY);
      ctx.lineTo(Math.min(canvas.width, egoX + 120), egoY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Particles (sensor points)
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.5;
        if (p.life <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = roadY - 60 + Math.random() * 120;
          p.life = p.maxLife;
        }
        const alpha = (p.life / p.maxLife) * 0.6;
        ctx.fillStyle = `rgba(208, 97, 72, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Obstacle
      const obsX = ((frame * 0.6 + 300) % (canvas.width + 60)) - 30;
      ctx.fillStyle = 'rgba(226, 88, 77, 0.8)';
      ctx.shadowColor = '#e2584d';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(obsX - 10, roadY - 6, 20, 12, 3);
      ctx.fill();
      ctx.shadowBlur = 0;

      frame++;
      requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.8 }}
    />
  );
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const [activePipelineStep, setActivePipelineStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePipelineStep(s => (s + 1) % PIPELINE_STEPS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Top Nav ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Navigation className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Road<span className="text-cyan-400">Sense</span>
            </span>
            <Badge variant="outline" className="hidden sm:flex border-cyan-500/40 text-cyan-400 text-[10px]">
              SIH 2026
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <AnimatedRoadBackground />
        <div className="hero-grid absolute inset-0 opacity-30" />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-cyan-500/10 border-cyan-500/30 text-cyan-300 px-4 py-1.5 text-sm">
              <Zap className="w-3.5 h-3.5 mr-1.5 inline" />
              Smart India Hackathon 2026 — Autonomous Vehicles
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight mb-6 leading-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Road
            <span className="text-gradient glow-cyan">Sense</span>
          </motion.h1>

          <motion.p
            className="text-xl sm:text-2xl text-slate-300 font-light mb-4 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Intelligent Navigation for India&apos;s Unstructured Roads
          </motion.p>

          <motion.p
            className="text-slate-400 text-base sm:text-lg mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            A complete autonomous driving simulation platform demonstrating adaptive path planning,
            real-time collision avoidance, and closed-loop replanning for Indian road conditions.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/simulation">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-8 gap-2">
                <Play className="w-5 h-5" />
                Launch Simulation
              </Button>
            </Link>
            <Link href="#pipeline">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 px-8 gap-2">
                Explore Technology
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Live pipeline preview */}
          <motion.div
            className="mt-16 flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-500 ${
                  i === activePipelineStep
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 scale-105'
                    : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
                }`}
              >
                <step.icon className="w-3 h-3" />
                {step.label}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-slate-400" />
          </div>
        </motion.div>
      </section>

      {/* ─── Metrics Banner ──────────────────────────────── */}
      <section className="py-8 border-y border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {METRICS.map((m, i) => (
              <FadeIn key={m.label} delay={i * 0.1} className="text-center">
                <div className="text-3xl font-black text-cyan-400 font-mono mb-1">{m.value}</div>
                <div className="text-slate-400 text-sm">{m.label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Indian Road Challenges ──────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <Badge className="mb-4 bg-red-500/10 border-red-500/30 text-red-400">The Problem</Badge>
          <h2 className="text-4xl font-bold mb-4">Why Conventional AV Systems Fail in India</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Standard autonomous driving systems are designed for structured, lane-marked roads.
            Indian roads present unique challenges that demand a fundamentally different approach.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CHALLENGES.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <div className="rs-panel p-6 h-full hover:border-red-500/30 transition-colors group">
                <div className="text-3xl mb-4">{c.icon}</div>
                <h3 className="font-semibold text-white mb-2 group-hover:text-red-400 transition-colors">{c.title}</h3>
                <p className="text-slate-400 text-sm">{c.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Pipeline ────────────────────────────────────── */}
      <section id="pipeline" className="py-24 bg-card/10">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/10 border-cyan-500/30 text-cyan-400">The Solution</Badge>
            <h2 className="text-4xl font-bold mb-4">Complete Autonomous Driving Pipeline</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              RoadSense implements the full SENSE → UNDERSTAND → PREDICT → DECIDE → PLAN → ACT → REPLAN cycle.
            </p>
          </FadeIn>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent -translate-y-1/2" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-4">
              {PIPELINE_STEPS.map((step, i) => (
                <FadeIn key={step.label} delay={step.delay}>
                  <div className="rs-panel p-4 text-center hover:border-cyan-500/40 transition-all group relative">
                    {i < PIPELINE_STEPS.length - 1 && (
                      <ArrowRight className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 z-10" />
                    )}
                    <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                      <step.icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div className={`text-xs font-mono font-bold ${step.color} mb-1`}>{step.label}</div>
                    <div className="text-slate-500 text-xs hidden lg:block">{step.desc}</div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Scenarios ───────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeIn className="text-center mb-16">
          <Badge className="mb-4 bg-violet-500/10 border-violet-500/30 text-violet-400">5 SIH Scenarios</Badge>
          <h2 className="text-4xl font-bold mb-4">Indian Road Simulation Scenarios</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Five realistic scenarios designed specifically for SIH problem statement evaluation.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {SCENARIOS.map((s, i) => (
            <FadeIn key={s.id} delay={i * 0.1}>
              <Link href={`/simulation?scenario=${s.id}`}>
                <div className="rs-panel p-5 h-full hover:border-cyan-500/40 cursor-pointer transition-all group hover:-translate-y-1">
                  <div className="text-3xl mb-3">{s.emoji}</div>
                  <Badge variant="outline" className={`mb-3 border-${s.color}-500/40 text-${s.color}-400 text-[10px]`}>
                    {s.tag}
                  </Badge>
                  <div className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors">
                    {s.name}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 group-hover:text-cyan-500 transition-colors">
                    <Play className="w-3 h-3" />
                    Run Simulation
                  </div>
                </div>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Tech Stack ──────────────────────────────────── */}
      <section className="py-24 bg-card/10">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Technology Stack</h2>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {TECH_STACK.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.07}>
                <div className="rs-panel p-4 text-center">
                  <div className="font-bold text-cyan-400 text-sm mb-1">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.role}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="text-4xl font-bold mb-6">Ready to Explore RoadSense?</h2>
          <p className="text-slate-400 mb-10">
            Launch the simulation center and experience adaptive autonomous driving on Indian roads.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-8">
                Create Account
              </Button>
            </Link>
            <Link href="/simulation">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:border-cyan-500/50 px-8">
                Demo Without Account
              </Button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border/60 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-cyan-400" />
              <span className="font-bold">Road<span className="text-cyan-400">Sense</span></span>
              <span className="text-slate-500 text-sm">— Smart India Hackathon 2026</span>
            </div>
            <div className="text-slate-500 text-xs text-center">
              ⚠️ Synthetic simulation for demonstration purposes only.
              Not a certified autonomous driving system.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
