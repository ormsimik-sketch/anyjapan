"use client";

import { useId, useState, type FormEvent } from "react";

import { Sheet } from "@/components/Sheet";
import { MAX_SINGLE_ENTRY_ML } from "@/lib/constants";

interface AddCustomSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (amountMl: number) => void;
}

export function AddCustomSheet({ open, onClose, onAdd }: AddCustomSheetProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const handleClose = () => {
    setValue("");
    setError(null);
    onClose();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(value);

    if (!value.trim() || !Number.isFinite(amount)) {
      setError("Enter an amount in ml.");
      return;
    }
    if (amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (amount > MAX_SINGLE_ENTRY_ML) {
      setError(`Max ${MAX_SINGLE_ENTRY_ML.toLocaleString()} ml per entry.`);
      return;
    }

    onAdd(Math.round(amount));
    setValue("");
    setError(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} title="Add custom amount">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-muted">
          Amount (ml)
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_SINGLE_ENTRY_ML}
          placeholder="e.g. 350"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          className="w-full rounded-2xl border border-border bg-surface-muted px-4 py-4 text-2xl font-semibold tabular-nums text-foreground outline-none ring-accent focus:ring-2"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-2 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="mt-5 w-full rounded-2xl bg-accent py-4 text-base font-semibold text-white transition-transform active:scale-[0.98]"
        >
          Add
        </button>
      </form>
    </Sheet>
  );
}
