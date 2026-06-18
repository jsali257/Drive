'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/system/settings').then((r) => r.data),
  });

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      settings.forEach((s: any) => { vals[s.key] = s.value; });
      setFormValues(vals);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put('/system/settings', { settings: Object.entries(formValues).map(([key, value]) => ({ key, value })) }),
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  });

  const grouped = (settings || []).reduce((acc: any, s: any) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Application configuration</p>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {Object.entries(grouped).map(([group, items]: any) => (
        <div key={group} className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground capitalize mb-4">{group}</h2>
          <div className="space-y-4">
            {items.map((setting: any) => (
              <div key={setting.key}>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {setting.label || setting.key}
                </label>
                {setting.type === 'boolean' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formValues[setting.key] === 'true'}
                      onChange={(e) => setFormValues((prev) => ({ ...prev, [setting.key]: e.target.checked ? 'true' : 'false' }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-muted-foreground">{formValues[setting.key] === 'true' ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ) : (
                  <input
                    type={setting.type === 'number' ? 'number' : 'text'}
                    value={formValues[setting.key] || ''}
                    onChange={(e) => setFormValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1 font-mono">{setting.key}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
