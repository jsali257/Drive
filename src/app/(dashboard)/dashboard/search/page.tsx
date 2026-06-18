'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Files, FolderOpen, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { api, formatBytes } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.data),
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files and folders..."
          autoFocus
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition text-base"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {data.total} result{data.total !== 1 ? 's' : ''} for &quot;{data.query}&quot;
          </p>

          {data.folders?.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Folders ({data.folders.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.folders.map((folder: any) => (
                  <div key={folder.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <FolderOpen className="w-8 h-8 text-yellow-500" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">{folder.path}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.files?.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Files className="w-4 h-4" /> Files ({data.files.length})
              </h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Size</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Type</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.files.map((file: any) => (
                      <tr key={file.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <p className="text-sm font-medium">{file.originalName}</p>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{formatBytes(Number(file.size))}</td>
                        <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{file.extension?.toUpperCase()}</td>
                        <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{format(new Date(file.createdAt), 'MMM dd, yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.total === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No results for &quot;{data.query}&quot;</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try different keywords</p>
            </div>
          )}
        </div>
      )}

      {!data && !isLoading && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Search className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Start typing to search</p>
        </div>
      )}
    </div>
  );
}
