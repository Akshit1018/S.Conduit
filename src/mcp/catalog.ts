import type { McpPrompt, McpResource, McpTool, SourceId } from "./types";

export const SOURCE_META: Record<
  SourceId,
  { label: string; org: string; description: string; color: string }
> = {
  github: {
    label: "GitHub",
    org: "kitepay",
    description: "Issues, pull requests, and code search across KitePay repos.",
    color: "source-github",
  },
  linear: {
    label: "Linear",
    org: "KitePay Eng",
    description: "Triage queue, release blockers, and write-path ticket creation.",
    color: "source-linear",
  },
  notion: {
    label: "Notion",
    org: "KitePay Wiki",
    description: "SOPs, incident playbooks, and architecture notes.",
    color: "source-notion",
  },
  hubspot: {
    label: "HubSpot",
    org: "KitePay CRM",
    description: "Accounts, contacts, and deals with product-module tags.",
    color: "source-hubspot",
  },
  aegis: {
    label: "Aegis Scan",
    org: "Security",
    description: "Snyk-style SCA findings with messy upstream payloads.",
    color: "source-aegis",
  },
};

const str = (description: string, extra: Record<string, unknown> = {}) => ({
  type: "string" as const,
  description,
  ...extra,
});

export const TOOLS: McpTool[] = [
  {
    name: "github.search_prs",
    sourceId: "github",
    description:
      "Search pull requests. Supports query, repo, state, since (ISO date), label.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Free-text match against title and body"),
        repo: str("Optional repo slug, e.g. kitepay/auth-service"),
        state: str("open | closed | merged | all", {
          enum: ["open", "closed", "merged", "all"],
        }),
        since: str("ISO date lower bound on updated_at"),
        label: str("Optional label filter"),
      },
    },
    example: { query: "auth", since: "2026-08-06" },
  },
  {
    name: "github.search_issues",
    sourceId: "github",
    description: "Search GitHub issues (bugs, tasks) across KitePay repos.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Free-text match"),
        repo: str("Optional repo slug"),
        state: str("open | closed | all", { enum: ["open", "closed", "all"] }),
        label: str("Optional label"),
      },
    },
    example: { query: "refresh token", state: "open" },
  },
  {
    name: "github.search_code",
    sourceId: "github",
    description: "Search code snippets (auth, jwt, oauth, secrets).",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Code or path query"),
        repo: str("Optional repo slug"),
      },
      required: ["query"],
    },
    example: { query: "jwt" },
  },
  {
    name: "github.get_pr",
    sourceId: "github",
    description: "Fetch a single pull request by number and optional repo.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        number: { type: "number", description: "PR number" },
        repo: str("Repo slug"),
      },
      required: ["number"],
    },
    example: { number: 884, repo: "kitepay/auth-service" },
  },
  {
    name: "linear.search_issues",
    sourceId: "linear",
    description: "Search Linear issues by text, team, state, or label.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Free-text"),
        team: str("Team key, e.g. AUTH, PAY, MOB"),
        state: str("backlog | started | review | done"),
        priority: str("urgent | high | medium | low"),
      },
    },
    example: { query: "auth", team: "AUTH" },
  },
  {
    name: "linear.get_issue",
    sourceId: "linear",
    description: "Get one Linear issue by identifier (e.g. AUTH-142).",
    write: false,
    inputSchema: {
      type: "object",
      properties: { id: str("Issue identifier") },
      required: ["id"],
    },
    example: { id: "AUTH-142" },
  },
  {
    name: "linear.create_issue",
    sourceId: "linear",
    description:
      "Create a Linear ticket. Write tool — pauses for human approval.",
    write: true,
    inputSchema: {
      type: "object",
      properties: {
        title: str("Issue title"),
        team: str("Team key"),
        priority: str("urgent | high | medium | low"),
        description: str("Markdown body"),
      },
      required: ["title", "team"],
    },
    example: {
      title: "Revoke reused refresh tokens — close AEG-4412",
      team: "AUTH",
      priority: "urgent",
      description:
        "Pair with PR 884. Notify SSO tenants Acme Logistics, Meridian Bank, Harbor Freight IN.",
    },
  },
  {
    name: "notion.search_pages",
    sourceId: "notion",
    description: "Search wiki pages (playbooks, SOPs, ADRs).",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Search query"),
        tag: str("Optional tag: security, auth, oncall, product"),
      },
      required: ["query"],
    },
    example: { query: "jwt", tag: "security" },
  },
  {
    name: "notion.read_page",
    sourceId: "notion",
    description: "Read a Notion page by id or slug.",
    write: false,
    inputSchema: {
      type: "object",
      properties: { id: str("Page id or slug") },
      required: ["id"],
    },
    example: { id: "jwt-secret-rotation" },
  },
  {
    name: "hubspot.search_contacts",
    sourceId: "hubspot",
    description: "Search CRM contacts. Messy property names are normalized.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Name, email, or company"),
        product_module: str("Filter by product module, e.g. sso, payments"),
      },
    },
    example: { product_module: "sso" },
  },
  {
    name: "hubspot.search_companies",
    sourceId: "hubspot",
    description: "Search companies / accounts with plan and module tags.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        query: str("Company name"),
        module: str("Affected product module"),
        plan: str("enterprise | growth | starter"),
      },
    },
    example: { module: "sso", plan: "enterprise" },
  },
  {
    name: "hubspot.get_deal",
    sourceId: "hubspot",
    description: "Get a deal by id or company name.",
    write: false,
    inputSchema: {
      type: "object",
      properties: { query: str("Deal id or company") },
      required: ["query"],
    },
    example: { query: "Acme Logistics" },
  },
  {
    name: "aegis.list_vulns",
    sourceId: "aegis",
    description:
      "List security scanner findings. Filter by severity, package, or repo.",
    write: false,
    inputSchema: {
      type: "object",
      properties: {
        severity: str("critical | high | medium | low"),
        package: str("Package name, e.g. jsonwebtoken"),
        repo: str("Affected repo"),
        q: str("Free-text across title and CWE"),
      },
    },
    example: { severity: "high" },
  },
  {
    name: "aegis.get_vuln",
    sourceId: "aegis",
    description: "Get one finding by id (AEG-xxxx or CVE).",
    write: false,
    inputSchema: {
      type: "object",
      properties: { id: str("Finding id") },
      required: ["id"],
    },
    example: { id: "AEG-4412" },
  },
];

export const RESOURCES: McpResource[] = [
  {
    uri: "github://kitepay/repos",
    name: "KitePay repositories",
    sourceId: "github",
    mimeType: "application/json",
    description: "Active engineering repos and default branches.",
  },
  {
    uri: "linear://kitepay/team/AUTH",
    name: "Auth team board",
    sourceId: "linear",
    mimeType: "application/json",
    description: "Open AUTH issues.",
  },
  {
    uri: "notion://kitepay/wiki/security",
    name: "Security wiki index",
    sourceId: "notion",
    mimeType: "text/markdown",
    description: "Playbooks and policies.",
  },
  {
    uri: "hubspot://kitepay/accounts/enterprise",
    name: "Enterprise accounts",
    sourceId: "hubspot",
    mimeType: "application/json",
    description: "SSO-enabled enterprise customers.",
  },
  {
    uri: "aegis://scans/latest",
    name: "Latest SCA scan",
    sourceId: "aegis",
    mimeType: "application/json",
    description: "Normalized findings from the last pipeline run.",
  },
];

export const PROMPTS: McpPrompt[] = [
  {
    name: "triage-auth-incident",
    title: "Triage an auth incident",
    description: "Cross-source sweep: vulns, recent auth PRs, playbook, customers.",
    text: "Show high-severity vulns related to auth PRs opened last week and which customers are affected in HubSpot.",
  },
  {
    name: "jwt-playbook",
    title: "JWT leak playbook",
    description: "Read the incident SOP and related open work.",
    text: "What does the incident playbook say about a JWT leak? Pull any related Linear work and recent PRs.",
  },
  {
    name: "release-blockers",
    title: "Payments release blockers",
    description: "Linear + GitHub blockers for payments-api.",
    text: "List open Linear issues blocking the payments-api release and any matching GitHub PRs.",
  },
  {
    name: "customer-impact",
    title: "Acme Logistics impact",
    description: "CRM + tickets for a named account.",
    text: "Who owns the Acme Logistics deal, which product modules do they use, and have they reported auth issues?",
  },
];

export const SOURCE_IDS = Object.keys(SOURCE_META) as SourceId[];

export function toolsFor(sourceId: SourceId) {
  return TOOLS.filter((t) => t.sourceId === sourceId);
}

export function toolByName(name: string) {
  return TOOLS.find((t) => t.name === name);
}
