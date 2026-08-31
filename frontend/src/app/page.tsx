'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useThemeStore, useLangStore, useRealtimeStore } from '@/store';
import { projectsAPI, skillsAPI, certificatesAPI, experiencesAPI, messagesAPI, visitorsAPI, settingsAPI, securityAPI } from '@/lib/api';
import { Turnstile } from '@marsidev/react-turnstile';
import { Project, Skill, Certificate, Experience } from '@/types';
import toast from 'react-hot-toast';
import { FiGithub, FiExternalLink, FiSend, FiSun, FiMoon, FiMenu, FiX, FiArrowUp, FiGlobe, FiUsers, FiLinkedin, FiTwitter, FiInstagram, FiMail, FiMapPin, FiCalendar, FiBriefcase, FiArrowRight } from 'react-icons/fi';
import { SiReact, SiNextdotjs, SiTypescript, SiLaravel } from 'react-icons/si';
import Footer from '@/components/layout/Footer';
import PremiumLoader from '@/components/ui/PremiumLoader';

/* ─── Premium Intentional Animations ─── */
const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUpText: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1, ease: premiumEase } },
};

const fadeReveal: import('framer-motion').Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 1.2, ease: premiumEase } },
};

const staggerContainer: import('framer-motion').Variants = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const bentoHover = {
  y: -8,
  transition: { duration: 0.5, ease: premiumEase }
};

export default function HomePage() {
  const { t, lang, switchLanguage, isLoaded } = useTranslation();
  const { theme, toggleTheme, loadTheme } = useThemeStore();
  const { loadLang } = useLangStore();
  const { onlineCount } = useRealtimeStore();
  useWebSocket();

  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState('home');
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  const { scrollY, scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const heroY = useTransform(scrollY, [0, 800], [0, 100]);

  const lenisRef = useRef<any>(null);
  const isNavClick = useRef(false);

  useEffect(() => {
    if (!loading && isLoaded) {
      const handleHashScroll = () => {
        if (window.location.hash) {
          const id = window.location.hash.replace('#', '');
          scrollToId(id);
        }
      };

      handleHashScroll();
      window.addEventListener('hashchange', handleHashScroll);
      return () => window.removeEventListener('hashchange', handleHashScroll);
    }
  }, [loading, isLoaded]);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(el, { offset: -80 });
        } else {
          const top = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 300);
    }
  };

  useEffect(() => {
    const pending = sessionStorage.getItem('pendingScroll');
    if (pending && !loading && isLoaded) {
      scrollToId(pending);
      sessionStorage.removeItem('pendingScroll');
    }
  }, [loading, isLoaded]);

  useEffect(() => {
    loadTheme();
    loadLang();
    fetchData();
    visitorsAPI.track('/').catch(() => { });

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
      if (isNavClick.current) return;

      const sections = ['home', 'about', 'skills', 'projects', 'experience', 'certificates', 'contact'];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 350) {
          setActiveSection(id);
          break;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth >= 1024) {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', `${x}%`);
        document.documentElement.style.setProperty('--mouse-y', `${y}%`);
      }
    };

    const handleDataUpdate = () => fetchData();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('data:update', handleDataUpdate);

    let lenis: any;
    Promise.resolve().then(async () => {
      try {
        const Lenis = (await import('lenis')).default;
        lenis = new Lenis({
          duration: 1.5,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          touchMultiplier: 2,
        });
        lenisRef.current = lenis;

        function raf(time: number) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      } catch (err) { }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('data:update', handleDataUpdate);
      if (lenis) lenis.destroy();
    };
  }, []);

  async function fetchData() {
    try {
      const [projRes, skillRes, certRes, expRes, setRes, secRes] = await Promise.all([
        projectsAPI.getPublic(), skillsAPI.getPublic(),
        certificatesAPI.getPublic(), experiencesAPI.getPublic(),
        settingsAPI.getAll(),
        securityAPI.getPublicSettings().catch(() => ({ data: { turnstileEnabled: false } })),
      ]);
      setProjects(projRes.data?.data || []);
      setSkills(skillRes.data?.data || []);
      setCertificates(certRes.data?.data || []);
      setExperiences(expRes.data?.data || []);
      setSettings(setRes.data?.data || {});
      setTurnstileEnabled(secRes.data?.turnstileEnabled || false);
    } catch { }
    setLoading(false);
  }

  function projectSlugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await messagesAPI.send({ ...contactForm, turnstileToken });
      toast.success(t('contact.success'));
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setTurnstileToken('');
    } catch {
      toast.error(t('contact.error'));
      setTurnstileToken('');
    }
    setSending(false);
  }

  const navItems = ['home', 'about', 'skills', 'projects', 'experience', 'certificates', 'contact'];

  if (!isLoaded || loading) {
    return <PremiumLoader />;
  }

  const sortedProjects = [...projects].sort((a, b) => (b.year || 0) - (a.year || 0));
  const finalProjects = sortedProjects.length > 0 ? sortedProjects : defaultProjects;
  const finalSkills = skills.length > 0 ? skills : defaultSkills;
  const finalExperiences = experiences.length > 0 ? experiences : defaultExperiences;
  const finalCertificates = certificates.length > 0 ? certificates : defaultCertificates;

  return (
    <div suppressHydrationWarning className="relative min-h-screen selection:bg-[var(--accent-primary)] selection:text-white">
      {/* ─── Immersive Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[var(--bg-primary)]" />
        <div className="absolute inset-0 texture-grid opacity-[0.15] dark:opacity-[0.2]" />
        <div className="noise-bg" />
      </div>

      {/* ─── Refined NavBar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl transition-all duration-500 border-b border-[var(--border-subtle)] bg-[var(--surface-glass)]">
        <div className="section-container flex items-center justify-between h-20">
          <a href="/" onClick={(e) => { e.preventDefault(); scrollToId('home'); }} className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)] hover:opacity-80 transition-opacity">
            Portofolio
            <span className="text-[var(--accent-primary)]">.</span>
          </a>

          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <a
                key={item}
                href={`#${item}`}
                className="relative px-5 py-2.5 text-[0.85rem] font-medium tracking-wide transition-colors duration-300 rounded-full hover:bg-[var(--bg-secondary)] text-transform-capitalize"
                style={{ color: activeSection === item ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(item);
                  setActiveSection(item);
                  isNavClick.current = true;
                  setTimeout(() => { isNavClick.current = false; }, 1000);
                }}
              >
                {t(`nav.${item}`)}
                {activeSection === item && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-[var(--accent-primary)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium border border-[var(--border-color)] bg-[var(--bg-card)] shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
              </span>
              <span className="text-[var(--text-primary)]">Online</span>
            </div>

            <div className="flex items-center gap-1 border-l border-[var(--border-subtle)] pl-4">
              <button onClick={() => switchLanguage(lang === 'en' ? 'id' : 'en')}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Language">
                <FiGlobe className="w-4 h-4" />
              </button>

              <button onClick={toggleTheme} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]" title="Toggle Theme">
                <AnimatePresence mode="wait">
                  <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.3, ease: premiumEase }}>
                    {theme === 'dark' ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
                  </motion.div>
                </AnimatePresence>
              </button>

              <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                {mobileMenu ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden bg-[var(--surface-overlay)] backdrop-blur-xl border-t border-[var(--border-subtle)]"
            >
              <div className="px-6 py-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <a key={item} href={`#${item}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenu(false);
                      scrollToId(item);
                      setActiveSection(item);
                      isNavClick.current = true;
                      setTimeout(() => { isNavClick.current = false; }, 1000);
                    }}
                    className="px-4 py-4 text-sm font-semibold tracking-wide rounded-xl transition-colors capitalize"
                    style={{
                      background: activeSection === item ? 'var(--bg-secondary)' : 'transparent',
                      color: activeSection === item ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}>
                    {t(`nav.${item}`)}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ─── 1. HERO SECTION (Premium 2-Column with Animated Code Terminal) ─── */}
      <section id="home" className="relative min-h-[100svh] flex flex-col justify-center pt-20 z-10 overflow-hidden">
        <div className="section-container relative z-10 w-full flex items-center justify-center">
          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full max-w-7xl mx-auto pt-10 lg:pt-0">

            {/* Left: Text Content */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left order-1">
              <motion.div
                initial="hidden" animate="visible" variants={fadeUpText}
                className="mb-8 inline-flex items-center gap-3 px-6 py-3 rounded-full border border-[var(--border-accent)] bg-[var(--surface-glass)] backdrop-blur-md shadow-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
                </span>
                <span className="text-xs font-mono tracking-[0.2em] uppercase font-semibold text-[var(--accent-primary)]">{t('hero.greeting')}</span>
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-4 mb-8 w-full">
                <motion.h1 variants={fadeUpText} className="font-display font-medium tracking-tight text-[clamp(2.8rem,8vw,6rem)] leading-[0.95] text-[var(--text-primary)] px-2">
                  {settings.full_name || t('hero.name')}
                </motion.h1>
                <motion.h2 variants={fadeUpText} className="font-display font-bold tracking-tight text-[clamp(1.8rem,5vw,3.5rem)] leading-[1.1] text-[var(--text-secondary)] opacity-80 px-2" style={{ WebkitTextFillColor: 'transparent', WebkitTextStroke: '1px var(--text-tertiary)' }}>
                  {settings.title || t('hero.title')}
                </motion.h2>
              </motion.div>

              <motion.p initial="hidden" animate="visible" variants={fadeUpText} className="text-base md:text-lg lg:text-xl text-[var(--text-tertiary)] max-w-xl mb-10 leading-relaxed font-light px-4 lg:px-2">
                {t('hero.subtitle')}
              </motion.p>

              <motion.div initial="hidden" animate="visible" variants={fadeUpText} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 w-full px-6 lg:px-2">
                <button onClick={(e) => { e.preventDefault(); scrollToId('projects'); }} className="btn-primary w-full sm:w-auto min-w-[180px] h-14 group flex items-center justify-center gap-2">
                  {t('hero.cta')} <FiArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
                {settings.resume_url && (
                  <a href={settings.resume_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full sm:w-auto min-w-[180px] h-14 group border-2 flex items-center justify-center relative overflow-hidden">
                    <span className="relative z-10">{t('hero.download_cv')}</span>
                  </a>
                )}
              </motion.div>
            </div>

            {/* Right: Visual Animation (Terminal / Dashboard) */}
            <div className="flex relative w-full justify-center lg:justify-end items-center order-2 mt-8 lg:mt-0 pb-16 lg:pb-0 px-4 sm:px-0">
              <div className="relative w-full max-w-[360px] md:max-w-[420px] lg:max-w-[480px] aspect-square">
                {/* Glow Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full blur-[90px] opacity-[0.15] animate-pulse" />

                {/* Main Code Editor Window */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: premiumEase }}
                  className="absolute inset-2 sm:inset-0 rounded-2xl border border-[var(--border-accent)] bg-[var(--surface-overlay)]/80 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col z-10"
                >
                  {/* Window Controls (Mac Style) */}
                  <div className="h-10 sm:h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/40 flex items-center px-4 justify-between">
                    <div className="flex gap-2.5">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/80" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/80" />
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-md border border-[var(--border-subtle)]">visitor@portfolio:~</div>
                    <div className="w-10 sm:w-12"></div>
                  </div>

                  {/* Code Content */}
                  <div className="flex-1 p-5 sm:p-6 font-mono text-[10px] sm:text-xs lg:text-sm flex flex-col gap-2.5 sm:gap-3 overflow-hidden">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[var(--text-tertiary)] flex flex-wrap items-center gap-x-2">
                      <span className="text-[var(--accent-primary)]">import</span> {'{ Developer }'} <span className="text-[var(--accent-primary)]">from</span> <span className="text-emerald-400">'@sultan/core'</span>;
                    </motion.div>
                    <div className="h-1 sm:h-2" />
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-[var(--text-tertiary)] break-words">
                      <span className="text-blue-400">const</span> profile = <span className="text-blue-400">new</span> <span className="text-yellow-500 dark:text-yellow-400">Developer</span>({'{'}
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", delay: 1.5 }} className="pl-4 sm:pl-6 text-[var(--text-secondary)]">
                      name: <span className="text-emerald-400">'Sultan Nafis'</span>,
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", delay: 2 }} className="pl-4 sm:pl-6 text-[var(--text-secondary)]">
                      role: <span className="text-emerald-400">'Full Stack Developer'</span>,
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", delay: 2.5 }} className="pl-4 sm:pl-6 text-[var(--text-secondary)] break-words whitespace-pre-wrap">
                      skills: [<span className="text-emerald-400">'React'</span>, <span className="text-emerald-400">'Next.js'</span>, <span className="text-emerald-400">'TS'</span>],
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", delay: 3 }} className="pl-4 sm:pl-6 text-[var(--text-secondary)] flex items-center">
                      status: <span className="text-emerald-400 ml-2">'Building...'</span>
                      <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-[14px] bg-[var(--text-primary)] ml-1" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }} className="text-[var(--text-tertiary)]">
                      {'});'}
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4.5 }} className="text-gray-400 dark:text-gray-500 mt-2 sm:mt-4 italic">
                      <span className="hidden sm:inline">{'//'} Let's create something amazing together</span>
                      <span className="sm:hidden">{'//'} Let's build together</span>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Floating Tech Badges */}
                <motion.div
                  animate={{ y: [-5, 10, -5], rotate: [0, 5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -right-1 sm:-right-6 top-16 lg:top-20 z-20 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md"
                >
                  <SiReact className="w-5 h-5 sm:w-7 sm:h-7 text-[#61DAFB]" />
                </motion.div>

                <motion.div
                  animate={{ y: [10, -5, 10], rotate: [0, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute left-1 sm:-left-6 bottom-16 lg:bottom-24 z-20 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md"
                >
                  <SiNextdotjs className="w-5 h-5 sm:w-7 sm:h-7 text-[var(--text-primary)]" />
                </motion.div>

                <motion.div
                  animate={{ y: [-8, 8, -8], rotate: [-10, 10, -10] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className="absolute right-6 sm:right-8 -bottom-3 sm:-bottom-4 z-20 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md"
                >
                  <SiTypescript className="w-5 h-5 sm:w-7 sm:h-7 text-[#3178C6]" />
                </motion.div>

                <motion.div
                  animate={{ y: [6, -8, 6], rotate: [5, -5, 5] }}
                  transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  className="absolute -left-3 sm:-left-8 top-1/2 -translate-y-1/2 z-20 bg-[var(--bg-card)] border border-[var(--border-subtle)] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md"
                >
                  <SiLaravel className="w-5 h-5 sm:w-7 sm:h-7 text-[#FF2D20]" />
                </motion.div>

              </div>
            </div>

          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 w-full pointer-events-none">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[var(--text-tertiary)]">{t('hero.scroll')}</span>
          <div className="w-[1px] h-8 sm:h-12 bg-gradient-to-b from-[var(--text-tertiary)] to-transparent" />
        </motion.div>
      </section>

      {/* ─── 2. ABOUT SECTION (2-Column Premium) ─── */}
      <section id="about" className="section-padding relative z-10 bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]">
        <div className="section-container relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={staggerContainer} className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Left Content */}
            <div className="flex flex-col">
              <motion.div variants={fadeUpText} className="section-label">
                <span className="w-12 h-[1px] bg-[var(--accent-primary)] mb-[1px]" />
                {t('about.title')}
              </motion.div>

              <motion.h3 variants={fadeUpText} className="font-display text-4xl md:text-5xl font-semibold mb-8 leading-tight tracking-tight text-[var(--text-primary)]">
                {t('about.heading_line1')} <span className="text-[var(--accent-primary)]">{t('about.heading_accent1')}</span><br />
                {t('about.heading_line2')} <span className="text-[var(--accent-primary)]">{t('about.heading_accent2')}</span>
              </motion.h3>

              <motion.p variants={fadeUpText} className="text-base md:text-lg leading-relaxed text-[var(--text-tertiary)] mb-10 font-light">
                {settings.bio || t('about.description')}
              </motion.p>

              <motion.div variants={fadeUpText} className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-10 border-t border-[var(--border-color)]">
                {[
                  { value: settings.experience_years || '5+', label: t('about.experience_years') },
                  { value: settings.projects_done || '50+', label: t('about.projects_done') },
                  { value: settings.happy_clients || '30+', label: t('about.happy_clients') },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col gap-2 group">
                    <span className="text-4xl lg:text-5xl font-display font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors duration-500">{stat.value}</span>
                    <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{stat.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Profile Card */}
            <motion.div variants={fadeReveal} className="relative w-full aspect-[4/5] max-w-md mx-auto lg:ml-auto">
              {/* Decorative shapes behind image */}
              <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl border-2 border-[var(--border-accent)] opacity-50 z-0 hidden sm:block" />

              <div className="premium-card absolute inset-0 z-10 overflow-hidden rounded-3xl p-0 group">
                <img 
                  src={settings.profile_image_url || '/images/skyra-l1.png'} 
                  alt="Profile" 
                  fetchPriority="high"
                  onError={(e) => { e.currentTarget.src = '/images/skyra-l1.png' }}
                  className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/40 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-glass)] backdrop-blur-md border border-[var(--border-subtle)] w-fit mb-4">
                    <FiMapPin className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span className="text-xs font-mono tracking-wider">{settings.location || 'Jakarta, Indonesia'}</span>
                  </span>
                  <h4 className="text-3xl font-display font-medium text-white shadow-sm mb-1">{settings.full_name || t('hero.name')}</h4>
                  <p className="text-[var(--accent-primary)] font-medium font-mono text-sm tracking-widest">{settings.title || t('hero.title')}</p>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ─── 3. SKILLS SECTION (Modern Badge Marquee) ─── */}
      <section id="skills" className="py-24 overflow-hidden relative border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        <div className="section-container relative z-10 flex flex-col items-center text-center mb-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUpText} className="section-label justify-center">
            <span className="w-12 h-[1px] bg-[var(--accent-primary)] mb-[1px]" />
            {t('skills.title')}
          </motion.div>
        </div>

        <div className="relative flex flex-col gap-6 z-10 mask-edges" style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
          {/* Row 1 */}
          <div className="flex w-max animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused]">
            {[...finalSkills, ...finalSkills].map((skill, i) => {
              const iconSlug = skill.icon ? skill.icon.toLowerCase() : skill.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return (
                <div key={`${skill.id}-row1-${i}`} className="flex items-center gap-4 px-6 py-4 mx-3 rounded-2xl premium-card group cursor-default" style={{ minWidth: 'max-content' }}>
                  <div className="w-7 h-7 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                    <img src={`https://cdn.simpleicons.org/${iconSlug}`} alt={skill.name} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                    <span className="hidden font-bold text-xl">{skill.name.charAt(0)}</span>
                  </div>
                  <span className="font-display font-medium text-base tracking-wide text-[var(--text-primary)]">{skill.name}</span>
                </div>
              );
            })}
          </div>

          {/* Row 2 - Reverse */}
          <div className="flex w-max animate-[marquee-reverse_50s_linear_infinite] hover:[animation-play-state:paused]">
            {[...finalSkills].reverse().concat([...finalSkills].reverse()).map((skill, i) => {
              const iconSlug = skill.icon ? skill.icon.toLowerCase() : skill.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return (
                <div key={`${skill.id}-row2-${i}`} className="flex items-center gap-4 px-6 py-4 mx-3 rounded-2xl premium-card group cursor-default" style={{ minWidth: 'max-content' }}>
                  <div className="w-7 h-7 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                    <img src={`https://cdn.simpleicons.org/${iconSlug}`} alt={skill.name} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                    <span className="hidden font-bold text-xl">{skill.name.charAt(0)}</span>
                  </div>
                  <span className="font-display font-medium text-base tracking-wide text-[var(--text-primary)]">{skill.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. PROJECTS SECTION (Premium Bento Grid) ─── */}
      <section id="projects" className="section-padding bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] relative" style={{ scrollMarginTop: '80px' }}>
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[var(--accent-glow)] rounded-full blur-[150px] pointer-events-none opacity-50" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-[var(--accent-primary)] rounded-full blur-[200px] pointer-events-none opacity-[0.03]" />
        <div className="section-container relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={staggerContainer} className="mb-16 md:mb-20">
            <motion.div variants={fadeUpText} className="section-label">
              <span className="w-12 h-[1px] bg-[var(--accent-primary)] mb-[1px]" />
              {t('projects.title')}
            </motion.div>
            <motion.h2 variants={fadeUpText} className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-[var(--text-primary)] max-w-2xl leading-tight">
              {t('projects.subtitle')}
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={staggerContainer}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {finalProjects.map((project, i) => {
              const thumbnail = project.thumbnail_url || (project as any).thumbnail || (project as any).image_url || project.media?.[0]?.media_url || (project.media?.[0] as any)?.url || "";
              const isFeatured = i === 0;

              return (
                <motion.div key={project.id || i} variants={fadeUpText} className={`group cursor-pointer relative ${isFeatured ? 'lg:col-span-2' : ''}`}>
                  <Link href={`/project/${project.slug || projectSlugify(project.title)}`} className="block w-full h-full">
                    <div className={`w-full h-full p-0 flex flex-col relative overflow-hidden rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-sm shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--accent-primary)]/40 transition-all duration-500 hover:-translate-y-2 ${isFeatured ? 'lg:flex-row' : ''}`}>

                      {/* ── Image Container with Browser Frame ── */}
                      <div className={`relative overflow-hidden bg-[var(--bg-secondary)] flex shrink-0 flex-col ${isFeatured ? 'lg:w-[55%] min-h-[280px] lg:min-h-[420px]' : 'w-full min-h-[240px] sm:min-h-[300px]'}`}>
                        {/* Subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-transparent to-[var(--accent-secondary)]/3 pointer-events-none z-10" />

                        {/* Browser chrome top bar */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50 shrink-0 relative z-10">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                          <span className="ml-2 text-[9px] font-mono text-[var(--text-tertiary)] tracking-wider truncate">{project.demo_url || project.title.toLowerCase().replace(/\s+/g, '-') + '.app'}</span>
                        </div>

                        {thumbnail ? (
                          <div className="flex-1 relative flex items-center justify-center p-4 md:p-6 bg-[var(--bg-primary)]">
                            <img src={thumbnail} alt={project.title}
                              className="w-full h-full object-contain transition-transform duration-700 ease-[0.22,1,0.36,1] group-hover:scale-[1.05]" />
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)] opacity-60">
                            <FiBriefcase className="w-10 h-10 text-[var(--border-color)] mb-3" />
                            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text-tertiary)]">{t('common.no_data')}</span>
                          </div>
                        )}
                      </div>

                      {/* ── Content Layer ── */}
                      <div className={`flex flex-col flex-1 p-7 md:p-9 ${isFeatured ? 'justify-center border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)]' : 'border-t border-[var(--border-subtle)]'}`}>
                        {/* Meta Row */}
                        <div className="flex justify-between items-start mb-5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-[0.15em] uppercase bg-[var(--accent-primary)]/8 text-[var(--accent-primary)] border border-[var(--accent-primary)]/15 font-semibold">
                              {project.category || t('common.uncategorized')}
                            </span>
                            {project.year > 0 && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                                {project.year}
                              </span>
                            )}
                          </div>
                          <div className="w-9 h-9 rounded-full bg-[var(--bg-muted)] border border-[var(--border-subtle)] flex items-center justify-center -rotate-45 group-hover:rotate-0 group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:border-[var(--accent-primary)] group-hover:shadow-lg group-hover:shadow-[var(--accent-primary)]/20 text-[var(--text-tertiary)] transition-all duration-400">
                            <FiArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className={`font-display font-semibold text-[var(--text-primary)] mb-3 leading-tight group-hover:text-[var(--accent-primary)] transition-colors duration-300 ${isFeatured ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl'}`}>
                          {project.title}
                        </h3>

                        {/* Description */}
                        <p className={`text-[var(--text-tertiary)] font-light text-sm md:text-base mb-6 leading-relaxed flex-1 ${isFeatured ? 'line-clamp-4' : 'line-clamp-2'}`}>
                          {project.description}
                        </p>

                        {/* Bottom row: Tags + CTA */}
                        <div className="flex items-end justify-between gap-4 mt-auto">
                          {project.tags ? (
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {project.tags.split(',').slice(0, isFeatured ? 5 : 3).map(tag => (
                                <span key={tag} className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--bg-primary)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] group-hover:border-[var(--border-color)] transition-colors">
                                  {tag.trim()}
                                </span>
                              ))}
                              {project.tags.split(',').length > (isFeatured ? 5 : 3) && (
                                <span className="text-[10px] font-mono px-2 py-1 text-[var(--text-tertiary)]">+{project.tags.split(',').length - (isFeatured ? 5 : 3)}</span>
                              )}
                            </div>
                          ) : <div />}

                          {/* CTA */}
                          <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] uppercase tracking-widest whitespace-nowrap transition-colors duration-300 shrink-0">
                            {t('project.view_detail')}
                            <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                          </span>
                        </div>
                      </div>

                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── 5. EXPERIENCE & CERTIFICATES SECTION ─── */}
      <section id="experience" className="section-padding bg-[var(--bg-primary)]">
        <div className="section-container relative">

          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left: Timeline Experience */}
            <div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUpText} className="section-label mb-12">
                <span className="w-12 h-[1px] bg-[var(--accent-primary)] mb-[1px]" />
                {t('experience.title')}
              </motion.div>

              <div className="relative pl-6 md:pl-8 border-l border-[var(--border-color)] flex flex-col gap-12">
                <div className="absolute top-0 bottom-0 left-[-1px] w-[2px] bg-gradient-to-b from-[var(--accent-primary)] via-[var(--accent-primary)]/20 to-transparent transform scale-y-[0.8] origin-top" />

                {finalExperiences.map((exp, i) => (
                  <motion.div key={exp.id || i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUpText} className="relative group">
                    {/* Node Glow */}
                    <span className="absolute -left-[30px] md:-left-[38px] top-2 w-4 h-4 rounded-full bg-[var(--bg-primary)] border-[3px] border-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] transition-colors duration-300 shadow-[0_0_10px_var(--accent-glow)]" />

                    <div className="premium-card p-6 md:p-8 hover:border-[var(--accent-primary)] transition-colors duration-300">
                      <div className="flex items-start gap-4 mb-4">
                        {exp.company_logo_url ? (
                          <img src={exp.company_logo_url} alt={exp.company} className="w-12 h-12 object-contain rounded-lg bg-white/5 p-1 border border-[var(--border-subtle)] shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] shrink-0"><FiBriefcase className="w-5 h-5" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h4 className="text-xl font-display font-semibold text-[var(--text-primary)] truncate">{exp.position}</h4>
                            <span className="px-3 py-1 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] text-xs font-mono uppercase tracking-wider w-fit shrink-0">
                              {exp.start_date ? new Date(exp.start_date).getFullYear() : ''} - {exp.is_current ? t('experience.present') : exp.end_date ? new Date(exp.end_date).getFullYear() : ''}
                            </span>
                          </div>
                          <p className="text-[var(--accent-primary)] font-medium text-sm mt-1">{exp.company}</p>
                        </div>
                      </div>
                      <p className="text-[var(--text-tertiary)] font-light text-sm md:text-base leading-relaxed">{exp.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Certificates / Small Bento */}
            <div id="certificates" className="scroll-mt-24">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUpText} className="section-label mb-12">
                <span className="w-12 h-[1px] bg-[var(--accent-primary)] mb-[1px]" />
                {t('certificates.title')}
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-6">
                {finalCertificates.map((cert, i) => (
                  <motion.div key={cert.id || i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeUpText}>
                    <div className="premium-card p-6 h-full flex flex-col justify-between group cursor-pointer" onClick={() => cert.image_url && setSelectedCert(cert.image_url)}>
                      <div>
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-muted)] flex items-center justify-center mb-6 group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-all duration-300 text-[var(--text-secondary)]">
                          <FiExternalLink className="w-4 h-4" />
                        </div>
                        <h4 className="font-display text-lg font-semibold text-[var(--text-primary)] leading-tight mb-2 group-hover:text-[var(--accent-primary)] transition-colors">{cert.title}</h4>
                        <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-widest">{cert.issuer}</p>
                      </div>

                      <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                        <span className="text-xs font-mono text-[var(--text-secondary)] overflow-hidden">
                          {cert.issue_date && new Date(cert.issue_date).getFullYear()}
                        </span>
                        <span className="text-[var(--accent-primary)] text-xs font-medium uppercase tracking-wider opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">{t('common.view')}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. CONTACT SECTION (Premium Form) ─── */}
      <section id="contact" className="section-padding bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)]/10 to-[var(--bg-secondary)] pointer-events-none" />

        <div className="section-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center max-w-6xl mx-auto">

            {/* Left Text */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={staggerContainer}>
              <motion.div variants={fadeUpText} className="section-label mb-8">
                <span className="w-12 h-[1px] bg-[var(--accent-primary)] mb-[1px]" />
                {t('contact.title')}
              </motion.div>
              <motion.h2 variants={fadeUpText} className="font-display text-5xl lg:text-7xl font-semibold mb-6 tracking-tight text-[var(--text-primary)] leading-tight">
                {t('contact.heading_line1')} <br />
                <span className="text-[var(--accent-primary)] italic font-light">{t('contact.heading_accent')}</span>
              </motion.h2>
              <motion.p variants={fadeUpText} className="text-lg text-[var(--text-tertiary)] max-w-md font-light leading-relaxed mb-10">
                {t('contact.subtitle')}
              </motion.p>

              <motion.div variants={fadeUpText} className="flex flex-col gap-4">

              </motion.div>
            </motion.div>

            {/* Right Form Card */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} variants={fadeReveal}>
              <div className="premium-card p-8 md:p-12 shadow-2xl relative">
                {/* Internal Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] opacity-5 blur-[80px] pointer-events-none" />

                <form onSubmit={handleContact} className="space-y-6 relative z-10">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="relative group">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] ml-2 mb-2 block">{t('contact.name')}</label>
                      <input type="text" required value={contactForm.name} onChange={(e) => setContactForm(s => ({ ...s, name: e.target.value }))} className="input-field" placeholder={t('contact.name_placeholder')} />
                    </div>
                    <div className="relative group">
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] ml-2 mb-2 block">{t('contact.email')}</label>
                      <input type="email" required value={contactForm.email} onChange={(e) => setContactForm(s => ({ ...s, email: e.target.value }))} className="input-field" placeholder={t('contact.email_placeholder')} />
                    </div>
                  </div>
                  <div className="relative group">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] ml-2 mb-2 block">{t('contact.subject')}</label>
                    <input type="text" value={contactForm.subject} onChange={(e) => setContactForm(s => ({ ...s, subject: e.target.value }))} className="input-field" placeholder={t('contact.subject_placeholder')} />
                  </div>
                  <div className="relative group">
                    <label className="text-[10px] uppercase font-mono tracking-widest text-[var(--text-tertiary)] ml-2 mb-2 block">{t('contact.message')}</label>
                    <textarea rows={5} required value={contactForm.message} onChange={(e) => setContactForm(s => ({ ...s, message: e.target.value }))} className="input-field resize-none" placeholder={t('contact.message_placeholder')} />
                  </div>
                  
                  {turnstileEnabled && (
                    <div className="relative group flex justify-center py-2">
                       <Turnstile
                         siteKey={(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string) || "0x4AAAAAADYAaJxXJPhV-n0l"}
                         onSuccess={(token) => setTurnstileToken(token)}
                         onError={() => setTurnstileToken('')}
                         onExpire={() => setTurnstileToken('')}
                         options={{ theme: theme === 'dark' ? 'dark' : 'light' }}
                       />
                    </div>
                  )}

                  <button type="submit" disabled={sending || (turnstileEnabled && !turnstileToken)} className={`btn-primary w-full h-14 mt-4 text-base font-semibold tracking-wide ${turnstileEnabled && !turnstileToken ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>{t('contact.send')}</span>}
                  </button>
                </form>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ─── Shared Modals (Certs) ─── */}
      <AnimatePresence>
        {selectedCert && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={() => setSelectedCert(null)}>
            <button onClick={() => setSelectedCert(null)} className="absolute top-6 right-6 p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-10 border border-white/20">
              <FiX className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.4, ease: premiumEase }}
              src={selectedCert}
              className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FOOTER ─── */}
      <Footer settings={settings} />

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 w-12 h-12 flex items-center justify-center rounded-full z-50 bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-xl hover:-translate-y-2 transition-transform duration-300">
            <FiArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// Fallbacks
const defaultSkills: Skill[] = [
  { id: '1', name: 'React', icon: 'react', proficiency: 90, sort_order: 0, is_published: true, created_at: '' },
  { id: '2', name: 'Next.js', icon: 'nextjs', proficiency: 85, sort_order: 1, is_published: true, created_at: '' },
  { id: '3', name: 'TypeScript', icon: 'typescript', proficiency: 85, sort_order: 2, is_published: true, created_at: '' },
  { id: '4', name: 'Tailwind', icon: 'tailwind', proficiency: 90, sort_order: 3, is_published: true, created_at: '' },
];
const defaultProjects: Project[] = [
  { id: '1', title: 'E-Commerce Engine', slug: 'ecommerce', description: 'Enterprise headless setup.', thumbnail_url: '', thumbnail_public_id: '', github_url: '#', demo_url: '#', video_url: '', documentation_url: '', category: 'Web App', tags: 'Next.js, Go', year: 2024, is_published: true, sort_order: 0, media: [], created_at: '', updated_at: '' },
];
const defaultExperiences: Experience[] = [
  { id: '1', company: 'Tech Inc', position: 'Senior Engineer', description: 'Microservices architecture.', start_date: '2022-01-01', end_date: '', is_current: true, company_logo_url: '', company_logo_public_id: '', sort_order: 0, is_published: true, created_at: '' },
];
const defaultCertificates: Certificate[] = [
  { id: '1', title: 'AWS Cloud Architect', issuer: 'Amazon', issue_date: '2023-01-01', expiry_date: '', credential_url: '#', image_url: '', image_public_id: '', is_published: true, created_at: '' },
];
