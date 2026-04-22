export type AdminNavItem = {
  href: string;
  labelKey: string;
  /** Chemins additionnels pour marquer le lien actif (ex. `/services/create` pour l’entrée Liste). */
  activeHrefPrefixes?: string[];
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
    labelKey: "nav.module.ourServices",
    pathPrefix: "/services",
    items: [
      {href: "/services/overview", labelKey: "nav.services.overview"},
      {
        href: "/services/list",
        labelKey: "nav.services.catalog",
        activeHrefPrefixes: ["/services/create"],
      },
      {
        href: "/services/on-demand/list",
        labelKey: "nav.services.onDemand",
        activeHrefPrefixes: ["/services/on-demand/create"],
      },
    ],
  },
  {
    id: "job",
    labelKey: "nav.module.jobOffersManager",
    pathPrefix: "/jobs",
    items: [
      {
        href: "/jobs/list",
        labelKey: "nav.jobOffers.offers",
        activeHrefPrefixes: ["/jobs/create"],
      },
      {href: "/jobs/contracts", labelKey: "nav.jobOffers.contracts"},
      {
        href: "/jobs/reviews/list",
        labelKey: "nav.jobOffers.reviews",
        activeHrefPrefixes: ["/jobs/reviews/create"],
      },
    ],
  },
  {
    id: "users",
    labelKey: "nav.module.accountManager",
    pathPrefix: "/users",
    items: [
      {
        href: "/users/list",
        labelKey: "nav.accountManager.accounts",
        activeHrefPrefixes: ["/users/create"],
      },
      {
        href: "/users/employer/list",
        labelKey: "nav.accountManager.employers",
        activeHrefPrefixes: ["/users/employer/create"],
      },
      {
        href: "/users/employee/list",
        labelKey: "nav.accountManager.employees",
        activeHrefPrefixes: ["/users/employee/create"],
      },
    ],
  },
  {
    id: "i18n",
    labelKey: "nav.module.i18nSettings",
    pathPrefix: "/languages",
    activePathPrefixes: ["/countries", "/locale"],
    items: [
      {href: "/countries/list", labelKey: "nav.i18n.countries"},
      {href: "/languages/list", labelKey: "nav.i18n.languages"},
      {href: "/locale/dictionary", labelKey: "nav.i18n.dictionary"},
    ],
  },
  {
    id: "cms",
    labelKey: "nav.module.contentManagementSystem",
    pathPrefix: "/cms",
    activePathPrefixes: ["/media"],
    items: [
      {href: "/cms/namespaces/list", labelKey: "nav.cms.namespaces"},
      {href: "/cms/sections", labelKey: "nav.cms.sections"},
      {href: "/media/list", labelKey: "nav.cmsContent.mediaList"},
      {href: "/cms/blog-news/articles", labelKey: "nav.blogNews.articles"},
      {href: "/cms/blog-news/news-feed", labelKey: "nav.blogNews.newsFeed"},
      {href: "/cms/settings", labelKey: "nav.cms.settings"},
    ],
  },
  {
    id: "helpDesk",
    labelKey: "nav.module.helpDesk",
    pathPrefix: "/help-desk",
    items: [
      {
        href: "/help-desk/messages",
        labelKey: "nav.helpDesk.contactMessages",
      },
      {
        href: "/help-desk/subjects",
        labelKey: "nav.helpDesk.contactSubjects",
        activeHrefPrefixes: ["/help-desk/subjects/create"],
      },
    ],
  },
];
