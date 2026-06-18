'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, RefreshCw, Search, UserCheck, UserX, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api, formatBytes } from '@/lib/api';
import { cn } from '@/lib/utils';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  ADMIN: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  DEVELOPER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
  USER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  READ_ONLY: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get(`/users?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/users/${id}`, data),
    onSuccess: () => { toast.success('User updated'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { toast.success('User deleted'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Failed to delete user'),
  });

  const users = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          {meta && <p className="text-sm text-muted-foreground mt-0.5">{meta.total} registered accounts</p>}
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email, username..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
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
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Role</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Storage</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Last Login</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {user.displayName?.[0] || user.email[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <select
                      value={user.role}
                      onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
                      className={cn(
                        'text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring',
                        ROLE_COLORS[user.role] || '',
                      )}
                    >
                      <option value="READ_ONLY">READ ONLY</option>
                      <option value="USER">USER</option>
                      <option value="DEVELOPER">DEVELOPER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER ADMIN</option>
                    </select>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                    {formatBytes(Number(user.storageUsedBytes || 0))}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                    {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM dd, HH:mm') : 'Never'}
                  </td>
                  <td className="p-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700',
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => updateMutation.mutate({ id: user.id, data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } })}
                        className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
                        title={user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      >
                        {user.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={!meta.hasPrevPage} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</span>
          <button onClick={() => setPage(Math.min(meta.totalPages, page + 1))} disabled={!meta.hasNextPage} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
