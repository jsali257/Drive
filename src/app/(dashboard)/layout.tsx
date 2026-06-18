'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { UploadModal } from '@/components/upload/upload-modal';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadUser } = useAuthStore();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only refresh user profile if we already have a token
    const token = localStorage.getItem('access_token');
    if (token) loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          onUploadClick={() => setShowUpload(true)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  );
}
