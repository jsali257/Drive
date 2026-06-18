'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Shield, Clock, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const createKeySchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  description: z.string().optional(),
  rateLimitPerMin: z.number().min(1).max(10000).default(60),
  expiresAt: z.string().optional(),
  allowedIps: z.string().optional(),
});

type CreateKeyForm = z.infer<typeof createKeySchema>;

function ApiKeyCard({ apiKey, onRevoke, onDelete }: { apiKey: any; onRevoke: () => void; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyPrefix = () => {
    navigator.clipboard.writeText(apiKey.keyPrefix);
    setCopied(true);
    toast.success('Key prefix copied — the full key was only shown at creation');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${apiKey.status === 'ACTIVE' ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{apiKey.name}</h3>
            {apiKey.description && <p className="text-sm text-muted-foreground">{apiKey.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-[200px]">{apiKey.keyPrefix}••••••••••••••</code>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Full key shown once at creation</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${apiKey.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
            {apiKey.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Rate Limit</p>
          <p className="text-sm font-medium">{apiKey.rateLimitPerMin}/min</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Usage</p>
          <p className="text-sm font-medium">{apiKey.usageCount?.toString() || 0} calls</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Last Used</p>
          <p className="text-sm font-medium">{apiKey.lastUsedAt ? format(new Date(apiKey.lastUsedAt), 'MMM dd') : 'Never'}</p>
        </div>
      </div>

      {apiKey.expiresAt && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          Expires {format(new Date(apiKey.expiresAt), 'MMM dd, yyyy')}
        </div>
      )}

      <div className="flex items-center gap-2 mt-4">
        {apiKey.status === 'ACTIVE' && (
          <button
            onClick={onRevoke}
            className="flex-1 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition flex items-center justify-center gap-1"
          >
            <Shield className="w-3.5 h-3.5" /> Revoke
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex-1 py-1.5 text-sm rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </motion.div>
  );
}

export default function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateKeyForm) =>
      api.post('/api-keys', { ...data, allowedIps: data.allowedIps?.split(',').map((s) => s.trim()).filter(Boolean) || [] }).then((r) => r.data),
    onSuccess: (data) => {
      setNewKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setShowCreate(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create API key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api-keys/${id}/revoke`),
    onSuccess: () => { toast.success('API key revoked'); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => { toast.success('API key deleted'); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateKeyForm>({
    resolver: zodResolver(createKeySchema),
    defaultValues: { rateLimitPerMin: 60 },
  });

  const onSubmit = (data: CreateKeyForm) => createMutation.mutate(data);

  const keys = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage programmatic access to your storage</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus className="w-4 h-4" /> New API Key
        </button>
      </div>

      {newKey && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border-2 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 shrink-0 mt-0.5">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">API Key Created Successfully</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                This is the <strong>only time</strong> the full key will be shown. Copy it now — it cannot be recovered.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-black/30 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2.5">
            <code className="flex-1 text-sm font-mono text-green-900 dark:text-green-100 break-all select-all">
              {newKey}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Full API key copied to clipboard!'); }}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Full Key
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-green-600 dark:text-green-400">Tip: store this in an environment variable, never in source code</p>
            <button
              onClick={() => setNewKey(null)}
              className="text-xs font-medium text-green-700 dark:text-green-300 hover:underline"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        </motion.div>
      )}

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name *</label>
                <input {...register('name')} placeholder="My App Key" className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rate Limit (req/min)</label>
                <input {...register('rateLimitPerMin', { valueAsNumber: true })} type="number" className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <input {...register('description')} placeholder="Optional description" className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Allowed IPs (comma-separated)</label>
                <input {...register('allowedIps')} placeholder="Leave empty for all IPs" className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Expires At</label>
                <input {...register('expiresAt')} type="date" className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Key'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keys.map((key: any) => (
          <ApiKeyCard
            key={key.id}
            apiKey={key}
            onRevoke={() => revokeMutation.mutate(key.id)}
            onDelete={() => deleteMutation.mutate(key.id)}
          />
        ))}
        {!isLoading && keys.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center h-48 text-center">
            <Key className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No API keys yet</p>
            <p className="text-sm text-muted-foreground/70">Create one to enable programmatic access</p>
          </div>
        )}
      </div>
    </div>
  );
}
