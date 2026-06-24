'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '@/lib/api';
import { useAuthStore, useThemeStore } from '@/store';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import { FiLock, FiUser, FiEye, FiEyeOff, FiArrowLeft, FiShield, FiRefreshCw } from 'react-icons/fi';

const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // OTP State
  const [otp, setOtp] = useState('');
  const [pendingLoginId, setPendingLoginId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const { t } = useTranslation();

  useEffect(() => {
    loadTheme();
    setMounted(true);
  }, [loadTheme]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(username, password);
      
      if (res.data?.requiresOtp) {
        setStep('otp');
        setPendingLoginId(res.data.pendingLoginId);
        setMaskedEmail(res.data.maskedEmail);
        setCooldown(60);
      } else if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Invalid username or password');
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingLoginId) return;
    setLoading(true);
    try {
      const res = await authAPI.verifyLoginOtp(pendingLoginId, otp);
      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || t('login.verify_otp_error') || 'Kode OTP salah atau sudah expired.');
    }
    setLoading(false);
  }

  async function handleResendOtp() {
    if (!pendingLoginId || cooldown > 0) return;
    setLoading(true);
    try {
      const res = await authAPI.resendLoginOtp(pendingLoginId);
      if (res.data.success) {
        setPendingLoginId(res.data.pendingLoginId); // It regenerates
        setCooldown(60);
        toast.success(res.data.message || 'OTP resent successfully');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to resend OTP. Please try again later.');
    }
    setLoading(false);
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex selection:bg-[var(--accent-primary)] selection:text-white bg-[var(--bg-primary)] overflow-hidden">
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
            System <br /><span className="text-[var(--text-tertiary)] font-light">Authentication</span>
          </h1>
          <p className="text-[var(--text-secondary)] font-light leading-relaxed text-lg mb-8 max-w-sm">
            {t('login.description')}
          </p>

          <div className="flex items-center gap-4 border-t border-[var(--border-color)] pt-8">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-muted)] flex items-center justify-center">
                  <FiLock className="w-3 h-3 text-[var(--text-tertiary)]" />
                </div>
              ))}
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{t('login.encrypted')}</span>
          </div>
        </motion.div>
      </div>

      {/* ─── Right Side: Login/OTP Form (Full width on Mobile) ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative bg-[var(--bg-primary)] px-6 py-12">
        <button onClick={() => step === 'otp' ? setStep('login') : router.push('/')} className="absolute top-8 left-8 flex items-center gap-2 text-sm font-mono tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-20">
          <FiArrowLeft className="w-4 h-4" /> {t('login.go_back')}
        </button>

        <AnimatePresence mode="wait">
          {step === 'login' ? (
            <motion.div key="step-login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: premiumEase }}
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
                      onChange={(e) => setUsername(e.target.value)} className="input-field pl-12 h-[3.5rem]" required autoFocus={step === 'login'} />
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

          ) : (

            <motion.div key="step-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: premiumEase }}
              className="w-full max-w-md relative z-10">

              <div className="text-left mb-10">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 flex items-center justify-center mb-6">
                  <FiShield className="w-6 h-6" />
                </div>
                <h2 className="font-display text-4xl font-semibold tracking-tight text-[var(--text-primary)] mb-2">{t('login.verify_otp_title') || 'Two-Factor Auth'}</h2>
                <p className="text-[var(--text-tertiary)] text-sm">{t('login.verify_otp_desc') || 'Enter the 6-digit code sent to '} <strong className="font-medium text-[var(--text-primary)]">{maskedEmail}</strong></p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] ml-1 block">{t('login.otp_code')}</label>
                  <input type="text" placeholder="123456" maxLength={6} value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                    className="input-field text-center text-2xl tracking-[0.5em] font-mono h-[4rem]" required autoFocus={step === 'otp'} />
                </div>

                <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full h-[3.5rem] text-[0.95rem] font-semibold tracking-wide shadow-lg shadow-[var(--accent-primary)]/20">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[var(--bg-primary)]/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    <span>{t('login.verify_btn')}</span>
                  )}
                </button>
                
                <div className="flex justify-center pt-2">
                  <button type="button" onClick={handleResendOtp} disabled={loading || cooldown > 0} 
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:hover:text-[var(--text-secondary)] transition-colors">
                    <FiRefreshCw className={`w-4 h-4 ${loading && cooldown === 0 ? 'animate-spin' : ''}`} />
                    {cooldown > 0 ? `${t('login.resend_wait')}${cooldown}s` : t('login.resend_otp')}
                  </button>
                </div>
              </form>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
