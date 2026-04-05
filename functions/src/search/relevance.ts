/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {PopulateOptions, RelationField} from "./types.js";
import {
  flattenValue,
  getNestedValue,
  isFirestoreTimestamp,
} from "./utilsCore.js";

export function extractSearchableFieldsWithRelations(
  documents: any[],
  populateOptions: PopulateOptions[] = [],
  customFields?: string[],
  maxDepth = 4,
): RelationField[] {
  const fieldsMap = new Map<string, RelationField>();

  if (customFields && customFields.length > 0) {
    customFields.forEach((field) => {
      const relationPath = field.split(".");
      fieldsMap.set(field, {
        path: field,
        relationPath,
        weight: 1,
      });
    });
    return Array.from(fieldsMap.values());
  }

  function extractFields(
    obj: any,
    prefix = "",
    depth = 0,
    relationPath: string[] = [],
    baseWeight = 1,
  ) {
    if (depth > maxDepth || obj === null || obj === undefined) {
      return;
    }

    if (isFirestoreTimestamp(obj)) {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const fullPath = prefix ? `${prefix}.${key}` : key;

      if (
        key === "id" ||
        fullPath === "id" ||
        key.startsWith("_") ||
        key === "distanceRaw" ||
        key === "distance" ||
        key === "_relevanceScore"
      ) {
        return;
      }

      if (isFirestoreTimestamp(value)) {
        return;
      }

      const isPopulatedRelation =
        relationPath.length > 0 ||
        populateOptions.some((p) => (p.as || p.field) === key);

      const relationWeight = isPopulatedRelation ? 0.8 : baseWeight;

      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        const newRelationPath = [...relationPath, key];
        if (!fieldsMap.has(fullPath)) {
          fieldsMap.set(fullPath, {
            path: fullPath,
            relationPath: newRelationPath,
            weight: relationWeight,
          });
        }
      } else if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !isFirestoreTimestamp(value) &&
        value !== null
      ) {
        const newRelationPath = [...relationPath];
        if (value.id) {
          newRelationPath.push(key);
        }

        extractFields(value, fullPath, depth + 1, newRelationPath, relationWeight);
      } else if (Array.isArray(value) && value.length > 0) {
        const hasPrimitives = value.some(
          (item) =>
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean",
        );

        if (hasPrimitives) {
          const newRelationPath = [...relationPath, key];
          if (!fieldsMap.has(fullPath)) {
            fieldsMap.set(fullPath, {
              path: fullPath,
              relationPath: newRelationPath,
              weight: relationWeight,
            });
          }
        }

        const objectItems = value.filter(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            !Array.isArray(item) &&
            !isFirestoreTimestamp(item),
        );

        if (objectItems.length > 0) {
          const newRelationPath = [...relationPath, key];
          objectItems.forEach((item) => {
            extractFields(item, fullPath, depth + 1, newRelationPath, relationWeight);
          });
        }
      }
    });
  }

  documents.forEach((doc) => extractFields(doc));

  return Array.from(fieldsMap.values());
}

export function buildRelationWeightMap(
  populateOptions: PopulateOptions[],
  customWeights: {[key: string]: number} = {},
): {[key: string]: number} {
  const weights: {[key: string]: number} = {...customWeights};

  function processPopulate(options: PopulateOptions[], prefix = "") {
    options.forEach((opt) => {
      const fieldName = opt.as || opt.field || opt.collection;
      const fullPath = prefix ? `${prefix}.${fieldName}` : fieldName;

      if (!weights[fullPath]) {
        weights[fullPath] = 0.8;
      }

      if (opt.populate && opt.populate.length > 0) {
        processPopulate(opt.populate, fullPath);
      }
    });
  }

  processPopulate(populateOptions);
  return weights;
}

export function calculateRelevanceScore(
  doc: any,
  searchTerms: string[],
  relationFields: RelationField[],
  fieldWeights: {[key: string]: number},
): number {
  let score = 0;

  relationFields.forEach((relationField) => {
    const fieldValue = getNestedValue(doc, relationField.path);
    const weight =
      fieldWeights[relationField.path] !== undefined ?
        fieldWeights[relationField.path] :
        relationField.weight;

    const searchableValues = flattenValue(fieldValue);

    searchableValues.forEach((value) => {
      const normalizedValue = String(value).toLowerCase();

      searchTerms.forEach((term, index) => {
        if (normalizedValue === term) {
          score += 100 * weight;
        } else if (normalizedValue.startsWith(term)) {
          score += 50 * weight;
        } else if (normalizedValue.includes(term)) {
          score += 25 * weight;
        }

        const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, "i");
        if (wordBoundaryRegex.test(normalizedValue)) {
          score += 15 * weight;
        }

        const positionBonus = (searchTerms.length - index) * 2;
        if (normalizedValue.includes(term)) {
          score += positionBonus * weight;
        }
      });
    });
  });

  return score;
}
