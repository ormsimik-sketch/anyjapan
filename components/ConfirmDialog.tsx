"use client";

import { Sheet } from "@/components/Sheet";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
}: ConfirmDialogProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-sm leading-relaxed text-muted">{description}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl border border-border bg-surface-muted py-3.5 text-sm font-semibold text-foreground transition-transform active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1 rounded-2xl bg-danger py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
