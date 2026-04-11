"use client";

import {useUiLocale} from "@/contexts/ui-locale-context";
import type {ServiceBenefit} from "@/lib/i18n-types";
import type {ServiceMarketingDraft} from "@/lib/service-marketing";
import {ServiceImageUploadField} from "@/components/service-image-upload-field";

type Props = {
  serviceId?: string;
  disabled?: boolean;
  value: ServiceMarketingDraft;
  onChange: (next: ServiceMarketingDraft) => void;
};

export function ServiceMarketingEditor({
  serviceId,
  disabled,
  value,
  onChange,
}: Props) {
  const {t} = useUiLocale();

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

  function removeBenefit(i: number) {
    onChange({
      ...value,
      benefits: value.benefits.filter((_, j) => j !== i),
    });
  }

  return (
    <div className="mt-6 space-y-6 border-t border-gray-200 pt-6">
      <h3 className="text-sm font-semibold text-gray-900">
        {t("services.marketing.sectionTitle")}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">
            {t("services.marketing.color1")}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={disabled}
              value={value.color1 || "#667eea"}
              onChange={(e) => set("color1", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-gray-200 disabled:opacity-50"
            />
            <input
              type="text"
              disabled={disabled}
              value={value.color1}
              onChange={(e) => set("color1", e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              placeholder="#667eea"
            />
          </div>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">
            {t("services.marketing.color2")}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              disabled={disabled}
              value={value.color2 || "#764ba2"}
              onChange={(e) => set("color2", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-gray-200 disabled:opacity-50"
            />
            <input
              type="text"
              disabled={disabled}
              value={value.color2}
              onChange={(e) => set("color2", e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              placeholder="#764ba2"
            />
          </div>
        </label>
      </div>

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

      <label className="block space-y-1">
        <span className="text-sm font-medium text-gray-700">
          {t("services.marketing.labelHtml")}
        </span>
        <textarea
          disabled={disabled}
          value={value.labelHtml}
          onChange={(e) => set("labelHtml", e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm"
          placeholder="<p>…</p>"
        />
      </label>

      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
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

      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
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

      <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
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

      <fieldset className="space-y-4 rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-gray-800">
          {t("services.marketing.benefits")}
        </legend>
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
              value={b.title}
              onChange={(e) => setBenefit(i, {title: e.target.value})}
              placeholder={t("services.marketing.benefitTitlePh")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <textarea
              disabled={disabled}
              value={b.description}
              onChange={(e) => setBenefit(i, {description: e.target.value})}
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
    </div>
  );
}
