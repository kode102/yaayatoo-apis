/** Badge profil employé (aligné API / Firestore). */
export type EmployeeBadge = "NONE" | "BLUE" | "GREEN" | "YELLOW";

/** Disponibilité / statut contrat employé (Firestore `status`). */
export type EmployeeStatus = "FREE" | "BUSY" | "BLOCKED";

/** Document Firestore collection `employee` (id = firebaseUid). */
export type EmployeeDoc = {
  id: string;
  firebaseUid: string;
  /** Code pays ISO2 (ex. CM) ; `__` si non renseigné (anciens documents). */
  countryCode?: string;
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
  /** Code pays ISO2 (ex. CM) ; `__` si non renseigné (anciens documents). */
  countryCode?: string;
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

/** Document Firestore collection `jobOffers` (id auto). */
export type JobOfferDoc = {
  id: string;
  /** Id document collection `employer` (= firebaseUid). */
  employerId: string;
  /** Id document collection `employee` (= firebaseUid). */
  employeeId?: string;
  jobTitle: string;
  /** Id document collection `services`. */
  serviceId: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Document Firestore collection `jobReviews` (id auto). */
export type JobReviewDoc = {
  id: string;
  /** Id document collection `jobOffers`. */
  jobOfferId: string;
  /** Note de 0,5 à 5 (demi-points). */
  rating: number;
  reviewText: string;
  /** Date de l’avis (YYYY-MM-DD). */
  reviewedAt: string;
  createdAt?: string;
  updatedAt?: string;
};
