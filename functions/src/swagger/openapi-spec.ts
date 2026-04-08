/* eslint-disable require-jsdoc */

import {openApiComponents} from "./openapi-components.js";
import {openApiPaths} from "./openapi-paths.js";

/**
 * Document OpenAPI 3.0 pour la Cloud Function `yaayatoo`.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Yaayatoo API",
    version: "1.0.0",
    description:
      "API HTTP de la Cloud Function Firebase **yaayatoo** " +
      "(région `europe-west1`). " +
      "Préfixe client : `https://europe-west1-{projectId}.cloudfunctions.net/yaayatoo`. " +
      "Remplacez `{projectId}` par l’ID projet GCP / Firebase.",
  },
  servers: [
    {
      url: "https://europe-west1-{projectId}.cloudfunctions.net/yaayatoo",
      variables: {
        projectId: {
          default: "YOUR_PROJECT_ID",
          description: "ID projet Firebase (ex. mon-app-prod)",
        },
      },
    },
  ],
  tags: [
    {name: "Health", description: "Santé du service"},
    {
      name: "Search",
      description: "Recherche et liste générique Firestore (`/get`)",
    },
    {
      name: "Public",
      description: "Données de référence sans authentification",
    },
    {
      name: "Admin — Documents",
      description: "CRUD services, pays, langues (Bearer Firebase)",
    },
    {
      name: "Admin — UI dictionary",
      description: "Surcharges textes admin (Firestore adminUiDictionary)",
    },
  ],
  paths: openApiPaths,
  components: openApiComponents,
};
