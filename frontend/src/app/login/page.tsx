'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import { FiLock, FiUser, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(username, password);
      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        toast.success('Login successful!');
        router.push('/admin/dashboard');
      }
    } catch {
      toast.error('Invalid username or password');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex selection:bg-[var(--accent-primary)] selection:text-white bg-[var(--bg-primary)]">
      {/* ─── Left Side: Visual Branding (Hidden on Mobile) ─── */}
      <div className="hidden lg:flex w-1/2 relative bg-[var(--bg-secondary)] overflow-hidden border-r border-[var(--border-subtle)] items-center justify-center">
        {/* Cinematic Backdrop Elements */}
         <div className="absolute inset-0 texture-grid opacity-[0.1]" />
         <div className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-[var(--accent-primary)] blur-[200px] opacity-[0.08]" />
         <div className="absolute bottom-0 left-0 w-[50vw] h-[100vh] bg-[var(--accent-secondary)] blur-[250px] opacity-[0.04]" />
         <div className="noise-bg opacity-10" />

         <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: premiumEase }} className="relative z-10 max-w-lg px-12">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center mb-8 shadow-2xl">
              <span className="text-2xl font-display font-bold text-[var(--accent-primary)]">P.</span>
            </div>
            <h1 className="text-5xl font-display font-semibold mb-6 tracking-tight text-[var(--text-primary)] leading-[1.1]">
              System <br/><span className="text-[var(--text-tertiary)] font-light">Authentication</span>
            </h1>
            <p className="text-[var(--text-secondary)] font-light leading-relaxed text-lg mb-8 max-w-sm">
              {t('login.description')}
            </p>

            <div className="flex items-center gap-4 border-t border-[var(--border-color)] pt-8">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-muted)] flex items-center justify-center">
                    <FiLock className="w-3 h-3 text-[var(--text-tertiary)]" />
                  </div>
                ))}
              </div>
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{t('login.encrypted')}</span>
            </div>
         </motion.div>
      </div>

      {/* ─── Right Side: Login Form (Full width on Mobile) ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative bg-[var(--bg-primary)] px-6 py-12">
        <a href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-mono tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <FiArrowLeft className="w-4 h-4" /> {t('login.go_back')}
        </a>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: premiumEase, delay: 0.1 }}
          className="w-full max-w-md relative z-10">
          
          <div className="text-left mb-10">
            <div className="w-12 h-12 lg:hidden rounded-xl bg-white/5 border border-[var(--border-subtle)] flex items-center justify-center mb-6">
              <span className="text-xl font-display font-bold text-[var(--accent-primary)]">P.</span>
            </div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">{t('login.welcome_back')}</h2>
            <p className="text-[var(--text-tertiary)] text-sm">{t('login.enter_credentials')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] ml-1 block">{t('login.username')}</label>
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-primary)] transition-colors z-10" />
                <input type="text" placeholder="admin" value={username} id="login-username"
                  onChange={(e) => setUsername(e.target.value)} className="input-field pl-12 h-[3.5rem]" required autoFocus />
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] block">{t('login.password')}</label>
              </div>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] group-focus-within:text-[var(--accent-primary)] transition-colors z-10" />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} id="login-password"
                  onChange={(e) => setPassword(e.target.value)} className="input-field pl-12 pr-12 h-[3.5rem]" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-10">
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full h-[3.5rem] mt-8 text-[0.95rem] font-semibold tracking-wide" id="login-submit">
              {loading ? (
                <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                <span>{t('login.sign_in')}</span>
              )}
            </button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}
