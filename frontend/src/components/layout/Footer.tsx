import { useTranslation } from '@/hooks/useTranslation';
import React from 'react';
import { FiGithub, FiLinkedin, FiTwitter, FiInstagram, FiMail, FiHeart } from 'react-icons/fi';

interface FooterProps {
  settings: Record<string, string>;
}

const socialIcons: { key: string; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { key: 'github_url', Icon: FiGithub, label: 'GitHub' },
  { key: 'linkedin_url', Icon: FiLinkedin, label: 'LinkedIn' },
  { key: 'twitter_url', Icon: FiTwitter, label: 'Twitter' },
  { key: 'instagram_url', Icon: FiInstagram, label: 'Instagram' },
];

export default function Footer({ settings }: FooterProps) {
  const { t } = useTranslation();
  const availableSocials = socialIcons.filter(s => settings[s.key]?.trim());

  return (
    <footer className="relative overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50vw] h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-40" />

      <div className="section-container py-12 md:py-16">
        {/* Main footer grid */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left - Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-display text-lg font-semibold text-[var(--text-primary)] tracking-tight">
              Portofolio
              <span className="text-[var(--accent-primary)]">.</span>
            </span>
            {settings.title && (
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)]">
                {settings.title}
              </span>
            )}
          </div>

          {/* Center - Social Links */}
          <div className="flex items-center gap-3">
            {availableSocials.map(({ key, Icon, label }) => (
              <a
                key={key}
                href={settings[key]}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>

          {/* Right - Copyright */}
          <div className="text-xs text-[var(--text-tertiary)] font-light text-center md:text-right flex items-center flex-wrap justify-center md:justify-end gap-1.5">
            {settings.footer_text ? (
              <span>{settings.footer_text}</span>
            ) : (
              <>
                © {new Date().getFullYear()} 
                <span className="font-medium text-[var(--text-secondary)]">{settings.full_name || 'Portfolio'}</span>
                <span className="hidden sm:inline">—</span>
                <span className="hidden sm:inline">{t('footer.made_with')}</span>
                <FiHeart className="w-3 h-3 text-[var(--accent-primary)] hidden sm:inline" />
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

