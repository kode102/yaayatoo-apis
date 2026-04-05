/* eslint-disable max-len */
export interface FilterCriteria {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "between";
  value: unknown;
  value2?: unknown;
}

export interface FilterGroup {
  logic?: "and" | "or";
  filters: (FilterCriteria | FilterGroup)[];
}

export interface SortCriteria {
  field: string;
  order: "asc" | "desc";
}

export interface PopulateOptions {
  field?: string;
  link?: string;
  collection: string;
  select?: string | string[];
  as?: string;
  type?: "forward" | "reverse";
  populate?: PopulateOptions[];
}

export interface SpecialFilter {
  type: string;
  [key: string]: unknown;
}

export interface SpecialSort {
  type: string;
  order?: "asc" | "desc";
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  latField?: string;
  lonField?: string;
  [key: string]: unknown;
}

export interface RelationField {
  path: string;
  relationPath: string[];
  weight: number;
}
