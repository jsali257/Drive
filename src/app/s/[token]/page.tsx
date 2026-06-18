'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Download, Lock, FileIcon, AlertCircle, CheckCircle, Loader2,
  HardDrive, Eye, EyeOff, Clock, Shield, Copy, Link2, Code2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api, formatBytes } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function getMimeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

function getMimeLabel(mimeType: string): string {
  if (!mimeType) return 'File';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF Document';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'Archive';
  if (mimeType.startsWith('text/')) return 'Text File';
  return 'File';
}

function getMimeColor(mimeType: string): string {
  if (!mimeType) return 'bg-blue-100 text-blue-600';
  if (mimeType.startsWith('image/')) return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
  if (mimeType.startsWith('video/')) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  if (mimeType.startsWith('audio/')) return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
  if (mimeType === 'application/pdf') return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0',
        copied ? 'bg-green-500 text-white' : 'bg-muted hover:bg-muted/80 text-foreground',
      )}
    >
      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function ShareAccessPage() {
  const params = useParams();
  const token = params?.token as string;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [wrongPassword, setWrongPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const { isLoading, error } = useQuery({
    queryKey: ['share-access', token],
    queryFn: () => api.get(`/shares/${token}/access`).then((r) => r.data),
    retry: false,
    enabled: !!token,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isLoading && !error && !shareData) {
      api.get(`/shares/${token}/access`).then((r) => setShareData(r.data)).catch(() => {});
    }
  }, [isLoading, error, token]);

  useEffect(() => {
    if (error) {
      const status = (error as any)?.response?.status;
      if (status === 403) setPasswordRequired(true);
    }
  }, [error]);

  const unlockMutation = useMutation({
    mutationFn: () =>
      api.get(`/shares/${token}/access?password=${encodeURIComponent(password)}`).then((r) => r.data),
    onSuccess: (data) => {
      setShareData(data);
      setPasswordRequired(false);
      setWrongPassword(false);
    },
    onError: () => setWrongPassword(true),
  });

  const handleDownload = async () => {
    const file = shareData?.file;
    if (!file) return;
    setDownloading(true);
    try {
      const passwordParam = password ? `?password=${encodeURIComponent(password)}` : '';
      const url = `${API_URL}/api/shares/${token}/download${passwordParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.originalName || 'download';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const file = shareData?.file;
  const share = shareData;
  const category = file ? getMimeCategory(file.mimeType) : 'other';

  const passwordParam = password ? `?password=${encodeURIComponent(password)}` : '';
  const filename = file ? encodeURIComponent(file.originalName) : 'file';
  const viewUrl = `${API_URL}/api/shares/${token}/view/${filename}${passwordParam}`;
  const downloadUrl = `${API_URL}/api/shares/${token}/download${passwordParam}`;

  const embedCode =
    category === 'image'
      ? `<img src="${viewUrl}" alt="${file?.originalName}" />`
      : category === 'video'
      ? `<video controls src="${viewUrl}"></video>`
      : category === 'audio'
      ? `<audio controls src="${viewUrl}"></audio>`
      : category === 'pdf'
      ? `<iframe src="${viewUrl}" width="100%" height="600px"></iframe>`
      : `<a href="${downloadUrl}" download>${file?.originalName}</a>`;

  const errorStatus = (error as any)?.response?.status;
  const errorMsg = (error as any)?.response?.data?.message?.toLowerCase() ?? '';
  const isExpired = errorMsg.includes('expir');
  const isLimitReached = errorMsg.includes('limit');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 pt-10">
      <div className="w-full max-w-2xl">
        {/* Branding */}
        <div className="flex items-center justify-center mb-8">
          <img src="/storage_logo.png" alt="RGV911 Drive" className="h-10 object-contain" />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && !passwordRequired && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold mb-1">
              {isExpired ? 'Link Expired' : isLimitReached ? 'Download Limit Reached' : 'Link Not Available'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isExpired
                ? 'This share link has expired.'
                : isLimitReached
                ? 'This file has reached its maximum download count.'
                : 'This share link is invalid, revoked, or no longer available.'}
            </p>
          </div>
        )}

        {/* Password gate */}
        {!isLoading && passwordRequired && !shareData && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm max-w-md mx-auto">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6 text-orange-500" />
              </div>
              <h2 className="text-lg font-semibold">Password Required</h2>
              <p className="text-sm text-muted-foreground mt-1 text-center">Enter the password to access this file.</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setWrongPassword(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && password) unlockMutation.mutate(); }}
                  placeholder="Enter password"
                  autoFocus
                  className={cn(
                    'w-full px-4 py-2.5 pr-10 rounded-xl border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition',
                    wrongPassword ? 'border-red-400 focus:ring-red-400' : 'border-input',
                  )}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {wrongPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Incorrect password.
                </p>
              )}
              <button
                onClick={() => unlockMutation.mutate()}
                disabled={!password || unlockMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {unlockMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</> : <><Shield className="w-4 h-4" /> Unlock</>}
              </button>
            </div>
          </div>
        )}

        {/* File view */}
        {!isLoading && file && (
          <div className="space-y-4">
            {/* File header */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl shrink-0', getMimeColor(file.mimeType))}>
                  <FileIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-lg">{file.originalName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-muted-foreground">
                    <span>{formatBytes(Number(file.size))}</span>
                    <span>·</span>
                    <span>{getMimeLabel(file.mimeType)}</span>
                    {file.extension && <><span>·</span><span className="font-mono">.{file.extension}</span></>}
                    {share?.downloadCount !== undefined && <><span>·</span><span>{share.downloadCount} download{share.downloadCount !== 1 ? 's' : ''}</span></>}
                    {share?.expiresAt && (
                      <><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />Expires {format(new Date(share.expiresAt), 'MMM dd, yyyy')}</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inline preview */}
            {category === 'image' && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex items-center justify-center p-2 min-h-[200px]">
                <img
                  src={viewUrl}
                  alt={file.originalName}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl"
                />
              </div>
            )}

            {category === 'video' && (
              <div className="bg-black rounded-2xl overflow-hidden shadow-sm">
                <video
                  controls
                  className="w-full max-h-[70vh]"
                  src={viewUrl}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            )}

            {category === 'audio' && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <audio controls className="w-full" src={viewUrl}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {category === 'pdf' && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <iframe
                  src={viewUrl}
                  className="w-full"
                  style={{ height: '75vh' }}
                  title={file.originalName}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {share?.allowDownload !== false && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-70 text-sm"
                >
                  {downloading ? <><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</> : <><Download className="w-4 h-4" /> Download</>}
                </button>
              )}
              <button
                onClick={() => setShowEmbed(!showEmbed)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border font-medium text-sm transition',
                  showEmbed ? 'bg-muted' : 'hover:bg-muted',
                )}
              >
                <Code2 className="w-4 h-4" />
                Embed
              </button>
            </div>

            {/* Embed / URL panel */}
            {showEmbed && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm">Direct URLs</h3>

                {/* View URL */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inline view URL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono truncate">{viewUrl}</code>
                    <CopyButton text={viewUrl} label="View URL" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Opens file in browser — use in &lt;img&gt;, &lt;video&gt;, &lt;iframe&gt;</p>
                </div>

                {/* Download URL */}
                {share?.allowDownload !== false && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Download URL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono truncate">{downloadUrl}</code>
                      <CopyButton text={downloadUrl} label="Download URL" />
                    </div>
                  </div>
                )}

                {/* Embed code */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Embed code</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-lg font-mono break-all whitespace-pre-wrap">{embedCode}</code>
                    <CopyButton text={embedCode} label="Embed code" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Shared via <span className="font-medium">RGV911 Drive</span>
        </p>
      </div>
    </div>
  );
}
