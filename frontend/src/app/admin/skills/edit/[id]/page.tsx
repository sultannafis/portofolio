'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { skillsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useUIStore } from '@/store';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function EditSkillPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setPageTitle } = useUIStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '', proficiency: 80, sort_order: 0, is_published: true });

  const fetchSkill = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await skillsAPI.getById(id);
      const s = res.data?.data;
      setPageTitle(`Edit: ${s.name}`);
      setForm({ 
        name: s.name || '', 
        icon: s.icon || '', 
        proficiency: s.proficiency || 80, 
        sort_order: s.sort_order || 0, 
        is_published: s.is_published 
      });
    } catch {
      toast.error('Failed to load skill details');
      router.push('/admin/skills');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await skillsAPI.update(id, form);
      toast.success(t('admin.toast.updated'));
      router.push('/admin/skills');
    } catch { 
      toast.error('Failed to update skill'); 
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/skills" className="p-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors">
          <FiArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Skill: {form.name || 'Loading...'}</h1>
          <p className="dark:text-gray-400 text-gray-500 text-sm">Update skill information</p>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-1 block">Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Icon Key</label>
            <input type="text" value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))}
              className="input-field" placeholder="react, go, etc." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block flex justify-between">
              <span>Proficiency</span>
              <span className="text-[var(--accent-primary)] font-bold">{form.proficiency}%</span>
            </label>
            <input type="range" min={0} max={100} value={form.proficiency}
              onChange={(e) => setForm(f => ({ ...f, proficiency: parseInt(e.target.value) }))}
              className="w-full accent-[var(--accent-primary)]" />
          </div>
          <div className="flex items-center gap-3 p-4 bg-[var(--bg-muted)] rounded-xl border border-[var(--border-color)]">
            <input type="checkbox" id="skill_published" checked={form.is_published}
              onChange={(e) => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]" />
            <label htmlFor="skill_published" className="text-sm font-medium cursor-pointer">Published</label>
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-color)]">
            <Link href="/admin/skills" className="btn-secondary px-6">Cancel</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Updating...' : 'Update Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
