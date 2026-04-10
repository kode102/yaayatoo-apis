import type {EmployeeStatus} from "@/lib/profile-doc-types";

/** Valeur API / Firestore hétérogène → statut sûr pour l’UI. */
export function employeeStatusOrDefault(
  v: string | undefined | null,
): EmployeeStatus {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "BUSY" || s === "BLOCKED" || s === "FREE") return s;
  return "FREE";
}

export const EMPLOYEE_STATUS_OPTIONS: {
  value: EmployeeStatus;
  labelKey: string;
}[] = [
  {value: "FREE", labelKey: "users.employee.statusFree"},
  {value: "BUSY", labelKey: "users.employee.statusBusy"},
  {value: "BLOCKED", labelKey: "users.employee.statusBlocked"},
];
