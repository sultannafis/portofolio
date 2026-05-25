import { useTranslation } from '@/hooks/useTranslation';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2 } from 'react-icons/fi';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item?",
  description = "This action cannot be undone.",
  isDeleting = false
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={(!isDeleting) ? onClose : undefined}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="premium-card p-6 md:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden bg-[var(--surface-glass)]">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] pointer-events-none" />

            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 relative">
              <FiTrash2 className="w-7 h-7 text-red-500 relative z-10" />
            </div>
            
            <h3 className="font-display text-xl font-semibold mb-3 text-[var(--text-primary)]">
              {title}
            </h3>
            
            <p className="text-[var(--text-secondary)] text-sm mb-8 font-light leading-relaxed">
              {description}
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={onClose} 
                disabled={isDeleting}
                className="btn-secondary w-full disabled:opacity-50">
                {t('common.cancel')}
              </button>
              <button 
                onClick={onConfirm} 
                disabled={isDeleting}
                className="btn-primary w-full !bg-red-500 hover:!bg-red-600 disabled:!bg-red-500/50 !shadow-none border-none relative inline-flex items-center justify-center !text-white transition-colors">
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>{t('common.delete')}</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

