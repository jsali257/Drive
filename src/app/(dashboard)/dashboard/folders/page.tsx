'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, FolderPlus, Trash2, RefreshCw, ChevronRight, Home,
  Pencil, X, Check, Folder, Upload, Files, Download, Share2, Link2, CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api, formatBytes } from '@/lib/api';
import { cn, getFileBadgeColor } from '@/lib/utils';
import { UploadModal } from '@/components/upload/upload-modal';
import { ShareModal } from '@/components/shares/share-modal';

interface FolderItem {
  id: string;
  name: string;
  description?: string;
  colorTag?: string;
  parentId?: string;
  createdAt: string;
}

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  extension?: string;
  size: number | bigint;
  createdAt: string;
  downloadCount?: number;
}

const FOLDER_COLORS: Record<string, string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  pink: 'text-pink-500',
  default: 'text-muted-foreground',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export default function FoldersPage() {
  const [parentId, setParentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Home' }]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [shareFile, setShareFile] = useState<{ id: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const insideFolder = parentId !== null;

  const { data: folderData, isLoading: foldersLoading, refetch } = useQuery({
    queryKey: ['folders', parentId],
    queryFn: () =>
      api.get(`/folders?${parentId ? `parentId=${parentId}` : 'root=true'}`).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const { data: fileData, isLoading: filesLoading } = useQuery({
    queryKey: ['folder-files', parentId],
    queryFn: () =>
      api.get(`/files?folderId=${parentId}&limit=100&sortBy=createdAt&sortOrder=desc`).then((r) => r.data),
    enabled: insideFolder,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/folders', { name, parentId: parentId ?? undefined }),
    onSuccess: () => {
      toast.success('Folder created');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowCreate(false);
      setNewName('');
    },
    onError: () => toast.error('Failed to create folder'),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/folders/${id}`, { name }),
    onSuccess: () => {
      toast.success('Folder renamed');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setRenamingId(null);
    },
    onError: () => toast.error('Failed to rename folder'),
  });

  const trashFolderMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/folders/${id}`),
    onSuccess: () => {
      toast.success('Folder moved to trash');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: () => toast.error('Failed to delete folder'),
  });

  const trashFileMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/files/${id}`),
    onSuccess: () => {
      toast.success('File moved to trash');
      queryClient.invalidateQueries({ queryKey: ['folder-files'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => toast.error('Failed to delete file'),
  });

  const navigateInto = (folder: FolderItem) => {
    setParentId(folder.id);
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateTo = (index: number) => {
    const crumb = breadcrumb[index];
    setParentId(crumb.id);
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  };

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
    fetch(`${API_URL}/api/files/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      });
  };

  const folders: FolderItem[] = folderData?.data || folderData || [];
  const files: FileItem[] = fileData?.data || [];
  const isLoading = foldersLoading || (insideFolder && filesLoading);
  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Folders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {folders.length} folder{folders.length !== 1 ? 's' : ''}
            {insideFolder && files.length > 0 && `, ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          {insideFolder && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              <Upload className="w-4 h-4" />
              Upload Files
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            <button
              onClick={() => navigateTo(i)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition',
                i === breadcrumb.length - 1 ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {i === 0 && <Home className="w-3.5 h-3.5" />}
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Create folder input */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <p className="text-sm font-medium mb-3">New folder name</p>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) createMutation.mutate(newName.trim());
                  if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
                }}
                placeholder="Folder name"
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
              <button
                onClick={() => { if (newName.trim()) createMutation.mutate(newName.trim()); }}
                disabled={!newName.trim() || createMutation.isPending}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                Create
              </button>
              <button onClick={() => { setShowCreate(false); setNewName(''); }} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderOpen className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {insideFolder ? 'This folder is empty' : 'No folders yet'}
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {insideFolder ? 'Upload files or create a subfolder' : 'Create a folder to organize your files'}
          </p>
          <div className="flex items-center gap-2 mt-4">
            {insideFolder && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
              >
                <Upload className="w-4 h-4" /> Upload Files
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
            >
              <FolderPlus className="w-4 h-4" /> New Folder
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subfolders */}
          {folders.length > 0 && (
            <div>
              {insideFolder && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subfolders</p>}
              <AnimatePresence mode="wait">
                <motion.div
                  key={parentId ?? 'root'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                >
                  {folders.map((folder) => (
                    <motion.div
                      key={folder.id}
                      layout
                      whileHover={{ y: -2 }}
                      onClick={() => renamingId !== folder.id && navigateInto(folder)}
                      className="bg-card border border-border rounded-xl p-4 group cursor-pointer hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Folder className={cn('w-10 h-10', FOLDER_COLORS[folder.colorTag || 'default'])} />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenamingId(folder.id); setRenameValue(folder.name); }}
                            className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); trashFolderMutation.mutate(folder.id); }}
                            className="p-1 rounded hover:bg-muted transition text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {renamingId === folder.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameMutation.mutate({ id: folder.id, name: renameValue });
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="flex-1 px-2 py-0.5 rounded text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button onClick={() => renameMutation.mutate({ id: folder.id, name: renameValue })} className="text-green-600">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(folder.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Files inside this folder */}
          {insideFolder && files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Files ({files.length})
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Upload className="w-3 h-3" /> Upload more
                </button>
              </div>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {files.map((file, i) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors',
                        i < files.length - 1 && 'border-b border-border',
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Files className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.originalName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatBytes(Number(file.size))}</span>
                          {file.extension && (
                            <span className={cn('inline-flex px-1.5 py-0.5 rounded text-xs font-medium', getFileBadgeColor(file.mimeType))}>
                              {file.extension.toUpperCase()}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{format(new Date(file.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                          onClick={() => trashFileMutation.mutate(file.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Empty files section prompt (inside folder, only folders exist) */}
          {insideFolder && files.length === 0 && folders.length > 0 && (
            <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground">No files in this folder yet.</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline mx-auto"
              >
                <Upload className="w-3.5 h-3.5" /> Upload files here
              </button>
            </div>
          )}
        </div>
      )}

      <UploadModal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          queryClient.invalidateQueries({ queryKey: ['folder-files', parentId] });
        }}
        folderId={parentId ?? undefined}
      />
      <ShareModal
        open={shareFile !== null}
        onClose={() => setShareFile(null)}
        fileId={shareFile?.id}
        fileName={shareFile?.name}
      />
    </div>
  );
}

