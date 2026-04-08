/**
 * URL publique de l’admin, utilisée au build pour canonical, sitemap, JSON-LD, Open Graph.
 * Définir dans `.env.local` : NEXT_PUBLIC_ADMIN_SITE_URL=https://admin.votredomaine.com
 */
export function getAdminSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ADMIN_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "https://localhost";
}

export function getMetadataBase(): URL {
  return new URL(`${getAdminSiteUrl()}/`);
}
