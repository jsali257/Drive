'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Moon, Sun, Menu, Upload } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface TopbarProps {
  onMenuClick: () => void;
  onUploadClick: () => void;
}

export function Topbar({ onMenuClick, onUploadClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur flex items-center gap-4 px-4 sticky top-0 z-40">
      <button
        onClick={onMenuClick}
        className="text-muted-foreground hover:text-foreground transition md:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Search files and folders..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary cursor-pointer">
          {user?.displayName?.[0] || user?.email?.[0] || '?'}
        </div>
      </div>
    </header>
  );
}
