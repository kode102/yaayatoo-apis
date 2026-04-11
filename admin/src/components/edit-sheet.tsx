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
  /** Zone centrale scrollable (formulaires longs). */
  scrollableContent?: boolean;
};

export function EditSheet({
  open,
  title,
  onClose,
  children,
  footer,
  panelClassName,
  scrollableContent,
}: Props) {
  if (!open) return null;
  const panel =
    panelClassName?.trim() || "max-w-md";
  const scroll = Boolean(scrollableContent);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full rounded-t-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:rounded-2xl ${panel} ${
          scroll ? "flex max-h-[min(92vh,900px)] flex-col" : ""
        }`}
      >
        <h2 className="shrink-0 text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {scroll ?
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
            <div className="space-y-3 pb-1">{children}</div>
          </div>
        : <div className="mt-4 space-y-3">{children}</div>}
        {footer ?
          <div className="mt-6 flex w-full shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
            {footer}
          </div>
        : null}
      </div>
    </div>
  );
}
