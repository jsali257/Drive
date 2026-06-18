'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Files, Grid3X3, List, Download, Trash2, Share2,
  RefreshCw, SortAsc, SortDesc, Link2, CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api, formatBytes } from '@/lib/api';
import { cn, getFileIcon, getFileBadgeColor } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { UploadModal } from '@/components/upload/upload-modal';
import { ShareModal } from '@/components/shares/share-modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

function FileIcon({ mimeType, extension }: { mimeType: string; extension: string }) {
  const icon = getFileIcon(mimeType, extension);
  const colors: Record<string, string> = {
    image: 'bg-purple-100 text-purple-600',
    video: 'bg-red-100 text-red-600',
    music: 'bg-pink-100 text-pink-600',
    'file-text': 'bg-blue-100 text-blue-600',
    'file-code': 'bg-green-100 text-green-600',
    archive: 'bg-yellow-100 text-yellow-600',
    file: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', colors[icon] || colors.file)}>
      <Files className="w-5 h-5" />
    </div>
  );
}

export default function FilesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [shareFile, setShareFile] = useState<{ id: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['files', page, sortBy, sortOrder],
    queryFn: () =>
      api.get(`/files?page=${page}&limit=20&sortBy=${sortBy}&sortOrder=${sortOrder}`).then((r) => r.data),
  });

  const trashMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      toast.success('File moved to trash');
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => toast.error('Failed to delete file'),
  });

  const copyDirectLink = async (fileId: string, fileName: string) => {
    try {
      const { data } = await api.post('/shares', { fileId });
      const encoded = encodeURIComponent(fileName);
      const viewUrl = `${API_URL}/api/shares/${data.token}/view/${encoded}`;
      await navigator.clipboard.writeText(viewUrl);
      setCopiedId(fileId);
      toast.success('Direct link copied!');
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.error('Failed to create link');
    }
  };

  const downloadFile = (id: string, name: string) => {
    const token = localStorage.getItem('access_token');
    const a = document.createElement('a');
    a.href = `${API_URL}/api/files/${id}/download`;
    a.download = name;
    if (token) {
      fetch(`${API_URL}/api/files/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.blob())
        .then((blob) => {
          a.href = URL.createObjectURL(blob);
          a.click();
        });
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const files = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Files</h1>
          {meta && <p className="text-sm text-muted-foreground mt-0.5">{meta.total.toLocaleString()} files total</p>}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <button
                onClick={() => {
                  Promise.all(Array.from(selectedIds).map((id) => trashMutation.mutateAsync(id))).then(() => setSelectedIds(new Set()));
                }}
                className="px-3 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </motion.div>
          )}
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
          >
            {viewMode === 'list' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Files className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No files yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">Upload your first file to get started</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            Upload Files
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(files.map((f: any) => f.id)) : new Set())}
                        checked={selectedIds.size === files.length && files.length > 0}
                      />
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                    <th
                      className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort('size')}
                    >
                      <span className="flex items-center gap-1">
                        Size
                        {sortBy === 'size' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </span>
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Type</th>
                    <th
                      className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground hidden md:table-cell"
                      onClick={() => toggleSort('createdAt')}
                    >
                      <span className="flex items-center gap-1">
                        Uploaded
                        {sortBy === 'createdAt' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                      </span>
                    </th>
                    <th className="w-24 p-3" />
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {files.map((file: any) => (
                      <motion.tr
                        key={file.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn('border-b border-border last:border-0 hover:bg-muted/30 transition-colors', selectedIds.has(file.id) && 'bg-primary/5')}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedIds.has(file.id)}
                            onChange={() => toggleSelect(file.id)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <FileIcon mimeType={file.mimeType} extension={file.extension} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-xs">{file.originalName}</p>
                              <p className="text-xs text-muted-foreground">{file.downloadCount?.toString()} downloads</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatBytes(Number(file.size))}</td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', getFileBadgeColor(file.mimeType))}>
                            {file.extension?.toUpperCase() || 'â€”'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                          {format(new Date(file.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => copyDirectLink(file.id, file.originalName)}
                              className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-primary"
                              title="Copy direct link"
                            >
                              {copiedId === file.id
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                : <Link2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setShareFile({ id: file.id, name: file.originalName })}
                              className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-blue-500"
                              title="Share with options"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
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
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {files.map((file: any) => (
                <motion.div
                  key={file.id}
                  layout
                  whileHover={{ y: -2 }}
                  className={cn(
                    'bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-all',
                    selectedIds.has(file.id) && 'border-primary bg-primary/5',
                  )}
                  onClick={() => toggleSelect(file.id)}
                >
                  {file.hasThumbnail ? (
                    <img
                      src={`${API_URL}/api/files/${file.id}/thumbnail`}
                      alt={file.originalName}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                      <Files className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-xs text-center truncate w-full font-medium">{file.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(Number(file.size))}</p>
                  <div className="flex items-center gap-1 w-full justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyDirectLink(file.id, file.originalName); }}
                      className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-primary"
                      title="Copy direct link"
                    >
                      {copiedId === file.id
                        ? <CheckCircle className="w-3 h-3 text-green-500" />
                        : <Link2 className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShareFile({ id: file.id, name: file.originalName }); }}
                      className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-blue-500"
                      title="Share with options"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadFile(file.id, file.originalName); }}
                      className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                      title="Download"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!meta.hasPrevPage}
                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={!meta.hasNextPage}
                className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
      <ShareModal
        open={shareFile !== null}
        onClose={() => setShareFile(null)}
        fileId={shareFile?.id}
        fileName={shareFile?.name}
      />
    </div>
  );
}

