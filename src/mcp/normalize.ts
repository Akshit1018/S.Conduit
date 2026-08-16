import {
  COMPANIES,
  CONTACTS,
  GH_ISSUES,
  LINEAR,
  PAGES,
  PRS,
  type RawCompany,
  type RawContact,
  type RawLinear,
  type RawPr,
  type RawVuln,
  VULNS,
} from "./data";

export function loginOf(user: RawPr["user"]) {
  if (!user) return "unknown";
  return typeof user === "string" ? user : user.login;
}

export function labelsOf(labels: RawPr["labels"]) {
  if (!labels) return [];
  return labels.map((l) => (typeof l === "string" ? l : l.name));
}

export function normalizePr(pr: RawPr) {
  return {
    number: pr.number,
    repo: pr.repo,
    title: pr.title,
    body: pr.body ?? "",
    state: pr.state,
    author: loginOf(pr.user),
    labels: labelsOf(pr.labels),
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at ?? null,
    url: pr.html_url,
    files: pr.files ?? [],
  };
}

export function linearPriority(p: RawLinear["priority"]) {
  if (p === "urgent" || p === 1) return "urgent";
  if (p === "high" || p === 2) return "high";
  if (p === "medium" || p === 3) return "medium";
  return "low";
}

export function normalizeLinear(issue: RawLinear) {
  return {
    id: issue.identifier,
    title: issue.title,
    team: issue.team,
    state: issue.state,
    priority: linearPriority(issue.priority),
    assignee: issue.assignee ?? null,
    labels: issue.labels ?? [],
    description: issue.description ?? "",
    updatedAt: issue.updatedAt,
  };
}

export function contactName(c: RawContact) {
  const p = c.properties ?? {};
  const first = c.firstname ?? p.firstname ?? "";
  const last = c.lastname ?? p.lastname ?? "";
  return `${first} ${last}`.trim() || "Unknown";
}

export function contactEmail(c: RawContact) {
  return c.email ?? c.properties?.email ?? "";
}

export function contactCompany(c: RawContact) {
  return c.company ?? c.properties?.company ?? "";
}

export function contactModules(c: RawContact) {
  const raw = c.properties?.product_module ?? "";
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeContact(c: RawContact) {
  return {
    id: String(c.vid ?? c.id ?? contactEmail(c)),
    name: contactName(c),
    email: contactEmail(c),
    company: contactCompany(c),
    title: c.properties?.jobtitle ?? null,
    modules: contactModules(c),
  };
}

export function companyPlan(c: RawCompany) {
  return c.plan ?? c.hs_plan ?? "unknown";
}

export function companyModules(c: RawCompany) {
  if (c.product_modules) return c.product_modules;
  if (c.modules) return c.modules.split(",").map((s) => s.trim());
  return [];
}

export function normalizeCompany(c: RawCompany) {
  return {
    id: c.companyId ?? c.name.toLowerCase().replace(/\s+/g, "-"),
    name: c.name,
    plan: companyPlan(c),
    modules: companyModules(c),
    owner: c.owner ?? null,
    arr: c.arr ?? 0,
    sso: Boolean(c.sso),
  };
}

export function vulnId(v: RawVuln) {
  return v.id ?? v.finding_id ?? "AEG-????";
}

export function vulnPkg(v: RawVuln) {
  return v.packageName ?? v.pkg ?? "unknown";
}

export function vulnSev(v: RawVuln) {
  return (v.severity ?? v.sev ?? "low").toLowerCase();
}

export function vulnRepos(v: RawVuln) {
  if (v.repos) return v.repos;
  if (v.repo) return [v.repo];
  return [];
}

export function normalizeVuln(v: RawVuln) {
  return {
    id: vulnId(v),
    package: vulnPkg(v),
    severity: vulnSev(v),
    cve: v.cve ?? null,
    cwe: v.cwe ?? null,
    title: v.title,
    repos: vulnRepos(v),
    introduced: v.introduced ?? null,
    fixedIn: v.fixed_in ?? null,
    description: v.description ?? "",
    blastRadius: v.blast_radius ?? null,
  };
}

export function matchText(hay: string, q?: string) {
  if (!q) return true;
  return hay.toLowerCase().includes(q.toLowerCase());
}

export function sinceOk(iso: string, since?: string) {
  if (!since) return true;
  return new Date(iso).getTime() >= new Date(since).getTime();
}

export { COMPANIES, CONTACTS, GH_ISSUES, LINEAR, PAGES, PRS, VULNS };
