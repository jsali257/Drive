'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Share2, Link, Copy, CheckCircle, Lock, Globe, Clock, Download,
  Loader2, Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  fileId?: string;
  folderId?: string;
  fileName?: string;
}

function generatePassword(): string {
  const words = ['Storm','River','Eagle','Falcon','Cedar','Ridge','Sierra','Delta','Cobra','Ranger'];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${w1}-${num}-${w2}`;
}

export function ShareModal({ open, onClose, fileId, folderId, fileName }: ShareModalProps) {
  const [label, setLabel] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useExpiry, setUseExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [useMaxDownloads, setUseMaxDownloads] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState('10');
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () =>
      api.post('/shares', {
        fileId,
        folderId,
        label: label.trim() || undefined,
        password: usePassword && password ? password : undefined,
        expiresAt: useExpiry && expiresAt ? new Date(expiresAt).toISOString() : undefined,
        maxDownloads: useMaxDownloads ? parseInt(maxDownloads, 10) : undefined,
      }),
    onSuccess: ({ data }) => {
      const token = data.token;
      const url = `${window.location.origin}/s/${token}`;
      setCreatedLink(url);
    },
    onError: () => toast.error('Failed to create share link'),
  });

  const copyLink = () => {
    if (!createdLink) return;
    navigator.clipboard.writeText(createdLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setLabel('');
    setUsePassword(false);
    setPassword('');
    setUseExpiry(false);
    setExpiresAt('');
    setUseMaxDownloads(false);
    setMaxDownloads('10');
    setCreatedLink(null);
    setCopied(false);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10">
                <Share2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{folderId ? 'Share Folder' : 'Share File'}</h2>
                {fileName && <p className="text-xs text-muted-foreground truncate max-w-[240px]">{fileName}</p>}
              </div>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {createdLink ? (
            /* Success state — show the link */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300 font-medium">Share link created!</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Share URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border min-w-0">
                    <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-xs truncate font-mono">{createdLink}</p>
                  </div>
                  <button
                    onClick={copyLink}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition shrink-0',
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                    )}
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCreatedLink(null)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition"
                >
                  Create another
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Create form */
            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Label <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Client files, Project assets..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>

              {/* Password protection */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setUsePassword(!usePassword)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition text-left"
                >
                  <div className={cn('p-1.5 rounded-lg', usePassword ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-muted text-muted-foreground')}>
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Password protection</p>
                    <p className="text-xs text-muted-foreground">Require a password to access</p>
                  </div>
                  <div className={cn('w-9 h-5 rounded-full transition-colors relative', usePassword ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', usePassword ? 'translate-x-4' : 'translate-x-0.5')} />
                  </div>
                </button>

                <AnimatePresence>
                  {usePassword && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-border pt-3 space-y-2">
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter a password"
                            autoFocus
                            className="w-full px-3 py-2 pr-9 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" /> Auto-generate password
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Expiry */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setUseExpiry(!useExpiry)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition text-left"
                >
                  <div className={cn('p-1.5 rounded-lg', useExpiry ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-muted text-muted-foreground')}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Expiry date</p>
                    <p className="text-xs text-muted-foreground">Link stops working after this date</p>
                  </div>
                  <div className={cn('w-9 h-5 rounded-full transition-colors relative', useExpiry ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', useExpiry ? 'translate-x-4' : 'translate-x-0.5')} />
                  </div>
                </button>

                <AnimatePresence>
                  {useExpiry && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-border pt-3">
                        <input
                          type="datetime-local"
                          value={expiresAt}
                          onChange={(e) => setExpiresAt(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Max downloads */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setUseMaxDownloads(!useMaxDownloads)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition text-left"
                >
                  <div className={cn('p-1.5 rounded-lg', useMaxDownloads ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-muted text-muted-foreground')}>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Download limit</p>
                    <p className="text-xs text-muted-foreground">Disable after N downloads</p>
                  </div>
                  <div className={cn('w-9 h-5 rounded-full transition-colors relative', useMaxDownloads ? 'bg-primary' : 'bg-muted-foreground/30')}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', useMaxDownloads ? 'translate-x-4' : 'translate-x-0.5')} />
                  </div>
                </button>

                <AnimatePresence>
                  {useMaxDownloads && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-border pt-3">
                        <input
                          type="number"
                          value={maxDownloads}
                          onChange={(e) => setMaxDownloads(e.target.value)}
                          min="1"
                          max="10000"
                          className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <button
                onClick={() => shareMutation.mutate()}
                disabled={shareMutation.isPending || (usePassword && !password) || (useExpiry && !expiresAt)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {shareMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating link...</>
                ) : (
                  <><Share2 className="w-4 h-4" /> Create share link</>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
