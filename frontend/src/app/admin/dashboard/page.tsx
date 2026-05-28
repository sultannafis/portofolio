'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '@/lib/api';
import { DashboardStats } from '@/types';
import { useRealtimeStore } from '@/store';
import { FiFolder, FiMail, FiUsers, FiTrendingUp, FiEye } from 'react-icons/fi';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { onlineCount } = useRealtimeStore();

  useEffect(() => {
    fetchStats();
    const handler = () => fetchStats();
    window.addEventListener('admin:refresh', handler);
    return () => window.removeEventListener('admin:refresh', handler);
  }, []);

  async function fetchStats() {
    try {
      const res = await dashboardAPI.getStats();
      setStats(res.data?.data);
    } catch { /* */ }
    setLoading(false);
  }

  const cards = [
    { label: t('admin.total_projects'), value: stats?.total_projects || 0, icon: FiFolder, color: 'from-purple-500 to-indigo-500', bg: 'purple' },
    { label: t('admin.unread_messages'), value: stats?.unread_messages || 0, icon: FiMail, color: 'from-pink-500 to-rose-500', bg: 'pink' },
    { label: t('admin.today_visitors'), value: stats?.today_visitors || 0, icon: FiEye, color: 'from-blue-500 to-cyan-500', bg: 'blue' },
    { label: t('admin.total_visitors'), value: stats?.total_visitors || 0, icon: FiTrendingUp, color: 'from-sky-500 to-sky-400', bg: 'sky' },
    { label: t('admin.online_now'), value: onlineCount, icon: FiUsers, color: 'from-amber-500 to-orange-500', bg: 'amber' },
  ];

  const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight text-[var(--text-primary)]">{t('admin.dashboard_overview')}</h1>
          <p className="text-[var(--text-secondary)] mt-1 font-light opacity-80">{t('admin.dashboard_subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} variants={fadeIn} className="premium-card p-6 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-primary)] opacity-[0.03] blur-[40px] pointer-events-none group-hover:opacity-[0.1] transition-opacity duration-500" />
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] group-hover:border-[var(--accent-primary)] transition-all duration-300">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              
              {loading ? (
                <div className="space-y-2 mt-auto relative z-10">
                  <div className="skeleton h-8 w-16" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ) : (
                <div className="mt-auto relative z-10">
                  <div className="text-4xl font-display font-semibold mb-1 text-[var(--text-primary)] tracking-tight">{card.value.toLocaleString()}</div>
                  <div className="text-xs text-[var(--text-tertiary)] tracking-widest font-mono uppercase opacity-80">{card.label}</div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Visitor Chart */}
      <div className="premium-card p-8 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/50 to-transparent pointer-events-none" />
        <h2 className="font-display text-xl font-medium mb-8 text-[var(--text-primary)] relative z-10">{t('admin.traffic_analytics')}</h2>
        
        {loading ? (
          <div className="skeleton h-72 w-full relative z-10" />
        ) : stats?.daily_stats && stats.daily_stats.length > 0 ? (
          <div className="flex items-end gap-2 md:gap-3 h-72 overflow-x-auto overflow-y-hidden pb-10 relative z-10 layout-scrollbar">
            {stats.daily_stats.map((day, i) => {
              const maxCount = Math.max(...stats.daily_stats.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={i} className="flex flex-col justify-end items-center flex-1 min-w-[30px] h-full group relative">
                  <span className="absolute -top-8 text-xs font-mono font-bold text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300">
                    {day.count}
                  </span>
                  <div className="w-full max-w-[48px] rounded-sm bg-[var(--bg-muted)] border-t-2 border-[var(--border-subtle)] relative overflow-hidden transition-all duration-300 group-hover:border-[var(--accent-primary)] group-hover:shadow-[0_0_20px_var(--accent-glow)]"
                    style={{ height: `${Math.max(height, 8)}%` }}>
                    <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <span className="absolute -bottom-6 text-[10px] text-[var(--text-tertiary)] hidden md:block whitespace-nowrap font-mono tracking-tighter opacity-50 group-hover:opacity-100 transition-opacity">
                    {day.date ? new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-[var(--text-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-2xl relative z-10 bg-[var(--bg-muted)]/50">
            <FiTrendingUp className="w-10 h-10 mb-4 opacity-40 text-[var(--accent-primary)]" />
            <p className="font-mono text-sm uppercase tracking-widest text-[var(--text-primary)]">{t('admin.no_analytics')}</p>
            <p className="text-sm font-light mt-2 max-w-sm text-center">{t('admin.no_analytics_desc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

