'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, Copy, Trash2, RefreshCw, ShieldOff, Clock, Download,
  Lock, Globe, CheckCircle, Activity,
  Monitor, Mail, MessageSquare, Globe2,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function refererLabel(referer: string | null): string {
  if (!referer) return 'Direct / Unknown';
  try {
    const host = new URL(referer).hostname.replace('www.', '');
    return host;
  } catch {
    return referer;
  }
}

function SourceBadge({ source, referer }: { source?: string | null; referer?: string | null }) {
  const label = source || refererLabel(referer || null);
  const isEmail = label.includes('gmail') || label.includes('outlook') || label.includes('yahoo') || label.includes('mail');
  const isSlack = label.includes('slack');
  const isTeams = label.includes('teams') || label.includes('microsoft');

  const icon = isEmail ? <Mail className="w-3 h-3" />
    : isSlack ? <MessageSquare className="w-3 h-3" />
    : isTeams ? <Monitor className="w-3 h-3" />
    : <Globe2 className="w-3 h-3" />;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function AccessHistory({ shareId }: { shareId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['share-accesses', shareId],
    queryFn: () => api.get(`/shares/${shareId}/accesses?limit=50`).then((r) => r.data),
  });

  const accesses = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accesses.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">No access events recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date &amp; Time</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Source</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">IP Address</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden md:table-cell">Referrer</th>
          </tr>
        </thead>
        <tbody>
          {accesses.map((entry: any) => {
            const details = entry.details || {};
            return (
              <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                  {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                </td>
                <td className="py-2 px-3">
                  <SourceBadge source={details.source} referer={details.referer} />
                </td>
                <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell font-mono">
                  {entry.ipAddress || '—'}
                </td>
                <td className="py-2 px-3 text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                  {details.referer || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SharedPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['shares', page],
    queryFn: () => api.get(`/shares?page=${page}&limit=20`).then((r) => r.data),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/shares/${id}/revoke`),
    onSuccess: () => {
      toast.success('Share link revoked');
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
    onError: () => toast.error('Failed to revoke share'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/shares/${id}`),
    onSuccess: () => {
      toast.success('Share link deleted');
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
    onError: () => toast.error('Failed to delete share'),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const shares = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shared Links</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta?.total ?? shares.length} share link{shares.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Share2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No shared links</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Go to Files and click the share icon on any file to create a link
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {shares.map((share: any) => {
              const expired = share.expiresAt && isPast(new Date(share.expiresAt));
              const active = share.isActive && !expired;
              const isExpanded = expandedId === share.id;

              return (
                <motion.div
                  key={share.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={cn(
                    'bg-card border rounded-xl overflow-hidden',
                    active ? 'border-border' : 'border-border opacity-60',
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-2.5 rounded-lg shrink-0',
                        share.type === 'PASSWORD_PROTECTED'
                          ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                      )}>
                        {share.type === 'PASSWORD_PROTECTED' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {share.file?.originalName || share.folder?.name || 'Unknown'}
                          </p>
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                          )}>
                            {active ? <CheckCircle className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                            {active ? 'Active' : expired ? 'Expired' : 'Revoked'}
                          </span>
                          {share.label && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {share.label}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {share.downloadCount} access{share.downloadCount !== 1 ? 'es' : ''}
                            {share.maxDownloads ? ` / ${share.maxDownloads} max` : ''}
                          </span>
                          {share.lastAccessedAt && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Last accessed {formatDistanceToNow(new Date(share.lastAccessedAt), { addSuffix: true })}
                            </span>
                          )}
                          {share.expiresAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {expired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true })}`}
                            </span>
                          )}
                          <span>Created {format(new Date(share.createdAt), 'MMM dd, yyyy')}</span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-xs">
                            /s/{share.token}
                          </code>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : share.id)}
                          className={cn(
                            'p-2 rounded-lg hover:bg-muted transition text-muted-foreground',
                            isExpanded && 'bg-muted text-foreground',
                          )}
                          title="View access history"
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyLink(share.token)}
                          className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
                          title="Copy link"
                        >
                          {copied === share.token ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        {active && (
                          <button
                            onClick={() => revokeMutation.mutate(share.id)}
                            className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-orange-500"
                            title="Revoke link"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(share.id)}
                          className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border px-4 py-3 bg-muted/20">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Activity className="w-3 h-3" />
                            Access History
                          </p>
                          <AccessHistory shareId={share.id} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!meta.hasPrevPage}
                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={!meta.hasNextPage}
                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
