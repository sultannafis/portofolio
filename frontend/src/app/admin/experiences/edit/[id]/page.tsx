'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { experiencesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useUIStore } from '@/store';
import { FiX, FiImage, FiArrowLeft } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

export default function EditExperiencePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setPageTitle } = useUIStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  
  const [form, setForm] = useState({
    company: '', position: '', description: '', start_date: '', end_date: '', is_current: false, is_published: true
  });

  const fetchExperience = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await experiencesAPI.getById(id);
      const exp = res.data?.data;
      setPageTitle(`Edit: ${exp.company} - ${exp.position}`);
      setLogoPreview(exp.company_logo_url || exp.company_logo || '');
      setForm({ 
        company: exp.company || exp.company_name || '', 
        position: exp.position || exp.role || '', 
        description: exp.description || '', 
        start_date: exp.start_date?.slice(0, 10) || '', 
        end_date: exp.end_date?.slice(0, 10) || '', 
        is_current: exp.is_current,
        is_published: exp.is_published ?? true
      });
    } catch {
      toast.error('Failed to load experience details');
      router.push('/admin/experiences');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchExperience();
  }, [fetchExperience]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      if (logoFile) formData.append('logo', logoFile);
      
      await experiencesAPI.update(id, formData);
      toast.success(t('admin.toast.updated'));
      router.push('/admin/experiences');
    } catch { 
      toast.error('Failed to update experience'); 
    }
    setSaving(false);
  }

  const dropzone = useDropzone({
    accept: { 'image/*': [] }, maxFiles: 1,
    onDrop: (files) => { 
      if (files[0]) { 
        setLogoFile(files[0]); 
        setLogoPreview(URL.createObjectURL(files[0])); 
      } 
    },
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-12">
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="space-y-2 flex-1"><div className="skeleton h-6 w-56" /><div className="skeleton h-4 w-36" /></div>
        </div>
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div className="skeleton h-32 w-32 mx-auto rounded-lg" />
          {[...Array(3)].map((_, i) => <div key={i} className="space-y-2"><div className="skeleton h-4 w-24" /><div className="skeleton h-12 w-full" /></div>)}
          <div className="skeleton h-12 w-44" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/experiences" className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors">
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Experience: {form.company ? `${form.company} - ${form.position}` : 'Loading...'}</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">Update your work experience details</p>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Company Logo</label>
            <div {...dropzone.getRootProps()} className="border-2 border-dashed dark:border-white/10 border-gray-300 rounded-xl p-4 text-center cursor-pointer dark:hover:border-purple-500/50 hover:border-purple-400 transition-colors">
              <input {...dropzone.getInputProps()} />
              {logoPreview ? (
                <div className="relative w-32 h-32 mx-auto">
                  <img src={logoPreview} alt="" className="w-full h-full object-contain bg-gray-100 dark:bg-black/20 rounded-lg" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(''); }} className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow">
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="py-6">
                  <FiImage className="w-8 h-8 mx-auto dark:text-gray-500 text-gray-400 mb-2" />
                  <p className="text-sm dark:text-gray-400 text-gray-500">Upload company logo</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Company Name *</label>
              <input type="text" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role *</label>
              <input type="text" value={form.position} onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t('admin.form.description')}</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="input-field resize-y min-h-[100px]" rows={4} />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date *</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('admin.form.end_date')}</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} className="input-field" disabled={form.is_current} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)] flex-1">
              <input type="checkbox" id="is_current" checked={form.is_current} onChange={(e) => setForm(f => ({ ...f, is_current: e.target.checked, end_date: e.target.checked ? '' : f.end_date }))} className="w-5 h-5 rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
              <label htmlFor="is_current" className="text-sm font-medium cursor-pointer">I currently work here</label>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)] flex-1">
              <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-5 h-5 rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
              <label htmlFor="is_published" className="text-sm font-medium cursor-pointer">Publish on Portfolio</label>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-[var(--border-color)]">
            <Link href="/admin/experiences" className="btn-secondary px-6">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Updating...' : 'Update Experience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
