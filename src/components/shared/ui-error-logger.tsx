'use client';

import { useEffect } from 'react';

function postLog(payload: any) {
  try {
    fetch('/api/system-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {}
}

export function UiErrorLogger({ route }: { route?: string }) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = String(event.message || 'UI Error');
      postLog({
        action_type: 'SYSTEM',
        action_detail: 'UI_ERROR',
        status: 'WARNING',
        metadata: { message, route },
      });
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const message = event && event.reason ? String(event.reason) : 'Unhandled Rejection';
      postLog({
        action_type: 'SYSTEM',
        action_detail: 'UI_ERROR',
        status: 'WARNING',
        metadata: { message, route },
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, [route]);

  return null;
}

