'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { SyncStatus } from '@/app/lib/types';

export function ImportingScreen() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync');
        if (!res.ok) return;
        const data: SyncStatus = await res.json();
        const latestManual = data.recentSyncs.find((s) => s.type === 'manual');
        if (latestManual && latestManual.status === 'completed') {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // ignore fetch errors, will retry
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="mb-6 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="text-lg text-white/80">Importing your videos...</p>
    </div>
  );
}
