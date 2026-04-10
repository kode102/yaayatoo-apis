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
      },
    },
    ReferenceDocument: {
      type: "object",
      description:
        "Document Firestore normalisé (timestamps en ISO). " +
        "Champs selon collection.",
      properties: {
        id: {type: "string"},
        active: {type: "boolean"},
        code: {type: "string", description: "Pays / langues"},
        flagLink: {type: "string", description: "URL drapeau pays"},
        flagIconUrl: {type: "string", description: "URL icône langue"},
        imageUrl: {type: "string", description: "URL image service"},
        translations: {
          type: "object",
          additionalProperties: {$ref: "#/components/schemas/TranslationBlock"},
        },
        createdAt: {type: "string", format: "date-time"},
        updatedAt: {type: "string", format: "date-time"},
      },
      additionalProperties: true,
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
