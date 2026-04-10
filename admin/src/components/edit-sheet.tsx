"use client";

import type {ReactNode} from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Remplace la largeur max du panneau (défaut : max-w-md). */
  panelClassName?: string;
};

export function EditSheet({
  open,
  title,
  onClose,
  children,
  footer,
  panelClassName,
}: Props) {
  if (!open) return null;
  const panel =
    panelClassName?.trim() || "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full rounded-t-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:rounded-2xl ${panel}`}
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-4 space-y-3">{children}</div>
        {footer ?
          <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-2">
            {footer}
          </div>
        : null}
      </div>
    </div>
  );
}
