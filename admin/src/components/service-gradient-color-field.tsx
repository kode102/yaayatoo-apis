"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";

/** Normalise vers #RRGGBB pour input type="color". */
function toPickerHex(hex: string, fallback: string): string {
  const t = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(t) && t.length === 4) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

type Props = {
  color1: string;
  color2: string;
  onColor1: (v: string) => void;
  onColor2: (v: string) => void;
  disabled?: boolean;
};

/**
 * Aperçu dégradé + deux sélecteurs couleur (pastille native + hex).
 */
export function ServiceGradientColorField({
  color1,
  color2,
  onColor1,
  onColor2,
  disabled,
}: Props) {
  const {t} = useUiLocale();
  const p1 = toPickerHex(color1, "#667eea");
  const p2 = toPickerHex(color2, "#764ba2");

  return (
    <div className="space-y-4">
      <div
        className="h-16 w-full rounded-2xl border border-gray-200/80 shadow-inner"
        style={{
          background: `linear-gradient(135deg, ${p1} 0%, ${p2} 100%)`,
        }}
        role="img"
        aria-label={t("services.marketing.gradientPreview")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
          <span className="mb-3 block text-sm font-medium text-gray-800">
            {t("services.marketing.color1")}
          </span>
          <div className="flex items-stretch gap-3">
            <label className="relative flex h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200">
              <input
                type="color"
                disabled={disabled}
                value={p1}
                onChange={(e) => onColor1(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <span
                className="pointer-events-none block h-full w-full"
                style={{backgroundColor: p1}}
              />
            </label>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <span className="text-xs text-gray-500">
                {t("services.marketing.hex")}
              </span>
              <input
                type="text"
                disabled={disabled}
                value={color1}
                onChange={(e) => onColor1(e.target.value)}
                onBlur={() => onColor1(toPickerHex(color1, p1))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm"
                placeholder="#667eea"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
          <span className="mb-3 block text-sm font-medium text-gray-800">
            {t("services.marketing.color2")}
          </span>
          <div className="flex items-stretch gap-3">
            <label className="relative flex h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-white shadow-md ring-1 ring-gray-200">
              <input
                type="color"
                disabled={disabled}
                value={p2}
                onChange={(e) => onColor2(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              <span
                className="pointer-events-none block h-full w-full"
                style={{backgroundColor: p2}}
              />
            </label>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <span className="text-xs text-gray-500">
                {t("services.marketing.hex")}
              </span>
              <input
                type="text"
                disabled={disabled}
                value={color2}
                onChange={(e) => onColor2(e.target.value)}
                onBlur={() => onColor2(toPickerHex(color2, p2))}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm"
                placeholder="#764ba2"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
