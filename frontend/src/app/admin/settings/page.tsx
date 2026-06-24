'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState } from 'react';
import { settingsAPI, authAPI, securityAPI } from '@/lib/api';
import { useThemeStore, useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import { FiSave, FiSettings, FiSun, FiMoon, FiGlobe, FiUser, FiCode, FiImage, FiX, FiUpload, FiFileText, FiLink, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'account' | 'profile' | 'site' | 'social' | 'security'>('account');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [securitySettings, setSecuritySettings] = useState<Record<string, boolean>>({});
  const [accountForm, setAccountForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);

  const [otpModal, setOtpModal] = useState({ isOpen: false, type: '', settingKey: '', newValue: false, pendingId: '', emailMask: '' });
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  const { theme, setTheme } = useThemeStore();
  const { user, me } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setAccountForm((prev) => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  async function fetchData() {
    try {
      const [res, secRes] = await Promise.all([
        settingsAPI.getAll(),
        securityAPI.getAdminSettings()
      ]);
      setSettings(res.data?.data || {});
      setSecuritySettings(secRes.data?.data || {});
    } catch { /* */ }
    setLoading(false);
  }

  async function handleSaveSettings(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('Settings saved successfully!');
      // Dispatch event to indicate profile/site settings have changed so the frontend fetches new data
      window.dispatchEvent(new Event('data:update'));
    } catch { toast.error('Failed to save settings'); }
    setSaving(false);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (accountForm.password.trim() !== '' && accountForm.password !== accountForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const dataToUpdate: Record<string, string> = {};
      if (accountForm.username.trim() !== '') dataToUpdate.username = accountForm.username;
      if (accountForm.email.trim() !== '') dataToUpdate.email = accountForm.email;
      if (accountForm.password.trim() !== '') dataToUpdate.password = accountForm.password;
      
      const res = await authAPI.requestAccountOTP(dataToUpdate);
      if (res.data?.data?.requiresOtp || res.data?.requiresOtp) {
          const payloadData = res.data?.data || res.data;
          setOtpModal({ isOpen: true, type: 'account', settingKey: '', newValue: false, pendingId: payloadData.pendingId, emailMask: payloadData.maskedEmail });
      }
    } catch (err: any) { 
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update account'); 
    }
    setSaving(false);
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSecurityToggle(key: string, currentVal: boolean) {
    const newVal = !currentVal;
    
    const protectedSettings = [
      'security_turnstile_enabled', 
      'security_rate_limit_enabled', 
      'security_visitor_protection_enabled', 
      'security_login_otp_enabled'
    ];
    
    if (protectedSettings.includes(key)) {
      setSaving(true);
      try {
        const res = await securityAPI.requestOTP(key, newVal);
        setOtpModal({ isOpen: true, type: 'security', settingKey: key, newValue: newVal, pendingId: '', emailMask: res.data?.maskedEmail || '' });
      } catch (e: any) {
        toast.error(e.response?.data?.error || 'Failed to request OTP');
      }
      setSaving(false);
    } else {
      setSaving(true);
      try {
        await securityAPI.updateSetting(key, newVal);
        setSecuritySettings(prev => ({ ...prev, [key]: newVal }));
        toast.success(t('admin.security.setting_updated') || 'Setting updated successfully');
      } catch (e: any) {
        toast.error(e.response?.data?.error || 'Failed to update setting');
      }
      setSaving(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    try {
       if (otpModal.type === 'account') {
         await authAPI.verifyAccountOTP(otpModal.pendingId, otpCode);
         toast.success('Account updated successfully!');
         if (accountForm.password.trim() !== '') {
            setAccountForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
         }
         await me();
       } else {
         await securityAPI.verifyOTP(otpModal.settingKey, otpModal.newValue, otpCode);
         setSecuritySettings(prev => ({ ...prev, [otpModal.settingKey]: otpModal.newValue }));
         toast.success(t('admin.security.setting_updated') || 'Setting updated successfully');
       }
       setOtpModal({ isOpen: false, type: '', settingKey: '', newValue: false, pendingId: '', emailMask: '' });
       setOtpCode('');
    } catch(e: any) {
       toast.error(e.response?.data?.error || e.response?.data?.message || 'Invalid or expired OTP');
    }
    setOtpLoading(false);
  }

  const profileDropzone = useDropzone({
    accept: { 'image/*': [] }, maxFiles: 1,
    onDrop: async (files) => {
      if (files[0]) {
        setUploadingImage(true);
        try {
          const formData = new FormData();
          formData.append('image', files[0]);
          const res = await settingsAPI.uploadProfileImage(formData);
          if (res.data?.data?.url) {
            updateSetting('profile_image_url', res.data.data.url);
            // Optionally, save settings immediately
            setSettings(prev => {
              const newSettings = { ...prev };
              settingsAPI.update(newSettings).then(() => {
                toast.success('Profile photo uploaded & saved!');
                window.dispatchEvent(new Event('data:update'));
              });
              return newSettings;
            });
          }
        } catch {
          toast.error('Failed to upload image');
        }
        setUploadingImage(false);
      }
    },
  });

  const cvDropzone = useDropzone({
    accept: { 'application/pdf': [] }, maxFiles: 1,
    onDrop: async (files) => {
      if (files[0]) {
        setUploadingCV(true);
        try {
          const formData = new FormData();
          formData.append('image', files[0]);
          // Upload as generic asset; backend stores it and returns a URL
          const res = await settingsAPI.uploadProfileImage(formData);
          if (res.data?.data?.url) {
            updateSetting('resume_url', res.data.data.url);
            toast.success('CV uploaded! Click "Save Links" to persist.');
          }
        } catch {
          toast.error('Failed to upload CV. Try pasting the URL manually.');
        }
        setUploadingCV(false);
      }
    },
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="glass-card p-6 space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'account', label: t('admin.settings_page.tabs.account') || 'Account', icon: FiUser },
    { id: 'profile', label: t('admin.settings_page.tabs.profile') || 'Public Profile', icon: FiCode },
    { id: 'social', label: t('admin.settings_page.tabs.social') || 'Social & links', icon: FiGlobe },
    { id: 'site', label: t('admin.settings_page.tabs.site') || 'Site Config', icon: FiSettings },
    { id: 'security', label: t('admin.security.title') || 'Security', icon: FiShield },
  ] as const;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-display font-medium tracking-tight">{t('admin.settings')}</h1><p className="text-[var(--text-secondary)] text-sm mt-1 font-light">{t('admin.settings_page.desc') || 'Manage your account and public portfolio details'}</p></div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === t.id ? 'bg-[var(--bg-muted)] text-[var(--accent-primary)] border border-[var(--border-subtle)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] border border-transparent'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="premium-card p-6 md:p-8 relative">
        
        {/* --- ACCOUNT TAB --- */}
        {activeTab === 'account' && (
          <form onSubmit={handleSaveAccount} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div><h3 className="font-display font-medium text-xl">{t('admin.settings_page.account_title') || 'Admin Account'}</h3><p className="text-sm text-[var(--text-secondary)] mt-1 font-light">{t('admin.settings_page.account_desc') || 'Credentials used to log into the dashboard'}</p></div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1 block">Username</label>
                <input type="text" value={accountForm.username} onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  className="input-field" placeholder="Admin username" required minLength={3} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="input-field" placeholder="Admin email" required />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('admin.settings_page.change_password') || 'Change Password'} <span className="text-xs text-[var(--text-tertiary)] font-light">{t('admin.settings_page.change_password_hint') || '(Leave blank to keep current)'}</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="input-field pr-10" placeholder="New password" minLength={6} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('admin.settings_page.confirm_password') || 'Confirm Password'}</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={accountForm.confirmPassword} onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                    className="input-field pr-10" placeholder="Confirm new password" minLength={6} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    {showConfirmPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                {saving ? (t('common.loading') || 'Saving...') : (t('admin.settings_page.update_account') || 'Update Account')}
              </button>
            </div>
          </form>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div><h3 className="font-display font-medium text-xl">Public Profile</h3><p className="text-sm text-[var(--text-secondary)] mt-1 font-light">How you appear on the main portfolio</p></div>
            
            {/* Profile Photo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Profile Photo (About Section)</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {settings.profile_image_url ? (
                  <div className="relative group w-24 h-24 rounded-full overflow-hidden shrink-0 border border-[var(--border-accent)] shadow-lg">
                    <img src={settings.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => updateSetting('profile_image_url', '')} title="Remove image"
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiX className="w-6 h-6 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[var(--bg-muted)] flex flex-col items-center justify-center shrink-0 border-2 border-dashed border-[var(--border-subtle)]">
                    <FiUser className="w-8 h-8 text-[var(--text-tertiary)]" />
                  </div>
                )}
                
                <div {...profileDropzone.getRootProps()}
                  className={`flex-1 border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-6 text-center cursor-pointer transition-colors w-full
                    ${uploadingImage ? 'opacity-50 pointer-events-none' : 'hover:border-[var(--accent-primary)] hover:bg-[var(--bg-muted)]'}`}>
                  <input {...profileDropzone.getInputProps()} />
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-2 text-[var(--accent-primary)]" />
                      <p className="text-xs">Uploading securely...</p>
                    </div>
                  ) : (
                    <>
                      <FiImage className="w-6 h-6 mx-auto text-[var(--text-tertiary)] mb-2" />
                      <p className="text-sm text-[var(--text-secondary)]">Drag & drop or click to upload new profile photo</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">Recommended: Square format ratio (e.g. 500x500)</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('admin.form.full_name')}</label>
                <input type="text" value={settings.full_name || ''} onChange={(e) => updateSetting('full_name', e.target.value)}
                  className="input-field" placeholder="Full Name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Title / Role</label>
                <input type="text" value={settings.title || ''} onChange={(e) => updateSetting('title', e.target.value)}
                  className="input-field" placeholder="Full Stack Developer" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Bio</label>
              <textarea value={settings.bio || ''} onChange={(e) => updateSetting('bio', e.target.value)}
                className="input-field resize-none" rows={4} placeholder="Brief introduction..." />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <input type="text" value={settings.location || ''} onChange={(e) => updateSetting('location', e.target.value)}
                className="input-field max-w-sm" placeholder="City, Country" />
            </div>

            <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-[var(--border-subtle)]">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('admin.form.years_of_experience')}</label>
                <input type="number" value={settings.experience_years || ''} onChange={(e) => updateSetting('experience_years', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('admin.form.projects_completed')}</label>
                <input type="number" value={settings.projects_done || ''} onChange={(e) => updateSetting('projects_done', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('admin.form.happy_clients')}</label>
                <input type="number" value={settings.happy_clients || ''} onChange={(e) => updateSetting('happy_clients', e.target.value)}
                  className="input-field" />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        )}

        {/* --- SOCIAL TAB --- */}
        {activeTab === 'social' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div><h3 className="font-display text-xl font-medium">Social & Links</h3><p className="text-sm text-[var(--text-secondary)] font-light mt-1">External footprints shown in header and footer</p></div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1 block">GitHub URL</label>
                <input type="url" value={settings.github_url || ''} onChange={(e) => updateSetting('github_url', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">LinkedIn URL</label>
                <input type="url" value={settings.linkedin_url || ''} onChange={(e) => updateSetting('linkedin_url', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Twitter / X URL</label>
                <input type="url" value={settings.twitter_url || ''} onChange={(e) => updateSetting('twitter_url', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Instagram URL</label>
                <input type="url" value={settings.instagram_url || ''} onChange={(e) => updateSetting('instagram_url', e.target.value)}
                  className="input-field" />
              </div>
            </div>
            
            {/* CV / Resume Upload */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">CV / Resume</h4>
                <p className="text-xs text-[var(--text-tertiary)] font-light">Upload a PDF or paste a direct URL. This will be shown as a "Download CV" button on the portfolio.</p>
              </div>

              {/* Current CV */}
              {settings.resume_url && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)]">
                  <FiFileText className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
                  <a href={settings.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-[var(--accent-primary)] truncate flex-1 hover:underline">
                    {settings.resume_url}
                  </a>
                  <button type="button" onClick={() => updateSetting('resume_url', '')} className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors shrink-0">
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* PDF Upload Zone */}
              <div {...cvDropzone.getRootProps()}
                className={`border-2 border-dashed border-[var(--border-subtle)] rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${uploadingCV ? 'opacity-50 pointer-events-none' : 'hover:border-[var(--accent-primary)] hover:bg-[var(--bg-muted)]'}`}>
                <input {...cvDropzone.getInputProps()} />
                {uploadingCV ? (
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 border-2 border-t-transparent border-[var(--accent-primary)] rounded-full animate-spin mb-2" />
                    <p className="text-xs text-[var(--text-secondary)]">Uploading CV...</p>
                  </div>
                ) : (
                  <>
                    <FiUpload className="w-6 h-6 mx-auto text-[var(--text-tertiary)] mb-2" />
                    <p className="text-sm text-[var(--text-secondary)]">Drag & drop PDF or click to upload</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">PDF only · Max 10MB</p>
                  </>
                )}
              </div>

              {/* Manual URL field */}
              <div className="relative">
                <label className="text-xs font-mono uppercase tracking-widest text-[var(--text-tertiary)] block mb-2 flex items-center gap-1"><FiLink className="w-3 h-3" /> Or paste URL directly</label>
                <input type="url" value={settings.resume_url || ''} onChange={(e) => updateSetting('resume_url', e.target.value)}
                  className="input-field" placeholder="https://drive.google.com/file/..." />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Links'}
              </button>
            </div>
          </form>
        )}

        {/* --- SITE CONFIG TAB --- */}
        {activeTab === 'site' && (
          <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div><h3 className="font-display font-medium text-xl">Site Settings</h3><p className="text-sm text-[var(--text-secondary)] mt-1 font-light">System functionality preferences</p></div>
            
            <div>
              <label className="text-sm font-medium mb-3 block">Theme Preference (Admin Panel)</label>
              <div className="flex gap-3">
                {['light', 'dark'].map(t => (
                  <button type="button" key={t} onClick={() => setTheme(t as 'light' | 'dark')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${theme === t ? 'border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--accent-primary)] font-bold shadow-sm' : 'border-[var(--border-color)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)]'}`}>
                    {t === 'dark' ? <FiMoon className="w-5 h-5" /> : <FiSun className="w-5 h-5" />}
                    <span className="capitalize font-medium">{t} Mode</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-subtle)]">
              <div>
                <label className="text-sm font-medium mb-1 block">Global Site Title</label>
                <input type="text" value={settings.site_title || ''} onChange={(e) => updateSetting('site_title', e.target.value)} className="input-field" placeholder="My Portfolio" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">SEO Description</label>
                <input type="text" value={settings.site_description || ''} onChange={(e) => updateSetting('site_description', e.target.value)} className="input-field" placeholder="Full Stack Developer Portfolio" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Default Language</label>
                <select value={settings.default_lang || 'en'} onChange={(e) => updateSetting('default_lang', e.target.value)} className="input-field bg-transparent">
                  <option value="en">English</option><option value="id">Bahasa Indonesia</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Google Analytics ID</label>
                <input type="text" value={settings.ga_id || ''} onChange={(e) => updateSetting('ga_id', e.target.value)} className="input-field" placeholder="G-XXXXXXXXXX" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-1 block">SEO Keywords</label>
                <input type="text" value={settings.meta_keywords || ''} onChange={(e) => updateSetting('meta_keywords', e.target.value)} className="input-field" placeholder="portfolio, developer, web" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Footer Copyright Text</label>
                <input type="text" value={settings.footer_text || ''} onChange={(e) => updateSetting('footer_text', e.target.value)} className="input-field" placeholder="Built with ❤ by..." />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Site Config'}
              </button>
            </div>
          </form>
        )}

        {/* --- SECURITY TAB --- */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="font-display font-medium text-xl">{t('admin.security.title') || 'Security Settings'}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1 font-light">{t('admin.security.subtitle') || 'Manage active protections'}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { 
                  id: 'security_turnstile_enabled', 
                  label: t('admin.security.turnstile') || 'Turnstile Protection', 
                  desc: t('admin.security.turnstile_desc') || 'Prevent bot spam', 
                  active: !!securitySettings.security_turnstile_enabled 
                },
                { 
                  id: 'security_rate_limit_enabled', 
                  label: t('admin.security.redis') || 'Redis Rate Limit', 
                  desc: t('admin.security.redis_desc') || 'Limit API requests', 
                  active: !!securitySettings.security_rate_limit_enabled 
                },
                { 
                  id: 'security_visitor_protection_enabled', 
                  label: t('admin.security.visitor') || 'Visitor Protection', 
                  desc: t('admin.security.visitor_desc') || 'Track genuine traffic', 
                  active: !!securitySettings.security_visitor_protection_enabled 
                },
                { 
                  id: 'security_exclude_admin_visits_enabled', 
                  label: t('admin.security.exclude_admin') || 'Exclude Admin Visits', 
                  desc: t('admin.security.exclude_admin_desc') || 'Ignore own stat points', 
                  active: !!securitySettings.security_exclude_admin_visits_enabled 
                },
                { 
                  id: 'security_resend_email_enabled', 
                  label: t('admin.security.resend') || 'Resend Email Notification', 
                  desc: t('admin.security.resend_desc') || 'Inbox routing', 
                  active: !!securitySettings.security_resend_email_enabled 
                },
                { 
                  id: 'security_login_otp_enabled', 
                  label: t('admin.security.login_otp') || 'Login Email OTP', 
                  desc: t('admin.security.login_otp_desc') || 'Require code sent to email', 
                  active: !!securitySettings.security_login_otp_enabled 
                },
              ].map((item) => (
                <div key={item.id} 
                  onClick={() => handleSecurityToggle(item.id, item.active)} 
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer group ${saving ? 'opacity-50 pointer-events-none' : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)] bg-[var(--bg-muted)]'}`}>
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">{item.label}</h4>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{item.desc}</p>
                  </div>
                  <div className={`w-10 h-6 shrink-0 rounded-full transition-colors flex items-center px-1 ${item.active ? 'bg-green-500/80 shadow-sm shadow-green-500/20' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* OTP Modal */}
      {otpModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-medium text-xl mb-2">{t('admin.security.otp_confirmation') || 'OTP Confirmation'}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {t('admin.security.otp_desc_sent') || 'Code sent to email'}: <span className="font-medium text-[var(--text-primary)]">{otpModal.emailMask}</span>
            </p>
            
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-lg tracking-[0.5em] font-mono" placeholder="------" required minLength={6} maxLength={6} disabled={otpLoading} autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setOtpModal({ isOpen: false, type: '', settingKey: '', newValue: false, pendingId: '', emailMask: '' })} disabled={otpLoading}
                  className="flex-1 btn-secondary text-sm h-10">
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button type="submit" disabled={otpLoading || otpCode.length < 6}
                  className="flex-1 btn-primary text-sm h-10 flex items-center justify-center gap-2">
                  {otpLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {t('admin.security.verify_otp') || 'Verify OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

