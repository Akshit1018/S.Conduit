/**
 * Intentionally messy upstream payloads for KitePay (Aug 2026).
 * Normalization lives in execute.ts — this file is the "real" world.
 */

export type RawPr = {
  number: number;
  repo: string;
  title: string;
  body?: string;
  state: "open" | "closed" | "merged";
  user?: { login: string } | string;
  labels?: Array<string | { name: string }>;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
  html_url: string;
  files?: string[];
};

export type RawGhIssue = {
  number: number;
  repo: string;
  title: string;
  state: "open" | "closed";
  labels?: string[];
  created_at: string;
  body?: string;
};

export type RawCodeHit = {
  repo: string;
  path: string;
  sha: string;
  snippet: string;
  score: number;
};

export type RawLinear = {
  identifier: string;
  title: string;
  team: string;
  state: string;
  priority: number | string;
  assignee?: string;
  labels?: string[];
  description?: string;
  updatedAt: string;
};

export type RawPage = {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  updated: string;
  excerpt: string;
  body: string;
};

export type RawContact = {
  vid?: number;
  id?: string;
  properties?: Record<string, string>;
  email?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
};

export type RawCompany = {
  companyId?: string;
  name: string;
  plan?: string;
  hs_plan?: string;
  modules?: string;
  product_modules?: string[];
  owner?: string;
  arr?: number;
  sso?: boolean;
};

export type RawDeal = {
  id: string;
  name: string;
  company: string;
  amount: number;
  stage: string;
  owner: string;
};

export type RawVuln = {
  id?: string;
  finding_id?: string;
  pkg?: string;
  packageName?: string;
  severity?: string;
  sev?: string;
  cve?: string;
  cwe?: string;
  title: string;
  repo?: string;
  repos?: string[];
  introduced?: string;
  fixed_in?: string | null;
  description?: string;
  blast_radius?: string;
};

export const NOW = "2026-08-13T00:00:00.000Z";

export const REPOS = [
  { name: "kitepay/auth-service", defaultBranch: "main", lang: "TypeScript" },
  { name: "kitepay/payments-api", defaultBranch: "main", lang: "Go" },
  { name: "kitepay/mobile-app", defaultBranch: "develop", lang: "Dart" },
  { name: "kitepay/admin-console", defaultBranch: "main", lang: "TypeScript" },
];

export const PRS: RawPr[] = [
  {
    number: 884,
    repo: "kitepay/auth-service",
    title: "Harden JWT refresh rotation",
    body: "Rotate refresh tokens on every use. Closes session-fixation window from AEG-4412. Relates to jsonwebtoken bump.",
    state: "open",
    user: { login: "meera.iyer" },
    labels: ["security", "auth", { name: "p1" }],
    created_at: "2026-08-08T09:14:00.000Z",
    updated_at: "2026-08-12T16:40:00.000Z",
    html_url: "https://github.com/kitepay/auth-service/pull/884",
    files: ["src/tokens/refresh.ts", "src/tokens/jwt.ts"],
  },
  {
    number: 881,
    repo: "kitepay/auth-service",
    title: "Fix OAuth state leak in callback",
    body: "state query param was echoed into logs. Customers on SSO (Acme, Meridian) hit this path.",
    state: "merged",
    user: "arjun.rao",
    labels: ["security", "auth"],
    created_at: "2026-08-07T11:02:00.000Z",
    updated_at: "2026-08-09T18:20:00.000Z",
    merged_at: "2026-08-09T18:20:00.000Z",
    html_url: "https://github.com/kitepay/auth-service/pull/881",
    files: ["src/oauth/callback.ts"],
  },
  {
    number: 876,
    repo: "kitepay/auth-service",
    title: "chore: bump jsonwebtoken to 9.0.2",
    body: "Addresses CVE-2026-31884 (high). Leaves HS256 default — follow-up in 884.",
    state: "merged",
    user: { login: "dependabot[bot]" },
    labels: ["dependencies", "security"],
    created_at: "2026-08-06T07:40:00.000Z",
    updated_at: "2026-08-07T10:11:00.000Z",
    merged_at: "2026-08-07T10:11:00.000Z",
    html_url: "https://github.com/kitepay/auth-service/pull/876",
    files: ["package.json", "package-lock.json"],
  },
  {
    number: 412,
    repo: "kitepay/mobile-app",
    title: "Store refresh token in secure storage",
    body: "Android still used SharedPreferences. Related to AUTH-142.",
    state: "open",
    user: { login: "nisha.k" },
    labels: ["mobile", "auth"],
    created_at: "2026-08-10T08:00:00.000Z",
    updated_at: "2026-08-12T12:00:00.000Z",
    html_url: "https://github.com/kitepay/mobile-app/pull/412",
    files: ["lib/auth/token_store.dart"],
  },
  {
    number: 209,
    repo: "kitepay/payments-api",
    title: "Idempotency keys on capture endpoint",
    body: "Release train 2026.32. Not auth-related.",
    state: "open",
    user: { login: "vikram.s" },
    labels: ["payments", "release-blocker"],
    created_at: "2026-08-11T14:22:00.000Z",
    updated_at: "2026-08-12T19:01:00.000Z",
    html_url: "https://github.com/kitepay/payments-api/pull/209",
  },
  {
    number: 201,
    repo: "kitepay/payments-api",
    title: "Fail closed when ledger replica lags",
    state: "merged",
    user: { login: "vikram.s" },
    labels: ["payments"],
    created_at: "2026-07-28T09:00:00.000Z",
    updated_at: "2026-07-30T11:00:00.000Z",
    merged_at: "2026-07-30T11:00:00.000Z",
    html_url: "https://github.com/kitepay/payments-api/pull/201",
  },
  {
    number: 77,
    repo: "kitepay/admin-console",
    title: "Session timeout banner for support role",
    state: "open",
    user: { login: "meera.iyer" },
    labels: ["auth", "ux"],
    created_at: "2026-08-09T15:30:00.000Z",
    updated_at: "2026-08-11T09:12:00.000Z",
    html_url: "https://github.com/kitepay/admin-console/pull/77",
  },
];

export const GH_ISSUES: RawGhIssue[] = [
  {
    number: 902,
    repo: "kitepay/auth-service",
    title: "Refresh token reuse not revoked on concurrent requests",
    state: "open",
    labels: ["bug", "security"],
    created_at: "2026-08-08T10:00:00.000Z",
    body: "Race in refresh handler. Tracked as AUTH-142.",
  },
  {
    number: 218,
    repo: "kitepay/payments-api",
    title: "Capture retries duplicate ledger rows under 5xx",
    state: "open",
    labels: ["bug", "release-blocker"],
    created_at: "2026-08-11T08:40:00.000Z",
  },
  {
    number: 54,
    repo: "kitepay/admin-console",
    title: "Support agents can see raw PATs in connector drawer",
    state: "closed",
    labels: ["security"],
    created_at: "2026-07-12T12:00:00.000Z",
  },
];

export const CODE_HITS: RawCodeHit[] = [
  {
    repo: "kitepay/auth-service",
    path: "src/tokens/jwt.ts",
    sha: "b7e21c9",
    snippet: `export function signAccess(payload: Claims) {\n  // TODO: migrate default away from HS256\n  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "15m" });\n}`,
    score: 0.94,
  },
  {
    repo: "kitepay/auth-service",
    path: "src/oauth/callback.ts",
    sha: "a11f03e",
    snippet: `// state is now hashed before log; see PR 881\nlogger.info("oauth.callback", { stateHash: sha256(state) });`,
    score: 0.81,
  },
  {
    repo: "kitepay/mobile-app",
    path: "lib/auth/token_store.dart",
    sha: "cc90aa1",
    snippet: `// Android: flutter_secure_storage; iOS: Keychain\nawait storage.write(key: 'refresh', value: token);`,
    score: 0.73,
  },
];

export const LINEAR: RawLinear[] = [
  {
    identifier: "AUTH-142",
    title: "Revoke reused refresh tokens",
    team: "AUTH",
    state: "started",
    priority: 1,
    assignee: "Meera Iyer",
    labels: ["security", "auth"],
    description:
      "Pair with github PR 884. High blast radius for SSO tenants.",
    updatedAt: "2026-08-12T16:40:00.000Z",
  },
  {
    identifier: "AUTH-138",
    title: "Rotate leaked HS256 signing secret",
    team: "AUTH",
    state: "review",
    priority: "urgent",
    assignee: "Arjun Rao",
    labels: ["security", "incident"],
    description: "Finding AEG-4401. Playbook: jwt-secret-rotation.",
    updatedAt: "2026-08-11T08:12:00.000Z",
  },
  {
    identifier: "PAY-88",
    title: "Idempotent capture before 2026.32 cut",
    team: "PAY",
    state: "started",
    priority: 2,
    assignee: "Vikram Shah",
    labels: ["release-blocker"],
    description: "Blocks payments-api release. See PR 209.",
    updatedAt: "2026-08-12T19:01:00.000Z",
  },
  {
    identifier: "PAY-91",
    title: "Replica lag circuit breaker",
    team: "PAY",
    state: "done",
    priority: 2,
    assignee: "Vikram Shah",
    updatedAt: "2026-07-30T11:00:00.000Z",
  },
  {
    identifier: "MOB-55",
    title: "Move refresh token off SharedPreferences",
    team: "MOB",
    state: "started",
    priority: 2,
    assignee: "Nisha K",
    labels: ["auth", "android"],
    description: "PR 412. Required for AEG-4412 close-out.",
    updatedAt: "2026-08-12T12:00:00.000Z",
  },
  {
    identifier: "SEC-12",
    title: "Quarterly SCA exception review",
    team: "SEC",
    state: "backlog",
    priority: 3,
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
];

export const PAGES: RawPage[] = [
  {
    id: "pg_jwt",
    slug: "jwt-secret-rotation",
    title: "Incident playbook — JWT / signing secret leak",
    tags: ["security", "auth", "oncall"],
    updated: "2026-08-04T00:00:00.000Z",
    excerpt: "Rotate, revoke refresh family, notify SSO tenants, file Linear.",
    body: `# JWT / signing secret leak

Severity: P1 if the secret signed production access tokens.

## Immediate
1. Rotate \`JWT_SECRET\` / signing key. Do not reuse the previous material.
2. Invalidate the entire refresh-token family (see AUTH-142).
3. Force re-auth for SSO tenants tagged \`sso=true\` in HubSpot.
4. Check Aegis for leftover hardcoded secrets (AEG-4401 pattern).

## Communicate
- Enterprise SSO accounts: Acme Logistics, Meridian Bank, Harbor Freight IN.
- Use the customer template in the Security wiki. Do not include raw CVEs.

## Close-out
- Linear ticket on AUTH, linked GitHub PR, Aegis finding marked mitigated.
- Postmortem within 3 business days.`,
  },
  {
    id: "pg_oncall",
    slug: "oncall-auth",
    title: "Auth on-call runbook",
    tags: ["oncall", "auth"],
    updated: "2026-07-22T00:00:00.000Z",
    excerpt: "Pages, dashboards, and escalation for auth-service.",
    body: `# Auth on-call

Pager: #auth-oncall. Dashboards: auth-service SLO, Aegis high+.\nEscalate to security after 2 failed secret rotations.`,
  },
  {
    id: "pg_sso",
    slug: "sso-tenant-map",
    title: "SSO tenant map",
    tags: ["product", "auth"],
    updated: "2026-08-10T00:00:00.000Z",
    excerpt: "Which HubSpot accounts have SSO and which IdP.",
    body: `# SSO tenant map

| Account | IdP | Module |
| Acme Logistics | Okta | sso, last-mile |
| Meridian Bank | Azure AD | sso, payouts |
| Harbor Freight IN | Google | sso |

Starter and Growth plans do not get SSO.`,
  },
  {
    id: "pg_release",
    slug: "release-2026-32",
    title: "Release train 2026.32",
    tags: ["product"],
    updated: "2026-08-11T00:00:00.000Z",
    excerpt: "payments-api cut blocked on PAY-88.",
    body: `# 2026.32

Cut: 2026-08-15. Blocker: PAY-88 / PR 209. Auth PRs 876 and 881 already on main.`,
  },
];

export const CONTACTS: RawContact[] = [
  {
    vid: 10021,
    properties: {
      email: "priya.nair@acmelog.in",
      firstname: "Priya",
      lastname: "Nair",
      company: "Acme Logistics",
      jobtitle: "Head of Engineering",
      product_module: "sso",
    },
  },
  {
    id: "hs_88",
    email: "cto@meridianbank.co",
    firstname: "Dev",
    lastname: "Kapoor",
    company: "Meridian Bank",
    properties: { product_module: "sso;payouts" },
  },
  {
    vid: 10044,
    properties: {
      email: "ops@harborfreight.in",
      firstname: "Anil",
      lastname: "Mehta",
      company: "Harbor Freight IN",
      product_module: "sso",
    },
  },
  {
    vid: 10090,
    properties: {
      email: "founders@quickcart.app",
      firstname: "Sara",
      lastname: "Qureshi",
      company: "QuickCart",
      product_module: "payments",
    },
  },
];

export const COMPANIES: RawCompany[] = [
  {
    companyId: "co_acme",
    name: "Acme Logistics",
    hs_plan: "enterprise",
    modules: "sso,last-mile",
    owner: "Neha Gupta",
    arr: 186000,
    sso: true,
  },
  {
    name: "Meridian Bank",
    plan: "enterprise",
    product_modules: ["sso", "payouts"],
    owner: "Neha Gupta",
    arr: 420000,
    sso: true,
  },
  {
    companyId: "co_harbor",
    name: "Harbor Freight IN",
    plan: "enterprise",
    modules: "sso",
    owner: "Rohit Sen",
    arr: 94000,
    sso: true,
  },
  {
    name: "QuickCart",
    plan: "growth",
    modules: "payments",
    owner: "Rohit Sen",
    arr: 36000,
    sso: false,
  },
];

export const DEALS: RawDeal[] = [
  {
    id: "d_acme_exp",
    name: "Acme Logistics — SSO expansion",
    company: "Acme Logistics",
    amount: 48000,
    stage: "negotiation",
    owner: "Neha Gupta",
  },
  {
    id: "d_meridian",
    name: "Meridian Bank — payouts add-on",
    company: "Meridian Bank",
    amount: 120000,
    stage: "closedwon",
    owner: "Neha Gupta",
  },
];

export const VULNS: RawVuln[] = [
  {
    finding_id: "AEG-4401",
    pkg: "kitepay/auth-service",
    severity: "critical",
    cve: null as unknown as string,
    cwe: "CWE-798",
    title: "Hardcoded HS256 fallback secret in jwt.ts",
    repos: ["kitepay/auth-service"],
    introduced: "2025-11-02",
    fixed_in: null,
    description:
      "If JWT_SECRET is unset in a misconfigured canary, signAccess falls back to a committed default. Scanner flagged after secret-scan rule v3.",
    blast_radius: "All access tokens if a canary ships without env.",
  },
  {
    id: "AEG-4412",
    packageName: "session",
    sev: "high",
    cwe: "CWE-384",
    title: "Session fixation via refresh-token reuse",
    repo: "kitepay/auth-service",
    introduced: "2026-03-18",
    fixed_in: null,
    description:
      "Concurrent refresh does not revoke the previous token. Open PR 884 / AUTH-142.",
    blast_radius: "SSO tenants sharing a stolen refresh token.",
  },
  {
    id: "AEG-4388",
    packageName: "jsonwebtoken",
    severity: "high",
    cve: "CVE-2026-31884",
    cwe: "CWE-347",
    title: "jsonwebtoken < 9.0.2 accepts malformed alg header",
    repos: ["kitepay/auth-service"],
    introduced: "2024-09-01",
    fixed_in: "9.0.2",
    description:
      "Dependency bump merged in PR 876. Residual risk until all replicas recycle.",
    blast_radius: "Auth-service pods still on 9.0.1 (2 of 12 as of Aug 12).",
  },
  {
    id: "AEG-4302",
    packageName: "flutter_secure_storage",
    severity: "medium",
    title: "Android fallback to SharedPreferences on older API",
    repo: "kitepay/mobile-app",
    description: "Tracked as MOB-55 / PR 412.",
    blast_radius: "Android API 22 devices only (~1.2% of sessions).",
  },
  {
    id: "AEG-4010",
    packageName: "golang.org/x/crypto",
    severity: "low",
    title: "Informational: crypto advisory, not reachable",
    repo: "kitepay/payments-api",
    description: "No auth impact.",
  },
];
