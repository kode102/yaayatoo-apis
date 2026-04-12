/* eslint-disable max-len -- schémas OpenAPI */
/* eslint-disable require-jsdoc */

/**
 * Composants réutilisables OpenAPI 3 (schemas + sécurité).
 */
export const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: "http" as const,
      scheme: "bearer",
      bearerFormat: "JWT",
      description:
        "Jeton Firebase Auth (ID token). " +
        "En-tête : `Authorization: Bearer <token>`. " +
        "Si `ADMIN_ALLOWED_EMAILS` est défini, seuls ces e-mails " +
        "sont autorisés.",
    },
  },
  schemas: {
    HealthResponse: {
      type: "object",
      properties: {
        status: {type: "string", example: "ok"},
        service: {type: "string", example: "yaayatoo-apis"},
        timestamp: {
          type: "string",
          format: "date-time",
        },
      },
    },
    ApiError: {
      type: "object",
      properties: {
        success: {type: "boolean", example: false},
        error: {type: "string"},
      },
    },
    ActiveLanguageItem: {
      type: "object",
      properties: {
        id: {type: "string"},
        code: {type: "string", example: "fr-cm"},
        label: {type: "string"},
        flagIconUrl: {type: "string"},
      },
    },
    TranslationBlock: {
      type: "object",
      properties: {
        name: {type: "string"},
        description: {type: "string"},
        label: {
          type: "string",
          description:
            "Libellé court vitrine (cartes, liste) ; sans valeur, affichage = name",
        },
        labelHtml: {
          type: "string",
          description: "Libellé HTML (sous-titre riche), par langue et pays",
        },
      },
    },
    ReferenceDocument: {
      type: "object",
      description:
        "Document Firestore normalisé (timestamps en ISO). " +
        "Champs selon collection.",
      properties: {
        id: {type: "string"},
        countryCode: {
          type: "string",
          description: "Pays résolu pour cmsSettings (ISO2 ou __)",
        },
        slug: {
          type: "string",
          description:
            "GET public / services uniquement : segment d’URL stable " +
            "(libellé FR défaut + suffixe numérique dérivé de l’id)",
        },
        active: {type: "boolean"},
        code: {type: "string", description: "Pays / langues"},
        flagLink: {type: "string", description: "URL drapeau pays"},
        flagIconUrl: {type: "string", description: "URL icône langue"},
        imageUrl: {type: "string", description: "URL image service"},
        color1: {type: "string", description: "Couleur dégradé bannière (#RGB)"},
        color2: {type: "string", description: "Couleur dégradé bannière (#RGB)"},
        bannerImageUrl: {type: "string", description: "Image bannière page service"},
        featureImageUrl: {
          type: "string",
          description: "Image mise en avant (héros)",
        },
        labelHtml: {
          type: "string",
          description:
            "Obsolète : préférer translations.*.*.labelHtml ; repli public si bloc sans labelHtml",
        },
        joinAction: {
          type: "object",
          properties: {
            text: {type: "string"},
            linkOrRoute: {
              type: "string",
              description: "URL absolue ou chemin interne",
            },
          },
        },
        postAction: {
          type: "object",
          properties: {
            text: {type: "string"},
            linkOrRoute: {type: "string"},
          },
        },
        featureTexts: {
          type: "array",
          items: {type: "string"},
          description: "Liste de puces marketing",
        },
        benefits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              imageUrl: {type: "string"},
              title: {type: "string"},
              description: {type: "string"},
            },
          },
        },
        reviewCount: {
          type: "integer",
          description:
            "GET public uniquement : nombre d’avis (jobReviews) liés au service",
        },
        averageRating: {
          type: "number",
          nullable: true,
          description:
            "GET public uniquement : note moyenne (null si aucun avis)",
        },
        translations: {
          type: "object",
          additionalProperties: {$ref: "#/components/schemas/TranslationBlock"},
        },
        googlePlayStoreLink: {type: "string"},
        appleAppStoreLink: {type: "string"},
        facebookLink: {type: "string"},
        twitterXLink: {type: "string"},
        instagramLink: {type: "string"},
        linkedInLink: {type: "string"},
        tiktokLink: {type: "string"},
        youtubeLink: {type: "string"},
        whatsappLink: {type: "string"},
        redirectUrl: {type: "string"},
        titleHtml: {type: "string"},
        addresses: {type: "array", items: {type: "string"}},
        phoneNumbers: {type: "array", items: {type: "string"}},
        emailAddresses: {type: "array", items: {type: "string"}},
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
      },
      additionalProperties: true,
    },
    NewsFeedItem: {
      type: "object",
      properties: {
        id: {type: "string"},
        titleHtml: {type: "string"},
        redirectUrl: {type: "string"},
      },
    },
    UiDictionaryData: {
      type: "object",
      description: "Clé message -> objet locale -> texte",
      additionalProperties: {
        type: "object",
        additionalProperties: {type: "string"},
      },
    },
    SearchPagination: {
      type: "object",
      properties: {
        page: {type: "integer"},
        limit: {type: "integer"},
        totalPages: {type: "integer"},
        totalResults: {type: "integer"},
        hasNextPage: {type: "boolean"},
        hasPrevPage: {type: "boolean"},
        nextPage: {type: "integer", nullable: true},
        prevPage: {type: "integer", nullable: true},
        startIndex: {type: "integer"},
        endIndex: {type: "integer"},
      },
    },
    PublicJobReviewReviewer: {
      type: "object",
      description:
        "Employeur lié à l’offre (nom affiché : companyName en priorité)",
      properties: {
        id: {type: "string", description: "Id document Firestore employer"},
        name: {type: "string"},
        subtitle: {type: "string"},
        imageUrl: {type: "string"},
        verified: {
          type: "boolean",
          description: "true si badge employeur TRUSTED",
        },
        badge: {
          type: "string",
          enum: ["NONE", "TRUSTED"],
          description: "Badge profil employeur",
        },
      },
    },
    PublicJobReviewMatchedProfile: {
      type: "object",
      description: "Employé associé à l’offre d’emploi",
      properties: {
        id: {type: "string", description: "Id document Firestore employee"},
        employeeSlug: {
          type: "string",
          description:
            "Slug URL (nom + suffixe numérique), même règle que " +
            "`GET /public/home-profiles`",
        },
        name: {type: "string"},
        subtitle: {type: "string"},
        imageUrl: {type: "string"},
        experienceYears: {type: "integer", nullable: true},
        verified: {
          type: "boolean",
          description: "true si badge employé différent de NONE",
        },
        badge: {
          type: "string",
          enum: ["NONE", "BLUE", "GREEN", "YELLOW"],
          description: "Badge profil employé",
        },
      },
    },
    PublicJobReviewCard: {
      type: "object",
      description:
        "Avis public (collection jobReviews) enrichi offre + profils",
      properties: {
        id: {type: "string"},
        rating: {type: "number"},
        reviewText: {type: "string"},
        reviewedAt: {type: "string", description: "Date YYYY-MM-DD"},
        jobTitle: {type: "string"},
        reviewer: {$ref: "#/components/schemas/PublicJobReviewReviewer"},
        matchedProfile: {
          $ref: "#/components/schemas/PublicJobReviewMatchedProfile",
        },
      },
    },
    PublicHomeProfileCard: {
      type: "object",
      description:
        "Profil employé vitrine (liste d’accueil). " +
        "Les avis sont ceux dont l’offre (`jobOffers`) a cet employé en " +
        "`employeeId` ; la moyenne et le total portent sur ces avis.",
      properties: {
        id: {type: "string"},
        fullName: {type: "string"},
        employeeSlug: {
          type: "string",
          description:
            "Slug URL : segment nom + 8 chiffres dérivés de l’id document",
        },
        profileImageUrl: {type: "string"},
        badge: {
          type: "string",
          enum: ["NONE", "BLUE", "GREEN", "YELLOW"],
        },
        verified: {
          type: "boolean",
          description: "true si badge employé différent de NONE",
        },
        ageYears: {type: "integer", nullable: true},
        experienceYears: {type: "integer", nullable: true},
        primaryServiceName: {
          type: "string",
          description: "Libellé du premier service proposé (CMS)",
        },
        totalReviews: {
          type: "integer",
          minimum: 0,
          description:
            "Nombre d’avis (jobReviews) liés aux offres assignées à l’employé",
        },
        averageRating: {
          type: "number",
          nullable: true,
          description:
            "Moyenne des notes sur ces avis ; null si aucun avis valide",
        },
        employeeNote: {
          type: "string",
          description:
            "Champ interne `notes` du document employé (peut être vide)",
        },
        homeAddress: {
          type: "string",
          description: "Adresse domicile (`address` Firestore employé)",
        },
        workType: {
          type: "string",
          enum: ["FULL_TIME", "PART_TIME"],
          description: "Temps plein ou partiel (`workType` Firestore)",
        },
      },
    },
    OnDemandServiceDocument: {
      type: "object",
      description:
        "Service à la demande actif (collection `onDemandServices`). " +
        "Traduction résolue pour le pays et la locale demandés via `resolvedTranslation`.",
      properties: {
        id: {type: "string"},
        active: {type: "boolean"},
        iconUrl: {
          type: "string",
          description: "URL Firebase Storage de l'icône du service",
        },
        linkedServiceIds: {
          type: "array",
          items: {type: "string"},
          description: "IDs Firestore des documents `services` associés",
        },
        translations: {
          type: "object",
          description: "Traductions imbriquées : pays → locale → { name, labelHtml }",
        },
        resolvedTranslation: {
          type: "object",
          description: "Bloc résolu pour le pays + locale de la requête",
          properties: {
            name: {type: "string", description: "Titre traduit"},
            labelHtml: {
              type: "string",
              description: "Description HTML (TinyMCE)",
            },
          },
        },
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
      },
    },
    FirebaseAuthUser: {
      type: "object",
      description: "Utilisateur Firebase Auth (sérialisé API admin)",
      properties: {
        uid: {type: "string"},
        email: {type: "string", nullable: true},
        displayName: {type: "string", nullable: true},
        phoneNumber: {type: "string", nullable: true},
        disabled: {type: "boolean"},
        emailVerified: {type: "boolean"},
        creationTime: {type: "string"},
        lastSignInTime: {type: "string", nullable: true},
        providerData: {type: "array", items: {type: "object"}},
      },
    },
  },
};
