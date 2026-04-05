"use client";

import type {ReactNode} from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function EditSheet({open, title, onClose, children, footer}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl sm:rounded-xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="mt-4 space-y-3">{children}</div>
        {footer ?
          <div className="mt-6 flex justify-end gap-2">{footer}</div>
        : null}
      </div>
    </div>
  );
}
