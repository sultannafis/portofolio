'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { messagesAPI } from '@/lib/api';
import { Message } from '@/types';
import toast from 'react-hot-toast';
import { FiMail, FiTrash2, FiCheck, FiInbox, FiClock } from 'react-icons/fi';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import Pagination from '@/components/ui/Pagination';

export default function MessagesPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: '10' };
      if (filter) params.is_read = filter;
      const res = await messagesAPI.getAll(params);
      setMessages(res.data?.data || []);
      setTotalPages(res.data?.meta?.total_pages || 1);
      
      // If we are on a page > 1 but no messages returned, jump to previous page
      if (page > 1 && (!res.data?.data || res.data.data.length === 0)) {
        setPage(page - 1);
      }
    } catch { toast.error('Failed to fetch messages'); }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { const h = () => fetchMessages(); window.addEventListener('admin:refresh', h); return () => window.removeEventListener('admin:refresh', h); }, [fetchMessages]);

  async function markAsRead(id: string) {
    try { await messagesAPI.markAsRead(id); toast.success('Marked as read'); fetchMessages(); }
    catch { toast.error('Failed'); }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    try { await messagesAPI.delete(id); toast.success('Deleted!'); setDeleteConfirm(null); setSelectedMsg(null); fetchMessages(); }
    catch { toast.error('Failed'); }
    setIsDeleting(false);
  }

  function openMessage(msg: Message) {
    setSelectedMsg(msg);
    if (!msg.is_read) markAsRead(msg.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.messages')}</h1>
        <p className="dark:text-gray-400 text-gray-500 text-sm">Contact form submissions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All', value: '' },
          { label: 'Unread', value: 'false' },
          { label: 'Read', value: 'true' },
        ].map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border border-[var(--border-color)] ${filter === f.value ? 'bg-gradient-to-r from-sky-500 to-sky-400 text-white border-transparent' : 'bg-[var(--bg-muted)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="glass-card p-4 space-y-2"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-3 w-2/3" /><div className="skeleton h-3 w-full" /></div>)
          ) : messages.length === 0 ? (
            <div className="glass-card p-12 text-center"><FiInbox className="w-12 h-12 mx-auto dark:text-gray-600 text-gray-300 mb-4" /><p className="dark:text-gray-400 text-gray-500">No messages</p></div>
          ) : (
            messages.map((msg) => (
              <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => openMessage(msg)}
                className={`glass-card p-4 cursor-pointer transition-all hover:scale-[1.01] ${selectedMsg?.id === msg.id ? 'dark:border-purple-500/50 border-purple-300 ring-1 ring-purple-500/20' : ''} ${!msg.is_read ? 'dark:border-purple-500/30 border-purple-200' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!msg.is_read && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />}
                      <h4 className={`text-sm truncate ${!msg.is_read ? 'font-bold' : 'font-medium'}`}>{msg.name}</h4>
                    </div>
                    <p className="text-xs dark:text-gray-400 text-gray-500 truncate">{msg.subject || 'No subject'}</p>
                    <p className="text-xs dark:text-gray-500 text-gray-400 truncate mt-1">{msg.message}</p>
                  </div>
                  <span className="text-xs dark:text-gray-500 text-gray-400 whitespace-nowrap flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))
          )}

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3">
          {selectedMsg ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-xl font-bold break-words line-clamp-2 leading-tight">{selectedMsg.subject || 'No subject'}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-3 text-sm dark:text-gray-400 text-gray-500">
                    <span className="font-medium dark:text-gray-300 text-gray-700 break-words max-w-full line-clamp-1">{selectedMsg.name}</span>
                    <span className="break-all">&lt;{selectedMsg.email}&gt;</span>
                  </div>
                  <p className="text-xs dark:text-gray-500 text-gray-400 mt-2">
                    {new Date(selectedMsg.created_at).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setDeleteConfirm(selectedMsg.id)} className="shrink-0 p-2 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
              <hr className="dark:border-white/10 border-gray-200" />
              <div className="dark:text-gray-300 text-gray-600 whitespace-pre-wrap leading-relaxed">
                {selectedMsg.message}
              </div>
              <div className="flex gap-2 pt-2">
                <a href={`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject || ''}`}
                  className="btn-primary text-sm flex items-center gap-2"><FiMail className="w-4 h-4" /> Reply via Email</a>
                {!selectedMsg.is_read && (
                  <button onClick={() => markAsRead(selectedMsg.id)} className="btn-secondary text-sm flex items-center gap-2"><FiCheck className="w-4 h-4" /> Mark Read</button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
              <FiMail className="w-16 h-16 dark:text-gray-700 text-gray-200 mb-4" />
              <p className="dark:text-gray-500 text-gray-400">Select a message to read</p>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title={t('admin.delete_warning')}
        description={t('admin.delete_warning')}
        isDeleting={isDeleting}
      />
    </div>
  );
}

