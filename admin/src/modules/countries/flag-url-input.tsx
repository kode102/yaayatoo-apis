"use client";

import {useEffect, useState} from "react";

type FlagUrlInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
};

export function FlagUrlInput({
  label,
  placeholder,
  value,
  onChange,
}: FlagUrlInputProps) {
  const trimmed = value.trim();
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [trimmed]);

  return (
    <label className="block text-sm text-gray-700">
      {label}
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          {trimmed && !broken ?
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL externe dynamique */}
              <img
                src={trimmed}
                alt="Flag preview"
                className="h-full w-full object-contain"
                loading="lazy"
                onError={() => setBroken(true)}
              />
            </>
          : <span className="text-xs text-gray-400">🏳️</span>}
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1.5 text-sm text-gray-900 outline-none"
        />
      </div>
    </label>
  );
}
