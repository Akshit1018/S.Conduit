import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  FilePlus,
  LoaderCircle,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callToolFn, runPlaybookFn } from "@/mcp/fns";
import type { PlaybookReport } from "@/mcp/playbook";
import { copyText, formatMs } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: IncidentPage });

function IncidentPage() {
  const [report, setReport] = useState<PlaybookReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ticketQueued, setTicketQueued] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);

  async function runSweep() {
    setBusy(true);
    setError(null);
    setTicketQueued(false);
    try {
      const next = await runPlaybookFn();
      setReport(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep failed. Sign in and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function fileTicket() {
    if (!report) return;
    setTicketBusy(true);
    try {
      await callToolFn({
        data: {
          tool: "linear.create_issue",
          args: report.recommendedTicket,
          caller: "playbook",
        },
      });
      setTicketQueued(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not queue ticket");
    } finally {
      setTicketBusy(false);
    }
  }

  async function copyBrief() {
    if (!report) return;
    await copyText(report.briefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-subtle">
        On-call desk · 13 Aug 2026
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Close the auth incident
        </h1>
        <Badge tone="danger">P1 · JWT / session</Badge>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        You are on-call for KitePay auth. Aegis flagged a leftover signing
        secret and refresh-token reuse. This desk runs the real tools — GitHub,
        Aegis, HubSpot, Notion, Linear — then you file the ticket.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          "1. Sweep sources",
          "2. Read the SOP",
          "3. File Linear ticket",
          "4. Notify SSO tenants",
        ].map((s, i) => (
          <li
            key={s}
            className="rounded-xl bg-card px-3 py-3 text-xs text-muted shadow-[var(--shadow-border)]"
          >
            <span className="text-foreground">{s}</span>
            {i === 0 && report && (
              <Check className="ml-1 inline size-3 text-ok" />
            )}
            {i === 2 && ticketQueued && (
              <Check className="ml-1 inline size-3 text-ok" />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => void runSweep()} disabled={busy}>
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {busy ? "Calling 5 tools…" : report ? "Run sweep again" : "Run incident sweep"}
        </Button>
        <Link
          to="/app/ask"
          className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm text-muted hover:text-foreground"
        >
          Ask in freeform
          <ArrowRight className="size-4" />
        </Link>
        <Link
          to="/guide"
          className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm text-muted hover:text-foreground"
        >
          <BookOpen className="size-4" />
          How to use
        </Link>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {!report && !busy && (
        <div className="mt-10 rounded-2xl bg-card p-6 shadow-[var(--shadow-border)]">
          <h2 className="text-sm font-medium">What the sweep does</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Aegis — high/critical findings mentioning auth</li>
            <li>GitHub — auth PRs since 6 Aug 2026</li>
            <li>HubSpot — enterprise accounts with the SSO module</li>
            <li>Notion — JWT leak playbook</li>
            <li>Linear — open AUTH work</li>
          </ul>
          <p className="mt-4 text-xs text-subtle">
            No LLM required for this path. Every call is audited.
          </p>
        </div>
      )}

      {busy && (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" />
          Hitting Aegis, GitHub, HubSpot, Notion, Linear…
        </p>
      )}

      {report && (
        <div className="mt-10 space-y-6">
          <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-medium">
                  {report.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{report.summary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void copyBrief()}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy briefing"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void fileTicket()}
                  disabled={ticketBusy || ticketQueued}
                >
                  <FilePlus className="size-3.5" />
                  {ticketQueued ? "Queued" : "File Linear ticket"}
                </Button>
              </div>
            </div>
            {ticketQueued && (
              <p className="mt-3 text-sm text-ok">
                Write paused for approval.{" "}
                <Link to="/app/approvals" className="underline underline-offset-4">
                  Open the queue
                </Link>
              </p>
            )}
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest text-subtle">
              Findings
            </h3>
            <ul className="mt-2 space-y-2">
              {report.findings.map((f) => (
                <li
                  key={f.id}
                  className="rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{f.id}</span>
                    <Badge tone={f.severity === "critical" ? "danger" : "warn"}>
                      {f.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm">{f.title}</p>
                  {f.detail && (
                    <p className="mt-1 text-xs text-muted">{f.detail}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <h3 className="text-xs uppercase tracking-widest text-subtle">
                Auth PRs this week
              </h3>
              <ul className="mt-2 space-y-2">
                {report.prs.map((p) => (
                  <li
                    key={`${p.repo}-${p.number}`}
                    className="rounded-xl bg-card px-4 py-3 text-sm shadow-[var(--shadow-border)]"
                  >
                    <p className="font-mono text-[11px] text-subtle">
                      {p.repo}#{p.number} · {p.state}
                    </p>
                    <p className="mt-1">{p.title}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="text-xs uppercase tracking-widest text-subtle">
                SSO customers
              </h3>
              <ul className="mt-2 space-y-2">
                {report.customers.map((c) => (
                  <li
                    key={c.name}
                    className="rounded-xl bg-card px-4 py-3 text-sm shadow-[var(--shadow-border)]"
                  >
                    <p>{c.name}</p>
                    <p className="text-xs text-muted">
                      {c.plan} · owner {c.owner}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {report.playbook && (
            <section className="rounded-xl bg-card px-4 py-4 shadow-[var(--shadow-border)]">
              <p className="text-xs text-subtle">Notion SOP</p>
              <p className="mt-1 text-sm font-medium">{report.playbook.title}</p>
              <p className="mt-1 text-xs text-muted">{report.playbook.excerpt}</p>
              <Link
                to="/app/inspector"
                className="mt-3 inline-flex h-10 items-center text-sm text-primary"
              >
                Open Inspector and read `{report.playbook.slug}`
              </Link>
            </section>
          )}

          <section>
            <h3 className="text-xs uppercase tracking-widest text-subtle">
              Tool trace
            </h3>
            <ol className="mt-2 divide-y divide-border rounded-xl bg-card shadow-[var(--shadow-border)]">
              {report.steps.map((s) => (
                <li
                  key={s.tool}
                  className="flex items-center justify-between px-4 py-2.5 font-mono text-[11px]"
                >
                  <span>{s.tool}</span>
                  <span className="text-muted tabular">
                    {s.status} · {formatMs(s.latencyMs)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
