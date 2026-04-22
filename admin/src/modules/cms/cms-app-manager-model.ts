import appManagerSiteDefault from "./app-manager-site-default.json";

export type AppManagerBadgeTone = "emerald" | "sky" | "amber" | "blue";

export type AppManagerMockRow = {
  label: string;
  badge: string;
  badgeTone: AppManagerBadgeTone;
};

export type AppManagerStepMock = {
  variant: "card" | "wallet";
  headline: string;
  barHint: string;
  cardCaption?: string;
  cardTitle?: string;
  walletCaption?: string;
  walletAmount?: string;
  listTitle: string;
  rows: AppManagerMockRow[];
};

export type AppManagerStep = {
  id: string;
  number: string;
  image: string;
  shapePath: string;
  title: string;
  description: string;
  bullets: string[];
  mock: AppManagerStepMock;
};

export type AppManagerConfig = {
  sectionAria: string;
  journeyPreview: string;
  journeyPrev: string;
  journeyNext: string;
  steps: AppManagerStep[];
};

export type AppManagerLocaleDraft = {
  name: string;
  config: AppManagerConfig;
};

export function cloneDefaultAppManagerConfig(): AppManagerConfig {
  return JSON.parse(JSON.stringify(appManagerSiteDefault)) as AppManagerConfig;
}

function isBadgeTone(x: unknown): x is AppManagerBadgeTone {
  return x === "emerald" || x === "sky" || x === "amber" || x === "blue";
}

function normalizeMockRow(raw: unknown): AppManagerMockRow {
  if (!raw || typeof raw !== "object") {
    return {label: "", badge: "", badgeTone: "emerald"};
  }
  const o = raw as Record<string, unknown>;
  const tone = o.badgeTone;
  return {
    label: typeof o.label === "string" ? o.label : "",
    badge: typeof o.badge === "string" ? o.badge : "",
    badgeTone: isBadgeTone(tone) ? tone : "emerald",
  };
}

function normalizeMock(
  raw: unknown,
  fallback: AppManagerStepMock,
): AppManagerStepMock {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const variant = o.variant === "wallet" ? "wallet" : "card";
  const rowsIn = Array.isArray(o.rows) ? o.rows : [];
  const rows =
    rowsIn.length > 0 ?
      rowsIn.map((r) => normalizeMockRow(r))
    : fallback.rows;
  return {
    variant,
    headline: typeof o.headline === "string" ? o.headline : fallback.headline,
    barHint: typeof o.barHint === "string" ? o.barHint : fallback.barHint,
    cardCaption:
      typeof o.cardCaption === "string" ? o.cardCaption : fallback.cardCaption,
    cardTitle: typeof o.cardTitle === "string" ? o.cardTitle : fallback.cardTitle,
    walletCaption:
      typeof o.walletCaption === "string" ?
        o.walletCaption
      : fallback.walletCaption,
    walletAmount:
      typeof o.walletAmount === "string" ? o.walletAmount : fallback.walletAmount,
    listTitle: typeof o.listTitle === "string" ? o.listTitle : fallback.listTitle,
    rows,
  };
}

function normalizeStep(
  raw: unknown,
  index: number,
  fallback: AppManagerStep,
): AppManagerStep {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const bullets = Array.isArray(o.bullets) ?
      (o.bullets as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback.bullets;
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id : fallback.id,
    number: typeof o.number === "string" ? o.number : fallback.number,
    image: typeof o.image === "string" ? o.image : fallback.image,
    shapePath:
      typeof o.shapePath === "string" && o.shapePath.trim() ?
        o.shapePath
      : fallback.shapePath,
    title: typeof o.title === "string" ? o.title : fallback.title,
    description:
      typeof o.description === "string" ? o.description : fallback.description,
    bullets: bullets.length > 0 ? bullets : fallback.bullets,
    mock: normalizeMock(o.mock, fallback.mock),
  };
}

/** Fusionne le JSON stocké avec les défauts (même logique que le site). */
export function parseStoredAppManagerConfig(
  json: string | undefined,
): AppManagerConfig {
  const base = cloneDefaultAppManagerConfig();
  if (!json?.trim()) return base;
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return base;
    const o = parsed as Record<string, unknown>;
    const stepsIn = Array.isArray(o.steps) ? o.steps : [];
    const mergedSteps = base.steps.map((fb, i) =>
      normalizeStep(stepsIn[i], i, fb),
    );
    return {
      sectionAria:
        typeof o.sectionAria === "string" && o.sectionAria.trim() ?
          o.sectionAria
        : base.sectionAria,
      journeyPreview:
        typeof o.journeyPreview === "string" && o.journeyPreview.trim() ?
          o.journeyPreview
        : base.journeyPreview,
      journeyPrev:
        typeof o.journeyPrev === "string" && o.journeyPrev.trim() ?
          o.journeyPrev
        : base.journeyPrev,
      journeyNext:
        typeof o.journeyNext === "string" && o.journeyNext.trim() ?
          o.journeyNext
        : base.journeyNext,
      steps: mergedSteps,
    };
  } catch {
    return base;
  }
}

export function serializeAppManagerConfig(c: AppManagerConfig): string {
  return JSON.stringify(c);
}

export function emptyAppManagerLocaleDraft(): AppManagerLocaleDraft {
  return {name: "", config: cloneDefaultAppManagerConfig()};
}

export function appManagerLocaleFromBlock(
  b: Record<string, unknown> | undefined,
): AppManagerLocaleDraft {
  const d = emptyAppManagerLocaleDraft();
  if (!b) return d;
  const raw =
    typeof b.appManagerStepsJson === "string" ? b.appManagerStepsJson : "";
  return {
    name: typeof b.name === "string" ? b.name : "",
    config: parseStoredAppManagerConfig(raw),
  };
}

export function filledAppManagerLocale(d: AppManagerLocaleDraft): boolean {
  if (!d.name.trim()) return false;
  return d.config.steps.some((s) => s.title.trim() || s.description.trim());
}
