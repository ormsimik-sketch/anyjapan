"use client";

import { Plus } from "lucide-react";

import { QUICK_ADD_AMOUNTS_ML } from "@/lib/constants";

interface AddWaterButtonsProps {
  onAdd: (amountMl: number) => void;
  onOpenCustom: () => void;
}

export function AddWaterButtons({ onAdd, onOpenCustom }: AddWaterButtonsProps) {
  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ADD_AMOUNTS_ML.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onAdd(amount)}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-surface py-5 text-foreground shadow-sm transition-transform active:scale-[0.96]"
          >
            <Plus className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-lg font-semibold tabular-nums">{amount} ml</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenCustom}
        className="mt-3 w-full rounded-2xl border border-dashed border-border py-4 text-sm font-semibold text-muted transition-colors hover:text-foreground active:scale-[0.98]"
      >
        Other amount
      </button>
    </div>
  );
}
