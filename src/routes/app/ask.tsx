import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Eraser, LoaderCircle, Plus } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBootstrap, getThreadFn, listThreadsFn, runAgentFn } from "@/mcp/fns";
import type { ChatMessage, McpPrompt } from "@/mcp/types";
import { formatMs } from "@/lib/utils";

export const Route = createFileRoute("/app/ask")({ component: AskPage });

function AskPage() {
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
  const [threads, setThreads] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getBootstrap()
      .then((b) => setPrompts(b.prompts))
      .catch(() => undefined);
    listThreadsFn()
      .then(setThreads)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  function newThread() {
    setConversationId(undefined);
    setMessages([]);
    setError(null);
    setDraft("");
  }

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setDraft("");
    setError(null);
    setBusy(true);
    setMessages((m) => [
      ...m,
      {
        id: `local-${Date.now()}`,
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const res = await runAgentFn({
        data: { conversationId, prompt },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConversationId(res.conversationId);
      const loaded = await getThreadFn({ data: { id: res.conversationId } });
      setMessages(loaded);
      setThreads(await listThreadsFn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function openThread(id: string) {
    setConversationId(id);
    setMessages(await getThreadFn({ data: { id } }));
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-4 py-6 md:px-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-subtle">
            Freeform agent
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">
            Ask across sources
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={newThread}>
            <Plus className="size-3.5" />
            New thread
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            disabled={messages.length === 0}
          >
            <Eraser className="size-3.5" />
            Clear
          </Button>
          {threads.length > 0 && (
            <select
              className="h-9 max-w-[200px] rounded-sm bg-elevated px-3 text-sm shadow-[var(--shadow-border)]"
              value={conversationId ?? ""}
              onChange={(e) => {
                if (e.target.value) void openThread(e.target.value);
              }}
            >
              <option value="">This thread</option>
              {threads.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted">
        Prefer a guaranteed result?{" "}
        <Link to="/app" className="text-foreground underline underline-offset-4">
          Run the incident sweep
        </Link>{" "}
        — it does not depend on the model.
      </p>

      <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
        {messages.length === 0 && !busy && (
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            {prompts.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => void send(p.text)}
                className="rounded-xl bg-card p-4 text-left shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]"
              >
                <p className="text-sm font-medium">{p.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{p.text}</p>
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <article key={m.id}>
            {m.role === "user" ? (
              <div className="ml-auto max-w-[40rem] rounded-xl bg-elevated px-4 py-3 text-sm shadow-[var(--shadow-border)]">
                {m.content}
              </div>
            ) : m.role === "assistant" ? (
              <div className="max-w-[44rem] rounded-2xl bg-card px-5 py-4 shadow-[var(--shadow-border)]">
                {m.payload?.toolCalls && m.payload.toolCalls.length > 0 && (
                  <ol className="mb-4 space-y-1.5 border-b border-border pb-3">
                    {m.payload.toolCalls.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 font-mono text-[11px] text-muted"
                      >
                        <span>{t.name}</span>
                        <span className="tabular">
                          {t.latencyMs ? formatMs(t.latencyMs) : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
                <Markdown text={m.content} />
              </div>
            ) : null}
          </article>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Model is calling tools…
          </div>
        )}
        {error && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-destructive">
            <span>{error}</span>
            <Button size="sm" variant="secondary" onClick={() => setError(null)}>
              Dismiss
            </Button>
            <Link to="/app" className="text-foreground underline underline-offset-4">
              Use the sweep instead
            </Link>
          </div>
        )}
      </div>

      <form
        className="sticky bottom-0 mt-2 flex items-end gap-2 rounded-xl bg-card p-2 shadow-[var(--shadow-border)]"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          rows={2}
          placeholder="Ask about vulns, PRs, customers, playbooks…"
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-subtle"
        />
        <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send">
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
