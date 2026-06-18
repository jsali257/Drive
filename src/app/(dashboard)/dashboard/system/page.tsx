'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Database, HardDrive, Cpu, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { api, formatBytes } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function SystemPage() {
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/system/health').then((r) => r.data),
    refetchInterval: 30000,
  });

  const StatusDot = ({ up }: { up: boolean }) => (
    <div className={cn('w-2.5 h-2.5 rounded-full', up ? 'bg-green-500' : 'bg-red-500')} />
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time server status and diagnostics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium', health?.status === 'healthy' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700')}>
            {health?.status === 'healthy' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {health?.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Services</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(health?.services || {}).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm capitalize">{name}</span>
                <div className="flex items-center gap-2">
                  <StatusDot up={status === 'up'} />
                  <span className={cn('text-xs font-medium', status === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600')}>
                    {String(status).toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Runtime</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="text-sm font-medium">{Math.floor((health?.uptime || 0) / 60)} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Node.js</span>
              <span className="text-sm font-medium font-mono">{health?.node}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform</span>
              <span className="text-sm font-medium capitalize">{health?.platform}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium">v{health?.version}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">System</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CPU Cores</span>
              <span className="text-sm font-medium">{health?.system?.cpuCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Memory</span>
              <span className="text-sm font-medium">{health?.system?.totalMemoryMb} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Free Memory</span>
              <span className="text-sm font-medium">{health?.system?.freeMemoryMb} MB</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <span className="text-sm font-medium">
                  {health?.system ? Math.round(100 - (health.system.freeMemoryMb / health.system.totalMemoryMb) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${health?.system ? Math.round(100 - (health.system.freeMemoryMb / health.system.totalMemoryMb) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Disk Storage</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Path</span>
              <span className="text-sm font-mono font-medium">{health?.disk?.path}</span>
            </div>
            {health?.disk?.totalBytes && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-sm font-medium">{formatBytes(health.disk.totalBytes)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <span className="text-sm font-medium">{formatBytes(health.disk.usedBytes)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Free</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatBytes(health.disk.freeBytes)}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Usage</span>
                    <span className="text-sm font-medium">
                      {Math.round((health.disk.usedBytes / health.disk.totalBytes) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.round((health.disk.usedBytes / health.disk.totalBytes) * 100)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'} · Auto-refreshes every 30s
      </p>
    </div>
  );
}
