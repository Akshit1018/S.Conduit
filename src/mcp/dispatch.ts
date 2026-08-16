import { toolByName } from "./catalog";
import { executeTool, readResource } from "./execute";
import type { ConnectorRow, JsonObject, JsonValue, SourceId, ToolResult } from "./types";
import {
  getConnector,
  insertApproval,
  listCreatedIssues,
  patchConnector,
  writeAudit,
} from "./workspace";

const OPEN_AFTER = 3;
const OPEN_MS = 25_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min));
}

function previewOf(result: ToolResult) {
  const json = result.content.find((c) => c.type === "json")?.json;
  if (json) {
    const s = JSON.stringify(json);
    return s.length > 280 ? `${s.slice(0, 280)}…` : s;
  }
  return result.content[0]?.text?.slice(0, 280) ?? "";
}

async function maybeHalfOpen(userId: string, conn: ConnectorRow) {
  if (conn.circuitState !== "open" || !conn.circuitOpenedAt) return conn;
  const opened = new Date(conn.circuitOpenedAt).getTime();
  if (Date.now() - opened < OPEN_MS) return conn;
  const next = await patchConnector(userId, conn.sourceId, {
    circuitState: "half_open",
  });
  return next ?? { ...conn, circuitState: "half_open" as const };
}

async function recordSuccess(userId: string, sourceId: SourceId) {
  await patchConnector(userId, sourceId, {
    failCount: 0,
    circuitState: "closed",
    circuitOpenedAt: null,
    lastOkAt: new Date().toISOString(),
    lastError: null,
    tokenStatus: "valid",
  });
}

async function recordFailure(
  userId: string,
  conn: ConnectorRow,
  message: string,
) {
  const failCount = conn.failCount + 1;
  const open = failCount >= OPEN_AFTER;
  await patchConnector(userId, conn.sourceId, {
    failCount,
    circuitState: open ? "open" : conn.circuitState,
    circuitOpenedAt: open ? new Date().toISOString() : conn.circuitOpenedAt,
    lastError: message,
  });
}

export async function dispatchTool(opts: {
  userId: string;
  tool: string;
  args: JsonObject;
  caller: string;
  skipHitl?: boolean;
}): Promise<{ result: ToolResult; latencyMs: number; approvalId?: string }> {
  const started = Date.now();
  const spec = toolByName(opts.tool);
  if (!spec) {
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "permanent",
      content: [{ type: "text", text: `Unknown tool ${opts.tool}` }],
    };
    return { result, latencyMs: Date.now() - started };
  }

  let conn = await getConnector(opts.userId, spec.sourceId);
  if (!conn) {
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "permanent",
      content: [{ type: "text", text: "Connector not provisioned" }],
    };
    return { result, latencyMs: Date.now() - started };
  }

  if (!conn.enabled) {
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "permanent",
      content: [
        {
          type: "text",
          text: `${spec.sourceId} is disabled. Enable it in Sources.`,
        },
      ],
    };
    const latencyMs = Date.now() - started;
    await writeAudit(opts.userId, {
      tool: opts.tool,
      sourceId: spec.sourceId,
      args: opts.args,
      status: "error",
      latencyMs,
      errorClass: "permanent",
      resultPreview: "source disabled",
      caller: opts.caller,
    });
    return { result, latencyMs };
  }

  if (conn.toolsAcl[opts.tool] === false) {
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "acl",
      content: [{ type: "text", text: `ACL denied for ${opts.tool}` }],
    };
    const latencyMs = Date.now() - started;
    await writeAudit(opts.userId, {
      tool: opts.tool,
      sourceId: spec.sourceId,
      args: opts.args,
      status: "error",
      latencyMs,
      errorClass: "acl",
      resultPreview: "acl denied",
      caller: opts.caller,
    });
    return { result, latencyMs };
  }

  conn = await maybeHalfOpen(opts.userId, conn);

  if (conn.circuitState === "open") {
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "circuit_open",
      content: [
        {
          type: "text",
          text: `Circuit open on ${spec.sourceId}. Wait for half-open probe.`,
        },
      ],
    };
    const latencyMs = Date.now() - started;
    await writeAudit(opts.userId, {
      tool: opts.tool,
      sourceId: spec.sourceId,
      args: opts.args,
      status: "error",
      latencyMs,
      errorClass: "circuit_open",
      resultPreview: "circuit open",
      caller: opts.caller,
    });
    return { result, latencyMs };
  }

  if (conn.tokenStatus === "expired") {
    await patchConnector(opts.userId, spec.sourceId, {
      tokenStatus: "refreshing",
    });
    await sleep(180);
    await patchConnector(opts.userId, spec.sourceId, { tokenStatus: "valid" });
  }

  if (spec.write && !opts.skipHitl) {
    const approvalId = await insertApproval(opts.userId, opts.tool, opts.args);
    const result: ToolResult = {
      status: "pending_approval",
      isError: false,
      content: [
        {
          type: "json",
          json: {
            pending: true,
            approvalId,
            message:
              "Write tool paused for human approval. Review it in Approvals.",
          },
        },
      ],
    };
    const latencyMs = Date.now() - started;
    await writeAudit(opts.userId, {
      tool: opts.tool,
      sourceId: spec.sourceId,
      args: opts.args,
      status: "pending_approval",
      latencyMs,
      resultPreview: `approval ${approvalId}`,
      caller: opts.caller,
    });
    return { result, latencyMs, approvalId };
  }

  const fault = conn.injectedFault;
  if (fault === "timeout") {
    await sleep(420);
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "transient",
      content: [{ type: "text", text: `Upstream timeout from ${spec.sourceId}` }],
    };
    await recordFailure(opts.userId, conn, "timeout");
    const latencyMs = Date.now() - started;
    await writeAudit(opts.userId, {
      tool: opts.tool,
      sourceId: spec.sourceId,
      args: opts.args,
      status: "error",
      latencyMs,
      errorClass: "transient",
      resultPreview: "timeout",
      caller: opts.caller,
    });
    return { result, latencyMs };
  }

  if (fault === "rate_limit") {
    await sleep(120);
    const result: ToolResult = {
      status: "error",
      isError: true,
      errorClass: "rate_limit",
      content: [
        {
          type: "text",
          text: `429 from ${spec.sourceId}. Backing off. Clear the injected fault to recover.`,
        },
      ],
    };
    await recordFailure(opts.userId, conn, "429 rate_limit");
    const latencyMs = Date.now() - started;
    await writeAudit(opts.userId, {
      tool: opts.tool,
      sourceId: spec.sourceId,
      args: opts.args,
      status: "error",
      latencyMs,
      errorClass: "rate_limit",
      resultPreview: "429",
      caller: opts.caller,
    });
    return { result, latencyMs };
  }

  await sleep(jitter(70, 260));

  const created = await listCreatedIssues(opts.userId);
  let result = executeTool(opts.tool, opts.args, { createdIssues: created });

  if (fault === "schema_drift") {
    result = {
      ...result,
      status: "degraded",
      warning:
        "Upstream schema drift detected. Response normalized; some fields may be missing.",
    };
  }

  if (result.isError) {
    await recordFailure(opts.userId, conn, result.content[0]?.text ?? "error");
  } else {
    await recordSuccess(opts.userId, spec.sourceId);
  }

  const latencyMs = Date.now() - started;
  await writeAudit(opts.userId, {
    tool: opts.tool,
    sourceId: spec.sourceId,
    args: opts.args,
    status: result.status,
    latencyMs,
    errorClass: result.errorClass ?? null,
    resultPreview: previewOf(result),
    caller: opts.caller,
  });
  return { result, latencyMs };
}

export async function dispatchResource(userId: string, uri: string) {
  const started = Date.now();
  const data = readResource(uri);
  return { data, latencyMs: Date.now() - started, userId };
}

export type { JsonValue };
