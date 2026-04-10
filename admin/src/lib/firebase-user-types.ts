/** Ligne renvoyée par GET /admin/firebase-users. */
export type FirebaseUserRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  disabled: boolean;
  emailVerified: boolean;
  creationTime: string;
  lastSignInTime: string | null;
};

export type ApiFirebaseUsersPage = {
  success: boolean;
  data?: FirebaseUserRow[];
  pageToken?: string | null;
  error?: string;
};

export type ApiFirebaseUserDoc = {
  success: boolean;
  data?: FirebaseUserRow;
  error?: string;
};
