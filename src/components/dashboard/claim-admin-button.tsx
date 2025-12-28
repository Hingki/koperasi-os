'use client';

import { useState, useTransition } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { grantAdminAccess } from '@/app/dashboard/actions';
import { useRouter } from 'next/navigation';

export function ClaimAdminButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleClaim = () => {
    setError(null);
    startTransition(async () => {
      try {
        await grantAdminAccess();
        setSuccess(true);
        router.refresh(); // Ensure client-side state updates
      } catch (err: any) {
        console.error('Claim admin error:', err);
        setError(err.message || 'Failed to claim access');
      }
    });
  };

  if (success) {
    return (
      <div className="text-sm text-green-600 font-medium flex items-center bg-green-50 px-3 py-2 rounded-lg border border-green-200">
        <Key className="mr-2 h-4 w-4" />
        Admin Access Granted!
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleClaim}
        disabled={isPending}
        className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Key className="mr-2 h-4 w-4" />
        )}
        Claim Admin Access
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1 font-medium bg-red-50 px-2 py-1 rounded">
          {error}
        </p>
      )}
    </div>
  );
}
