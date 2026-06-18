'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Files, Download, Trash2, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { api, formatBytes } from '@/lib/api';
import { cn, getFileBadgeColor } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export default function RecentPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['recent-files', page],
    queryFn: () =>
      api.get(`/files?page=${page}&limit=25&sortBy=createdAt&sortOrder=desc`).then((r) => r.data),
  });

  const trashMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      toast.success('File moved to trash');
      queryClient.invalidateQueries({ queryKey: ['recent-files'] });
    },
    onError: () => toast.error('Failed to delete file'),
  });

  const downloadFile = (id: string, name: string) => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/files/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      });
  };

  const files = data?.data || [];
  const meta = data?.meta;

  const grouped = files.reduce((acc: Record<string, any[]>, file: any) => {
    const day = format(new Date(file.createdAt), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(file);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recent</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your recently uploaded files</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No recent files</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Files you upload will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {Object.entries(grouped).map(([day, dayFiles]) => (
              <motion.div key={day} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {format(new Date(day + 'T00:00:00'), 'EEEE, MMMM d')}
                </p>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {(dayFiles as any[]).map((file: any, i: number) => (
                    <div
                      key={file.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors',
                        i < (dayFiles as any[]).length - 1 && 'border-b border-border',
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Files className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.originalName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatBytes(Number(file.size))}</span>
                          <span className={cn('inline-flex px-1.5 py-0.5 rounded text-xs font-medium', getFileBadgeColor(file.mimeType))}>
                            {file.extension?.toUpperCase() || 'â€”'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadFile(file.id, file.originalName)}
                          className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => trashMutation.mutate(file.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
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

