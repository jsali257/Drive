'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, RefreshCw, RotateCcw, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api, formatBytes } from '@/lib/api';

export default function TrashPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trash'],
    queryFn: () => api.get('/files/trash?limit=50').then((r) => r.data),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/files/${id}/restore`),
    onSuccess: () => { toast.success('File restored'); queryClient.invalidateQueries({ queryKey: ['trash'] }); queryClient.invalidateQueries({ queryKey: ['files'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}/permanent`),
    onSuccess: () => { toast.success('File permanently deleted'); queryClient.invalidateQueries({ queryKey: ['trash'] }); },
  });

  const files = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} in trash</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {files.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Trash2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Trash is empty</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Deleted files will appear here</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">File</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Size</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Deleted</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {files.map((file: any) => (
                <tr key={file.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <p className="text-sm font-medium">{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">{file.extension?.toUpperCase()}</p>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{formatBytes(Number(file.size))}</td>
                  <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                    {file.trashedAt ? format(new Date(file.trashedAt), 'MMM dd, yyyy') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => restoreMutation.mutate(file.id)} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-green-600" title="Restore">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(file.id)} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive" title="Delete permanently">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
