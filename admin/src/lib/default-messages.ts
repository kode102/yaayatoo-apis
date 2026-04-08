import type {UiLocale} from "@/lib/ui-locale-constants";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

export const DEFAULT_MESSAGES: Record<UiLocale, Record<string, string>> = {
  fr: fr as Record<string, string>,
  en: en as Record<string, string>,
};

/** Toutes les clés définies dans les fichiers de messages par défaut. */
export function allDefaultMessageKeys(): string[] {
  const s = new Set<string>();
  for (const k of Object.keys(fr)) s.add(k);
  for (const k of Object.keys(en)) s.add(k);
  return [...s].sort((a, b) => a.localeCompare(b));
}

export function interpolateTemplate(
  template: string,
  vars?: Record<string, string>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? `{${name}}`);
}
