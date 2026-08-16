import { dispatchTool } from "./dispatch";
import type { CallStatus, JsonObject, JsonValue } from "./types";

export type PlaybookStep = {
  tool: string;
  args: JsonObject;
  latencyMs: number;
  status: CallStatus;
  data: JsonValue;
};

export type PlaybookReport = {
  id: string;
  title: string;
  summary: string;
  findings: Array<{
    id: string;
    title: string;
    severity: string;
    detail: string;
  }>;
  prs: Array<{
    number: number;
    title: string;
    repo: string;
    state: string;
  }>;
  customers: Array<{ name: string; plan: string; owner: string }>;
  playbook: { slug: string; title: string; excerpt: string } | null;
  tickets: Array<{ id: string; title: string; state: string }>;
  recommendedTicket: JsonObject;
  briefing: string;
  steps: PlaybookStep[];
};

function asObj(v: JsonValue | undefined): JsonObject {
  if (v && typeof v === "object" && !Array.isArray(v)) return v;
  return {};
}

function asArr(v: JsonValue | undefined): JsonValue[] {
  return Array.isArray(v) ? v : [];
}

function str(v: JsonValue | undefined) {
  return typeof v === "string" ? v : "";
}

function num(v: JsonValue | undefined) {
  return typeof v === "number" ? v : 0;
}

async function step(
  userId: string,
  tool: string,
  args: JsonObject,
): Promise<PlaybookStep> {
  const out = await dispatchTool({
    userId,
    tool,
    args,
    caller: "playbook",
  });
  const data =
    out.result.content.find((c) => c.type === "json")?.json ??
    out.result.content[0]?.text ??
    null;
  return {
    tool,
    args,
    latencyMs: out.latencyMs,
    status: out.result.status,
    data: (data ?? null) as JsonValue,
  };
}

export async function runAuthIncident(userId: string): Promise<PlaybookReport> {
  const steps = [
    await step(userId, "aegis.list_vulns", { q: "auth" }),
    await step(userId, "github.search_prs", {
      query: "auth",
      since: "2026-08-06",
    }),
    await step(userId, "hubspot.search_companies", { module: "sso" }),
    await step(userId, "notion.search_pages", { query: "jwt" }),
    await step(userId, "linear.search_issues", { query: "auth", team: "AUTH" }),
  ];

  const vulns = asArr(asObj(steps[0]?.data).findings)
    .map(asObj)
    .filter((v) => {
      const sev = str(v.severity);
      return sev === "critical" || sev === "high";
    });
  const prs = asArr(asObj(steps[1]?.data).pullRequests).map(asObj);
  const companies = asArr(asObj(steps[2]?.data).companies).map(asObj);
  const pages = asArr(asObj(steps[3]?.data).pages).map(asObj);
  const tickets = asArr(asObj(steps[4]?.data).issues).map(asObj);
  const playbookPage = pages[0] ?? null;

  const findings = vulns.map((v) => ({
    id: str(v.id),
    title: str(v.title),
    severity: str(v.severity),
    detail: str(v.description) || str(v.blastRadius),
  }));

  const prList = prs.map((p) => ({
    number: num(p.number),
    title: str(p.title),
    repo: str(p.repo),
    state: str(p.state),
  }));

  const customers = companies.map((c) => ({
    name: str(c.name),
    plan: str(c.plan),
    owner: str(c.owner),
  }));

  const ticketList = tickets.map((t) => ({
    id: str(t.id),
    title: str(t.title),
    state: str(t.state),
  }));

  const recommendedTicket: JsonObject = {
    title: "Close AEG-4412 / AEG-4401 — rotate secret and revoke refresh family",
    team: "AUTH",
    priority: "urgent",
    description: [
      "Auto-drafted from the auth-incident playbook.",
      "",
      "Findings:",
      ...findings.map((f) => `- ${f.id} (${f.severity}): ${f.title}`),
      "",
      "Related PRs this week:",
      ...prList.map((p) => `- ${p.repo}#${p.number} ${p.title} [${p.state}]`),
      "",
      "SSO customers to notify:",
      ...customers.map((c) => `- ${c.name} (${c.plan}, owner ${c.owner})`),
      "",
      playbookPage
        ? `SOP: ${str(playbookPage.slug)}`
        : "SOP: jwt-secret-rotation",
    ].join("\n"),
  };

  const briefing = [
    `P1 auth incident — 13 Aug 2026`,
    `${findings.length} high/critical findings. ${prList.length} auth PRs this week. ${customers.length} SSO tenants in blast radius.`,
    findings.map((f) => `${f.id} ${f.severity}: ${f.title}`).join(" · "),
    customers.length
      ? `Notify: ${customers.map((c) => c.name).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: "auth-incident",
    title: "Auth incident — JWT / session",
    summary: `${findings.length} high/critical vulns, ${prList.length} auth PRs since 6 Aug, ${customers.length} SSO customers.`,
    findings,
    prs: prList,
    customers,
    playbook: playbookPage
      ? {
          slug: str(playbookPage.slug),
          title: str(playbookPage.title),
          excerpt: str(playbookPage.excerpt),
        }
      : null,
    tickets: ticketList,
    recommendedTicket,
    briefing,
    steps,
  };
}
