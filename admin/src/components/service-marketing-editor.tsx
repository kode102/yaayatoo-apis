"use client";

import {useEffect, useMemo, useState} from "react";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {useEditorLocale} from "@/contexts/editor-locale-context";
import type {ServiceBenefit} from "@/lib/i18n-types";
import type {ServiceMarketingDraft} from "@/lib/service-marketing";
import {ServiceGradientColorField} from "@/components/service-gradient-color-field";
import {ServiceImageUploadField} from "@/components/service-image-upload-field";
type Props = {
  serviceId?: string;
  disabled?: boolean;
  value: ServiceMarketingDraft;
  onChange: (next: ServiceMarketingDraft) => void;
};

const STEP_COUNT = 4;

export function ServiceMarketingEditor({
  serviceId,
  disabled,
  value,
  onChange,
}: Props) {
  const {t} = useUiLocale();
  const {editorLocale, activeLanguages} = useEditorLocale();
  const [step, setStep] = useState(0);
  const [benefitLocale, setBenefitLocale] = useState(
    editorLocale.trim().toLowerCase(),
  );

  useEffect(() => {
    setStep(0);
  }, [serviceId]);
  useEffect(() => {
    const fallback = editorLocale.trim().toLowerCase();
    if (!fallback) return;
    setBenefitLocale((prev) => prev || fallback);
  }, [editorLocale]);

  const benefitLocales = useMemo(
    () =>
      [...activeLanguages]
        .map((lang) => lang.code.trim().toLowerCase())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [activeLanguages],
  );

  useEffect(() => {
    if (benefitLocales.length === 0) return;
    if (!benefitLocales.includes(benefitLocale)) {
      setBenefitLocale(benefitLocales[0]!);
    }
  }, [benefitLocales, benefitLocale]);

  const stepLabel = useMemo(
    () => [
      t("services.marketing.step.colors"),
      t("services.marketing.step.media"),
      t("services.marketing.step.actions"),
      t("services.marketing.step.benefits"),
    ],
    [t],
  );

  function set<K extends keyof ServiceMarketingDraft>(
    key: K,
    v: ServiceMarketingDraft[K],
  ) {
    onChange({...value, [key]: v});
  }

  function addFeatureLine() {
    onChange({...value, featureTexts: [...value.featureTexts, ""]});
  }

  function setFeatureLine(i: number, text: string) {
    const next = [...value.featureTexts];
    next[i] = text;
    onChange({...value, featureTexts: next});
  }

  function removeFeatureLine(i: number) {
    const next = value.featureTexts.filter((_, j) => j !== i);
    onChange({
      ...value,
      featureTexts: next.length ? next : [""],
    });
  }

  function addBenefit() {
    const b: ServiceBenefit = {title: "", description: ""};
    onChange({...value, benefits: [...value.benefits, b]});
  }

  function setBenefit(i: number, patch: Partial<ServiceBenefit>) {
    const next = value.benefits.map((b, j) =>
      j === i ? {...b, ...patch} : b,
    );
    onChange({...value, benefits: next});
  }

  function benefitText(
    benefit: ServiceBenefit,
    key: "title" | "description",
  ): string {
    const translated = benefit.translations?.[benefitLocale]?.[key];
    if (typeof translated === "string") return translated;
    const hasAnyTranslations = Boolean(
      benefit.translations && Object.keys(benefit.translations).length > 0,
    );
    // Legacy fallback: only use root values when no localized copy exists yet.
    return hasAnyTranslations ? "" : String(benefit[key] ?? "");
  }

  function setBenefitText(
    i: number,
    key: "title" | "description",
    text: string,
  ) {
    const prev = value.benefits[i];
    if (!prev) return;
    const nextTranslations = {
      ...(prev.translations ?? {}),
      [benefitLocale]: {
        ...(prev.translations?.[benefitLocale] ?? {}),
        [key]: text,
      },
    };
    // Localized copy is edited independently per language tab.
    setBenefit(i, {translations: nextTranslations});
  }

  function removeBenefit(i: number) {
    onChange({
      ...value,
      benefits: value.benefits.filter((_, j) => j !== i),
    });
  }

  return (
    <div className="mt-6 space-y-5 border-t border-gray-200 pt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {t("services.marketing.sectionTitle")}
        </h3>
        <p className="text-xs text-gray-500">
          {t("services.marketing.stepCounter", {
            current: String(step + 1),
            total: String(STEP_COUNT),
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("services.marketing.stepsAria")}>
        {stepLabel.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={step === i}
            disabled={disabled}
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              step === i ?
                "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } disabled:opacity-50`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <p className="text-sm font-medium text-gray-800">{stepLabel[step]}</p>

      <div className="min-h-[200px] space-y-5">
        {step === 0 ?
          <ServiceGradientColorField
            color1={value.color1}
            color2={value.color2}
            onColor1={(v) => set("color1", v)}
            onColor2={(v) => set("color2", v)}
            disabled={disabled}
          />
        : null}

        {step === 1 ?
          <div className="space-y-5">
            <ServiceImageUploadField
              value={value.bannerImageUrl}
              onChange={(url) => set("bannerImageUrl", url)}
              serviceId={serviceId}
              variant="banner"
              labelKey="services.marketing.bannerImage"
              hintKey="services.image.hint"
              disabled={disabled}
            />
            <ServiceImageUploadField
              value={value.featureImageUrl}
              onChange={(url) => set("featureImageUrl", url)}
              serviceId={serviceId}
              variant="feature"
              labelKey="services.marketing.featureImage"
              hintKey="services.image.hint"
              disabled={disabled}
            />
          </div>
        : null}

        {step === 2 ?
          <div className="space-y-5">
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-800">
                {t("services.marketing.joinAction")}
              </legend>
              <input
                type="text"
                disabled={disabled}
                value={value.joinText}
                onChange={(e) => set("joinText", e.target.value)}
                placeholder={t("services.marketing.buttonTextPh")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                disabled={disabled}
                value={value.joinLink}
                onChange={(e) => set("joinLink", e.target.value)}
                placeholder={t("services.marketing.linkOrRoutePh")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </fieldset>

            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-800">
                {t("services.marketing.postAction")}
              </legend>
              <input
                type="text"
                disabled={disabled}
                value={value.postText}
                onChange={(e) => set("postText", e.target.value)}
                placeholder={t("services.marketing.buttonTextPh")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="text"
                disabled={disabled}
                value={value.postLink}
                onChange={(e) => set("postLink", e.target.value)}
                placeholder={t("services.marketing.linkOrRoutePh")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </fieldset>

            <fieldset className="space-y-2 rounded-lg border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-800">
                {t("services.marketing.featureTexts")}
              </legend>
              {value.featureTexts.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    disabled={disabled}
                    value={line}
                    onChange={(e) => setFeatureLine(i, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={disabled || value.featureTexts.length <= 1}
                    onClick={() => removeFeatureLine(i)}
                    className="shrink-0 rounded-lg border border-gray-200 px-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    {t("services.marketing.removeLine")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={disabled}
                onClick={addFeatureLine}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("services.marketing.addFeatureLine")}
              </button>
            </fieldset>
          </div>
        : null}

        {step === 3 ?
          <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
            <legend className="px-1 text-sm font-medium text-gray-800">
              {t("services.marketing.benefits")}
            </legend>
            {benefitLocales.length > 0 ?
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  {t("common.translationTabsHint")}
                </p>
                <div
                  role="tablist"
                  aria-label={t("common.translationTabsAria")}
                  className="flex flex-wrap gap-1 border-b border-gray-200 pb-1"
                >
                  {benefitLocales.map((localeCode) => {
                    const selected = localeCode === benefitLocale;
                    return (
                      <button
                        key={localeCode}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        disabled={disabled}
                        onClick={() => setBenefitLocale(localeCode)}
                        className={`rounded-t-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          selected ?
                            "bg-primary text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        } disabled:opacity-50`}
                      >
                        {localeCode.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            : null}
            {value.benefits.map((b, i) => (
              <div
                key={i}
                className="space-y-3 rounded-md border border-dashed border-gray-300 p-3"
              >
                <ServiceImageUploadField
                  value={b.imageUrl ?? ""}
                  onChange={(url) => setBenefit(i, {imageUrl: url})}
                  serviceId={serviceId}
                  variant="benefit"
                  benefitKey={`b-${i}`}
                  labelKey="services.marketing.benefitImage"
                  hintKey="services.image.hint"
                  disabled={disabled}
                />
                <input
                  type="text"
                  disabled={disabled}
                  value={benefitText(b, "title")}
                  onChange={(e) => setBenefitText(i, "title", e.target.value)}
                  placeholder={t("services.marketing.benefitTitlePh")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <textarea
                  disabled={disabled}
                  value={benefitText(b, "description")}
                  onChange={(e) => setBenefitText(i, "description", e.target.value)}
                  placeholder={t("services.marketing.benefitDescPh")}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeBenefit(i)}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t("services.marketing.removeBenefit")}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={disabled}
              onClick={addBenefit}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("services.marketing.addBenefit")}
            </button>
          </fieldset>
        : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
        <button
          type="button"
          disabled={disabled || step <= 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40"
        >
          {t("services.marketing.prevStep")}
        </button>
        <button
          type="button"
          disabled={disabled || step >= STEP_COUNT - 1}
          onClick={() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1))}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {t("services.marketing.nextStep")}
        </button>
      </div>
    </div>
  );
}
