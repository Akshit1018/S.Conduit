import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { PROMPTS, RESOURCES, SOURCE_IDS, SOURCE_META, TOOLS } from "./catalog";
import { dispatchTool, dispatchResource } from "./dispatch";
import { executeTool } from "./execute";
import { runAuthIncident } from "./playbook";
import type { InjectedFault, JsonObject, JsonValue, SourceId, TokenStatus, ToolResult } from "./types";
import {
  addMessage,
  createConversation,
  ensureWorkspace,
  getConnector,
  listApprovals,
  listAudit,
  listConnectors,
  listConversations,
  listCreatedIssues,
  listMessages,
  patchConnector,
  pendingApprovalCount,
  resolveApproval,
  saveCreatedIssue,
} from "./workspace";

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureWorkspace(context.userId);
    const [connectors, approvals, audit] = await Promise.all([
      listConnectors(context.userId),
      listApprovals(context.userId),
      listAudit(context.userId, { limit: 12 }),
    ]);
    return {
      connectors,
      tools: TOOLS,
      resources: RESOURCES,
      prompts: PROMPTS,
      sources: SOURCE_META,
      pendingApprovals: approvals.filter((a) => a.status === "pending").length,
      recentAudit: audit,
    };
  });

export const getConnectorsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => listConnectors(context.userId));

export const updateConnectorFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      sourceId: SourceId;
      enabled?: boolean;
      injectedFault?: InjectedFault;
      tokenStatus?: TokenStatus;
      toolsAcl?: Record<string, boolean>;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { sourceId, ...patch } = data;
    return patchConnector(context.userId, sourceId, patch);
  });

export const rotateTokenFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sourceId: SourceId }) => input)
  .handler(async ({ context, data }) => {
    const label = `pat_${data.sourceId}_${Date.now().toString(36)}`;
    return patchConnector(context.userId, data.sourceId, {
      tokenStatus: "valid",
      tokenLabel: label,
      failCount: 0,
      circuitState: "closed",
      circuitOpenedAt: null,
      lastError: null,
    });
  });

export const expireTokenFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sourceId: SourceId }) => input)
  .handler(async ({ context, data }) =>
    patchConnector(context.userId, data.sourceId, { tokenStatus: "expired" }),
  );

export const resetCircuitFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sourceId: SourceId }) => input)
  .handler(async ({ context, data }) =>
    patchConnector(context.userId, data.sourceId, {
      failCount: 0,
      circuitState: "closed",
      circuitOpenedAt: null,
      lastError: null,
      injectedFault: "none",
    }),
  );

export const callToolFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { tool: string; args: JsonObject; caller?: string }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const out = await dispatchTool({
      userId: context.userId,
      tool: data.tool,
      args: data.args ?? {},
      caller: data.caller ?? "inspector",
    });
    return out;
  });

export const readResourceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { uri: string }) => input)
  .handler(async ({ context, data }) =>
    dispatchResource(context.userId, data.uri),
  );

export const getAuditFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input?: { sourceId?: SourceId }) => input ?? {})
  .handler(async ({ context, data }) =>
    listAudit(context.userId, { sourceId: data.sourceId, limit: 120 }),
  );

export const getApprovalsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => listApprovals(context.userId));

export const decideApprovalFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; decision: "approved" | "rejected" }) => input)
  .handler(async ({ context, data }) => {
    const rows = await listApprovals(context.userId);
    const row = rows.find((r) => r.id === data.id);
    if (!row || row.status !== "pending") {
      return { ok: false as const, error: "Approval not found" };
    }
    if (data.decision === "rejected") {
      await resolveApproval(context.userId, data.id, "rejected", {
        rejected: true,
      });
      return { ok: true as const };
    }
    const created = await listCreatedIssues(context.userId);
    const result = executeTool(row.tool, row.args, { createdIssues: created });
    const issue =
      (result.content.find((c) => c.type === "json")?.json as {
        issue?: JsonObject;
      }) ?? {};
    if (issue.issue) {
      await saveCreatedIssue(context.userId, "linear", issue.issue);
    }
    await resolveApproval(context.userId, data.id, "approved", result);
    return { ok: true as const, result };
  });

export const getHealthFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const [connectors, audit, pending] = await Promise.all([
      listConnectors(context.userId),
      listAudit(context.userId, { limit: 200 }),
      pendingApprovalCount(context.userId),
    ]);
    const bySource = SOURCE_IDS.map((sourceId) => {
      const conn = connectors.find((c) => c.sourceId === sourceId)!;
      const rows = audit.filter((a) => a.sourceId === sourceId);
      const okN = rows.filter((r) => r.status === "ok" || r.status === "degraded")
        .length;
      const successRate = rows.length ? okN / rows.length : 1;
      const lat = [...rows.map((r) => r.latencyMs)].sort((a, b) => a - b);
      const p95 = lat.length
        ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))]
        : 0;
      return {
        sourceId,
        enabled: conn.enabled,
        circuitState: conn.circuitState,
        tokenStatus: conn.tokenStatus,
        injectedFault: conn.injectedFault,
        successRate,
        p95,
        calls24h: rows.length,
        lastError: conn.lastError,
        lastOkAt: conn.lastOkAt,
      };
    });
    const all = audit;
    const okAll = all.filter((r) => r.status === "ok" || r.status === "degraded")
      .length;
    const latAll = [...all.map((r) => r.latencyMs)].sort((a, b) => a - b);
    return {
      sources: bySource,
      overallSuccess: all.length ? okAll / all.length : 1,
      overallP95: latAll.length
        ? latAll[Math.min(latAll.length - 1, Math.floor(latAll.length * 0.95))]
        : 0,
      calls24h: all.length,
      pendingApprovals: pending,
    };
  });

export const runPlaybookFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => runAuthIncident(context.userId));

export const testSourceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { sourceId: SourceId }) => input)
  .handler(async ({ context, data }) => {
    const probe: Record<SourceId, { tool: string; args: JsonObject }> = {
      github: { tool: "github.search_prs", args: { query: "auth", since: "2026-08-06" } },
      linear: { tool: "linear.search_issues", args: { team: "AUTH" } },
      notion: { tool: "notion.search_pages", args: { query: "jwt" } },
      hubspot: { tool: "hubspot.search_companies", args: { module: "sso" } },
      aegis: { tool: "aegis.list_vulns", args: { severity: "high" } },
    };
    const p = probe[data.sourceId];
    return dispatchTool({
      userId: context.userId,
      tool: p.tool,
      args: p.args,
      caller: "health-probe",
    });
  });

export const listThreadsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => listConversations(context.userId));

export const getThreadFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) =>
    listMessages(context.userId, data.id),
  );

export const runAgentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { conversationId?: string; prompt: string }) => input,
  )
  .handler(async ({ context, data }) => {
    const apiKey = process.env.XAI_API_KEY;
    const prompt = data.prompt.trim();
    if (!prompt) return { ok: false as const, error: "Empty prompt" };

    let conversationId = data.conversationId;
    if (!conversationId) {
      const title = prompt.length > 56 ? `${prompt.slice(0, 53)}…` : prompt;
      conversationId = await createConversation(context.userId, title);
    }
    await addMessage(context.userId, conversationId, {
      role: "user",
      content: prompt,
    });

    if (!apiKey) {
      const text =
        "AI is not available in this environment. Use the Inspector to call tools directly.";
      await addMessage(context.userId, conversationId, {
        role: "assistant",
        content: text,
      });
      return {
        ok: true as const,
        conversationId,
        text,
        toolTrace: [] as Array<{
          id: string;
          name: string;
          args: JsonObject;
          latencyMs: number;
          result: ToolResult;
        }>,
      };
    }

    type OaiMsg =
      | { role: "system" | "user" | "assistant"; content: string }
      | {
          role: "assistant";
          content: string | null;
          tool_calls: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        }
      | { role: "tool"; tool_call_id: string; content: string };

    const connectors = await listConnectors(context.userId);
    const enabled = new Set(
      connectors.filter((c) => c.enabled).map((c) => c.sourceId),
    );
    const liveTools = TOOLS.filter((t) => enabled.has(t.sourceId));

    const history = await listMessages(context.userId, conversationId);
    const messages: OaiMsg[] = [
      {
        role: "system",
        content: `You are Conduit, the MCP control-plane agent for KitePay (today is 13 Aug 2026).
You may only answer from tool results. Cite sources by tool name and record ids (PR numbers, AEG ids, Linear ids, company names).
If a source is down, say so and continue with what you have.
Write tools (linear.create_issue) require human approval — tell the user the approval was queued.
Never invent CVEs, customers, or PR numbers.
Prefer 2–5 focused tool calls. For the common auth-incident question: list high/critical vulns, search last week's auth PRs (since 2026-08-06), then HubSpot companies with the sso module.
Be concise. Use short markdown with headings and bullets.`,
      },
      ...history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    ];

    const tools = liveTools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));

    const toolTrace: Array<{
      id: string;
      name: string;
      args: JsonObject;
      latencyMs: number;
      result: ToolResult;
    }> = [];

    let finalText = "";
    for (let round = 0; round < 5; round += 1) {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.2,
          max_tokens: 1400,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) {
        const err = `xAI API error ${res.status}`;
        await addMessage(context.userId, conversationId, {
          role: "assistant",
          content: err,
        });
        return { ok: false as const, error: err, conversationId };
      }
      const body = (await res.json()) as {
        choices: Array<{
          message: {
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason?: string;
        }>;
      };
      const msg = body.choices[0]?.message;
      if (!msg) {
        return { ok: false as const, error: "Empty model response", conversationId };
      }

      const calls = msg.tool_calls ?? [];
      if (!calls.length) {
        finalText = msg.content ?? "";
        break;
      }

      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: calls,
      });

      for (const call of calls) {
        let args: JsonObject = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as JsonObject;
        } catch {
          args = {};
        }
        const out = await dispatchTool({
          userId: context.userId,
          tool: call.function.name,
          args,
          caller: "agent",
        });
        toolTrace.push({
          id: call.id,
          name: call.function.name,
          args,
          latencyMs: out.latencyMs,
          result: out.result,
        });
        const payload = JSON.stringify(
          out.result.content.find((c) => c.type === "json")?.json ??
            out.result.content[0]?.text ??
            out.result,
        );
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: payload.slice(0, 8000),
        });
      }
    }

    if (!finalText) {
      finalText = "I could not finish reasoning over the tools. Try again.";
    }

    await addMessage(context.userId, conversationId, {
      role: "assistant",
      content: finalText,
      payload: { toolCalls: toolTrace },
    });

    return {
      ok: true as const,
      conversationId,
      text: finalText,
      toolTrace,
    };
  });

export async function getConnectorSafe(userId: string, sourceId: SourceId) {
  return getConnector(userId, sourceId);
}
