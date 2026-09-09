'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation, LayoutDashboard, Play, Map, Eye, TrendingUp, Route,
  Shield, BarChart3, History, FileText, Database, User, Settings,
  ShieldCheck, Menu, X, Bell, ChevronDown, LogOut, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  adminOnly?: boolean;
  researcherOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/simulation', icon: Play, label: 'Simulation', badge: 'LIVE' },
  { href: '/scenarios', icon: Map, label: 'Scenarios' },
  { href: '/perception', icon: Eye, label: 'Perception' },
  { href: '/prediction', icon: TrendingUp, label: 'Prediction' },
  { href: '/path-planning', icon: Route, label: 'Path Planning' },
  { href: '/collision-avoidance', icon: Shield, label: 'Collision Avoidance' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/history', icon: History, label: 'Simulation History' },
  { href: '/reports', icon: FileText, label: 'Reports' },
  { href: '/datasets', icon: Database, label: 'Datasets', researcherOnly: true },
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/admin', icon: ShieldCheck, label: 'Admin', adminOnly: true },
];

interface DashboardUser {
  email: string;
  role: string;
  full_name?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Check for demo user or Supabase user
    const demoUser = localStorage.getItem('roadsense_demo_user');
    if (demoUser) {
      setUser(JSON.parse(demoUser));
      return;
    }

    if (isSupabaseConfigured()) {
      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user: supaUser } }) => {
          if (!supaUser) {
            router.push('/login');
            return;
          }
          setUser({
            email: supaUser.email ?? '',
            role: (supaUser.user_metadata?.role as string) ?? 'user',
            full_name: supaUser.user_metadata?.full_name as string,
          });
        });
      });
    } else {
      // No auth configured and no demo user — redirect to login
      router.push('/login');
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    localStorage.removeItem('roadsense_demo_user');
    if (isSupabaseConfigured()) {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push('/');
  }, [router]);

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly && user?.role !== 'administrator') return false;
    if (item.researcherOnly && !['researcher', 'administrator'].includes(user?.role ?? '')) return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800/60">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="font-black text-white text-base leading-none">
              Road<span className="text-cyan-400">Sense</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">SIH 2026</div>
          </div>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Sidebar navigation">
        <div className="space-y-0.5">
          {visibleItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                  isActive ? 'nav-item-active' : 'nav-item'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className={`flex-1 ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                {item.badge && (
                  <Badge className="text-[9px] py-0 px-1.5 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    {item.badge}
                  </Badge>
                )}
                {item.adminOnly && (
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400 uppercase">
            {user?.full_name?.[0] ?? user?.email?.[0] ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.full_name ?? 'User'}</div>
            <div className="text-xs text-slate-500 truncate">{user?.role ?? 'user'}</div>
          </div>
          <button onClick={handleLogout} aria-label="Logout" className="text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#060b15] text-white overflow-hidden">
      {/* ─── Desktop Sidebar ─────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-slate-900/80 border-r border-slate-800/60">
        <SidebarContent />
      </aside>

      {/* ─── Mobile Sidebar Overlay ───────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-60 bg-slate-900 border-r border-slate-800/60 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="h-14 border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-sm flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 flex items-center gap-2 text-sm">
            <span className="text-slate-500 hidden sm:block">RoadSense</span>
            <span className="text-slate-700 hidden sm:block">/</span>
            <span className="text-slate-200 font-medium capitalize">
              {pathname.split('/').pop()?.replace(/-/g, ' ') ?? 'Dashboard'}
            </span>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:block">System Online</span>
          </div>

          {/* Demo mode badge */}
          {!isSupabaseConfigured() && (
            <Badge className="hidden sm:flex bg-amber-500/10 border-amber-500/30 text-amber-400 text-[10px]">
              <Zap className="w-3 h-3 mr-1" />
              Demo Mode
            </Badge>
          )}

          {/* Notifications */}
          <button className="relative text-slate-400 hover:text-white p-1" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-slate-400 hover:text-white p-1"
              aria-label="User menu"
            >
              <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-400 uppercase">
                {user?.full_name?.[0] ?? user?.email?.[0] ?? 'U'}
              </div>
              <ChevronDown className="w-3 h-3 hidden sm:block" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-10 w-48 rs-panel py-1 z-50"
                >
                  <div className="px-3 py-2 border-b border-slate-700/50">
                    <div className="text-sm font-medium text-white truncate">{user?.full_name ?? 'User'}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <div className="border-t border-slate-700/50 mt-1 pt-1">
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
