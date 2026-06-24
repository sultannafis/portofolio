'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useThemeStore, useRealtimeStore, useUIStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { FiHome, FiGrid, FiFolder, FiZap, FiUser, FiAward, FiBriefcase, FiMail, FiSettings, FiLogOut, FiSun, FiMoon, FiMenu, FiX, FiBell } from 'react-icons/fi';
import { messagesAPI } from '@/lib/api';

import { useTranslation } from '@/hooks/useTranslation';

const sidebarLinks = [
  { href: '/admin/dashboard', icon: FiGrid, labelKey: 'admin.dashboard' },
  { href: '/admin/projects', icon: FiFolder, labelKey: 'admin.projects' },
  { href: '/admin/skills', icon: FiZap, labelKey: 'admin.skills' },
  { href: '/admin/certificates', icon: FiAward, labelKey: 'admin.certificates' },
  { href: '/admin/experiences', icon: FiBriefcase, labelKey: 'admin.experiences' },
  { href: '/admin/messages', icon: FiMail, labelKey: 'admin.messages' },
  { href: '/admin/settings', icon: FiSettings, labelKey: 'admin.settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, loadFromStorage, logout } = useAuthStore();
  const { theme, toggleTheme, loadTheme } = useThemeStore();
  const { onlineCount, newMessage, setNewMessage } = useRealtimeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { pageTitle, setPageTitle } = useUIStore();
  const [loaded, setLoaded] = useState(false);
  const { t, lang, switchLanguage } = useTranslation();
  useWebSocket();

  useEffect(() => {
    setPageTitle('');
    document.title = 'Admin Dashboard';
  }, [pathname, setPageTitle]);

  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} | Admin`;
    }
  }, [pageTitle]);

  useEffect(() => {
    loadFromStorage();
    loadTheme();
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && !isAuthenticated) {
      router.push('/login');
    }
  }, [loaded, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      messagesAPI.countUnread().then(res => {
        setUnreadCount(res.data?.data?.count || 0);
      }).catch(() => { });
    }
  }, [isAuthenticated, newMessage]);

  useEffect(() => {
    if (newMessage) {
      setUnreadCount(prev => prev + 1);
      setNewMessage(false);
    }
  }, [newMessage, setNewMessage]);

  // Listen for data:update events
  useEffect(() => {
    const handler = () => {
      // Trigger re-fetch in child pages
      window.dispatchEvent(new Event('admin:refresh'));
    };
    window.addEventListener('data:update', handler);
    return () => window.removeEventListener('data:update', handler);
  }, []);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (!loaded || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)] blur-xl opacity-30 animate-pulse absolute inset-0" />
          <div className="w-12 h-12 border-[3px] border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin relative" />
        </div>
        <p className="text-sm font-mono text-[var(--text-tertiary)] tracking-widest uppercase animate-pulse">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 relative text-[var(--text-primary)]" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Cinematic Background ─── */}
      <div className="noise-bg fixed inset-0 z-0 opacity-50" />
      <div className="ambient-glow fixed top-0 left-0 w-[50vw] h-[50vh] bg-[var(--accent-glow)] pointer-events-none z-0" />

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 w-64 bg-[var(--surface-glass)] backdrop-blur-3xl border-r border-[var(--border-subtle)] z-50 flex flex-col transition-transform duration-300`}>
        <div className="flex items-center justify-between p-6 pb-4">
          <Link href="/" className="text-2xl font-display font-medium tracking-tight">Portfolio <span className="text-[var(--accent-primary)]">.</span></Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 mb-6">
          <div className="premium-card p-4 flex items-center gap-4 bg-[var(--bg-card)] border-[var(--border-subtle)] shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-glow)] flex items-center justify-center text-[var(--accent-primary)] font-display font-medium text-lg relative overflow-hidden group">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{user?.username}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate font-mono">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto hide-scrollbar">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium group relative overflow-hidden ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-glow)] to-transparent border-l-2 border-[var(--accent-primary)]" />
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-[var(--bg-muted)] opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
                <Icon className="w-5 h-5 flex-shrink-0 relative z-10" />
                <span className="flex-1 relative z-10">{t(link.labelKey)}</span>
                {link.labelKey === 'admin.messages' && unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--accent-primary)] text-white font-mono shadow-sm relative z-10">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border-subtle)] mt-auto">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors font-medium">
            <FiLogOut className="w-5 h-5" /> {t('admin.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[var(--surface-glass)] backdrop-blur-2xl border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-6 h-20">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mr-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors shrink-0">
                <FiMenu className="w-5 h-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-display font-medium tracking-tight capitalize truncate">
                {pageTitle || (
                  pathname.includes('/edit/') ? `Edit ${pathname.split('/')[2].slice(0, -1)}` :
                    pathname.includes('/create') ? `Create ${pathname.split('/')[2].slice(0, -1)}` :
                      (pathname.split('/').pop() || 'Dashboard')
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-glow)] border border-[var(--border-accent)] text-[var(--accent-primary)] text-xs font-mono uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-sm animate-pulse" />
                {onlineCount} <span className="opacity-70">online</span>
              </div>

              <Link href="/admin/messages" className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all">
                <FiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <button onClick={() => switchLanguage(lang === 'en' ? 'id' : 'en')} className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all font-mono font-bold text-sm">
                {lang.toUpperCase()}
              </button>

              <button onClick={toggleTheme} className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all">
                {theme === 'dark' ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
              </button>

              <Link href="/" className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-all" title="View site">
                <FiHome className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
