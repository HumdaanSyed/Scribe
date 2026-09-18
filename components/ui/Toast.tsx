'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { cn } from '@/lib/ui/cn';

type ToastKind = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Errors linger longer — they're the ones people need time to read and act on.
const DURATION_MS: Record<ToastKind, number> = { error: 8000, success: 4000, info: 5000 };
const MAX_VISIBLE = 3;

const ACCENT_BAR: Record<ToastKind, string> = {
  error: 'border-l-error',
  success: 'border-l-ok',
  info: 'border-l-accent',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((current) =>
        // Don't stack the exact same message on top of itself.
        current.some((t) => t.kind === kind && t.message === message)
          ? current
          : [...current.slice(-(MAX_VISIBLE - 1)), { id, kind, message }],
      );
      setTimeout(() => dismiss(id), DURATION_MS[kind]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      error: (message) => show('error', message),
      success: (message) => show('success', message),
      info: (message) => show('info', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22.5rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex animate-panel-in items-start justify-between gap-3 rounded-card border border-l-[3px] border-line bg-surface p-3 shadow-overlay',
              ACCENT_BAR[toast.kind],
            )}
          >
            <p className="py-1 text-sm text-fg">{toast.message}</p>
            <Button size="sm" variant="ghost" onClick={() => dismiss(toast.id)}>
              Dismiss
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
  return context;
}
