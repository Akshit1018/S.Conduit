import { CODE_HITS, DEALS, GH_ISSUES, PAGES, PRS, REPOS } from "./data";
import { toolByName } from "./catalog";
import type { JsonObject, JsonValue, SourceId, ToolResult } from "./types";
import {
  COMPANIES,
  CONTACTS,
  LINEAR,
  VULNS,
  companyPlan,
  labelsOf,
  loginOf,
  matchText,
  normalizeCompany,
  normalizeContact,
  normalizeLinear,
  normalizePr,
  normalizeVuln,
  sinceOk,
  vulnId,
} from "./normalize";

function ok(data: JsonValue, warning?: string): ToolResult {
  return {
    status: warning ? "degraded" : "ok",
    isError: false,
    warning,
    content: [
      { type: "json", json: data },
      { type: "text", text: JSON.stringify(data, null, 2) },
    ],
  };
}

function fail(message: string): ToolResult {
  return {
    status: "error",
    isError: true,
    errorClass: "permanent",
    content: [{ type: "text", text: message }],
  };
}

function asString(v: JsonValue | undefined) {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: JsonValue | undefined) {
  return typeof v === "number" ? v : Number(v);
}

export function executeTool(
  name: string,
  args: JsonObject,
  extras: { createdIssues?: JsonObject[] } = {},
): ToolResult {
  const tool = toolByName(name);
  if (!tool) return fail(`Unknown tool: ${name}`);

  switch (name) {
    case "github.search_prs": {
      const q = asString(args.query);
      const repo = asString(args.repo);
      const state = asString(args.state) ?? "all";
      const since = asString(args.since);
      const label = asString(args.label);
      const items = PRS.filter((pr) => {
        if (repo && pr.repo !== repo) return false;
        if (state !== "all" && pr.state !== state) return false;
        if (!sinceOk(pr.updated_at, since) && !sinceOk(pr.created_at, since))
          return false;
        if (label && !labelsOf(pr.labels).includes(label)) return false;
        const blob = `${pr.title} ${pr.body ?? ""} ${pr.repo} ${loginOf(pr.user)} ${labelsOf(pr.labels).join(" ")}`;
        return matchText(blob, q);
      }).map(normalizePr);
      return ok({ count: items.length, pullRequests: items });
    }
    case "github.search_issues": {
      const q = asString(args.query);
      const repo = asString(args.repo);
      const state = asString(args.state) ?? "all";
      const label = asString(args.label);
      const items = GH_ISSUES.filter((iss) => {
        if (repo && iss.repo !== repo) return false;
        if (state !== "all" && iss.state !== state) return false;
        if (label && !(iss.labels ?? []).includes(label)) return false;
        return matchText(`${iss.title} ${iss.body ?? ""} ${iss.repo}`, q);
      });
      return ok({ count: items.length, issues: items });
    }
    case "github.search_code": {
      const q = asString(args.query) ?? "";
      const repo = asString(args.repo);
      const items = CODE_HITS.filter((h) => {
        if (repo && h.repo !== repo) return false;
        return matchText(`${h.path} ${h.snippet} ${h.repo}`, q);
      });
      return ok({ count: items.length, hits: items });
    }
    case "github.get_pr": {
      const number = asNumber(args.number);
      const repo = asString(args.repo);
      const pr = PRS.find(
        (p) => p.number === number && (!repo || p.repo === repo),
      );
      if (!pr) return fail(`PR #${number} not found`);
      return ok(normalizePr(pr));
    }
    case "linear.search_issues": {
      const q = asString(args.query);
      const team = asString(args.team);
      const state = asString(args.state);
      const priority = asString(args.priority);
      const extra = extras.createdIssues ?? [];
      const base = [
        ...LINEAR.map(normalizeLinear),
        ...extra.map((row) => row as ReturnType<typeof normalizeLinear>),
      ];
      const items = base.filter((iss) => {
        if (team && iss.team !== team.toUpperCase() && iss.team !== team)
          return false;
        if (state && iss.state !== state) return false;
        if (priority && iss.priority !== priority) return false;
        return matchText(
          `${iss.id} ${iss.title} ${iss.description} ${(iss.labels ?? []).join(" ")}`,
          q,
        );
      });
      return ok({ count: items.length, issues: items });
    }
    case "linear.get_issue": {
      const id = asString(args.id);
      const extra = extras.createdIssues ?? [];
      const found =
        LINEAR.map(normalizeLinear).find((i) => i.id === id) ??
        extra.find((i) => i.id === id);
      if (!found) return fail(`Issue ${id} not found`);
      return ok(found as JsonValue);
    }
    case "linear.create_issue": {
      const title = asString(args.title) ?? "Untitled";
      const team = (asString(args.team) ?? "ENG").toUpperCase();
      const issueId = `${team}-${200 + Math.floor(Math.random() * 80)}`;
      const created = {
        id: issueId,
        title,
        team,
        state: "backlog",
        priority: asString(args.priority) ?? "medium",
        assignee: null,
        labels: [] as string[],
        description: asString(args.description) ?? "",
        updatedAt: new Date().toISOString(),
      };
      return ok({ created: true, issue: created });
    }
    case "notion.search_pages": {
      const q = asString(args.query) ?? "";
      const tag = asString(args.tag);
      const items = PAGES.filter((p) => {
        if (tag && !p.tags.includes(tag)) return false;
        return matchText(`${p.title} ${p.excerpt} ${p.body} ${p.tags.join(" ")}`, q);
      }).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        tags: p.tags,
        updated: p.updated,
        excerpt: p.excerpt,
      }));
      return ok({ count: items.length, pages: items });
    }
    case "notion.read_page": {
      const id = asString(args.id) ?? "";
      const page = PAGES.find((p) => p.id === id || p.slug === id);
      if (!page) return fail(`Page ${id} not found`);
      return ok(page);
    }
    case "hubspot.search_contacts": {
      const q = asString(args.query);
      const mod = asString(args.product_module);
      const items = CONTACTS.map(normalizeContact).filter((c) => {
        if (mod && !c.modules.includes(mod)) return false;
        return matchText(`${c.name} ${c.email} ${c.company} ${c.modules.join(" ")}`, q);
      });
      return ok({ count: items.length, contacts: items });
    }
    case "hubspot.search_companies": {
      const q = asString(args.query);
      const mod = asString(args.module);
      const plan = asString(args.plan);
      const items = COMPANIES.map(normalizeCompany).filter((c) => {
        if (mod && !c.modules.includes(mod)) return false;
        if (plan && c.plan !== plan) return false;
        return matchText(`${c.name} ${c.modules.join(" ")} ${c.owner ?? ""}`, q);
      });
      return ok({ count: items.length, companies: items });
    }
    case "hubspot.get_deal": {
      const q = asString(args.query) ?? "";
      const deal = DEALS.find(
        (d) =>
          matchText(d.id, q) ||
          matchText(d.name, q) ||
          matchText(d.company, q),
      );
      if (!deal) return fail(`Deal not found for "${q}"`);
      return ok(deal);
    }
    case "aegis.list_vulns": {
      const sev = asString(args.severity);
      const pkg = asString(args.package);
      const repo = asString(args.repo);
      const q = asString(args.q);
      const items = VULNS.map(normalizeVuln).filter((v) => {
        if (sev && v.severity !== sev.toLowerCase()) return false;
        if (pkg && !v.package.toLowerCase().includes(pkg.toLowerCase()))
          return false;
        if (repo && !v.repos.includes(repo)) return false;
        return matchText(
          `${v.title} ${v.package} ${v.cve ?? ""} ${v.cwe ?? ""} ${v.description}`,
          q,
        );
      });
      return ok({ count: items.length, findings: items });
    }
    case "aegis.get_vuln": {
      const id = asString(args.id) ?? "";
      const v = VULNS.find(
        (x) => vulnId(x) === id || (x.cve && x.cve === id),
      );
      if (!v) return fail(`Finding ${id} not found`);
      return ok(normalizeVuln(v));
    }
    default:
      return fail(`Unhandled tool ${name}`);
  }
}

export function readResource(uri: string): JsonValue {
  switch (uri) {
    case "github://kitepay/repos":
      return { uri, contents: REPOS };
    case "linear://kitepay/team/AUTH":
      return {
        uri,
        contents: LINEAR.filter((i) => i.team === "AUTH").map(normalizeLinear),
      };
    case "notion://kitepay/wiki/security":
      return {
        uri,
        contents: PAGES.filter((p) => p.tags.includes("security")).map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
        })),
      };
    case "hubspot://kitepay/accounts/enterprise":
      return {
        uri,
        contents: COMPANIES.filter(
          (c) => companyPlan(c) === "enterprise",
        ).map(normalizeCompany),
      };
    case "aegis://scans/latest":
      return {
        uri,
        scannedAt: "2026-08-12T21:10:00.000Z",
        contents: VULNS.map(normalizeVuln),
      };
    default:
      return { uri, error: "Unknown resource" };
  }
}

export function sourceOfTool(name: string): SourceId | null {
  return toolByName(name)?.sourceId ?? null;
}
