import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eraser, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callToolFn, getBootstrap, readResourceFn } from "@/mcp/fns";
import { SOURCE_META } from "@/mcp/catalog";
import type { JsonObject, McpResource, McpTool, SourceId, ToolResult } from "@/mcp/types";
import { cn, copyText, formatMs } from "@/lib/utils";

export const Route = createFileRoute("/app/inspector")({
  component: InspectorPage,
});

function stringifyExample(value: JsonObject) {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    next[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return next;
}

function InspectorPage() {
  const [tab, setTab] = useState<"tools" | "resources">("tools");
  const [tools, setTools] = useState<McpTool[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ToolResult | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [resourceOut, setResourceOut] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getBootstrap()
      .then((b) => {
        setTools(b.tools);
        setResources(b.resources);
        const first = b.tools[0];
        if (first) {
          setActive(first.name);
          setArgs(stringifyExample(first.example));
        }
      })
      .catch(() => undefined);
  }, []);

  const tool = tools.find((t) => t.name === active);
  const grouped = useMemo(() => {
    const g: Partial<Record<SourceId, McpTool[]>> = {};
    for (const t of tools) {
      g[t.sourceId] = g[t.sourceId] ?? [];
      g[t.sourceId]!.push(t);
    }
    return g;
  }, [tools]);

  function fillExample() {
    if (!tool) return;
    setArgs(stringifyExample(tool.example));
    setResult(null);
  }

  async function run() {
    if (!tool) return;
    setBusy(true);
    setResult(null);
    const parsed: JsonObject = {};
    for (const [k, v] of Object.entries(args)) {
      if (v === "") continue;
      const spec = tool.inputSchema.properties[k];
      parsed[k] = spec?.type === "number" ? Number(v) : v;
    }
    try {
      const out = await callToolFn({
        data: { tool: tool.name, args: parsed, caller: "inspector" },
      });
      setResult(out.result);
      setLatency(out.latencyMs);
    } finally {
      setBusy(false);
    }
  }

  const jsonOut = result
    ? JSON.stringify(
        result.content.find((c) => c.type === "json")?.json ?? result.content,
        null,
        2,
      )
    : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-8">
      <aside>
        <div className="mb-4 flex gap-1 rounded-md bg-elevated p-1">
          {(["tools", "resources"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "h-9 flex-1 rounded-sm text-xs font-medium capitalize",
                tab === t ? "bg-card text-foreground" : "text-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "tools" ? (
          <div className="space-y-4">
            {(Object.keys(grouped) as SourceId[]).map((sid) => (
              <div key={sid}>
                <p className="mb-1 px-1 text-[11px] uppercase tracking-widest text-subtle">
                  {SOURCE_META[sid].label}
                </p>
                <ul className="space-y-0.5">
                  {grouped[sid]!.map((t) => (
                    <li key={t.name}>
                      <button
                        type="button"
                        onClick={() => {
                          setActive(t.name);
                          setArgs(stringifyExample(t.example));
                          setResult(null);
                        }}
                        className={cn(
                          "flex h-10 w-full items-center rounded-md px-2 text-left font-mono text-[11px]",
                          active === t.name
                            ? "bg-elevated text-foreground"
                            : "text-muted hover:bg-elevated/50",
                        )}
                      >
                        {t.name.split(".")[1]}
                        {t.write && (
                          <Badge tone="warn" className="ml-auto">
                            write
                          </Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {resources.map((r) => (
              <li key={r.uri}>
                <button
                  type="button"
                  onClick={async () => {
                    const out = await readResourceFn({ data: { uri: r.uri } });
                    setResourceOut(out.data);
                  }}
                  className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-elevated"
                >
                  <p className="font-medium">{r.name}</p>
                  <p className="font-mono text-[10px] text-subtle">{r.uri}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section>
        {tab === "tools" && tool && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-subtle">{tool.name}</p>
                <h1 className="mt-1 font-display text-2xl font-medium">
                  tools/call
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted">
                  {tool.description}
                </p>
              </div>
              {tool.write && <Badge tone="warn">Requires approval</Badge>}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Object.entries(tool.inputSchema.properties).map(([key, spec]) => (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-xs text-muted">
                    {key}
                    {tool.inputSchema.required?.includes(key) ? " *" : ""}
                  </span>
                  <Input
                    value={args[key] ?? ""}
                    placeholder={spec.description}
                    onChange={(e) =>
                      setArgs((a) => ({ ...a, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void run()} disabled={busy}>
                {busy ? "Calling…" : "Call tool"}
              </Button>
              <Button variant="secondary" onClick={fillExample}>
                Fill example
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setArgs({});
                  setResult(null);
                }}
              >
                <Eraser className="size-3.5" />
                Clear
              </Button>
              {result && (
                <Button variant="ghost" onClick={() => void run()} disabled={busy}>
                  <RotateCcw className="size-3.5" />
                  Retry
                </Button>
              )}
            </div>
            {result && (
              <div className="mt-6 rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      result.status === "ok"
                        ? "ok"
                        : result.status === "degraded"
                          ? "warn"
                          : result.status === "pending_approval"
                            ? "info"
                            : "danger"
                    }
                  >
                    {result.status}
                  </Badge>
                  {latency != null && (
                    <span className="text-xs tabular text-muted">
                      {formatMs(latency)}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await copyText(jsonOut);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                  >
                    <Copy className="size-3.5" />
                    {copied ? "Copied" : "Copy JSON"}
                  </Button>
                  {result.status === "pending_approval" && (
                    <Link
                      to="/app/approvals"
                      className="text-xs text-primary underline underline-offset-4"
                    >
                      Open queue
                    </Link>
                  )}
                </div>
                <pre className="max-h-[420px] overflow-auto font-mono text-[11px] leading-5 text-muted">
                  {jsonOut}
                </pre>
              </div>
            )}
          </>
        )}
        {tab === "resources" && (
          <div>
            <h1 className="font-display text-2xl font-medium">resources/read</h1>
            <p className="mt-2 text-sm text-muted">
              Pick a resource. These are live indexes, not placeholders.
            </p>
            {resourceOut != null && (
              <pre className="mt-6 max-h-[520px] overflow-auto rounded-xl bg-card p-4 font-mono text-[11px] leading-5 text-muted shadow-[var(--shadow-border)]">
                {JSON.stringify(resourceOut, null, 2)}
              </pre>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
