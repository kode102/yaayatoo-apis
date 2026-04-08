export type AdminNavItem = {
  href: string;
  labelKey: string;
};

export type AdminNavModule = {
  id: string;
  labelKey: string;
  /** Préfixe de chemin pour détecter le module actif (ex. /services). */
  pathPrefix: string;
  /** Autres préfixes (ex. /locale pour le dictionnaire rattaché aux langues). */
  activePathPrefixes?: string[];
  items: AdminNavItem[];
};

export const ADMIN_NAV_MODULES: AdminNavModule[] = [
  {
    id: "services",
    labelKey: "nav.module.services",
    pathPrefix: "/services",
    items: [
      {href: "/services/list", labelKey: "nav.action.list"},
      {href: "/services/create", labelKey: "nav.action.create"},
    ],
  },
  {
    id: "countries",
    labelKey: "nav.module.countries",
    pathPrefix: "/countries",
    items: [
      {href: "/countries/list", labelKey: "nav.action.list"},
      {href: "/countries/create", labelKey: "nav.action.create"},
    ],
  },
  {
    id: "languages",
    labelKey: "nav.module.languages",
    pathPrefix: "/languages",
    activePathPrefixes: ["/locale"],
    items: [
      {href: "/languages/list", labelKey: "nav.action.list"},
      {href: "/languages/create", labelKey: "nav.action.create"},
      {href: "/locale/dictionary", labelKey: "nav.locale.dictionary"},
    ],
  },
];
