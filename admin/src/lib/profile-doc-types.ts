/** Badge profil employé (aligné API / Firestore). */
export type EmployeeBadge = "NONE" | "BLUE" | "GREEN" | "YELLOW";

/** Disponibilité / statut contrat employé (Firestore `status`). */
export type EmployeeStatus = "FREE" | "BUSY" | "BLOCKED";

/** Document Firestore collection `employee` (id = firebaseUid). */
export type EmployeeDoc = {
  id: string;
  firebaseUid: string;
  fullName?: string;
  notes?: string;
  /** Début d’activité (YYYY-MM-DD) pour calculer l’ancienneté. */
  startedWorkingAt?: string;
  badge?: EmployeeBadge;
  /** Disponibilité (défaut API / affichage : FREE si absent en base). */
  status?: EmployeeStatus;
  profileImageUrl?: string;
  /** Ids documents collection `services`. */
  offeredServiceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

/** Badge profil employeur (aligné API / Firestore). */
export type EmployerBadge = "NONE" | "TRUSTED";

/** Document Firestore collection `employer` (id = firebaseUid). */
export type EmployerDoc = {
  id: string;
  firebaseUid: string;
  companyName?: string;
  contactName?: string;
  notes?: string;
  /** Date d’inscription / adhésion (YYYY-MM-DD). */
  joinedAt?: string;
  badge?: EmployerBadge;
  profileImageUrl?: string;
  occupation?: string;
  createdAt?: string;
  updatedAt?: string;
};
