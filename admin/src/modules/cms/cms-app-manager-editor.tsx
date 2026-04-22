"use client";

import {CmsVideoThumbnailField} from "@/components/cms-video-thumbnail-field";
import {useUiLocale} from "@/contexts/ui-locale-context";
import {
  cloneDefaultAppManagerConfig,
  type AppManagerBadgeTone,
  type AppManagerConfig,
  type AppManagerLocaleDraft,
  type AppManagerMockRow,
  type AppManagerStep,
  type AppManagerStepMock,
} from "./cms-app-manager-model";

const BADGE_TONES: AppManagerBadgeTone[] = [
  "emerald",
  "sky",
  "amber",
  "blue",
];

function ensureTwoRows(rows: AppManagerMockRow[]): AppManagerMockRow[] {
  const a = [...rows];
  while (a.length < 2) {
    a.push({label: "", badge: "", badgeTone: "emerald"});
  }
  return a.slice(0, 2);
}

function patchMock(mock: AppManagerStepMock, patch: Partial<AppManagerStepMock>): AppManagerStepMock {
  const next = {...mock, ...patch};
  return {...next, rows: ensureTwoRows(next.rows)};
}

type Props = {
  value: AppManagerLocaleDraft;
  onChange: (next: AppManagerLocaleDraft) => void;
  sectionId?: string;
  disabled?: boolean;
};

export function CmsAppManagerEditor({value, onChange, sectionId, disabled}: Props) {
  const {t} = useUiLocale();
  const busy = Boolean(disabled);

  function setConfig(cfg: AppManagerConfig) {
    onChange({...value, config: cfg});
  }

  function setName(name: string) {
    onChange({...value, name});
  }

  function updateStep(index: number, fn: (s: AppManagerStep) => AppManagerStep) {
    const steps = value.config.steps.map((s, i) => (i === index ? fn(s) : s));
    setConfig({...value.config, steps});
  }

  return (
    <div className="space-y-6">
      <label className="block text-sm text-gray-700">
        {t("cms.appManager.fieldTitle")} *
        <input
          value={value.name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </label>

      <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <legend className="px-1 text-sm font-semibold text-gray-800">
          {t("cms.appManager.globalLegend")}
        </legend>
        <label className="block text-sm text-gray-700 md:col-span-2">
          {t("cms.appManager.sectionAria")}
          <textarea
            rows={2}
            value={value.config.sectionAria}
            onChange={(e) =>
              setConfig({...value.config, sectionAria: e.target.value})
            }
            disabled={busy}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm text-gray-700">
            {t("cms.appManager.journeyPreview")}
            <input
              value={value.config.journeyPreview}
              onChange={(e) =>
                setConfig({...value.config, journeyPreview: e.target.value})
              }
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-gray-700">
            {t("cms.appManager.journeyPrev")}
            <input
              value={value.config.journeyPrev}
              onChange={(e) =>
                setConfig({...value.config, journeyPrev: e.target.value})
              }
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-gray-700">
            {t("cms.appManager.journeyNext")}
            <input
              value={value.config.journeyNext}
              onChange={(e) =>
                setConfig({...value.config, journeyNext: e.target.value})
              }
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>
      </fieldset>

      {value.config.steps.map((step, stepIndex) => (
        <fieldset
          key={step.id || `step-${stepIndex}`}
          className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <legend className="px-1 text-sm font-semibold text-primary">
            {t("cms.appManager.stepLegend", {n: String(stepIndex + 1)})}
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm text-gray-700">
              {t("cms.appManager.fieldId")}
              <input
                value={step.id}
                onChange={(e) =>
                  updateStep(stepIndex, (s) => ({...s, id: e.target.value}))
                }
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-gray-700">
              {t("cms.appManager.fieldNumber")}
              <input
                value={step.number}
                onChange={(e) =>
                  updateStep(stepIndex, (s) => ({...s, number: e.target.value}))
                }
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <CmsVideoThumbnailField
            label={t("cms.appManager.fieldImage")}
            hint={t("cms.appManager.imageHint")}
            value={step.image}
            onChange={(url) =>
              updateStep(stepIndex, (s) => ({...s, image: url}))
            }
            sectionId={sectionId}
            disabled={busy}
          />
          <label className="block text-sm text-gray-700">
            {t("cms.appManager.fieldShapePath")}
            <textarea
              rows={4}
              spellCheck={false}
              value={step.shapePath}
              onChange={(e) =>
                updateStep(stepIndex, (s) => ({
                  ...s,
                  shapePath: e.target.value,
                }))
              }
              disabled={busy}
              placeholder={t("cms.appManager.shapePlaceholder")}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100"
            />
          </label>
          <label className="block text-sm text-gray-700">
            {t("cms.appManager.fieldTitleStep")}
            <input
              value={step.title}
              onChange={(e) =>
                updateStep(stepIndex, (s) => ({...s, title: e.target.value}))
              }
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-gray-700">
            {t("cms.appManager.fieldDescription")}
            <textarea
              rows={4}
              value={step.description}
              onChange={(e) =>
                updateStep(stepIndex, (s) => ({
                  ...s,
                  description: e.target.value,
                }))
              }
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3">
            <p className="mb-2 text-xs font-medium text-gray-700">
              {t("cms.appManager.bulletsLegend")}
            </p>
            <div className="space-y-2">
              {step.bullets.map((line, bi) => (
                <div key={bi} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={line}
                    onChange={(e) => {
                      const bullets = [...step.bullets];
                      bullets[bi] = e.target.value;
                      updateStep(stepIndex, (s) => ({...s, bullets}));
                    }}
                    disabled={busy}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busy || step.bullets.length <= 1}
                    onClick={() => {
                      const bullets = step.bullets.filter((_, i) => i !== bi);
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        bullets: bullets.length ? bullets : [""],
                      }));
                    }}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                updateStep(stepIndex, (s) => ({
                  ...s,
                  bullets: [...s.bullets, ""],
                }))
              }
              className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {t("cms.appManager.addBullet")}
            </button>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-xs font-semibold text-gray-700">
              {t("cms.appManager.mockLegend")}
            </legend>
            <label className="block text-sm text-gray-700">
              {t("cms.appManager.mockVariant")}
              <select
                value={step.mock.variant}
                onChange={(e) => {
                  const variant = e.target.value === "wallet" ? "wallet" : "card";
                  updateStep(stepIndex, (s) => ({
                    ...s,
                    mock: patchMock(s.mock, {variant}),
                  }));
                }}
                disabled={busy}
                className="mt-1 w-full max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="card">{t("cms.appManager.variantCard")}</option>
                <option value="wallet">
                  {t("cms.appManager.variantWallet")}
                </option>
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-gray-700">
                {t("cms.appManager.fieldHeadline")}
                <input
                  value={step.mock.headline}
                  onChange={(e) =>
                    updateStep(stepIndex, (s) => ({
                      ...s,
                      mock: patchMock(s.mock, {headline: e.target.value}),
                    }))
                  }
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-gray-700">
                {t("cms.appManager.fieldBarHint")}
                <input
                  value={step.mock.barHint}
                  onChange={(e) =>
                    updateStep(stepIndex, (s) => ({
                      ...s,
                      mock: patchMock(s.mock, {barHint: e.target.value}),
                    }))
                  }
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            {step.mock.variant === "wallet" ?
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-gray-700">
                  {t("cms.appManager.fieldWalletCaption")}
                  <input
                    value={step.mock.walletCaption ?? ""}
                    onChange={(e) =>
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {
                          walletCaption: e.target.value,
                        }),
                      }))
                    }
                    disabled={busy}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  {t("cms.appManager.fieldWalletAmount")}
                  <input
                    value={step.mock.walletAmount ?? ""}
                    onChange={(e) =>
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {
                          walletAmount: e.target.value,
                        }),
                      }))
                    }
                    disabled={busy}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            : <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-gray-700">
                  {t("cms.appManager.fieldCardCaption")}
                  <input
                    value={step.mock.cardCaption ?? ""}
                    onChange={(e) =>
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {
                          cardCaption: e.target.value,
                        }),
                      }))
                    }
                    disabled={busy}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm text-gray-700">
                  {t("cms.appManager.fieldCardTitle")}
                  <input
                    value={step.mock.cardTitle ?? ""}
                    onChange={(e) =>
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {
                          cardTitle: e.target.value,
                        }),
                      }))
                    }
                    disabled={busy}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            }
            <label className="block text-sm text-gray-700">
              {t("cms.appManager.fieldListTitle")}
              <input
                value={step.mock.listTitle}
                onChange={(e) =>
                  updateStep(stepIndex, (s) => ({
                    ...s,
                    mock: patchMock(s.mock, {listTitle: e.target.value}),
                  }))
                }
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>

            <p className="text-xs font-medium text-gray-600">
              {t("cms.appManager.rowsLegend")}
            </p>
            {ensureTwoRows(step.mock.rows).map((row, ri) => (
              <div
                key={ri}
                className="grid gap-2 rounded-lg border border-gray-100 bg-white p-2 md:grid-cols-3"
              >
                <label className="block text-xs text-gray-600 md:col-span-1">
                  {t("cms.appManager.fieldRowLabel", {n: String(ri + 1)})}
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const rows = [...ensureTwoRows(step.mock.rows)];
                      rows[ri] = {...rows[ri], label: e.target.value};
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {rows}),
                      }));
                    }}
                    disabled={busy}
                    className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  {t("cms.appManager.fieldRowBadge")}
                  <input
                    value={row.badge}
                    onChange={(e) => {
                      const rows = [...ensureTwoRows(step.mock.rows)];
                      rows[ri] = {...rows[ri], badge: e.target.value};
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {rows}),
                      }));
                    }}
                    disabled={busy}
                    className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  {t("cms.appManager.fieldRowBadgeTone")}
                  <select
                    value={row.badgeTone}
                    onChange={(e) => {
                      const tone = e.target.value as AppManagerBadgeTone;
                      const rows = [...ensureTwoRows(step.mock.rows)];
                      rows[ri] = {
                        ...rows[ri],
                        badgeTone: BADGE_TONES.includes(tone) ? tone : "emerald",
                      };
                      updateStep(stepIndex, (s) => ({
                        ...s,
                        mock: patchMock(s.mock, {rows}),
                      }));
                    }}
                    disabled={busy}
                    className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                  >
                    {BADGE_TONES.map((tone) => (
                      <option key={tone} value={tone}>
                        {tone}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </fieldset>
        </fieldset>
      ))}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onChange({
            ...value,
            config: cloneDefaultAppManagerConfig(),
            name: value.name.trim() || t("cms.appManager.defaultName"),
          })
        }
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {t("cms.appManager.resetDefaults")}
      </button>
    </div>
  );
}
