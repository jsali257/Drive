'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HardDrive, Files, Users, TrendingUp, RefreshCw, Database, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { api, formatBytes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-lg', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function StoragePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['storage-stats'],
    queryFn: () => api.get(isAdmin ? '/storage/stats' : '/storage/me').then((r) => r.data),
  });

  const { data: growthData } = useQuery({
    queryKey: ['storage-growth'],
    queryFn: () => api.get('/storage/growth?days=30').then((r) => r.data),
    enabled: isAdmin === true,
  });

  const myStats = useQuery({
    queryKey: ['storage-me'],
    queryFn: () => api.get('/storage/me').then((r) => r.data),
    enabled: isAdmin === true,
  });

  const storageUsed = Number(stats?.storageUsedBytes || stats?.totalStorageBytes || 0);
  const storageQuota = Number(stats?.storageQuotaBytes || 0);
  const storagePercent = storageQuota > 0 ? Math.min(100, Math.round((storageUsed / storageQuota) * 100)) : 0;

  const myUsed = Number(myStats.data?.storageUsedBytes || 0);
  const myQuota = Number(myStats.data?.storageQuotaBytes || 1);
  const myPercent = Math.min(100, Math.round((myUsed / myQuota) * 100));

  const fileTypeData = stats?.filesByType
    ? Object.entries(stats.filesByType).map(([name, value]: any) => ({ name, value: Number(value) }))
    : [];

  const growthChartData = (growthData || []).map((d: any) => ({
    date: format(new Date(d.date), 'MM/dd'),
    bytes: Number(d.bytes || 0),
    files: Number(d.files || 0),
  }));

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Storage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? 'Platform-wide storage analytics' : 'Your storage usage'}
          </p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={HardDrive}
          label={isAdmin ? 'Total Storage Used' : 'Your Storage Used'}
          value={formatBytes(storageUsed)}
          sub={storageQuota > 0 ? `of ${formatBytes(storageQuota)} quota` : 'No quota set'}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatCard
          icon={Files}
          label="Total Files"
          value={(stats?.totalFiles ?? 0).toLocaleString()}
          sub="Across all types"
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
        />
        {isAdmin && (
          <>
            <StatCard
              icon={Users}
              label="Total Users"
              value={(stats?.totalUsers ?? 0).toLocaleString()}
              sub="Registered accounts"
              color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Uploads Today"
              value={(stats?.uploadsToday ?? 0).toLocaleString()}
              sub="Files uploaded"
              color="bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400"
            />
          </>
        )}
        {!isAdmin && (
          <StatCard
            icon={Database}
            label="Available"
            value={storageQuota > 0 ? formatBytes(Math.max(0, storageQuota - storageUsed)) : 'Unlimited'}
            sub="Remaining quota"
            color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
          />
        )}
      </div>

      {/* Usage bar */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{isAdmin ? 'Platform Storage' : 'Your Storage'}</h2>
          <span className="text-sm text-muted-foreground">{storagePercent}% used</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${storagePercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-primary',
            )}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{formatBytes(storageUsed)} used</span>
          {storageQuota > 0 && <span>{formatBytes(storageQuota)} total</span>}
        </div>
      </div>

      {/* My usage (admin sees both platform + own) */}
      {isAdmin && myStats.data && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-3">My Storage</h2>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">{formatBytes(myUsed)} used of {formatBytes(myQuota)}</span>
            <span className="font-medium">{myPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${myPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', myPercent > 90 ? 'bg-red-500' : myPercent > 70 ? 'bg-yellow-500' : 'bg-primary')}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth chart */}
        {isAdmin && growthChartData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Storage Growth (30 days)</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => formatBytes(v, 0)} />
                  <Tooltip
                    formatter={(v: any) => formatBytes(v)}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="bytes" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* File type breakdown */}
        {fileTypeData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Files by Type</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fileTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {fileTypeData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Upload activity */}
        {isAdmin && growthChartData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold mb-4">Upload Activity (30 days)</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Bar dataKey="files" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* User breakdown (admin only) */}
      {isAdmin && stats?.topUsers && stats.topUsers.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Top Users by Storage</h2>
          <div className="space-y-3">
            {stats.topUsers.map((u: any, i: number) => {
              const pct = storageUsed > 0 ? Math.round((Number(u.storageUsedBytes) / storageUsed) * 100) : 0;
              return (
                <div key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground font-mono text-right">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{(u.displayName || u.email)[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{u.displayName || u.email}</p>
                      <p className="text-xs text-muted-foreground ml-2 shrink-0">{formatBytes(Number(u.storageUsedBytes))}</p>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
