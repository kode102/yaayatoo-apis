/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  FilterCriteria,
  FilterGroup,
  PopulateOptions,
  SortCriteria,
  SpecialFilter,
  SpecialSort,
} from "./types.js";

export function isFirestoreTimestamp(value: any): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    ("_seconds" in value || "seconds" in value) &&
    ("_nanoseconds" in value || "nanoseconds" in value)
  );
}

export function firestoreTimestampToDate(timestamp: any): Date | null {
  if (!isFirestoreTimestamp(timestamp)) return null;
  const seconds = timestamp._seconds || timestamp.seconds;
  const nanoseconds = timestamp._nanoseconds || timestamp.nanoseconds || 0;
  return new Date(seconds * 1000 + nanoseconds / 1000000);
}

export function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (current === null || current === undefined) {
      return undefined;
    }

    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);

    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      current = current[arrayName];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      }
    } else {
      current = current[part];
    }

    if (Array.isArray(current) && i < parts.length - 1) {
      const remainingPath = parts.slice(i + 1).join(".");
      const nestedValues = current
        .map((item: any) => {
          if (item === null || item === undefined) return undefined;
          return getNestedValue(item, remainingPath);
        })
        .filter((val: any) => val !== undefined);

      return nestedValues.length > 0 ? nestedValues : undefined;
    }
  }

  return current;
}

export function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

export function flattenValue(value: any): any[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (isFirestoreTimestamp(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => flattenValue(item))
      .flat()
      .filter((v) => v !== null && v !== undefined);
  }

  if (typeof value !== "object" || value instanceof Date) {
    return [value];
  }

  return [value];
}

export function compareValues(
  docValue: any,
  operator: string,
  filterValue: any,
  filterValue2?: any,
): boolean {
  let dv = docValue;
  if (dv === null || dv === undefined) {
    return operator === "ne" || operator === "lt" || operator === "lte";
  }

  if (isFirestoreTimestamp(dv)) {
    dv = firestoreTimestampToDate(dv);
  }

  if (
    dv instanceof Date ||
    (typeof filterValue === "string" && !isNaN(Date.parse(filterValue)))
  ) {
    const docDate = dv instanceof Date ? dv : new Date(dv);
    const filterDate = new Date(filterValue as string);

    switch (operator) {
      case "eq":
        return docDate.getTime() === filterDate.getTime();
      case "ne":
        return docDate.getTime() !== filterDate.getTime();
      case "gt":
        return docDate.getTime() > filterDate.getTime();
      case "gte":
        return docDate.getTime() >= filterDate.getTime();
      case "lt":
        return docDate.getTime() < filterDate.getTime();
      case "lte":
        return docDate.getTime() <= filterDate.getTime();
      case "between":
        if (filterValue2) {
          const filterDate2 = new Date(filterValue2);
          return (
            docDate.getTime() >= filterDate.getTime() &&
            docDate.getTime() <= filterDate2.getTime()
          );
        }
        return false;
    }
  }

  if (typeof dv === "number" || !isNaN(Number(dv))) {
    const docNum = typeof dv === "number" ? dv : Number(dv);
    const filterNum =
      typeof filterValue === "number" ? filterValue : Number(filterValue);

    switch (operator) {
      case "eq":
        return docNum === filterNum;
      case "ne":
        return docNum !== filterNum;
      case "gt":
        return docNum > filterNum;
      case "gte":
        return docNum >= filterNum;
      case "lt":
        return docNum < filterNum;
      case "lte":
        return docNum <= filterNum;
      case "between":
        if (filterValue2 !== undefined) {
          const filterNum2 =
            typeof filterValue2 === "number" ?
              filterValue2 :
              Number(filterValue2);
          return docNum >= filterNum && docNum <= filterNum2;
        }
        return false;
    }
  }

  const docStr = String(dv).toLowerCase();
  const filterStr = String(filterValue).toLowerCase();

  switch (operator) {
    case "eq":
      return docStr === filterStr;
    case "ne":
      return docStr !== filterStr;
    case "gt":
      return docStr > filterStr;
    case "gte":
      return docStr >= filterStr;
    case "lt":
      return docStr < filterStr;
    case "lte":
      return docStr <= filterStr;
    case "contains":
      return docStr.includes(filterStr);
    case "startsWith":
      return docStr.startsWith(filterStr);
    case "endsWith":
      return docStr.endsWith(filterStr);
    case "in":
      if (Array.isArray(filterValue)) {
        return filterValue.some((v) => String(v).toLowerCase() === docStr);
      }
      return false;
  }

  return false;
}

export function matchesSingleFilter(doc: any, filter: FilterCriteria): boolean {
  const fieldValue = getNestedValue(doc, filter.field);

  if (Array.isArray(fieldValue)) {
    const flatValues = flattenValue(fieldValue);
    return flatValues.some((val) =>
      compareValues(val, filter.operator, filter.value, filter.value2),
    );
  }

  return compareValues(
    fieldValue,
    filter.operator,
    filter.value,
    filter.value2,
  );
}

export function matchesFilterGroup(doc: any, filterGroup: FilterGroup): boolean {
  if (!filterGroup.filters || filterGroup.filters.length === 0) return true;

  const logic = filterGroup.logic || "and";

  if (logic === "and") {
    return filterGroup.filters.every((filter) => {
      if ("logic" in filter && "filters" in filter) {
        return matchesFilterGroup(doc, filter as FilterGroup);
      }
      return matchesSingleFilter(doc, filter as FilterCriteria);
    });
  }
  return filterGroup.filters.some((filter) => {
    if ("logic" in filter && "filters" in filter) {
      return matchesFilterGroup(doc, filter as FilterGroup);
    }
    return matchesSingleFilter(doc, filter as FilterCriteria);
  });
}

export function parseFilters(filters: any): FilterGroup {
  if (!filters) return {logic: "and", filters: []};

  if (Array.isArray(filters)) {
    return {logic: "and", filters};
  }

  if (typeof filters === "string") {
    try {
      const parsed = JSON.parse(filters);
      if (Array.isArray(parsed)) {
        return {logic: "and", filters: parsed};
      }
      return parsed;
    } catch {
      return {logic: "and", filters: []};
    }
  }

  if (filters.logic && filters.filters) {
    return filters;
  }

  return {logic: "and", filters: []};
}

export function parseSortCriteria(sortParam: any): SortCriteria[] {
  if (!sortParam) return [];

  if (Array.isArray(sortParam)) {
    return sortParam.map((s) => ({
      field: s.field,
      order: s.order || "asc",
    }));
  }

  if (typeof sortParam === "string") {
    try {
      const parsed = JSON.parse(sortParam);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          field: s.field,
          order: s.order || "asc",
        }));
      }
      if (parsed.field) {
        return [{field: parsed.field, order: parsed.order || "asc"}];
      }
    } catch {
      return sortParam
        .split(",")
        .map((s) => {
          const [field, order] = s.trim().split(":");
          return {
            field: field.trim(),
            order: (order?.trim() as "asc" | "desc") || "asc",
          };
        })
        .filter((s) => s.field);
    }
  }

  if (sortParam.field) {
    return [{field: sortParam.field, order: sortParam.order || "asc"}];
  }

  return [];
}

export function parsePopulateOptions(populateParam: any): PopulateOptions[] {
  if (!populateParam) return [];

  const mapOne = (p: any): PopulateOptions => ({
    field: p.field,
    link: p.link,
    collection: p.collection,
    select: p.select || "*",
    as: p.as || p.field || (p.link ? p.collection : undefined),
    type: p.type,
    populate: p.populate ? parsePopulateOptions(p.populate) : undefined,
  });

  if (Array.isArray(populateParam)) {
    return populateParam.map(mapOne);
  }

  if (typeof populateParam === "string") {
    try {
      const parsed = JSON.parse(populateParam);
      if (Array.isArray(parsed)) {
        return parsed.map(mapOne);
      }
      if ((parsed.field || parsed.link) && parsed.collection) {
        return [mapOne(parsed)];
      }
    } catch {
      return [];
    }
  }

  if (
    (populateParam.field || populateParam.link) &&
    populateParam.collection
  ) {
    return [mapOne(populateParam)];
  }

  return [];
}

export function getComparableValue(value: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  if (isFirestoreTimestamp(value)) {
    const date = firestoreTimestampToDate(value);
    return date ? date.getTime() : null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    return value.toLowerCase();
  }

  return value;
}

export function compareSortValues(
  a: any,
  b: any,
  order: "asc" | "desc",
): number {
  const valA = getComparableValue(a);
  const valB = getComparableValue(b);

  if (valA === null && valB === null) return 0;
  if (valA === null) return 1;
  if (valB === null) return -1;

  let comparison = 0;

  if (typeof valA === "number" && typeof valB === "number") {
    comparison = valA - valB;
  } else if (typeof valA === "string" && typeof valB === "string") {
    comparison = valA.localeCompare(valB);
  } else {
    comparison = String(valA).localeCompare(String(valB));
  }

  return order === "desc" ? -comparison : comparison;
}

export function sortDocuments(
  documents: any[],
  sortCriteria: SortCriteria[],
): any[] {
  if (!sortCriteria || sortCriteria.length === 0) {
    return documents;
  }

  return [...documents].sort((a, b) => {
    for (const criteria of sortCriteria) {
      const valueA = getNestedValue(a, criteria.field);
      const valueB = getNestedValue(b, criteria.field);

      const comparison = compareSortValues(valueA, valueB, criteria.order);

      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}

export function selectFields(doc: any, select: string | string[]): any {
  if (!doc) return null;

  if (select === "*") {
    return doc;
  }

  const fieldsArray =
    typeof select === "string" ?
      select.split(",").map((f) => f.trim()) :
      select;

  const result: any = {id: doc.id};

  fieldsArray.forEach((field) => {
    if (field === "*") {
      Object.assign(result, doc);
      return;
    }

    const value = getNestedValue(doc, field);
    if (value !== undefined) {
      setNestedValue(result, field, value);
    }
  });

  return result;
}

export function parseSpecialFilter(specialFilterParam: any): SpecialFilter | null {
  if (!specialFilterParam) return null;

  if (typeof specialFilterParam === "string") {
    try {
      return JSON.parse(specialFilterParam);
    } catch {
      return null;
    }
  }

  if (
    typeof specialFilterParam === "object" &&
    (specialFilterParam as SpecialFilter).type
  ) {
    return specialFilterParam as SpecialFilter;
  }

  return null;
}

export function parseSpecialSort(specialSortParam: any): SpecialSort | null {
  if (!specialSortParam) return null;

  if (typeof specialSortParam === "string") {
    try {
      return JSON.parse(specialSortParam);
    } catch {
      return null;
    }
  }

  if (
    typeof specialSortParam === "object" &&
    (specialSortParam as SpecialSort).type
  ) {
    return specialSortParam as SpecialSort;
  }

  return null;
}

export function parseDate(dateString: string): Date | null {
  try {
    const parts = dateString.split("-");
    if (parts.length !== 3) return null;

    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;

    const date = new Date(year, month, day);

    if (
      date.getMonth() !== month ||
      date.getDate() !== day ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

function getDayOfWeek(date: Date): number {
  return date.getDay();
}

function getDayNameInFrench(dayOfWeek: number): string {
  const dayNames = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];
  return dayNames[dayOfWeek];
}

function checkWorkingDayOpen(doc: any, dateString: string): boolean {
  const date = parseDate(dateString);
  if (!date) {
    console.error("Invalid date format. Expected MM-DD-YYYY");
    return false;
  }

  const dayOfWeek = getDayOfWeek(date);
  const dayName = getDayNameInFrench(dayOfWeek);

  if (!doc.workingDays || !Array.isArray(doc.workingDays)) {
    return false;
  }

  const workingDay = doc.workingDays.find((wd: any) => wd.name === dayName);
  if (!workingDay) {
    return false;
  }

  return workingDay.isOpen === true;
}

export function applySpecialFilters(
  documents: any[],
  specialFilter: SpecialFilter,
  collectionName: string,
): any[] {
  if (!specialFilter || !specialFilter.type) {
    return documents;
  }

  if (collectionName === "users") {
    switch (specialFilter.type) {
      case "workingDayOpen": {
        const date = specialFilter.date as string;
        if (!date) {
          console.error(
            "Special filter \"workingDayOpen\" requires a \"date\" parameter",
          );
          return documents;
        }
        return documents.filter((doc) => checkWorkingDayOpen(doc, date));
      }
      default:
        console.warn(
          `Unknown special filter type for users collection: ${specialFilter.type}`,
        );
        return documents;
    }
  }

  console.warn(
    `Special filters not implemented for collection: ${collectionName}`,
  );
  return documents;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function sortByDistance(
  documents: any[],
  userLat: number,
  userLon: number,
  latField = "address.latitude",
  lonField = "address.longitude",
  order: "asc" | "desc" = "asc",
): any[] {
  const documentsWithDistance = documents.map((doc) => {
    const docLat = getNestedValue(doc, latField);
    const docLon = getNestedValue(doc, lonField);

    if (
      docLat === null ||
      docLat === undefined ||
      docLon === null ||
      docLon === undefined ||
      isNaN(Number(docLat)) ||
      isNaN(Number(docLon))
    ) {
      return {
        ...doc,
        distance: null,
        distanceRaw: Infinity,
      };
    }

    const distance = calculateDistance(
      userLat,
      userLon,
      Number(docLat),
      Number(docLon),
    );

    return {
      ...doc,
      distance,
      distanceRaw: distance,
    };
  });

  return documentsWithDistance.sort((a, b) => {
    if (order === "asc") {
      return a.distanceRaw - b.distanceRaw;
    }
    return b.distanceRaw - a.distanceRaw;
  });
}

export function applySpecialSort(
  documents: any[],
  specialSort: SpecialSort,
  collectionName: string,
): any[] {
  if (!specialSort || !specialSort.type) {
    return documents;
  }

  if (collectionName === "users") {
    switch (specialSort.type) {
      case "distance": {
        const {lat, lon, latitude, longitude, order} = specialSort;

        const userLat = lat !== undefined ? lat : latitude;
        const userLon = lon !== undefined ? lon : longitude;

        if (userLat === undefined || userLon === undefined) {
          console.error(
            "Special sort \"distance\" requires \"lat\" and \"lon\"",
          );
          return documents;
        }

        if (isNaN(Number(userLat)) || isNaN(Number(userLon))) {
          console.error("Special sort \"distance\" requires valid coordinates");
          return documents;
        }

        const latField = (specialSort.latField as string) || "address.latitude";
        const lonField =
          (specialSort.lonField as string) || "address.longitude";
        const sortOrder = (order as "asc" | "desc") || "asc";

        return sortByDistance(
          documents,
          Number(userLat),
          Number(userLon),
          latField,
          lonField,
          sortOrder,
        );
      }
      default:
        console.warn(
          `Unknown special sort type for users collection: ${specialSort.type}`,
        );
        return documents;
    }
  }

  console.warn(
    `Special sorts not implemented for collection: ${collectionName}`,
  );
  return documents;
}

export function applyCombinedSort(
  documents: any[],
  specialSort: SpecialSort | null,
  sortCriteria: SortCriteria[],
  collectionName: string,
): any[] {
  if (!specialSort) {
    return sortDocuments(documents, sortCriteria);
  }

  const sortedDocs = applySpecialSort(documents, specialSort, collectionName);

  if (!sortCriteria || sortCriteria.length === 0) {
    return sortedDocs;
  }

  const specialSortOrder = specialSort.order || "asc";

  return sortedDocs.sort((a, b) => {
    if (specialSort.type === "distance") {
      const distA =
        a.distanceRaw !== undefined ?
          a.distanceRaw :
          a.distance !== null ?
            a.distance :
            Infinity;
      const distB =
        b.distanceRaw !== undefined ?
          b.distanceRaw :
          b.distance !== null ?
            b.distance :
            Infinity;

      const distanceComparison =
        specialSortOrder === "desc" ? distB - distA : distA - distB;

      if (Math.abs(distanceComparison) > 0.0001) {
        return distanceComparison;
      }
    }

    for (const criteria of sortCriteria) {
      const valueA = getNestedValue(a, criteria.field);
      const valueB = getNestedValue(b, criteria.field);

      const comparison = compareSortValues(valueA, valueB, criteria.order);

      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}
