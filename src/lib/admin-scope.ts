export const BUSINESS_VERTICALS = ["RECRUITMENT", "SECURITY", "BABY_CARE", "HOUSEKEEPING", "PEST_CONTROL"] as const;

export type BusinessVertical = typeof BUSINESS_VERTICALS[number];

export const BUSINESS_VERTICAL_LABELS: Record<BusinessVertical, string> = {
  RECRUITMENT: "Jobs & Recruitment",
  SECURITY: "Security Services",
  BABY_CARE: "Baby Care & Caretaker",
  HOUSEKEEPING: "Housekeeping",
  PEST_CONTROL: "Pest Control",
};

export type AdminScope = {
  all: boolean;
  verticals: BusinessVertical[];
};

export function isBusinessVertical(value: unknown): value is BusinessVertical {
  return typeof value === "string" && BUSINESS_VERTICALS.includes(value as BusinessVertical);
}

export function normalizeBusinessVerticals(values: unknown, fallback: BusinessVertical[] = ["RECRUITMENT"]): BusinessVertical[] {
  if (!Array.isArray(values)) return fallback;
  const normalized = [...new Set(values.filter(isBusinessVertical))];
  return normalized.length ? normalized : fallback;
}

export function inferBusinessVertical(category?: string): BusinessVertical {
  const value = category?.trim().toLowerCase() ?? "";
  if (/security|guard|bouncer/.test(value)) return "SECURITY";
  if (/baby|nanny|caretaker|patient care|elder care/.test(value)) return "BABY_CARE";
  if (/housekeep|cleaning|cleaner|maid/.test(value)) return "HOUSEKEEPING";
  if (/pest|termite|fumigation/.test(value)) return "PEST_CONTROL";
  return "RECRUITMENT";
}

export function serviceTypesForScope(scope: AdminScope): string[] | undefined {
  if (scope.all) return undefined;
  const types = new Set<string>();
  for (const vertical of scope.verticals) {
    if (vertical === "SECURITY") types.add("SECURITY");
    if (vertical === "BABY_CARE") { types.add("BABY_CARE"); types.add("CARETAKER"); }
    if (vertical === "HOUSEKEEPING") types.add("HOUSEKEEPING");
    if (vertical === "PEST_CONTROL") types.add("PEST_CONTROL");
    if (vertical === "RECRUITMENT") { types.add("MANPOWER"); types.add("OTHER"); }
  }
  return [...types];
}

export function businessVerticalForServiceType(serviceType: string): BusinessVertical {
  if (serviceType === "SECURITY") return "SECURITY";
  if (serviceType === "BABY_CARE" || serviceType === "CARETAKER") return "BABY_CARE";
  if (serviceType === "HOUSEKEEPING") return "HOUSEKEEPING";
  if (serviceType === "PEST_CONTROL") return "PEST_CONTROL";
  return "RECRUITMENT";
}

export function jobScopeFilter(scope: AdminScope): Record<string, unknown> {
  if (scope.all) return {};
  const conditions: Record<string, unknown>[] = [{ businessVertical: { $in: scope.verticals } }];
  const legacyPatterns: string[] = [];
  if (scope.verticals.includes("SECURITY")) legacyPatterns.push("security", "guard", "bouncer");
  if (scope.verticals.includes("BABY_CARE")) legacyPatterns.push("baby", "nanny", "caretaker", "patient care", "elder care");
  if (scope.verticals.includes("HOUSEKEEPING")) legacyPatterns.push("housekeep", "cleaning", "cleaner", "maid");
  if (scope.verticals.includes("PEST_CONTROL")) legacyPatterns.push("pest", "termite", "fumigation");
  if (legacyPatterns.length) {
    conditions.push({ businessVertical: { $exists: false }, category: { $regex: legacyPatterns.join("|"), $options: "i" } });
  }
  if (scope.verticals.includes("RECRUITMENT")) {
    conditions.push({ businessVertical: { $exists: false }, category: { $not: { $regex: "security|guard|bouncer|baby|nanny|caretaker|patient care|elder care|housekeep|cleaning|cleaner|maid|pest|termite|fumigation", $options: "i" } } });
  }
  return { $or: conditions };
}

export function requirementScopeFilter(scope: AdminScope): Record<string, unknown> {
  return jobScopeFilter(scope);
}

export function canAccessVertical(scope: AdminScope, vertical: BusinessVertical) {
  return scope.all || scope.verticals.includes(vertical);
}
