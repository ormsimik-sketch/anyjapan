"use client";

import { useToast } from "@/hooks/useToast";

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg"
        >
          <span className="text-sm font-medium text-foreground">{toast.message}</span>
          <div className="flex items-center gap-3">
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className="text-sm font-semibold text-accent"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-sm text-muted"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
