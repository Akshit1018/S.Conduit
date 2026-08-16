import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideApprovalFn, getApprovalsFn } from "@/mcp/fns";
import type { ApprovalRow } from "@/mcp/types";
import { formatRelative } from "@/lib/utils";

export const Route = createFileRoute("/app/approvals")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const load = useCallback(() => {
    getApprovalsFn().then(setRows).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  async function decide(id: string, decision: "approved" | "rejected") {
    await decideApprovalFn({ data: { id, decision } });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-subtle">
        Human in the loop
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
        Approvals
      </h1>
      <p className="mt-2 text-sm text-muted">
        Write tools never hit Linear until someone here says so.
      </p>

      <section className="mt-8 space-y-3">
        {pending.length === 0 && (
          <p className="rounded-xl bg-card px-4 py-8 text-sm text-muted shadow-[var(--shadow-border)]">
            Queue is empty. Create an issue from the Inspector
            (`linear.create_issue`) to see a pause.
          </p>
        )}
        {pending.map((r) => (
          <article
            key={r.id}
            className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs">{r.tool}</p>
              <Badge tone="warn">pending</Badge>
            </div>
            <pre className="mt-3 overflow-auto font-mono text-[12px] text-muted">
              {JSON.stringify(r.args, null, 2)}
            </pre>
            <p className="mt-2 text-xs text-subtle">
              queued {formatRelative(r.createdAt)}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => void decide(r.id, "approved")}>
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => void decide(r.id, "rejected")}
              >
                Reject
              </Button>
            </div>
          </article>
        ))}
      </section>

      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs uppercase tracking-widest text-subtle">
            History
          </h2>
          <ul className="mt-3 space-y-2">
            {done.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-card px-4 py-3 text-sm shadow-[var(--shadow-border)]"
              >
                <span className="font-mono text-xs">{r.tool}</span>
                <Badge tone={r.status === "approved" ? "ok" : "neutral"}>
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
