/* eslint-disable max-len */
/* eslint-disable require-jsdoc */

const collectionParam = {
  name: "collection",
  in: "path" as const,
  required: true,
  schema: {
    type: "string" as const,
    enum: [
      "services",
      "countries",
      "languages",
      "cmsSections",
      "cmsNamespaces",
      "cmsSettings",
      "newsFeed",
      "onDemandServices",
      "employee",
      "employer",
      "jobOffers",
      "jobReviews",
      "siteMedia",
      "contactMessages",
    ],
  },
  description: "Collection Firestore",
};

const idParam = {
  name: "id",
  in: "path" as const,
  required: true,
  schema: {type: "string" as const},
  description: "Identifiant document Firestore",
};

const localeQuery = {
  name: "locale",
  in: "query" as const,
  schema: {type: "string" as const, example: "fr-cm"},
  description: "Locale pour tri des libellés (public reference)",
};

const sortLocaleQuery = {
  name: "sortLocale",
  in: "query" as const,
  schema: {type: "string" as const, example: "fr"},
  description: "Alias de locale= (admin list + public)",
};

const countryQuery = {
  name: "country",
  in: "query" as const,
  schema: {type: "string" as const, example: "CM"},
  description:
    "Code pays ISO2 : résolution des traductions CMS / langues actives",
};

const countryCodeQuery = {
  name: "countryCode",
  in: "query" as const,
  schema: {type: "string" as const, example: "CM"},
  description: "Alias de country=",
};

const firebaseUidParam = {
  name: "uid",
  in: "path" as const,
  required: true,
  schema: {type: "string" as const},
  description: "UID Firebase Authentication",
};

const adminListResponses = {
  "200": {
    description: "Liste triée",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            success: {type: "boolean", example: true},
            data: {
              type: "array",
              items: {$ref: "#/components/schemas/ReferenceDocument"},
            },
          },
        },
      },
    },
  },
  "401": {
    description: "Bearer manquant ou token invalide",
    content: {
      "application/json": {
        schema: {$ref: "#/components/schemas/ApiError"},
      },
    },
  },
  "403": {
    description: "E-mail non autorisé (allowlist)",
    content: {
      "application/json": {
        schema: {$ref: "#/components/schemas/ApiError"},
      },
    },
  },
};

/**
 * Chemins OpenAPI pour l’API Yaayatoo.
 */
export const openApiPaths = {
  "/": {
    get: {
      tags: ["Health"],
      summary: "État du service",
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/HealthResponse"},
            },
          },
        },
      },
    },
    head: {
      tags: ["Health"],
      summary: "Entêtes seules (santé)",
      responses: {"200": {description: "OK"}},
    },
  },
  "/health": {
    get: {
      tags: ["Health"],
      summary: "Health check",
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/HealthResponse"},
            },
          },
        },
      },
    },
    head: {
      tags: ["Health"],
      summary: "HEAD health",
      responses: {"200": {description: "OK"}},
    },
  },
  "/graph": {
    get: {
      tags: ["GraphQL"],
      summary: "Aide endpoint GraphQL (HTML)",
      description:
        "Page d’aide minimale. Le schéma GraphQL est un placeholder ; " +
        "la vitrine utilise les routes REST.",
      responses: {
        "200": {description: "HTML"},
      },
    },
    post: {
      tags: ["GraphQL"],
      summary: "Exécution GraphQL",
      description:
        "Corps JSON : `{ \"query\": \"{ ping }\", \"variables\": {} }`. " +
        "Réservé à un usage futur.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                query: {type: "string"},
                variables: {type: "object"},
              },
              required: ["query"],
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Réponse GraphQL standard (data / errors)",
          content: {
            "application/json": {
              schema: {type: "object"},
            },
          },
        },
        "400": {description: "Requête invalide"},
        "500": {description: "Erreur serveur"},
      },
    },
  },
  "/get": {
    get: {
      tags: ["Search"],
      summary: "Recherche / liste Firestore (query string)",
      description:
        "Paramètres en query : `collection` (défaut services), `q` / " +
        "`query`, `limit`, `page`, `filters`, `sort`, `populate`, " +
        "`weights`, `minScore`, `specialFilter`, `specialSort`, " +
        "`fields`, `includeScore`, `includeDistance`. " +
        "`query=*` retourne tous les documents filtrés.",
      parameters: [
        {
          name: "collection",
          in: "query",
          schema: {type: "string", default: "services"},
        },
        {name: "q", in: "query", schema: {type: "string"}},
        {name: "query", in: "query", schema: {type: "string"}},
        {name: "limit", in: "query", schema: {type: "integer", default: 50}},
        {name: "page", in: "query", schema: {type: "integer", default: 1}},
        {name: "minScore", in: "query", schema: {type: "number"}},
        {name: "filters", in: "query", schema: {type: "string"}},
        {name: "sort", in: "query", schema: {type: "string"}},
        {name: "sortBy", in: "query", schema: {type: "string"}},
        {name: "populate", in: "query", schema: {type: "string"}},
        {name: "weights", in: "query", schema: {type: "string"}},
        {name: "specialFilter", in: "query", schema: {type: "string"}},
        {name: "specialSort", in: "query", schema: {type: "string"}},
        {name: "fields", in: "query", schema: {type: "string"}},
        {
          name: "includeScore",
          in: "query",
          schema: {type: "string", enum: ["true", "false"]},
        },
        {
          name: "includeDistance",
          in: "query",
          schema: {type: "string", enum: ["true", "false"]},
        },
      ],
      responses: {
        "200": {
          description: "Résultats paginés + métadonnées filtres/tri",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  count: {type: "integer"},
                  totalDocuments: {type: "integer"},
                  filteredDocuments: {type: "integer"},
                  data: {type: "array", items: {type: "object"}},
                  pagination: {
                    $ref: "#/components/schemas/SearchPagination",
                  },
                  searchQuery: {type: "string", nullable: true},
                  searchTerms: {
                    type: "array",
                    items: {type: "string"},
                  },
                  filters: {type: "object"},
                  sort: {type: "array"},
                  populate: {type: "array"},
                },
              },
            },
          },
        },
        "400": {
          description: "Pagination ou paramètres invalides",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "405": {description: "Méthode non autorisée"},
        "500": {
          description: "Erreur serveur",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
    post: {
      tags: ["Search"],
      summary: "Recherche / liste Firestore (corps JSON)",
      description: "Mêmes champs que GET, passés dans le body JSON.",
      requestBody: {
        content: {
          "application/json": {
            schema: {type: "object", additionalProperties: true},
          },
        },
      },
      responses: {
        "200": {description: "Voir GET /get"},
        "400": {description: "Requête invalide"},
        "405": {description: "Méthode non autorisée"},
        "500": {description: "Erreur serveur"},
      },
    },
    options: {
      tags: ["Search"],
      summary: "CORS preflight",
      responses: {"204": {description: "No content"}},
    },
  },
  "/public/active-languages": {
    get: {
      tags: ["Public"],
      summary: "Langues actives (liste légère)",
      description:
        "Pour sélecteurs vitrine : id, code, label, flagIconUrl. " +
        "Sans auth.",
      parameters: [
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/ActiveLanguageItem",
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/countries": {
    get: {
      tags: ["Public"],
      summary: "Pays actifs",
      description:
        "Documents `countries` avec active !== false, tri par libellé.",
      parameters: [localeQuery, sortLocaleQuery],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/ReferenceDocument",
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/languages": {
    get: {
      tags: ["Public"],
      summary: "Langues actives (documents complets)",
      parameters: [localeQuery, sortLocaleQuery],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/ReferenceDocument",
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/services": {
    get: {
      tags: ["Public"],
      summary: "Services actifs",
      parameters: [
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/ReferenceDocument",
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/services/{serviceKey}": {
    get: {
      tags: ["Public"],
      summary: "Détail d'un service actif",
      description:
        "Retourne un seul document `services` actif par **id Firestore** ou **slug** " +
        "(y compris slug dérivé du libellé). Préférer cet endpoint à la liste " +
        "`GET /public/services` pour les pages détail.",
      parameters: [
        {
          name: "serviceKey",
          in: "path",
          required: true,
          schema: {type: "string"},
          description: "Identifiant document ou slug public",
        },
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {$ref: "#/components/schemas/ReferenceDocument"},
                },
              },
            },
          },
        },
        "400": {
          description: "Paramètre manquant",
        },
        "404": {
          description: "Service introuvable ou inactif",
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/on-demand-services": {
    get: {
      tags: ["Public"],
      summary: "Services à la demande actifs",
      description:
        "Liste **tous** les documents `onDemandServices` actifs avec traduction " +
        "résolue pour le pays et la locale demandés. Inclut `iconUrl`, " +
        "`linkedServiceIds` et `resolvedTranslation` (name + labelHtml). " +
        "Pour les **seuls** services liés à un placement donné, préférer " +
        "`GET /public/on-demand-services/by-service/{placementServiceKey}`.",
      parameters: [localeQuery, sortLocaleQuery, countryQuery, countryCodeQuery],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {$ref: "#/components/schemas/OnDemandServiceDocument"},
                  },
                },
              },
            },
          },
        },
        "500": {
          description: "Erreur serveur",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/on-demand-services/by-service/{placementServiceKey}": {
    get: {
      tags: ["Public"],
      summary: "Services à la demande liés à un service de placement",
      description:
        "Liste **filtrée côté serveur** : documents `onDemandServices` actifs " +
        "dont `linkedServiceIds` contient l’id Firestore du service, son `slug` " +
        "stocké, le slug URL calculé, ou la clé passée dans l’URL (ex. slug " +
        "`nounou-…`). Même résolution `locale` / `country` que la liste complète. " +
        "Le champ `linkedServiceIds` est omis dans la réponse (données vitrine).",
      parameters: [
        {
          name: "placementServiceKey",
          in: "path" as const,
          required: true,
          schema: {type: "string" as const},
          description:
            "Id Firestore ou slug du service de placement (`services`), " +
            "comme dans `/public/services/{serviceKey}`",
        },
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK (tableau vide si service inconnu ou aucun lien)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {$ref: "#/components/schemas/OnDemandServiceDocument"},
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Paramètre de chemin manquant",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/on-demand-services/{serviceKey}": {
    get: {
      tags: ["Public"],
      summary: "Détail d'un service à la demande actif",
      description:
        "Un document `onDemandServices` par id ou slug. Préférer à la liste pour le détail.",
      parameters: [
        {
          name: "serviceKey",
          in: "path",
          required: true,
          schema: {type: "string"},
        },
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/OnDemandServiceDocument"},
                },
              },
            },
          },
        },
        "400": {description: "Paramètre manquant"},
        "404": {description: "Introuvable ou inactif"},
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/site-media/tag/{tag}": {
    get: {
      tags: ["Public"],
      summary: "Médias vitrine par tag",
      description:
        "Documents `siteMedia` actifs dont le tableau `tags` contient le tag " +
        "demandé. Tri par `sortOrder` puis id. Réponse allégée (`id`, `url`, " +
        "`altText`). Query `namespaceKey` pour filtrer par espace logique " +
        "(ex. `service`).",
      parameters: [
        {
          name: "tag",
          in: "path" as const,
          required: true,
          schema: {type: "string" as const, example: "service"},
          description: "Tag (a-z, 0-9, _ et -)",
        },
        {
          name: "limit",
          in: "query" as const,
          schema: {type: "integer" as const, minimum: 1, maximum: 50, example: 5},
          description: "Nombre max d’entrées (défaut 5)",
        },
        {
          name: "namespaceKey",
          in: "query" as const,
          schema: {type: "string" as const, example: "service"},
          description: "Si défini, ne retient que les médias avec ce namespaceKey",
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: {type: "string"},
                        url: {type: "string"},
                        altText: {type: "string"},
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Tag manquant ou invalide",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/catalog": {
    get: {
      tags: ["Public"],
      summary: "Catalogue (pays + langues + services)",
      description: "Un seul appel : trois listes actives.",
      parameters: [localeQuery, sortLocaleQuery],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "object",
                    properties: {
                      countries: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/ReferenceDocument",
                        },
                      },
                      languages: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/ReferenceDocument",
                        },
                      },
                      services: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/ReferenceDocument",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/cms/namespace/{namespaceKey}": {
    get: {
      tags: ["Public"],
      summary: "Contenu CMS pour une clé d’espace (namespace)",
      description:
        "Équivalent à `GET /public/cms?namespaceKeys={namespaceKey}` pour une " +
        "seule clé, avec une réponse dédiée : `namespace` (document ou `null` " +
        "si absent / inactif), `sections` (triées, avec `resolvedTranslation` " +
        "et `namespaceKey` sur chaque ligne). Query : `locale`, `sortLocale`, " +
        "`country`, `countryCode` comme sur `/public/cms`.",
      parameters: [
        {
          name: "namespaceKey",
          in: "path" as const,
          required: true,
          schema: {type: "string" as const, example: "service"},
          description:
            "Clé technique de l’espace CMS (ex. home, contact, service)",
        },
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "object",
                    properties: {
                      namespaceKey: {type: "string", example: "service"},
                      namespace: {
                        oneOf: [{type: "object"}, {type: "null"}],
                        description:
                          "Document espace normalisé ou null si clé inconnue / inactive",
                      },
                      sections: {
                        type: "array",
                        items: {type: "object"},
                        description:
                          "Sections actives de cet espace (`namespaceKey` renseigné)",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Clé d’URL invalide",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/cms": {
    get: {
      tags: ["Public"],
      summary: "Contenu CMS par espaces (namespaces)",
      description:
        "Retourne les espaces actifs demandés et leurs sections actives. " +
        "Passer `namespaceKeys` (ex. home,contact) et/ou `namespaceIds` " +
        "(ids Firestore). Union des deux. Tri des sections : `locale` / " +
        "`sortLocale`. Résolution des champs par pays : `country` / " +
        "`countryCode` (ISO2). Pour **une seule clé**, préférer " +
        "`GET /public/cms/namespace/{namespaceKey}` (réponse `namespace` + " +
        "`sections`). Chaque section inclut `namespaceKey` pour rattachement.",
      parameters: [
        {
          name: "namespaceKeys",
          in: "query" as const,
          schema: {type: "string" as const, example: "home,contact"},
          description: "Clés techniques des espaces, séparées par des virgules",
        },
        {
          name: "namespaceIds",
          in: "query" as const,
          schema: {type: "string" as const},
          description: "Ids documents `cmsNamespaces`, séparés par des virgules",
        },
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "object",
                    properties: {
                      namespaces: {type: "array", items: {type: "object"}},
                      sections: {type: "array", items: {type: "object"}},
                      byNamespace: {type: "object", additionalProperties: true},
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Paramètres manquants",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
    post: {
      tags: ["Public"],
      summary: "Contenu CMS (même logique que GET, corps JSON)",
      description:
        "Corps JSON : `{ \"namespaceKeys\": [\"home\"], \"namespaceIds\": [] }` " +
        "ou chaînes séparées par virgules acceptées comme tableaux de strings. " +
        "Query : `locale`, `sortLocale`, `country`, `countryCode` (même sémantique " +
        "que le GET). Une seule clé : voir aussi `GET /public/cms/namespace/{namespaceKey}`.",
      parameters: [
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                namespaceKeys: {
                  oneOf: [
                    {type: "array", items: {type: "string"}},
                    {type: "string"},
                  ],
                },
                namespaceIds: {
                  oneOf: [
                    {type: "array", items: {type: "string"}},
                    {type: "string"},
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "object",
                    properties: {
                      namespaces: {type: "array", items: {type: "object"}},
                      sections: {type: "array", items: {type: "object"}},
                      byNamespace: {type: "object", additionalProperties: true},
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Paramètres manquants",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/ui-dictionary": {
    get: {
      tags: ["Public"],
      summary: "Dictionnaire UI vitrine (adminUiDictionary)",
      description:
        "Toutes les clés surchargées : `{ [messageKey]: { [locale]: texte } }`. " +
        "Sans auth — utilisé par le site Next.js pour fusionner les textes.",
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {$ref: "#/components/schemas/UiDictionaryData"},
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/cms-settings": {
    get: {
      tags: ["Public"],
      summary: "Réglages CMS publics (contacts + liens)",
      description:
        "Retourne le premier document actif de `cmsSettings` avec " +
        "adresses, téléphones, e-mails et liens applicatifs / réseaux, " +
        "résolus par pays (`country` / `countryCode`).",
      parameters: [countryQuery, countryCodeQuery],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    oneOf: [
                      {$ref: "#/components/schemas/ReferenceDocument"},
                      {type: "null"},
                    ],
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/news-feed": {
    get: {
      tags: ["Public"],
      summary: "News feed public (footer)",
      description:
        "Retourne les entrées actives de `newsFeed` avec titre HTML " +
        "résolu par locale et pays.",
      parameters: [
        localeQuery,
        sortLocaleQuery,
        countryQuery,
        countryCodeQuery,
        {
          name: "limit",
          in: "query" as const,
          schema: {type: "integer" as const, default: 20, minimum: 1, maximum: 50},
          description: "Nombre max d’entrées (1–50, défaut 20)",
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {$ref: "#/components/schemas/NewsFeedItem"},
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/job-reviews": {
    get: {
      tags: ["Public"],
      summary: "Avis publics (jobReviews)",
      description:
        "Avis avec note strictement supérieure à `minRating` (défaut 2.5). " +
        "Tri par date d’avis décroissante. Enrichissement : offre, employeur " +
        "(reviewer), employé (matchedProfile avec `employeeSlug`, années " +
        "d’expérience depuis `startedWorkingAt`).",
      parameters: [
        {
          name: "minRating",
          in: "query" as const,
          schema: {type: "number" as const, default: 2.5},
          description: "Seuil strict (exclu) ; avis avec rating > minRating",
        },
        {
          name: "min",
          in: "query" as const,
          schema: {type: "number" as const},
          description: "Alias de minRating",
        },
        {
          name: "limit",
          in: "query" as const,
          schema: {type: "integer" as const, default: 30, maximum: 60},
          description: "Nombre max. de cartes (1–60, défaut 30)",
        },
        {
          name: "serviceId",
          in: "query" as const,
          schema: {type: "string" as const},
          description:
            "Filtre : ne renvoie que les avis liés aux offres du " +
            "service (jobOffers.serviceId == serviceId).",
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/PublicJobReviewCard",
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/home-profiles": {
    get: {
      tags: ["Public"],
      summary: "Profils employés (liste d’accueil)",
      description:
        "Jusqu’à 10 profils : priorité aux badges ≠ NONE, ordre aléatoire " +
        "dans chaque groupe. `totalReviews` et `averageRating` agrègent les " +
        "avis dont l’offre a cet employé en `employeeId`. `employeeNote` " +
        "expose le champ `notes` du document employé. `employeeSlug` " +
        "(nom + suffixe numérique) sert de segment d’URL employé. " +
        "`homeAddress` = `address`, `workType` = FULL_TIME ou PART_TIME.",
      parameters: [
        localeQuery,
        countryQuery,
        {
          name: "limit",
          in: "query" as const,
          schema: {type: "integer" as const, default: 10, maximum: 10, minimum: 1},
          description: "Nombre max. de profils (1–10, défaut 10)",
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/PublicHomeProfileCard",
                    },
                  },
                },
              },
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/public/contact-messages": {
    post: {
      tags: ["Public"],
      summary: "Envoyer un message (formulaire contact vitrine)",
      description:
        "Crée un document Firestore `contactMessages` (sans auth). " +
        "Champs : `name`, `email`, `subject` (general | booking | support), " +
        "`message`, `locale` optionnel (ex. fr, en).",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "subject", "message"],
              properties: {
                name: {type: "string"},
                email: {type: "string", format: "email"},
                subject: {
                  type: "string",
                  enum: ["general", "booking", "support"],
                },
                message: {type: "string"},
                locale: {type: "string", example: "fr"},
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Créé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean", example: true},
                  data: {
                    type: "object",
                    properties: {id: {type: "string"}},
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Champs invalides",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/admin/documents/{collection}": {
    get: {
      tags: ["Admin — Documents"],
      summary: "Lister une collection",
      security: [{bearerAuth: []}],
      parameters: [
        collectionParam,
        {
          ...sortLocaleQuery,
          description:
            "Locale pour ordre alphabétique des libellés (défaut fr)",
        },
      ],
      responses: adminListResponses,
    },
    post: {
      tags: ["Admin — Documents"],
      summary: "Créer un document",
      security: [{bearerAuth: []}],
      parameters: [collectionParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              oneOf: [
                {
                  title: "service",
                  type: "object",
                  required: ["locale", "name"],
                  properties: {
                    locale: {type: "string"},
                    name: {type: "string"},
                    description: {type: "string"},
                    label: {
                      type: "string",
                      description: "Libellé vitrine optionnel (repli sur name)",
                    },
                    imageUrl: {type: "string", description: "URL image service"},
                    active: {type: "boolean"},
                  },
                },
                {
                  title: "country",
                  type: "object",
                  required: ["locale", "name", "code"],
                  properties: {
                    locale: {type: "string"},
                    name: {type: "string"},
                    code: {type: "string"},
                    flagLink: {type: "string"},
                    activePopularCities: {type: "array", items: {type: "string"}},
                    activePopularRegions: {
                      type: "array",
                      items: {type: "string"},
                    },
                    active: {type: "boolean"},
                  },
                },
                {
                  title: "language",
                  type: "object",
                  required: ["locale", "name", "code"],
                  properties: {
                    locale: {type: "string"},
                    name: {type: "string"},
                    code: {type: "string"},
                    flagIconUrl: {type: "string"},
                    active: {type: "boolean"},
                  },
                },
                {
                  title: "cmsSettings",
                  type: "object",
                  properties: {
                    countryCode: {type: "string", description: "ISO2 ou __"},
                    googlePlayStoreLink: {type: "string"},
                    appleAppStoreLink: {type: "string"},
                    facebookLink: {type: "string"},
                    twitterXLink: {type: "string"},
                    instagramLink: {type: "string"},
                    linkedInLink: {type: "string"},
                    tiktokLink: {type: "string"},
                    youtubeLink: {type: "string"},
                    whatsappLink: {type: "string"},
                    addresses: {type: "array", items: {type: "string"}},
                    phoneNumbers: {type: "array", items: {type: "string"}},
                    emailAddresses: {type: "array", items: {type: "string"}},
                    active: {type: "boolean"},
                  },
                },
                {
                  title: "newsFeed",
                  type: "object",
                  required: ["locale", "titleHtml"],
                  properties: {
                    locale: {type: "string"},
                    titleHtml: {type: "string"},
                    redirectUrl: {type: "string"},
                    active: {type: "boolean"},
                  },
                },
              ],
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Créé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    $ref: "#/components/schemas/ReferenceDocument",
                  },
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/admin/documents/{collection}/{id}": {
    put: {
      tags: ["Admin — Documents"],
      summary: "Mettre à jour un document",
      description:
        "Au moins un parmi : `active`, `locale`+champs traduction, " +
        "`imageUrl` (services), `code`/`flagLink`/`activePopularCities`/`activePopularRegions` (pays), `flagIconUrl` (langue). " +
        "Avec `locale` : services exigent au moins un parmi name, description, label, labelHtml ; " +
        "pays/langues exigent `name`.",
      security: [{bearerAuth: []}],
      parameters: [collectionParam, idParam],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                active: {type: "boolean"},
                countryCode: {type: "string", description: "ISO2 ou __"},
                locale: {type: "string"},
                name: {type: "string"},
                description: {type: "string"},
                label: {type: "string"},
                labelHtml: {type: "string"},
                imageUrl: {type: "string"},
                code: {type: "string"},
                flagLink: {type: "string"},
                activePopularCities: {type: "array", items: {type: "string"}},
                activePopularRegions: {type: "array", items: {type: "string"}},
                flagIconUrl: {type: "string"},
                googlePlayStoreLink: {type: "string"},
                appleAppStoreLink: {type: "string"},
                facebookLink: {type: "string"},
                twitterXLink: {type: "string"},
                instagramLink: {type: "string"},
                linkedInLink: {type: "string"},
                tiktokLink: {type: "string"},
                youtubeLink: {type: "string"},
                whatsappLink: {type: "string"},
                addresses: {type: "array", items: {type: "string"}},
                phoneNumbers: {type: "array", items: {type: "string"}},
                emailAddresses: {type: "array", items: {type: "string"}},
                titleHtml: {type: "string"},
                redirectUrl: {type: "string"},
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Mis à jour",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    $ref: "#/components/schemas/ReferenceDocument",
                  },
                },
              },
            },
          },
        },
        "400": {
          description: "Patch vide ou champs invalides",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "404": {
          description: "Document introuvable",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
    delete: {
      tags: ["Admin — Documents"],
      summary: "Supprimer un document",
      security: [{bearerAuth: []}],
      parameters: [collectionParam, idParam],
      responses: {
        "200": {
          description: "Supprimé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {success: {type: "boolean", example: true}},
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/admin/ui-dictionary": {
    get: {
      tags: ["Admin — UI dictionary"],
      summary: "Toutes les clés dictionnaire interface",
      security: [{bearerAuth: []}],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/UiDictionaryData"},
                },
              },
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/admin/ui-dictionary/{key}": {
    put: {
      tags: ["Admin — UI dictionary"],
      summary: "Créer / remplacer une clé",
      description:
        "Corps : `translations` (objet locale->texte) et/ou `fr`, `en` " +
        "legacy. Fusion avec l’existant.",
      security: [{bearerAuth: []}],
      parameters: [
        {
          name: "key",
          in: "path",
          required: true,
          schema: {type: "string"},
          description: "Clé : lettre minuscule, puis a-z 0-9 . _ -",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                translations: {
                  type: "object",
                  additionalProperties: {type: "string"},
                },
                fr: {type: "string"},
                en: {type: "string"},
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "object",
                    properties: {
                      key: {type: "string"},
                      translations: {
                        type: "object",
                        additionalProperties: {type: "string"},
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
    delete: {
      tags: ["Admin — UI dictionary"],
      summary: "Supprimer la surcharge d’une clé",
      security: [{bearerAuth: []}],
      parameters: [
        {
          name: "key",
          in: "path",
          required: true,
          schema: {type: "string"},
        },
      ],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {success: {type: "boolean"}},
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
  "/admin/firebase-users": {
    get: {
      tags: ["Admin — Firebase Auth"],
      summary: "Lister les utilisateurs Auth (paginé)",
      security: [{bearerAuth: []}],
      parameters: [
        {
          name: "maxResults",
          in: "query" as const,
          schema: {type: "integer" as const, default: 50, maximum: 100},
          description: "Taille de page (1–100)",
        },
        {
          name: "pageToken",
          in: "query" as const,
          schema: {type: "string" as const},
          description: "Jeton page suivante (réponse précédente)",
        },
      ],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {
                    type: "array",
                    items: {$ref: "#/components/schemas/FirebaseAuthUser"},
                  },
                  pageToken: {type: "string", nullable: true},
                },
              },
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "500": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
    post: {
      tags: ["Admin — Firebase Auth"],
      summary: "Créer un utilisateur (téléphone E.164)",
      security: [{bearerAuth: []}],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["phoneNumber"],
              properties: {
                phoneNumber: {
                  type: "string",
                  example: "+33612345678",
                  description: "E.164",
                },
                displayName: {type: "string"},
                email: {type: "string"},
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Créé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/FirebaseAuthUser"},
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
      },
    },
  },
  "/admin/firebase-users/{uid}": {
    get: {
      tags: ["Admin — Firebase Auth"],
      summary: "Détail utilisateur Auth",
      security: [{bearerAuth: []}],
      parameters: [firebaseUidParam],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/FirebaseAuthUser"},
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "404": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
    put: {
      tags: ["Admin — Firebase Auth"],
      summary: "Mettre à jour téléphone / displayName",
      security: [{bearerAuth: []}],
      parameters: [firebaseUidParam],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                phoneNumber: {type: "string"},
                displayName: {type: "string"},
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/FirebaseAuthUser"},
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
      },
    },
    delete: {
      tags: ["Admin — Firebase Auth"],
      summary: "Supprimer le compte Auth",
      security: [{bearerAuth: []}],
      parameters: [firebaseUidParam],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {success: {type: "boolean"}},
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
      },
    },
  },
  "/admin/firebase-users/{uid}/disable": {
    post: {
      tags: ["Admin — Firebase Auth"],
      summary: "Désactiver le compte",
      security: [{bearerAuth: []}],
      parameters: [firebaseUidParam],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/FirebaseAuthUser"},
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
      },
    },
  },
  "/admin/firebase-users/{uid}/enable": {
    post: {
      tags: ["Admin — Firebase Auth"],
      summary: "Réactiver le compte",
      security: [{bearerAuth: []}],
      parameters: [firebaseUidParam],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  data: {$ref: "#/components/schemas/FirebaseAuthUser"},
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
      },
    },
  },
  "/admin/firebase-users/{uid}/send-verification-sms": {
    post: {
      tags: ["Admin — Firebase Auth"],
      summary: "Envoyer SMS de vérification (Identity Toolkit)",
      description:
        "Nécessite `FIREBASE_WEB_API_KEY` sur les Functions. " +
        "Corps optionnel : `{ \"recaptchaToken\": \"...\" }` (reCAPTCHA v3).",
      security: [{bearerAuth: []}],
      parameters: [firebaseUidParam],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                recaptchaToken: {type: "string"},
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "SMS demandé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {type: "boolean"},
                  message: {type: "string"},
                },
              },
            },
          },
        },
        "400": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "401": adminListResponses["401"],
        "403": adminListResponses["403"],
        "404": {
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
        "503": {
          description: "FIREBASE_WEB_API_KEY manquante",
          content: {
            "application/json": {
              schema: {$ref: "#/components/schemas/ApiError"},
            },
          },
        },
      },
    },
  },
};
