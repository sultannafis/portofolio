'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

export default function PremiumLoader() {
  const { t } = useTranslation();

  return (
    <div suppressHydrationWarning className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[var(--bg-primary)] overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[30%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[var(--accent-primary)] blur-[120px] opacity-[0.1]" />
      <div className="absolute bottom-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-[var(--accent-secondary)] blur-[120px] opacity-[0.1]" />

      {/* Central Content */}
      <div className="relative flex flex-col items-center z-10">

        {/* Animated Skyra Logo */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-24 h-24 mb-6"
        >
          <img
            src="/images/skyra-l1.png"
            alt="Skyra AI Loading"
            className="w-full h-full object-contain filter drop-shadow-[0_0_15px_var(--accent-primary)]"
          />
          {/* Circular progress track */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="48"
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="2"
            />
            <motion.circle
              cx="50" cy="50" r="48"
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 300" }}
              animate={{ strokeDasharray: ["0 300", "150 150", "300 0"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>

        {/* Shimmer Text */}
        <div className="relative overflow-hidden w-full text-center">
          <p className="text-sm font-mono uppercase tracking-[0.3em] font-semibold text-[var(--text-tertiary)] bg-clip-text">
            {t('common.preparing_data')}
            <motion.span
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent w-full h-full"
            />
          </p>
        </div>

      </div>
    </div>
  );
}
