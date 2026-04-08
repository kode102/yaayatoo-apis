import {getAdminSiteUrl} from "@/lib/site-url";

/** Données structurées Schema.org (WebSite + WebApplication + Organization). */
export default function AdminJsonLd() {
  const base = getAdminSiteUrl();
  const graph = [
    {
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: "Yaayatoo",
      url: base,
    },
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      name: "Yaayatoo Admin",
      url: base,
      inLanguage: "fr-FR",
      publisher: {"@id": `${base}/#organization`},
    },
    {
      "@type": "WebApplication",
      "@id": `${base}/#webapp`,
      name: "Yaayatoo Admin",
      url: base,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isPartOf: {"@id": `${base}/#website`},
    },
  ];

  const json = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(json)}}
    />
  );
}
