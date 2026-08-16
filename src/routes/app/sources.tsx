import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOURCE_META, toolsFor } from "@/mcp/catalog";
import {
  expireTokenFn,
  getConnectorsFn,
  resetCircuitFn,
  rotateTokenFn,
  testSourceFn,
  updateConnectorFn,
} from "@/mcp/fns";
import type { ConnectorRow, InjectedFault, SourceId } from "@/mcp/types";
import { cn, formatRelative } from "@/lib/utils";

export const Route = createFileRoute("/app/sources")({
  component: SourcesPage,
});

const FAULTS: { id: InjectedFault; label: string }[] = [
  { id: "none", label: "Healthy" },
  { id: "rate_limit", label: "Rate limit" },
  { id: "timeout", label: "Timeout" },
  { id: "schema_drift", label: "Schema drift" },
];

function SourcesPage() {
  const [rows, setRows] = useState<ConnectorRow[]>([]);
  const load = useCallback(() => {
    getConnectorsFn().then(setRows).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function patch(
    sourceId: SourceId,
    data: {
      enabled?: boolean;
      injectedFault?: InjectedFault;
      toolsAcl?: Record<string, boolean>;
    },
  ) {
    await updateConnectorFn({ data: { sourceId, ...data } });
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-subtle">Admin</p>
      <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
        Sources
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Tokens stay on the server. Inject a fault, press Test connection, then
        Reset circuit. That is the resilience drill.
      </p>
      <ul className="mt-8 space-y-4">
        {rows.map((c) => (
          <li
            key={c.sourceId}
            className="rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium">
                    {SOURCE_META[c.sourceId].label}
                  </h2>
                  <Badge tone={c.enabled ? "ok" : "neutral"}>
                    {c.enabled ? "on" : "off"}
                  </Badge>
                  <Badge
                    tone={
                      c.circuitState === "closed"
                        ? "ok"
                        : c.circuitState === "half_open"
                          ? "warn"
                          : "danger"
                    }
                  >
                    circuit {c.circuitState}
                  </Badge>
                  <Badge
                    tone={c.tokenStatus === "valid" ? "neutral" : "warn"}
                  >
                    token {c.tokenStatus}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {SOURCE_META[c.sourceId].description}
                </p>
                <p className="mt-2 font-mono text-[11px] text-subtle">
                  {c.tokenLabel}
                  {c.lastOkAt ? ` · last ok ${formatRelative(c.lastOkAt)}` : ""}
                  {c.lastError ? ` · ${c.lastError}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void patch(c.sourceId, { enabled: !c.enabled })}
                className={cn(
                  "h-11 rounded-md px-4 text-sm",
                  c.enabled ? "bg-elevated" : "bg-primary text-primary-foreground",
                )}
              >
                {c.enabled ? "Disable" : "Enable"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {FAULTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    void patch(c.sourceId, { injectedFault: f.id })
                  }
                  className={cn(
                    "h-9 rounded-full px-3 text-xs",
                    c.injectedFault === f.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-elevated text-muted",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await testSourceFn({ data: { sourceId: c.sourceId } });
                  load();
                }}
              >
                Test connection
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await expireTokenFn({ data: { sourceId: c.sourceId } });
                  load();
                }}
              >
                Expire token
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await rotateTokenFn({ data: { sourceId: c.sourceId } });
                  load();
                }}
              >
                Rotate token
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await resetCircuitFn({ data: { sourceId: c.sourceId } });
                  load();
                }}
              >
                Reset circuit
              </Button>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2 text-xs text-subtle">Tool ACL</p>
              <div className="flex flex-wrap gap-2">
                {toolsFor(c.sourceId).map((t) => {
                  const on = c.toolsAcl[t.name] !== false;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() =>
                        void patch(c.sourceId, {
                          toolsAcl: { ...c.toolsAcl, [t.name]: !on },
                        })
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 font-mono text-[11px]",
                        on ? "bg-elevated text-foreground" : "bg-background text-subtle line-through",
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
