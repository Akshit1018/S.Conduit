import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Shield, GitBranch, Radio } from "lucide-react";
import { AuthSlot } from "@/components/auth-slot";
import { Mark } from "@/components/mark";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Landing });

const LOG = [
  { dir: "→", method: "tools/call", name: "github.search_prs", meta: "186 ms · ok" },
  { dir: "→", method: "tools/call", name: "aegis.list_vulns", meta: "241 ms · ok" },
  { dir: "→", method: "tools/call", name: "hubspot.search_companies", meta: "154 ms · ok" },
  { dir: "←", method: "content", name: "3 PRs · 2 high vulns · 3 SSO tenants", meta: "cited" },
];

const SOURCES = [
  { name: "GitHub", detail: "PRs, issues, code" },
  { name: "Linear", detail: "Triage + HITL writes" },
  { name: "Notion", detail: "Playbooks, SOPs" },
  { name: "HubSpot", detail: "Accounts, deals" },
  { name: "Aegis", detail: "SCA findings" },
];

function Landing() {
  const { user, isPending } = useCurrentUserState();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-sm font-medium tracking-wide">Conduit</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <Link to="/guide" className="hover:text-foreground">
              How to use
            </Link>
            <a href="#job" className="hover:text-foreground">
              The job
            </a>
            <a href="#sources" className="hover:text-foreground">
              Sources
            </a>
          </nav>
          <AuthSlot />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
          <div>
            <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.18em] text-muted">
              Thursday 13 Aug · KitePay on-call
            </p>
            <h1 className="animate-fade-up stagger-1 mt-4 font-display text-[2.6rem] leading-[1.12] font-medium tracking-tight md:text-6xl">
              Close the
              <br />
              auth incident.
            </h1>
            <p className="animate-fade-up stagger-2 mt-5 max-w-md text-base leading-relaxed text-muted">
              A leftover JWT secret and refresh-token reuse. Three SSO
              customers. One sweep across GitHub, Aegis, HubSpot, Notion, and
              Linear — then you file the ticket.
            </p>
            <div className="animate-fade-up stagger-3 mt-8 flex flex-wrap items-center gap-3">
              {isPending ? (
                <div className="h-12 w-40 animate-pulse rounded-lg bg-elevated" />
              ) : user ? (
                <Link
                  to="/app"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Start incident
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
                >
                  Start incident
                  <ArrowRight className="size-4" />
                </Link>
              )}
              <Link
                to="/guide"
                className="inline-flex h-12 items-center rounded-lg px-4 text-sm text-muted hover:text-foreground"
              >
                How to use
              </Link>
            </div>
            <dl className="animate-fade-up stagger-4 mt-12 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["95%+", "tool success"],
                ["< 3s", "p95 target"],
                ["5", "live sources"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-2xl font-medium tabular">{k}</dt>
                  <dd className="mt-1 text-xs text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            id="protocol"
            className="animate-fade-up stagger-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-border)]"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-subtle">
                json-rpc · streamable http
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-ok">
                <span className="size-1.5 rounded-full bg-ok" />
                ready
              </span>
            </div>
            <div className="rounded-xl bg-background px-4 py-4 font-mono text-[12px] leading-6">
              {LOG.map((row, i) => (
                <div
                  key={i}
                  className="animate-fade-up flex flex-wrap gap-x-2"
                  style={{ animationDelay: `${180 + i * 90}ms` }}
                >
                  <span className="text-subtle">{row.dir}</span>
                  <span className="text-muted">{row.method}</span>
                  <span className="text-foreground">{row.name}</span>
                  <span className="text-subtle">{row.meta}</span>
                </div>
              ))}
              <pre className="mt-4 overflow-x-auto text-[11px] text-muted">
{`{
  "query": "auth",
  "since": "2026-08-06"
}`}
              </pre>
            </div>
          </div>
        </section>

        <section id="job" className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-3xl font-medium tracking-tight">
              Five messy sources. One schema.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Upstream payloads disagree on field names. Conduit validates,
              retries, normalizes, and returns MCP content blocks with an
              immutable audit row for every call.
            </p>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SOURCES.map((s) => (
                <li
                  key={s.name}
                  className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]"
                >
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="mt-1 text-xs text-muted">{s.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="security" className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Least privilege",
                body: "Per-tool ACL, PAT rotation, auto-refresh, secrets never logged.",
              },
              {
                icon: Radio,
                title: "Resilience",
                body: "Jittered backoff, circuit breakers, partial results when a source dies.",
              },
              {
                icon: GitBranch,
                title: "Human in the loop",
                body: "Write tools pause. Approve on the console before Linear ever sees it.",
              },
            ].map((c) => (
              <article
                key={c.title}
                className="rounded-2xl bg-card p-6 shadow-[var(--shadow-border)]"
              >
                <c.icon className="size-5 text-primary" strokeWidth={1.5} />
                <h3 className="mt-4 text-base font-medium">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8 text-xs text-subtle">
          <span>Conduit · KitePay sandbox tenant</span>
          <span>MCP · JSON-RPC</span>
        </div>
      </footer>
    </div>
  );
}
