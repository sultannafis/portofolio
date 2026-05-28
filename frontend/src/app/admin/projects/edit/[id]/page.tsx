'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { projectsAPI } from '@/lib/api';
import { Project } from '@/types';
import toast from 'react-hot-toast';
import { useUIStore } from '@/store';
import { FiX, FiImage, FiArrowLeft } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

export default function EditProjectPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setPageTitle } = useUIStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '', description: '', category: '', tags: '', year: new Date().getFullYear(),
    github_url: '', demo_url: '', video_url: '', documentation_url: '', is_published: false,
  });

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await projectsAPI.getById(id);
      const p = res.data?.data;
      setProject(p);
      setPageTitle(p.title || 'Edit Project');
      setForm({
        title: p.title || '', description: p.description || '', category: p.category || '',
        tags: p.tags || '', year: p.year || new Date().getFullYear(), github_url: p.github_url || '',
        demo_url: p.demo_url || '', video_url: p.video_url || '', documentation_url: p.documentation_url || '',
        is_published: p.is_published,
      });
      setThumbnailPreview(p.thumbnail_url || '');
    } catch {
      toast.error('Failed to load project details');
      router.push('/admin/projects');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

      await projectsAPI.update(id, formData);
      
      if (mediaFiles.length > 0) {
        const mediaFormData = new FormData();
        mediaFiles.forEach(f => mediaFormData.append('files', f));
        mediaFormData.append('media_type', 'image');
        await projectsAPI.addMedia(id, mediaFormData);
      }
      toast.success('Project updated successfully!');
      router.push('/admin/projects');
    } catch {
      toast.error(t('admin.toast.failed'));
    }
    setSaving(false);
  }

  async function handleDeleteMedia(mediaId: string) {
    try {
      await projectsAPI.deleteMedia(id, mediaId);
      toast.success('Media deleted!');
      if (project) {
        setProject({ ...project, media: project.media.filter(m => m.id !== mediaId) });
      }
    } catch { toast.error('Failed to delete media'); }
  }

  const thumbDropzone = useDropzone({
    accept: { 'image/*': [] }, maxFiles: 1,
    onDrop: (files) => {
      if (files[0]) {
        setThumbnailFile(files[0]);
        setThumbnailPreview(URL.createObjectURL(files[0]));
      }
    },
  });

  const mediaDropzone = useDropzone({
    accept: { 'image/*': [], 'video/*': [] }, multiple: true,
    onDrop: (files) => {
      setMediaFiles(prev => [...prev, ...files]);
      setMediaPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/projects" className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors">
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Project: {project?.title || 'Loading...'}</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">Update your portfolio project details</p>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thumbnail Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Thumbnail</label>
            <div {...thumbDropzone.getRootProps()}
              className="border-2 border-dashed dark:border-white/10 border-gray-300 rounded-xl p-4 text-center cursor-pointer dark:hover:border-purple-500/50 hover:border-purple-400 transition-colors">
              <input {...thumbDropzone.getInputProps()} />
              {thumbnailPreview ? (
                <div className="relative">
                  <img src={thumbnailPreview} alt="Thumb" className="w-full h-64 object-cover rounded-lg" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setThumbnailFile(null); setThumbnailPreview(''); }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-12">
                  <FiImage className="w-12 h-12 mx-auto dark:text-gray-500 text-gray-400 mb-3" />
                  <p className="text-sm dark:text-gray-400 text-gray-500">Drag & drop or click to upload thumbnail</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('admin.form.category')}</label>
              <input type="text" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="input-field" placeholder="Web App, Mobile, etc." />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t('admin.form.description')}</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="input-field resize-y" rows={5} />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Tags (comma separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                className="input-field" placeholder="React, Go, PostgreSQL" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('admin.form.year')}</label>
              <input type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                className="input-field" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">GitHub URL</label>
              <input type="url" value={form.github_url} onChange={(e) => setForm(f => ({ ...f, github_url: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('admin.form.demo_url')}</label>
              <input type="url" value={form.demo_url} onChange={(e) => setForm(f => ({ ...f, demo_url: e.target.value }))}
                className="input-field" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Video URL</label>
              <input type="url" value={form.video_url} onChange={(e) => setForm(f => ({ ...f, video_url: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Documentation URL</label>
              <input type="url" value={form.documentation_url} onChange={(e) => setForm(f => ({ ...f, documentation_url: e.target.value }))}
                className="input-field" />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
            <input type="checkbox" id="is_published" checked={form.is_published}
              onChange={(e) => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
            <label htmlFor="is_published" className="text-sm font-medium cursor-pointer">Publish this project</label>
          </div>

          {/* Gallery Media Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Gallery Media</label>
            {/* Existing media */}
            {project?.media && project.media.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {project.media.map((m) => (
                  <div key={m.id} className="relative group aspect-video">
                    <img src={m.media_url} alt="" className="w-full h-full object-cover rounded-lg border border-[var(--border-color)]" />
                    <button type="button" onClick={() => handleDeleteMedia(m.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white shadow opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div {...mediaDropzone.getRootProps()}
              className="border-2 border-dashed dark:border-white/10 border-gray-300 rounded-xl p-8 text-center cursor-pointer dark:hover:border-purple-500/50 hover:border-purple-400 transition-colors">
              <input {...mediaDropzone.getInputProps()} />
              <FiImage className="w-8 h-8 mx-auto dark:text-gray-500 text-gray-400 mb-2" />
              <p className="text-sm dark:text-gray-400 text-gray-500">Drag & drop new images/videos for gallery</p>
            </div>
            {mediaPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {mediaPreviews.map((p, i) => (
                  <div key={i} className="relative group aspect-video">
                    <img src={p} alt="" className="w-full h-full object-cover rounded-lg border border-purple-500" />
                    <button type="button" onClick={() => {
                      setMediaFiles(prev => prev.filter((_, idx) => idx !== i));
                      setMediaPreviews(prev => prev.filter((_, idx) => idx !== i));
                    }} className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiX className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-6 border-t border-[var(--border-color)]">
            <Link href="/admin/projects" className="btn-secondary px-6">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Updating Project...' : 'Update Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
