'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatBytes } from '@/lib/utils';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  folderId?: string;
}

export function UploadModal({ open, onClose, folderId }: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const queryClient = useQueryClient();

  const updateUpload = (id: string, data: Partial<UploadFile>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    updateUpload(uploadFile.id, { status: 'uploading', progress: 0 });

    const CHUNK_THRESHOLD = 50 * 1024 * 1024; // 50MB

    if (uploadFile.file.size > CHUNK_THRESHOLD) {
      await uploadChunked(uploadFile, folderId);
    } else {
      await uploadDirect(uploadFile, folderId);
    }
  };

  const uploadDirect = async (uploadFile: UploadFile, folderId?: string) => {
    const formData = new FormData();
    formData.append('file', uploadFile.file);
    if (folderId) formData.append('folderId', folderId);

    try {
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          updateUpload(uploadFile.id, { progress: pct });
        },
      });
      updateUpload(uploadFile.id, { status: 'done', progress: 100 });
    } catch (err: any) {
      updateUpload(uploadFile.id, { status: 'error', error: err?.response?.data?.message || 'Upload failed' });
    }
  };

  const uploadChunked = async (uploadFile: UploadFile, folderId?: string) => {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const totalChunks = Math.ceil(uploadFile.file.size / CHUNK_SIZE);

    try {
      const { data: session } = await api.post('/files/chunk/init', {
        filename: uploadFile.file.name,
        mimeType: uploadFile.file.type,
        totalSize: uploadFile.file.size,
        totalChunks,
        chunkSize: CHUNK_SIZE,
        folderId,
      });

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, uploadFile.file.size);
        const chunk = uploadFile.file.slice(start, end);

        const form = new FormData();
        form.append('chunk', chunk);
        form.append('uploadId', session.id);
        form.append('chunkIndex', String(i));

        await api.post('/files/chunk/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        updateUpload(uploadFile.id, { progress: Math.round(((i + 1) / totalChunks) * 90) });
      }

      await api.post('/files/chunk/complete', { uploadId: session.id });
      updateUpload(uploadFile.id, { status: 'done', progress: 100 });
    } catch (err: any) {
      updateUpload(uploadFile.id, { status: 'error', error: err?.response?.data?.message || 'Upload failed' });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: UploadFile[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    newUploads.forEach((u) => {
      uploadFile(u).then(() => {
        queryClient.invalidateQueries({ queryKey: ['files'] });
      });
    });
  }, [folderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const handleClose = () => {
    const hasActive = uploads.some((u) => u.status === 'uploading' || u.status === 'pending');
    if (hasActive) {
      toast.warning('Uploads are in progress. Please wait.');
      return;
    }
    setUploads([]);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 mx-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upload Files</h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition',
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">or click to select files</p>
            <p className="text-xs text-muted-foreground mt-3">Any file type supported • Max 5 GB per file</p>
          </div>

          {uploads.length > 0 && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {uploads.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <File className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{u.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(u.file.size)}</p>
                    {(u.status === 'uploading' || u.status === 'done') && (
                      <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', u.status === 'done' ? 'bg-green-500' : 'bg-primary')}
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                    )}
                    {u.error && <p className="text-xs text-destructive mt-0.5">{u.error}</p>}
                  </div>
                  <div className="shrink-0">
                    {u.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    {u.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {u.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
