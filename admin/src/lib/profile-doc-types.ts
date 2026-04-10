/** Badge profil employé (aligné API / Firestore). */
export type EmployeeBadge = "NONE" | "BLUE" | "GREEN" | "YELLOW";

/** Document Firestore collection `employee` (id = firebaseUid). */
export type EmployeeDoc = {
  id: string;
  firebaseUid: string;
  fullName?: string;
  notes?: string;
  /** Début d’activité (YYYY-MM-DD) pour calculer l’ancienneté. */
  startedWorkingAt?: string;
  badge?: EmployeeBadge;
  profileImageUrl?: string;
  /** Ids documents collection `services`. */
  offeredServiceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

/** Document Firestore collection `employer` (id = firebaseUid). */
export type EmployerDoc = {
  id: string;
  firebaseUid: string;
  companyName?: string;
  contactName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};
