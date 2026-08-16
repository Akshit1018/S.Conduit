import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SOURCE_IDS, SOURCE_META } from "@/mcp/catalog";
import { getAuditFn } from "@/mcp/fns";
import type { AuditRow, SourceId } from "@/mcp/types";
import { cn, downloadText, formatMs, formatRelative } from "@/lib/utils";

export const Route = createFileRoute("/app/audit")({ component: AuditPage });

function toneFor(status: AuditRow["status"]) {
  if (status === "ok") return "ok" as const;
  if (status === "degraded" || status === "pending_approval") return "warn" as const;
  return "danger" as const;
}

function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [source, setSource] = useState<SourceId | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  function load() {
    getAuditFn({
      data: source === "all" ? {} : { sourceId: source },
    }).then(setRows);
  }

  useEffect(() => {
    load();
  }, [source]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.tool.toLowerCase().includes(needle) ||
        r.caller.toLowerCase().includes(needle) ||
        r.status.includes(needle),
    );
  }, [rows, q]);

  function exportCsv() {
    const header = "ts,tool,source,status,latency_ms,caller";
    const body = visible
      .map(
        (r) =>
          `${r.ts},${r.tool},${r.sourceId},${r.status},${r.latencyMs},${r.caller}`,
      )
      .join("\n");
    downloadText("conduit-audit.csv", `${header}\n${body}`, "text/csv");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-subtle">
        Immutable
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Audit log
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={load}>
            Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={visible.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSource("all")}
          className={cn(
            "h-9 rounded-full px-3 text-xs",
            source === "all" ? "bg-primary text-primary-foreground" : "bg-elevated text-muted",
          )}
        >
          All
        </button>
        {SOURCE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSource(id)}
            className={cn(
              "h-9 rounded-full px-3 text-xs",
              source === id ? "bg-primary text-primary-foreground" : "bg-elevated text-muted",
            )}
          >
            {SOURCE_META[id].label}
          </button>
        ))}
      </div>
      <div className="mt-4 max-w-sm">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter tool, caller, status"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
        <div className="hidden grid-cols-[1fr_140px_80px_88px_72px] gap-2 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wider text-subtle md:grid">
          <span>Tool</span>
          <span>Source</span>
          <span>Status</span>
          <span>Latency</span>
          <span>When</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted">
            No rows. Run the incident sweep first.
          </p>
        ) : (
          <ul>
            {visible.map((r) => (
              <li key={r.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left md:grid-cols-[1fr_140px_80px_88px_72px] md:items-center"
                >
                  <span className="font-mono text-xs">{r.tool}</span>
                  <span className="text-xs text-muted">
                    {SOURCE_META[r.sourceId].label}
                  </span>
                  <Badge tone={toneFor(r.status)}>{r.status}</Badge>
                  <span className="text-xs tabular text-muted">
                    {formatMs(r.latencyMs)}
                  </span>
                  <span className="text-xs text-subtle">
                    {formatRelative(r.ts)}
                  </span>
                </button>
                {open === r.id && (
                  <pre className="border-t border-border bg-background px-4 py-3 font-mono text-[11px] leading-5 text-muted">
                    {JSON.stringify(
                      {
                        caller: r.caller,
                        args: r.args,
                        errorClass: r.errorClass,
                        preview: r.resultPreview,
                      },
                      null,
                      2,
                    )}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
