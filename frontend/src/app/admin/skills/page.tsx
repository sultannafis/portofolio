'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { skillsAPI } from '@/lib/api';
import { Skill } from '@/types';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiZap } from 'react-icons/fi';
import Link from 'next/link';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import Pagination from '@/components/ui/Pagination';

export default function SkillsPage() {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await skillsAPI.getAll({ search });
      setSkills(res.data?.data || []);
    } catch { toast.error(t('admin.toast.fetch_failed')); }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => {
    const handler = () => fetchSkills();
    window.addEventListener('admin:refresh', handler);
    return () => window.removeEventListener('admin:refresh', handler);
  }, [fetchSkills]);

  const sortedSkills = [...skills].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalPages = Math.ceil(sortedSkills.length / perPage);
  const paginatedSkills = sortedSkills.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > 1 && paginatedSkills.length === 0 && skills.length > 0) {
      setPage(page - 1);
    }
  }, [page, paginatedSkills.length, skills.length]);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await skillsAPI.delete(id);
      toast.success(t('admin.toast.deleted'));
      setDeleteConfirm(null);
      fetchSkills();
    } catch { toast.error('Failed to delete skill'); }
    setIsDeleting(false);
  }

  const categories: string[] = [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.skills')}</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">Manage your skills and technologies</p>
        </div>
        <Link href="/admin/skills/create" className="btn-primary flex items-center gap-2" id="btn-create-skill">
          <FiPlus className="w-4 h-4" />{t('common.create')}</Link>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-gray-400 text-gray-500 w-4 h-4" />
        <input type="text" placeholder={t('common.search')} value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" id="search-skills" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="skeleton h-10 w-10 rounded-lg mx-auto" />
              <div className="skeleton h-4 w-2/3 mx-auto" />
              <div className="skeleton h-2 w-full" />
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FiZap className="w-12 h-12 mx-auto dark:text-gray-600 text-gray-300 mb-4" />
          <p className="dark:text-gray-400 text-gray-500">{t('common.no_data')}</p>
        </div>
      ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {paginatedSkills.map(skill => (
              <motion.div key={skill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card p-5 text-center card-hover group relative">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/admin/skills/edit/${skill.id}`} className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--bg-muted)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-colors">
                    <FiEdit2 className="w-3 h-3" />
                  </Link>
                  <button onClick={() => setDeleteConfirm(skill.id)} className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-2xl font-bold gradient-text mb-2">{skill.icon || skill.name.charAt(0)}</div>
                <h4 className="font-semibold text-sm mb-2">{skill.name}</h4>
                <div className="w-full dark:bg-white/10 bg-gray-200 rounded-full h-1.5 mb-1">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-sky-400"
                    style={{ width: `${skill.proficiency}%` }} />
                </div>
                <span className="text-xs dark:text-gray-400 text-gray-500">{skill.proficiency}%</span>
                {!skill.is_published && (
                  <span className="block text-xs text-yellow-500 mt-1">Draft</span>
                )}
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
        title={t('admin.delete_skill')}
        description={t('admin.delete_warning')}
        isDeleting={isDeleting}
      />

    </div>
  );
}

