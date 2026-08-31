'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FiArrowLeft, FiGithub, FiExternalLink, FiCalendar, FiTag, FiX, FiChevronLeft, FiChevronRight, FiZoomIn, FiLayers, FiArrowRight } from 'react-icons/fi';
import { projectsAPI, settingsAPI } from '@/lib/api';
import { Project } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import Footer from '@/components/layout/Footer';
import PremiumLoader from '@/components/ui/PremiumLoader';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 40, filter: 'blur(6px)' },
  visible: (delay: number) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.9, ease: premiumEase, delay }
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: { duration: 0.8, ease: premiumEase, delay }
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(8px)' },
  visible: (delay: number) => ({
    opacity: 1, scale: 1, filter: 'blur(0px)',
    transition: { duration: 1, ease: premiumEase, delay }
  }),
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, isLoaded } = useTranslation();
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (params.slug) {
      fetchData(params.slug as string);
    }
  }, [params.slug]);

  // Close lightbox on Escape key + arrow navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight' && lightboxIndex !== null && allMedia.length > 1) nextImage();
      if (e.key === 'ArrowLeft' && lightboxIndex !== null && allMedia.length > 1) prevImage();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex]);

  // Disable body scroll when lightbox open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  async function fetchData(slug: string) {
    try {
      const [resContext, setRes] = await Promise.all([
        projectsAPI.getPublic(),
        settingsAPI.getAll().catch(() => ({ data: { data: {} } }))
      ]);
      const all: Project[] = resContext.data?.data || [];
      const found = all.find(p => p.slug === slug || projectSlugify(p.title) === slug || p.id === slug);
      if (found) {
        setProject(found);
      } else {
        navigateToProjects();
      }
      setSettings(setRes.data?.data || {});
    } catch {
      navigateToProjects();
    }
    setLoading(false);
  }

  function projectSlugify(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  const allMedia = project ? [
    ...((project.thumbnail_url || (project as any).thumbnail || (project as any).image_url) ? [{ media_url: project.thumbnail_url || (project as any).thumbnail || (project as any).image_url, media_type: 'image' }] : []),
    ...(project.media || [])
  ].filter((v, i, a) => a.findIndex((t) => (t.media_url === v.media_url)) === i) : [];

  function nextImage() {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % allMedia.length);
    }
  }
  function prevImage() {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + allMedia.length) % allMedia.length);
    }
  }

  function navigateToProjects() {
    sessionStorage.setItem('pendingScroll', 'projects');
    router.push('/');
  }

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault();
    navigateToProjects();
  };

  if (!isLoaded || loading) {
    return <PremiumLoader />;
  }

  if (!project) return null;

  const thumbnail = allMedia[0]?.media_url;
  const galleryMedia = allMedia.slice(1);
  const techTags = project.tags ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen relative flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ─── Background ─── */}
      <div className="noise-bg fixed inset-0 z-0 pointer-events-none" />
      <div className="fixed top-0 left-[10%] w-[70vw] h-[50vh] bg-[var(--accent-primary)] blur-[300px] opacity-[0.04] pointer-events-none" />
      <div className="fixed bottom-0 right-[10%] w-[50vw] h-[40vh] bg-[var(--accent-secondary)] blur-[250px] opacity-[0.03] pointer-events-none" />

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl border-b bg-[var(--surface-glass)]" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="section-container flex items-center justify-between h-20">
          <button onClick={navigateToProjects} className="group flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none">
            <div className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white group-hover:border-[var(--accent-primary)] flex items-center justify-center transition-all duration-300">
              <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300" />
            </div>
            <span className="hidden sm:inline">{t('project.back_to_projects')}</span>
          </button>

          {/* Brand */}
          <a href="/" className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] hover:opacity-80 transition-opacity">
            Portofolio
            <span className="text-[var(--accent-primary)]">.</span>
          </a>
        </div>
      </nav>

      <main className="flex-1 relative z-10 pt-28 md:pt-32">
        {/* ═══════════════════════════════════════════
            HERO SECTION — 2 Column Layout
            ═══════════════════════════════════════════ */}
        <section className="section-container max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left Column: Project Info */}
            <div className="order-2 lg:order-1 space-y-8">
              {/* Category & Year Badges */}
              <motion.div variants={fadeInUp} initial="hidden" animate="visible" custom={0.1} className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-semibold">
                  <FiLayers className="w-3 h-3" />
                  {project.category || t('project.category')}
                </span>
                {project.year > 0 && (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-mono uppercase tracking-[0.2em] bg-[var(--bg-muted)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    <FiCalendar className="w-3 h-3" />
                    {project.year}
                  </span>
                )}
              </motion.div>

              {/* Title */}
              <motion.h1 variants={fadeInUp} initial="hidden" animate="visible" custom={0.2}
                className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-[var(--text-primary)] leading-[1.05]">
                {project.title}
              </motion.h1>

              {/* Short Description */}
              <motion.p variants={fadeInUp} initial="hidden" animate="visible" custom={0.35}
                className="text-base md:text-lg leading-relaxed text-[var(--text-secondary)] font-light max-w-xl">
                {project.description?.split('\n')[0]?.substring(0, 200) || project.description}
              </motion.p>

              {/* Tech Stack */}
              {techTags.length > 0 && (
                <motion.div variants={fadeInUp} initial="hidden" animate="visible" custom={0.45} className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)] flex items-center gap-2">
                    <FiTag className="w-3 h-3" /> {t('project.technologies')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {techTags.map((tag) => (
                      <span key={tag} className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all duration-300" style={{ borderColor: 'var(--border-color)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA Buttons */}
              <motion.div variants={fadeInUp} initial="hidden" animate="visible" custom={0.55} className="flex flex-wrap gap-4 pt-4">
                {project.demo_url && (
                  <a href={project.demo_url} target="_blank" rel="noopener noreferrer"
                    className="btn-primary h-12 min-w-[160px] group">
                    <FiExternalLink className="w-4 h-4 group-hover:-mt-0.5 group-hover:ml-0.5 transition-all" /> {t('project.live_demo')}
                  </a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    className="h-12 min-w-[160px] flex items-center justify-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] hover:border-[var(--text-primary)] text-[var(--text-primary)] font-medium transition-all duration-300 group px-6">
                    <FiGithub className="w-4 h-4" /> {t('project.source_code')}
                    <FiArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                  </a>
                )}
              </motion.div>
            </div>

            {/* Right Column: Hero Preview Image */}
            <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0.2}
              className="order-1 lg:order-2 relative">
              {thumbnail ? (
                <div className="relative group cursor-zoom-in" onClick={() => setLightboxIndex(0)}>
                  {/* Decorative glow behind the image */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-[var(--accent-primary)]/10 via-transparent to-[var(--accent-secondary)]/5 rounded-[36px] blur-2xl opacity-60 pointer-events-none" />

                  <div className="relative bg-[var(--bg-secondary)] rounded-[24px] border border-[var(--border-color)] overflow-hidden shadow-2xl group-hover:shadow-[0_24px_80px_rgba(0,0,0,0.25)] group-hover:border-[var(--accent-primary)]/30 transition-all duration-700">
                    {/* Top bar decoration */}
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/50">
                      <div className="w-3 h-3 rounded-full bg-red-400/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                      <div className="w-3 h-3 rounded-full bg-green-400/60" />
                      <span className="ml-3 text-[10px] font-mono text-[var(--text-tertiary)] tracking-wider truncate">{project.demo_url || project.title}</span>
                    </div>

                    {/* Image container */}
                    <div className="relative w-full aspect-[16/10] flex items-center justify-center bg-[var(--bg-primary)] p-4 md:p-6">
                      <img
                        src={thumbnail}
                        alt={project.title}
                        className="w-full h-full object-contain transition-transform duration-700 ease-[0.22,1,0.36,1] group-hover:scale-[1.03]"
                      />
                    </div>

                    {/* Zoom indicator */}
                    <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-20 shadow-xl">
                      <FiZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative bg-[var(--bg-secondary)] rounded-[24px] border border-[var(--border-color)] overflow-hidden h-[300px] md:h-[400px] flex items-center justify-center">
                  <div className="text-center text-[var(--text-tertiary)]">
                    <FiLayers className="w-12 h-12 mb-4 mx-auto opacity-30" />
                    <span className="text-xs font-mono tracking-widest uppercase">{t('common.no_data')}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            OVERVIEW + PROJECT INFO SECTION
            ═══════════════════════════════════════════ */}
        <section className="bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)] relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-transparent to-transparent h-24 pointer-events-none" />

          <div className="section-container max-w-7xl mx-auto px-6 py-16 md:py-24">
            <div className="grid lg:grid-cols-3 gap-12 lg:gap-16 items-start">

              {/* Left: Overview */}
              <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} custom={0}
                className="lg:col-span-2 space-y-8">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-[var(--text-primary)] flex items-center gap-4">
                  <span className="w-10 h-[3px] rounded-full bg-[var(--accent-primary)]" />
                  {t('project.overview')}
                </h2>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <p className="text-base md:text-lg leading-[1.8] text-[var(--text-secondary)] font-light whitespace-pre-wrap">
                    {project.description}
                  </p>
                </div>
              </motion.div>

              {/* Right: Info Sidebar Card */}
              <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} custom={0.2}
                className="lg:col-span-1 lg:sticky lg:top-28">
                <div className="premium-card overflow-visible">
                  {/* Accent top bar */}
                  <div className="h-1 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />

                  <div className="p-8 space-y-7">
                    <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-6">{t('project.project_info')}</h3>

                    {/* Info rows */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
                        <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{t('project.category')}</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{project.category || t('project.category')}</span>
                      </div>

                      {project.year > 0 && (
                        <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
                          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{t('project.year')}</span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">{project.year}</span>
                        </div>
                      )}

                      {project.created_at && (
                        <div className="flex justify-between items-center pb-4 border-b border-[var(--border-subtle)]">
                          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{t('project.date')}</span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {new Date(project.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}

                      {techTags.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">{t('project.technologies')}</span>
                          <div className="flex flex-wrap gap-2">
                            {techTags.map((tag) => (
                              <span key={tag} className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-color)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    {(project.demo_url || project.github_url) && (
                      <div className="pt-6 space-y-3 border-t border-[var(--border-subtle)]">
                        {project.demo_url && (
                          <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full h-11 justify-center text-sm group">
                            <FiExternalLink className="w-4 h-4" /> {t('project.live_demo')}
                          </a>
                        )}
                        {project.github_url && (
                          <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--text-primary)] text-[var(--text-primary)] text-sm font-medium transition-all duration-300">
                            <FiGithub className="w-4 h-4" /> {t('project.source_code')}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            GALLERY SECTION
            ═══════════════════════════════════════════ */}
        {galleryMedia.length > 0 && (
          <section className="section-container max-w-7xl mx-auto px-6 py-16 md:py-24">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-10%" }} custom={0}>
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-[var(--text-primary)] flex items-center gap-4 mb-12">
                <span className="w-10 h-[3px] rounded-full bg-[var(--accent-primary)]" />
                {t('project.gallery')}
                <span className="text-sm font-mono font-normal text-[var(--text-tertiary)] tracking-widest ml-2">({galleryMedia.length})</span>
              </h2>
            </motion.div>

            <div className="relative max-w-5xl mx-auto">
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-5%" }}
                className="group cursor-zoom-in"
                onClick={() => setLightboxIndex(galleryIndex + 1)}
              >
                <div className="relative bg-[var(--bg-secondary)] rounded-[24px] overflow-hidden border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 transition-all duration-500 shadow-xl hover:shadow-2xl">
                  {/* Browser-style top bar */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/40">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    <span className="ml-3 text-[10px] font-mono text-[var(--text-tertiary)] tracking-wider">Foto {project.title}-{galleryIndex + 1}</span>
                  </div>

                  {/* Image */}
                  <div className="relative w-full aspect-[16/10] md:aspect-[16/9] flex items-center justify-center bg-[var(--bg-primary)] p-4 md:p-8">
                    <img
                      key={galleryIndex}
                      src={galleryMedia[galleryIndex]?.media_url}
                      alt={`${project.title} screenshot ${galleryIndex + 1}`}
                      className="w-full h-full object-contain transition-transform duration-700 ease-[0.22,1,0.36,1] group-hover:scale-[1.02]"
                    />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex items-end justify-center pb-8">
                    <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium tracking-wider shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <FiZoomIn className="w-4 h-4" /> {t('project.view_full_size')}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Navigation Controls */}
              {galleryMedia.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => (prev - 1 + galleryMedia.length) % galleryMedia.length); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-secondary)] hover:scale-110 hover:border-[var(--accent-primary)] transition-all z-10 shadow-lg"
                    aria-label="Previous image"
                  >
                    <FiChevronLeft className="w-6 h-6 -ml-0.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex((prev) => (prev + 1) % galleryMedia.length); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--bg-secondary)] hover:scale-110 hover:border-[var(--accent-primary)] transition-all z-10 shadow-lg"
                    aria-label="Next image"
                  >
                    <FiChevronRight className="w-6 h-6 -mr-0.5" />
                  </button>

                  {/* Indicators */}
                  <div className="flex justify-between items-center mt-6 px-2 text-sm font-mono text-[var(--text-tertiary)]">
                    <div className="flex items-center gap-2">
                      {galleryMedia.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setGalleryIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === galleryIndex ? 'w-6 bg-[var(--accent-primary)]' : 'bg-[var(--border-color)] hover:bg-[var(--text-tertiary)]'}`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <span>{galleryIndex + 1} / {galleryMedia.length}</span>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ─── Back to Projects CTA ─── */}
        <section className="section-container max-w-7xl mx-auto px-6 pb-24">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0}
            className="flex justify-center">
            <button onClick={navigateToProjects}
              className="group flex items-center gap-3 px-8 py-4 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] font-medium transition-all duration-300 cursor-pointer">
              <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {t('project.back_to_all')}
            </button>
          </motion.div>
        </section>
      </main>

      {/* ─── LIGHTBOX ─── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
              className="absolute top-6 right-6 md:top-8 md:right-8 w-12 h-12 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all z-10"
            >
              <FiX className="w-5 h-5" />
            </button>

            {/* Nav arrows */}
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all z-10"
                >
                  <FiChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all z-10"
                >
                  <FiChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Counter */}
            {allMedia.length > 1 && (
              <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-mono tracking-widest shadow-xl">
                {lightboxIndex + 1} / {allMedia.length}
              </div>
            )}

            {/* Image with Zoom & Pan */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: premiumEase }}
              className="w-full h-full flex items-center justify-center p-6 md:p-16 lg:p-24"
              onClick={(e) => e.stopPropagation()}
            >
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={6}
                centerOnInit
                wheel={{ step: 0.04 }}
                doubleClick={{ mode: "reset" }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    {/* Manual Zoom Controls Overlay */}
                    <div className="absolute bottom-6 md:bottom-10 right-6 md:right-10 flex items-center gap-1 z-[250] bg-black/60 backdrop-blur-xl p-1.5 rounded-full border border-white/10">
                      <button onClick={(e) => { e.stopPropagation(); zoomOut(0.5); }} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-all text-xl font-light">
                        -
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); resetTransform(); }} className="px-4 text-[10px] font-mono tracking-widest text-[var(--text-tertiary)] hover:text-white transition-colors uppercase">
                        Reset
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); zoomIn(0.5); }} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-all text-xl font-light">
                        +
                      </button>
                    </div>

                    <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img
                        src={allMedia[lightboxIndex]?.media_url}
                        alt={`Gallery ${lightboxIndex + 1}`}
                        className="max-w-full max-h-full object-contain rounded-[16px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] select-none border border-white/10 cursor-grab active:cursor-grabbing"
                        draggable={false}
                      />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer settings={settings} />
    </div>
  );
}
