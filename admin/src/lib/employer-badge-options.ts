import type {EmployerBadge} from "@/lib/profile-doc-types";

export const EMPLOYER_BADGE_OPTIONS: {value: EmployerBadge; labelKey: string}[] =
  [
    {value: "NONE", labelKey: "users.employer.badgeNone"},
    {value: "TRUSTED", labelKey: "users.employer.badgeTrusted"},
  ];
