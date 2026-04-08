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
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-4 space-y-3">{children}</div>
        {footer ?
          <div className="mt-6 flex justify-end gap-2">{footer}</div>
        : null}
      </div>
    </div>
  );
}
