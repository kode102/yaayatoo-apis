/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {admin, db} from "../lib/admin.js";
import type {PopulateOptions} from "./types.js";
import {
  getNestedValue,
  selectFields,
  setNestedValue,
} from "./utilsCore.js";

export async function performForwardPopulation(
  documents: any[],
  option: PopulateOptions,
): Promise<void> {
  const {field, collection, select, as} = option;

  if (!field) {
    console.error("Forward population requires \"field\" parameter");
    return;
  }

  const cache: {[id: string]: any} = {};
  const foreignKeysSet = new Set<string>();

  documents.forEach((doc) => {
    const foreignKey = getNestedValue(doc, field);

    if (foreignKey) {
      if (Array.isArray(foreignKey)) {
        foreignKey.forEach((fk) => {
          if (fk && typeof fk === "string") {
            foreignKeysSet.add(fk);
          }
        });
      } else if (typeof foreignKey === "string") {
        foreignKeysSet.add(foreignKey);
      }
    }
  });

  const foreignKeys = Array.from(foreignKeysSet);

  if (foreignKeys.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < foreignKeys.length; i += batchSize) {
      const batch = foreignKeys.slice(i, i + batchSize);

      try {
        const snapshot = await db
          .collection(collection)
          .where(admin.firestore.FieldPath.documentId(), "in", batch)
          .get();

        snapshot.forEach((doc) => {
          const docData = {id: doc.id, ...doc.data()};
          cache[doc.id] = selectFields(docData, select || "*");
        });
      } catch (error) {
        console.error(`Error fetching from collection ${collection}:`, error);
      }
    }

    foreignKeys.forEach((fk) => {
      if (!cache[fk]) {
        cache[fk] = null;
      }
    });
  }

  documents.forEach((doc) => {
    const foreignKey = getNestedValue(doc, field);
    const targetField = as || field;

    if (foreignKey) {
      if (Array.isArray(foreignKey)) {
        const populatedArray = foreignKey
          .map((fk) => cache[fk])
          .filter((item) => item !== null && item !== undefined);

        setNestedValue(doc, targetField, populatedArray);
      } else if (typeof foreignKey === "string") {
        const populatedDoc = cache[foreignKey];
        setNestedValue(doc, targetField, populatedDoc || null);
      }
    } else {
      setNestedValue(doc, targetField, null);
    }
  });

  if (option.populate && option.populate.length > 0) {
    const targetField = as || field;
    const nestedDocs: any[] = [];

    documents.forEach((doc) => {
      const populatedValue = getNestedValue(doc, targetField);
      if (populatedValue) {
        if (Array.isArray(populatedValue)) {
          nestedDocs.push(...populatedValue.filter((v) => v !== null));
        } else if (populatedValue !== null) {
          nestedDocs.push(populatedValue);
        }
      }
    });

    if (nestedDocs.length > 0) {
      await populateDocuments(nestedDocs, option.populate);
    }
  }
}

export async function performReversePopulation(
  documents: any[],
  option: PopulateOptions,
): Promise<void> {
  const {link, collection, select, as} = option;

  if (!link) {
    console.error("Reverse population requires \"link\" parameter");
    return;
  }

  const documentIds = documents.map((doc) => doc.id).filter(Boolean);

  if (documentIds.length === 0) {
    return;
  }

  const relatedDocsMap: {[parentId: string]: any[]} = {};
  documents.forEach((doc) => {
    relatedDocsMap[doc.id] = [];
  });

  const batchSize = 10;
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);

    try {
      const snapshot = await db
        .collection(collection)
        .where(link, "in", batch)
        .get();

      snapshot.forEach((doc) => {
        const docData: any = {id: doc.id, ...doc.data()};
        const selectedDoc = selectFields(docData, select || "*");
        const parentId = docData[link] as string;

        if (parentId && relatedDocsMap[parentId]) {
          relatedDocsMap[parentId].push(selectedDoc);
        }
      });
    } catch (error) {
      console.error(
        `Error performing reverse population from collection ${collection}:`,
        error,
      );
    }
  }

  try {
    const snapshot = await db.collection(collection).get();

    snapshot.forEach((doc) => {
      const docData: any = {id: doc.id, ...doc.data()};
      const linkValue = docData[link];

      if (Array.isArray(linkValue)) {
        const matchingParentIds = documentIds.filter((id) =>
          linkValue.includes(id),
        );

        if (matchingParentIds.length > 0) {
          const selectedDoc = selectFields(docData, select || "*");
          matchingParentIds.forEach((parentId) => {
            if (relatedDocsMap[parentId]) {
              const exists = relatedDocsMap[parentId].some(
                (d) => d.id === selectedDoc.id,
              );
              if (!exists) {
                relatedDocsMap[parentId].push(selectedDoc);
              }
            }
          });
        }
      }
    });
  } catch (error) {
    console.error("Error checking array fields in reverse population:", error);
  }

  documents.forEach((doc) => {
    const targetField = as || `${collection}`;
    const relatedDocs = relatedDocsMap[doc.id] || [];
    setNestedValue(doc, targetField, relatedDocs);
  });

  if (option.populate && option.populate.length > 0) {
    const targetField = as || `${collection}`;
    const allNestedDocs: any[] = [];

    documents.forEach((doc) => {
      const populatedValue = getNestedValue(doc, targetField);
      if (Array.isArray(populatedValue)) {
        allNestedDocs.push(...populatedValue.filter((v) => v !== null));
      }
    });

    if (allNestedDocs.length > 0) {
      await populateDocuments(allNestedDocs, option.populate);
    }
  }
}

export async function populateDocuments(
  documents: any[],
  populateOptions: PopulateOptions[],
): Promise<any[]> {
  if (!populateOptions || populateOptions.length === 0) {
    return documents;
  }

  for (const option of populateOptions) {
    const {field, link, type} = option;

    const isReverse = type === "reverse" || (link && !field);
    const isForward = type === "forward" || (field && !link);

    if (!isReverse && !isForward) {
      console.error(
        "Population option must have either \"field\" (forward) or \"link\" (reverse)",
      );
      continue;
    }

    if (isReverse) {
      await performReversePopulation(documents, option);
    } else {
      await performForwardPopulation(documents, option);
    }
  }

  return documents;
}
