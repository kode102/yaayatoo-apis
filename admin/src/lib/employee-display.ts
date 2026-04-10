/**
 * Années d’expérience à partir d’une date de début (YYYY-MM-DD ou ISO).
 */
export function yearsOfExperienceFromStartDate(
  iso: string | undefined | null,
): number | null {
  if (!iso?.trim()) return null;
  const raw = iso.trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ?
      new Date(`${raw}T12:00:00`)
    : new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    y -= 1;
  }
  return Math.max(0, y);
}
