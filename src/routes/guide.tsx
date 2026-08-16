import { createFileRoute, Link } from "@tanstack/react-router";
import { Mark } from "@/components/mark";
import { AuthSlot } from "@/components/auth-slot";

export const Route = createFileRoute("/guide")({ component: GuidePage });

const STEPS = [
  {
    title: "1. Sign in",
    body: "Google, X, or email (8+ character password). The workspace is yours — audit, approvals, and tokens are scoped to your account.",
  },
  {
    title: "2. Run the incident sweep",
    body: "Incident is the job. Press “Run incident sweep”. Conduit calls Aegis, GitHub, HubSpot, Notion, and Linear, then shows findings, PRs, and SSO customers. This path does not need the model.",
  },
  {
    title: "3. File the ticket",
    body: "“File Linear ticket” is a write. It pauses. Open Queue, approve or reject. Nothing hits Linear until you say so.",
  },
  {
    title: "4. Inspector",
    body: "Pick a tool → Fill example → Call tool. Copy the JSON. Writes go to the approval queue. Resources tab reads live indexes.",
  },
  {
    title: "5. Sources",
    body: "Inject a rate limit or timeout, press Test connection, watch Health and Audit. Reset circuit when you are done. Expire token to see auto-refresh.",
  },
  {
    title: "6. Ask (optional)",
    body: "Freeform agent for other questions. If the model is unavailable, go back to the sweep — that always runs.",
  },
];

function GuidePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <Mark className="size-6" />
            <span className="text-sm font-medium">Conduit</span>
          </Link>
          <AuthSlot compact />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-xs uppercase tracking-[0.16em] text-subtle">
          How to use this
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
          You are on-call. Close the incident.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          This is not a slide deck. KitePay is a simulated fintech tenant with
          messy GitHub, Linear, Notion, HubSpot, and Aegis data. Your job is
          the Thursday 13 Aug auth P1: leftover JWT secret + refresh-token reuse,
          three SSO customers in the blast radius.
        </p>
        <ol className="mt-10 space-y-6">
          {STEPS.map((s) => (
            <li key={s.title} className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]">
              <h2 className="text-sm font-medium">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/app"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Open the incident desk
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center rounded-md px-4 text-sm text-muted hover:text-foreground"
          >
            Sign in first
          </Link>
        </div>
      </main>
    </div>
  );
}
