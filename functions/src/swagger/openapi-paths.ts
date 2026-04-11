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
      "employee",
      "employer",
      "jobOffers",
      "jobReviews",
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
  "/public/cms": {
    get: {
      tags: ["Public"],
      summary: "Contenu CMS par espaces (namespaces)",
      description:
        "Retourne les espaces actifs demandés et leurs sections actives. " +
        "Passer `namespaceKeys` (ex. home,contact) et/ou `namespaceIds` " +
        "(ids Firestore). Union des deux. Tri des sections : `locale` / " +
        "`sortLocale`. Résolution des champs par pays : `country` / " +
        "`countryCode` (ISO2).",
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
        "que le GET).",
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
        "`imageUrl` (services), `code`/`flagLink` (pays), `flagIconUrl` (langue). " +
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
                locale: {type: "string"},
                name: {type: "string"},
                description: {type: "string"},
                label: {type: "string"},
                labelHtml: {type: "string"},
                imageUrl: {type: "string"},
                code: {type: "string"},
                flagLink: {type: "string"},
                flagIconUrl: {type: "string"},
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
