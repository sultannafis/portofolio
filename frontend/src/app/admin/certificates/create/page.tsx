'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { certificatesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiX, FiImage, FiArrowLeft } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

export default function CreateCertificatePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({ title: '', issuer: '', issue_date: '', expiry_date: '', credential_url: '', is_published: true });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      if (imageFile) formData.append('image', imageFile);
      
      await certificatesAPI.create(formData);
      toast.success(t('admin.toast.created'));
      router.push('/admin/certificates');
    } catch { 
      toast.error('Failed to create certificate'); 
    }
    setSaving(false);
  }

  const dropzone = useDropzone({
    accept: { 'image/*': [] }, maxFiles: 1,
    onDrop: (files) => { 
      if (files[0]) { 
        setImageFile(files[0]); 
        setImagePreview(URL.createObjectURL(files[0])); 
      } 
    },
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/certificates" className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors">
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Certificate</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">Add a new certificate to your profile</p>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Certificate Image</label>
            <div {...dropzone.getRootProps()} className="border-2 border-dashed dark:border-white/10 border-gray-300 rounded-xl p-4 text-center cursor-pointer dark:hover:border-purple-500/50 hover:border-purple-400 transition-colors">
              <input {...dropzone.getInputProps()} />
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="" className="w-full h-48 object-contain bg-gray-100 dark:bg-black/20 rounded-lg" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(''); }} className="absolute top-2 right-2 p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  <FiImage className="w-10 h-10 mx-auto dark:text-gray-500 text-gray-400 mb-3" />
                  <p className="text-sm dark:text-gray-400 text-gray-500">Drag & drop or click to upload</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('admin.form.issuer')}</label>
            <input type="text" value={form.issuer} onChange={(e) => setForm(f => ({ ...f, issuer: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('admin.form.issue_date')}</label>
              <input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('admin.form.expiry_date')}</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('admin.form.credential_url')}</label>
            <input type="url" value={form.credential_url} onChange={(e) => setForm(f => ({ ...f, credential_url: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
            <input type="checkbox" id="cert_pub" checked={form.is_published} onChange={(e) => setForm(f => ({ ...f, is_published: e.target.checked }))} className="w-5 h-5 rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
            <label htmlFor="cert_pub" className="text-sm font-medium cursor-pointer">Published</label>
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-color)]">
            <Link href="/admin/certificates" className="btn-secondary px-6">{t('common.cancel')}</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Creating...' : 'Create Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

