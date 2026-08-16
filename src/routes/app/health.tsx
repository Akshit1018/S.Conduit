import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOURCE_META } from "@/mcp/catalog";
import { getHealthFn, resetCircuitFn } from "@/mcp/fns";
import type { HealthSnapshot } from "@/mcp/types";
import { formatMs } from "@/lib/utils";

export const Route = createFileRoute("/app/health")({ component: HealthPage });

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function HealthPage() {
  const [snap, setSnap] = useState<HealthSnapshot | null>(null);
  const load = useCallback(() => {
    getHealthFn().then(setSnap).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  if (!snap) {
    return (
      <div className="p-8">
        <div className="h-40 animate-pulse rounded-xl bg-elevated" />
      </div>
    );
  }

  const chart = snap.sources.map((s) => ({
    name: SOURCE_META[s.sourceId].label.replace(" Scan", ""),
    success: Math.round(s.successRate * 100),
    p95: s.p95,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <p className="text-xs uppercase tracking-[0.16em] text-subtle">
        Observability
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Health
        </h1>
        <Button size="sm" variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          { k: pct(snap.overallSuccess), v: "success rate" },
          { k: formatMs(snap.overallP95), v: "p95 latency" },
          { k: String(snap.calls24h), v: "calls (session)" },
          { k: String(snap.pendingApprovals), v: "pending writes" },
        ].map((s) => (
          <div
            key={s.v}
            className="rounded-xl bg-card px-4 py-4 shadow-[var(--shadow-border)]"
          >
            <p className="font-display text-2xl tabular">{s.k}</p>
            <p className="mt-1 text-xs text-muted">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 h-56 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-xs text-subtle">Success by source</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={chart} barSize={28}>
            <XAxis
              dataKey="name"
              tick={{ fill: "#8c8a83", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#8c8a83", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "#131314",
                border: "1px solid #2a2a2c",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="success" fill="#d8d2c4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-6 space-y-2">
        {snap.sources.map((s) => (
          <li
            key={s.sourceId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 shadow-[var(--shadow-border)]"
          >
            <div>
              <p className="text-sm font-medium">
                {SOURCE_META[s.sourceId].label}
              </p>
              <p className="text-xs text-muted">
                {s.calls24h} calls · p95 {formatMs(s.p95)}
                {s.lastError ? ` · ${s.lastError}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={s.enabled ? "ok" : "neutral"}>
                {s.enabled ? "enabled" : "off"}
              </Badge>
              <Badge
                tone={
                  s.circuitState === "closed"
                    ? "ok"
                    : s.circuitState === "half_open"
                      ? "warn"
                      : "danger"
                }
              >
                {s.circuitState}
              </Badge>
              <Badge tone={s.successRate >= 0.95 ? "ok" : "warn"}>
                {pct(s.successRate)}
              </Badge>
              {s.circuitState !== "closed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await resetCircuitFn({ data: { sourceId: s.sourceId } });
                    load();
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
