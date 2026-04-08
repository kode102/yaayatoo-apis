"use client";

import {useCallback, useRef, useState, type ReactNode} from "react";

type Ripple = {id: number; x: number; y: number};

type RippleIconButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  rippleClassName?: string;
  children: ReactNode;
};

/**
 * Bouton icône circulaire avec onde au point de contact (style Material).
 */
export function RippleIconButton({
  label,
  onClick,
  disabled,
  className = "",
  rippleClassName = "bg-white/35",
  children,
}: RippleIconButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const id = idRef.current++;
      setRipples((prev) => [
        ...prev,
        {
          id,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        },
      ]);
    },
    [disabled],
  );

  const clearRipple = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      className={`relative inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-full text-current transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className={`pointer-events-none absolute rounded-full animate-material-ripple ${rippleClassName}`}
          style={{
            left: r.x,
            top: r.y,
            width: 88,
            height: 88,
            marginLeft: -44,
            marginTop: -44,
          }}
          onAnimationEnd={() => clearRipple(r.id)}
        />
      ))}
      <span className="relative z-[1] flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}
