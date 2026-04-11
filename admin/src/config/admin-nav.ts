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
  {
    id: "cms",
    labelKey: "nav.module.cms",
    pathPrefix: "/cms",
    items: [
      {href: "/cms/namespaces/list", labelKey: "nav.cms.namespaces"},
      {href: "/cms/sections", labelKey: "nav.cms.sections"},
      {href: "/cms/settings", labelKey: "nav.cms.settings"},
    ],
  },
  {
    id: "blogNews",
    labelKey: "nav.module.blogNews",
    pathPrefix: "/cms/blog-news",
    items: [
      {href: "/cms/blog-news/articles", labelKey: "nav.blogNews.articles"},
      {href: "/cms/blog-news/news-feed", labelKey: "nav.blogNews.newsFeed"},
    ],
  },
  {
    id: "job",
    labelKey: "nav.module.job",
    pathPrefix: "/jobs",
    items: [
      {href: "/jobs/list", labelKey: "nav.action.list"},
      {href: "/jobs/create", labelKey: "nav.action.create"},
      {href: "/jobs/reviews/list", labelKey: "nav.jobs.reviewsList"},
      {href: "/jobs/reviews/create", labelKey: "nav.jobs.reviewsCreate"},
    ],
  },
  {
    id: "users",
    labelKey: "nav.module.users",
    pathPrefix: "/users",
    items: [
      {href: "/users/list", labelKey: "nav.users.firebaseList"},
      {href: "/users/create", labelKey: "nav.users.firebaseCreate"},
      {href: "/users/employee/list", labelKey: "nav.users.employees"},
      {href: "/users/employer/list", labelKey: "nav.users.employers"},
    ],
  },
];
