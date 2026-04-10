"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";

export const PROFILE_WIZARD_STEP_COUNT = 3;

/** Clés i18n pour les 3 étapes : Général, KYC, Meta. */
export const PROFILE_WIZARD_STEP_KEYS = [
  "users.wizard.stepGeneral",
  "users.wizard.stepKyc",
  "users.wizard.stepMeta",
] as const;

export function ProfileWizardStepIndicator({
  currentStep,
}: {
  /** 0 = général, 1 = KYC, 2 = meta */
  currentStep: number;
}) {
  const {t} = useUiLocale();
  const safe = Math.min(
    Math.max(0, currentStep),
    PROFILE_WIZARD_STEP_KEYS.length - 1,
  );

  return (
    <div className="mb-1">
      <p className="mb-3 text-center text-xs font-medium tracking-wide text-gray-500 uppercase">
        {t("users.wizard.stepProgress", {
          current: String(safe + 1),
          total: String(PROFILE_WIZARD_STEP_KEYS.length),
        })}
      </p>
      <ol className="flex items-start justify-between gap-1">
        {PROFILE_WIZARD_STEP_KEYS.map((key, i) => {
          const done = i < safe;
          const active = i === safe;
          return (
            <li
              key={key}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  active ? "bg-primary text-white shadow-sm"
                  : done ? "bg-primary/12 text-primary"
                  : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`hidden text-center text-[10px] font-semibold leading-tight sm:block ${
                  active ? "text-gray-900"
                  : "text-gray-500"
                }`}
              >
                {t(key)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-sm font-medium text-gray-800 sm:hidden">
        {t(PROFILE_WIZARD_STEP_KEYS[safe])}
      </p>
    </div>
  );
}
