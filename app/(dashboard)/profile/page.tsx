'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const [user, setUser] = useState({ full_name: '', email: '', role: 'user' });
  const [simCount, setSimCount] = useState(0);

  useEffect(() => {
    const demo = localStorage.getItem('roadsense_demo_user');
    if (demo) setUser(JSON.parse(demo));
    try {
      setSimCount(JSON.parse(localStorage.getItem('roadsense_history') ?? '[]').length);
    } catch (e) {}
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your RoadSense account details.</p>
      </motion.div>

      <div className="rs-panel p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800/60">
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center text-2xl font-black text-cyan-400 uppercase">
            {user.full_name?.[0] ?? user.email?.[0] ?? 'U'}
          </div>
          <div>
            <div className="font-bold text-white text-lg">{user.full_name || 'Demo User'}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 text-[10px]">SIH 2026</Badge>
              <Badge className="bg-violet-500/10 border-violet-500/30 text-violet-400 text-[10px] capitalize">{user.role}</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300 text-sm">Full Name</Label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={user.full_name} onChange={e => setUser(u => ({ ...u, full_name: e.target.value }))}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-sm">Email Address</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={user.email} disabled className="pl-10 bg-slate-800/30 border-slate-700 text-slate-500" />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-sm">Role</Label>
            <div className="relative mt-1.5">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={user.role} disabled className="pl-10 bg-slate-800/30 border-slate-700 text-slate-500" />
            </div>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold gap-2" onClick={() => {
            localStorage.setItem('roadsense_demo_user', JSON.stringify(user));
          }}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="rs-panel p-6">
        <h2 className="font-bold text-white mb-4">Platform Stats</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Simulations Run', value: simCount },
            { label: 'SIH Scenarios', value: 5 },
            { label: 'Reports', value: 1 },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/40 rounded-xl p-4">
              <div className="text-2xl font-black text-cyan-400">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
