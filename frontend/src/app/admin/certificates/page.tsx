'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { certificatesAPI } from '@/lib/api';
import { Certificate } from '@/types';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiAward, FiImage, FiExternalLink } from 'react-icons/fi';
import Link from 'next/link';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import Pagination from '@/components/ui/Pagination';

export default function CertificatesPage() {
  const { t } = useTranslation();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await certificatesAPI.getAll({ search });
      setCerts(res.data?.data || []);
    } catch { toast.error('Failed to fetch'); }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    const handler = () => fetchCerts();
    window.addEventListener('admin:refresh', handler);
    return () => window.removeEventListener('admin:refresh', handler);
  }, [fetchCerts]);

  const sortedCerts = [...certs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalPages = Math.ceil(sortedCerts.length / perPage);
  const paginatedCerts = sortedCerts.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > 1 && paginatedCerts.length === 0 && certs.length > 0) {
      setPage(page - 1);
    }
  }, [page, paginatedCerts.length, certs.length]);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try { await certificatesAPI.delete(id); toast.success('Deleted!'); setDeleteConfirm(null); fetchCerts(); }
    catch { toast.error('Failed to delete'); }
    setIsDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.certificates')}</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">{t('admin.manage_certificates')}</p>
        </div>
        <Link href="/admin/certificates/create" className="btn-primary flex items-center gap-2"><FiPlus className="w-4 h-4" />{t('common.create')}</Link>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400 text-gray-500 w-4 h-4" />
        <input type="text" placeholder={t('common.search')} value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card p-4 space-y-3"><div className="skeleton h-32 w-full" /><div className="skeleton h-5 w-3/4" /><div className="skeleton h-4 w-1/2" /></div>)}
        </div>
      ) : certs.length === 0 ? (
        <div className="glass-card p-12 text-center"><FiAward className="w-12 h-12 mx-auto dark:text-gray-600 text-gray-300 mb-4" /><p className="dark:text-gray-400 text-gray-500">{t('common.no_data')}</p></div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCerts.map((cert) => (
            <motion.div key={cert.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden card-hover group">
              {cert.image_url ? (
                <img src={cert.image_url} alt={cert.title} className="w-full h-36 object-contain bg-gray-100 dark:bg-black/20" />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center"><FiAward className="w-10 h-10 dark:text-gray-600 text-gray-300" /></div>
              )}
              <div className="p-4">
                <h3 className="font-bold mb-1 truncate">{cert.title}</h3>
                <p className="text-sm dark:text-gray-400 text-gray-500 mb-1">{cert.issuer}</p>
                {cert.issue_date && <p className="text-xs dark:text-gray-500 text-gray-400 mb-3">{new Date(cert.issue_date).toLocaleDateString()}</p>}
                {cert.credential_url && (
                  <a href={cert.credential_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 flex items-center gap-1 mb-3"><FiExternalLink className="w-3 h-3" /> View Credential</a>
                )}
                <div className="flex gap-2">
                  <Link href={`/admin/certificates/edit/${cert.id}`} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--bg-muted)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-colors flex items-center justify-center gap-1"><FiEdit2 className="w-3.5 h-3.5" /> Edit</Link>
                  <button onClick={() => setDeleteConfirm(cert.id)} className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"><FiTrash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </motion.div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title={t('admin.delete_certificate')}
        description={t('admin.delete_warning')}
        isDeleting={isDeleting}
      />

    </div>
  );
}

