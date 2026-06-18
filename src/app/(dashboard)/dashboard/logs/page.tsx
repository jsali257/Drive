'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Activity, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  LOGOUT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  LOGIN_FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  FILE_UPLOADED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  FILE_DOWNLOADED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
  FILE_DELETED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  API_KEY_CREATED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  API_KEY_REVOKED: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

export default function LogsPage() {
  const [tab, setTab] = useState<'audit' | 'activity'>('audit');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [tab, page],
    queryFn: () => api.get(`/logs/${tab}?page=${page}&limit=25`).then((r) => r.data),
  });

  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Audit trail and activity history</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(['audit', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={cn('px-4 py-1.5 rounded-md text-sm font-medium capitalize transition', tab === t ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {t === 'audit' ? <><ScrollText className="w-3.5 h-3.5 inline mr-1.5" />Audit</> : <><Activity className="w-3.5 h-3.5 inline mr-1.5" />Activity</>}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">User</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">IP</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground')}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {log.user?.email || '—'}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground font-mono text-xs hidden md:table-cell">
                    {log.ipAddress || '—'}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">No logs found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={!meta.hasPrevPage} className="p-2 rounded-lg border border-border hover:bg-muted transition disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={!meta.hasNextPage} className="p-2 rounded-lg border border-border hover:bg-muted transition disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
