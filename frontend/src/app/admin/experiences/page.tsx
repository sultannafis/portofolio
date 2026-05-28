'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { experiencesAPI } from '@/lib/api';
import { Experience } from '@/types';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiBriefcase, FiEye } from 'react-icons/fi';
import Link from 'next/link';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import Pagination from '@/components/ui/Pagination';

export default function ExperiencesPage() {
  const { t } = useTranslation();
  const [exps, setExps] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [detailExp, setDetailExp] = useState<Experience | null>(null);
  const perPage = 10;

  const fetchExps = useCallback(async () => {
    setLoading(true);
    try { const res = await experiencesAPI.getAll({ search }); setExps(res.data?.data || []); }
    catch { toast.error('Failed to fetch'); }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchExps(); }, [fetchExps]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { const h = () => fetchExps(); window.addEventListener('admin:refresh', h); return () => window.removeEventListener('admin:refresh', h); }, [fetchExps]);

  const sortedExps = [...exps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalPages = Math.ceil(sortedExps.length / perPage);
  const paginatedExps = sortedExps.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > 1 && paginatedExps.length === 0 && exps.length > 0) {
      setPage(page - 1);
    }
  }, [page, paginatedExps.length, exps.length]);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try { await experiencesAPI.delete(id); toast.success('Deleted!'); setDeleteConfirm(null); fetchExps(); }
    catch { toast.error('Failed to delete'); }
    setIsDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{t('admin.experiences')}</h1><p className="dark:text-gray-400 text-gray-500 text-sm">Manage your work experience</p></div>
        <Link href="/admin/experiences/create" className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" />{t('common.create')}</Link>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400 text-gray-500 w-4 h-4" />
        <input type="text" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="glass-card p-6"><div className="skeleton h-5 w-1/3 mb-2" /><div className="skeleton h-4 w-1/4 mb-3" /><div className="skeleton h-3 w-full" /></div>)}</div>
      ) : exps.length === 0 ? (
        <div className="glass-card p-12 text-center"><FiBriefcase className="w-12 h-12 mx-auto dark:text-gray-600 text-gray-300 mb-4" /><p className="dark:text-gray-400 text-gray-500">{t('common.no_data')}</p></div>
      ) : (
        <div className="space-y-4">
          {paginatedExps.map((exp) => (
            <motion.div key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 card-hover group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg">{exp.position}</h3>
                    {exp.is_current && <span className="px-2 py-0.5 text-xs rounded-full bg-sky-500/20 text-sky-400 font-medium">Current</span>}
                    {!exp.is_published && <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 font-medium">Draft</span>}
                  </div>
                  <p className="dark:text-purple-400 text-purple-600 font-medium">{exp.company}</p>
                  <p className="text-sm dark:text-gray-500 text-gray-400 mt-1">
                    {exp.start_date ? new Date(exp.start_date).toLocaleDateString('en', { year: 'numeric', month: 'short' }) : ''} - {exp.is_current ? 'Present' : exp.end_date ? new Date(exp.end_date).toLocaleDateString('en', { year: 'numeric', month: 'short' }) : ''}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setDetailExp(exp)} className="flex items-center justify-center p-2 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-card-hover)] text-sky-500 border border-[var(--border-color)] transition-colors"><FiEye className="w-4 h-4" /></button>
                  <Link href={`/admin/experiences/edit/${exp.id}`} className="flex items-center justify-center p-2 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-colors"><FiEdit2 className="w-4 h-4" /></Link>
                  <button onClick={() => setDeleteConfirm(exp.id)} className="p-2 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title={t('admin.delete_experience')}
        description={t('admin.delete_warning')}
        isDeleting={isDeleting}
      />

      <AnimatePresence>
        {detailExp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailExp(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-[var(--border-color)] flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {detailExp.company_logo_url ? (
                    <img src={detailExp.company_logo_url} alt="" className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[var(--bg-muted)] flex flex-col items-center justify-center"><FiBriefcase className="w-6 h-6 dark:text-gray-500 text-gray-400" /></div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{detailExp.position}</h2>
                    <p className="dark:text-purple-400 text-purple-600 font-medium">{detailExp.company}</p>
                  </div>
                </div>
                <button onClick={() => setDetailExp(null)} className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"><FiX className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm dark:text-gray-500 text-gray-400 mb-1">Duration</p>
                    <p className="font-medium">{detailExp.start_date ? new Date(detailExp.start_date).toLocaleDateString() : ''} - {detailExp.is_current ? 'Present' : detailExp.end_date ? new Date(detailExp.end_date).toLocaleDateString() : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm dark:text-gray-500 text-gray-400 mb-1">Status</p>
                    <div className="flex items-center gap-2">
                       {detailExp.is_published ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 font-medium border border-green-500/20">Published</span> : <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 font-medium border border-yellow-500/20">Draft</span>}
                       {detailExp.is_current && <span className="px-2 py-0.5 text-xs rounded-full bg-sky-500/20 text-sky-400 font-medium border border-sky-500/20">Current Role</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm dark:text-gray-500 text-gray-400 mb-1">Created At</p>
                    <p className="text-sm">{new Date(detailExp.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm dark:text-gray-500 text-gray-400 mb-2">Description</p>
                  <p className="dark:text-gray-300 text-gray-700 whitespace-pre-wrap">{detailExp.description || 'No description provided.'}</p>
                </div>
             </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

