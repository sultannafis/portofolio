'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectsAPI } from '@/lib/api';
import { Project } from '@/types';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiImage, FiExternalLink, FiGithub, FiFolder } from 'react-icons/fi';
import Link from 'next/link';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import Pagination from '@/components/ui/Pagination';

export default function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsAPI.getAll({ per_page: '1000', search });
      setProjects(res.data?.data || []);
    } catch { toast.error(t('admin.toast.fetch_failed')); }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    const handler = () => fetchProjects();
    window.addEventListener('admin:refresh', handler);
    return () => window.removeEventListener('admin:refresh', handler);
  }, [fetchProjects]);

  const sortedProjects = [...projects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const totalPages = Math.ceil(sortedProjects.length / perPage);
  const paginatedProjects = sortedProjects.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    if (page > 1 && paginatedProjects.length === 0 && projects.length > 0) {
      setPage(page - 1);
    }
  }, [page, paginatedProjects.length, projects.length]);

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try {
      await projectsAPI.delete(id);
      toast.success(t('admin.toast.deleted'));
      setDeleteConfirm(null);
      fetchProjects();
    } catch { toast.error(t('admin.toast.failed')); }
    setIsDeleting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.projects')}</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">{t('admin.manage_projects')}</p>
        </div>
        <Link href="/admin/projects/create" className="btn-primary flex items-center gap-2" id="btn-create-project">
          <FiPlus className="w-4 h-4" />{t('common.create')}</Link>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] w-4 h-4" />
        <input type="text" placeholder={t('common.search')} value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-10" id="search-projects" />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="premium-card p-4 space-y-3">
              <div className="skeleton h-40 w-full" />
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="premium-card p-12 text-center border-dashed">
          <FiFolder className="w-12 h-12 mx-auto text-[var(--text-tertiary)] mb-4" />
          <p className="text-[var(--text-secondary)] font-medium">{t('common.no_data')}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProjects.map((project) => (
            <motion.div key={project.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="premium-card overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="relative h-48 overflow-hidden rounded-t-[19px]">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-[var(--accent-glow)] flex items-center justify-center">
                      <FiImage className="w-8 h-8 text-[var(--accent-primary)] opacity-50" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium shadow-lg backdrop-blur-md ${project.is_published ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                      {project.is_published ? t('admin.status.published') : t('admin.status.unpublished')}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display font-medium text-xl mb-1 truncate group-hover:text-[var(--accent-primary)] transition-colors">{project.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 font-light">{project.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)] font-mono mb-6">
                    <span className="px-2 py-1 rounded bg-[var(--bg-muted)] border border-[var(--border-subtle)]">{project.category || 'Uncategorized'}</span>
                    {project.year > 0 && <span className="px-2 py-1 rounded border border-[var(--border-subtle)]">{project.year}</span>}
                    {project.media?.length > 0 && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--border-subtle)]"><FiImage className="w-3 h-3" />{project.media.length}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 mt-auto">
                <div className="flex gap-3">
                  <Link href={`/admin/projects/edit/${project.id}`} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--bg-muted)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] transition-colors flex items-center justify-center gap-2">
                    <FiEdit2 className="w-4 h-4" /> Edit
                  </Link>
                  <button onClick={() => setDeleteConfirm(project.id)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <DeleteConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title={t('admin.delete_project')}
        description={t('admin.delete_warning')}
        isDeleting={isDeleting}
      />

    </div>
  );
}

