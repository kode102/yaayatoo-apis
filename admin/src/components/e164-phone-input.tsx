"use client";

import {useMemo, type CSSProperties} from "react";
import PhoneInput, {type Country, type Labels} from "react-phone-number-input";
import enLabels from "react-phone-number-input/locale/en.json";
import frLabels from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";

export type E164PhoneInputProps = {
  id?: string;
  /** Numéro au format E.164 (ex. +237…) ; chaîne vide si vide. */
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  /** Aligné sur l’UI admin : noms de pays en français ou anglais. */
  labelsLocale: "fr" | "en";
  /** Pays pré-sélectionné (ISO 3166-1 alpha-2). */
  defaultCountry?: Country;
  placeholder?: string;
};

export function E164PhoneInput({
  id,
  value,
  onChange,
  disabled,
  labelsLocale,
  defaultCountry = "CM",
  placeholder,
}: E164PhoneInputProps) {
  const labels = useMemo((): Labels => {
    const raw = labelsLocale === "fr" ? frLabels : enLabels;
    return raw as unknown as Labels;
  }, [labelsLocale]);

  return (
    <div
      className={
        "mt-1 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm " +
        "focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 " +
        "focus-within:outline-none [&_.PhoneInput]:min-h-[38px] [&_.PhoneInputInput]:text-sm " +
        "[&_.PhoneInputInput]:text-gray-900"
      }
      style={
        {
          "--PhoneInput-color--focus": "rgb(2 102 255)",
        } as CSSProperties
      }
    >
      <PhoneInput
        id={id}
        international
        defaultCountry={defaultCountry}
        labels={labels}
        placeholder={placeholder}
        value={value || undefined}
        onChange={(v) => onChange(v ?? "")}
        disabled={disabled}
        className="PhoneInput !w-full !border-0 !shadow-none !ring-0"
        numberInputProps={{
          className:
            "PhoneInputInput !min-h-0 !border-0 !bg-transparent !shadow-none " +
            "!outline-none !ring-0 focus:!ring-0",
        }}
      />
    </div>
  );
}
