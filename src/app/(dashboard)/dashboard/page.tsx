'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HardDrive, Files, Users, Key, Upload, Download, TrendingUp,
  Activity, AlertCircle, ArrowUpRight,
} from 'lucide-react';
import { api, formatBytes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import Link from 'next/link';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

function StatCard({ icon: Icon, label, value, sub, color, href }: any) {
  const content = (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get(isAdmin ? '/storage/stats' : '/storage/me').then((r) => r.data),
    enabled: true,
  });

  const { data: activityData } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => api.get('/logs/activity?limit=10').then((r) => r.data),
  });

  const { data: recentFiles } = useQuery({
    queryKey: ['recent-files'],
    queryFn: () => api.get('/files?limit=5&sortBy=createdAt&sortOrder=desc').then((r) => r.data),
  });

  const storagePercent = stats
    ? Math.min(100, Math.round((Number(stats.storageUsedBytes) / Math.max(1, Number(stats.storageQuotaBytes || stats.storageUsedBytes + 1))) * 100))
    : 0;

  const storageData = [
    { name: 'Used', value: Number(stats?.storageUsedBytes || 0) },
    { name: 'Free', value: Math.max(0, Number(stats?.storageQuotaBytes || 0) - Number(stats?.storageUsedBytes || 0)) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">RGV911</p>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.displayName || user?.username}
        </h1>
        <p className="text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening with your storage</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Files}
          label="Total Files"
          value={(stats?.totalFiles ?? '—').toLocaleString?.() ?? '—'}
          sub="Active files"
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
          href="/dashboard/files"
        />
        <StatCard
          icon={HardDrive}
          label="Storage Used"
          value={formatBytes(stats?.storageUsedBytes || 0)}
          sub={isAdmin ? 'Total platform storage' : 'Your storage'}
          color="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
          href="/dashboard/storage"
        />
        {isAdmin && (
          <>
            <StatCard
              icon={Users}
              label="Total Users"
              value={(stats?.totalUsers ?? '—').toLocaleString?.() ?? '—'}
              sub="Registered accounts"
              color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
              href="/dashboard/users"
            />
            <StatCard
              icon={Key}
              label="API Keys"
              value={(stats?.activeApiKeys ?? '—').toLocaleString?.() ?? '—'}
              sub="Active API keys"
              color="bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400"
              href="/dashboard/api-keys"
            />
          </>
        )}
        {!isAdmin && (
          <StatCard
            icon={Upload}
            label="Uploads Today"
            value={stats?.uploadsToday ?? '—'}
            sub="Files uploaded"
            color="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
          />
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Upload}
            label="Uploads Today"
            value={stats?.uploadsToday ?? '—'}
            sub="Files uploaded today"
            color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400"
          />
          <StatCard
            icon={Download}
            label="Downloads Today"
            value={stats?.downloadsToday ?? '—'}
            sub="Files downloaded today"
            color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Storage Usage</h2>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-muted-foreground">
              {formatBytes(stats?.storageUsedBytes || 0)} used
              {stats?.storageQuotaBytes ? ` of ${formatBytes(stats?.storageQuotaBytes)}` : ''}
            </span>
            <span className="ml-auto text-sm font-medium text-foreground">{storagePercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storagePercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-primary'}`}
            />
          </div>

          <div className="mt-6 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recentFiles?.data?.map((f: any, i: number) => ({ name: format(new Date(f.createdAt), 'MM/dd'), size: Number(f.size) })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => formatBytes(v)} />
                <Tooltip formatter={(v: any) => formatBytes(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Area type="monotone" dataKey="size" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Recent Files</h2>
          <div className="space-y-3">
            {recentFiles?.data?.slice(0, 5).map((file: any) => (
              <div key={file.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Files className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
              </div>
            ))}
            {!recentFiles?.data?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">No files yet</p>
            )}
          </div>
          <Link href="/dashboard/files" className="mt-4 flex items-center gap-1 text-sm text-primary hover:underline">
            View all files <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {activityData?.data?.slice(0, 8).map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{log.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(log.createdAt), 'MMM dd, HH:mm')}</p>
              </div>
            </div>
          ))}
          {!activityData?.data?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
