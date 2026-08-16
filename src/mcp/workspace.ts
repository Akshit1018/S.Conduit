import { getSql } from "@/lib/db";
import { SOURCE_IDS, TOOLS, toolsFor } from "./catalog";
import type {
  ApprovalRow,
  AuditRow,
  CallStatus,
  CircuitState,
  ConnectorRow,
  Conversation,
  ChatMessage,
  ErrorClass,
  InjectedFault,
  JsonObject,
  JsonValue,
  SourceId,
  TokenStatus,
} from "./types";

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function iso(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString();
}

function defaultAcl(sourceId: SourceId): Record<string, boolean> {
  const acl: Record<string, boolean> = {};
  for (const t of toolsFor(sourceId)) acl[t.name] = true;
  return acl;
}

export async function ensureWorkspace(userId: string) {
  const sql = await getSql();
  const existing = await sql<{ source_id: string }>`
    select source_id from connectors where user_id = ${userId}
  `;
  const have = new Set(existing.map((r) => r.source_id));
  for (const sourceId of SOURCE_IDS) {
    if (have.has(sourceId)) continue;
    const acl = JSON.stringify(defaultAcl(sourceId));
    await sql`
      insert into connectors (user_id, source_id, tools_acl, token_label)
      values (${userId}, ${sourceId}, ${acl}, ${`pat_${sourceId}_live`})
    `;
  }
}

function mapConnector(row: {
  source_id: string;
  enabled: boolean;
  token_status: string;
  token_label: string;
  injected_fault: string;
  tools_acl: string;
  last_ok_at: string | Date | null;
  last_error: string | null;
  fail_count: number;
  circuit_state: string;
  circuit_opened_at: string | Date | null;
}): ConnectorRow {
  return {
    sourceId: row.source_id as SourceId,
    enabled: Boolean(row.enabled),
    tokenStatus: row.token_status as TokenStatus,
    tokenLabel: row.token_label,
    injectedFault: row.injected_fault as InjectedFault,
    toolsAcl: parseJson(row.tools_acl, {}),
    lastOkAt: iso(row.last_ok_at),
    lastError: row.last_error,
    failCount: Number(row.fail_count),
    circuitState: row.circuit_state as CircuitState,
    circuitOpenedAt: iso(row.circuit_opened_at),
  };
}

export async function listConnectors(userId: string): Promise<ConnectorRow[]> {
  await ensureWorkspace(userId);
  const sql = await getSql();
  const rows = await sql<{
    source_id: string;
    enabled: boolean;
    token_status: string;
    token_label: string;
    injected_fault: string;
    tools_acl: string;
    last_ok_at: string | Date | null;
    last_error: string | null;
    fail_count: number;
    circuit_state: string;
    circuit_opened_at: string | Date | null;
  }>`
    select source_id, enabled, token_status, token_label, injected_fault,
           tools_acl, last_ok_at, last_error, fail_count, circuit_state,
           circuit_opened_at
    from connectors where user_id = ${userId}
  `;
  const order = SOURCE_IDS;
  return rows
    .map(mapConnector)
    .sort((a, b) => order.indexOf(a.sourceId) - order.indexOf(b.sourceId));
}

export async function getConnector(userId: string, sourceId: SourceId) {
  const all = await listConnectors(userId);
  return all.find((c) => c.sourceId === sourceId) ?? null;
}

export async function patchConnector(
  userId: string,
  sourceId: SourceId,
  patch: Partial<{
    enabled: boolean;
    tokenStatus: TokenStatus;
    injectedFault: InjectedFault;
    toolsAcl: Record<string, boolean>;
    failCount: number;
    circuitState: CircuitState;
    circuitOpenedAt: string | null;
    lastOkAt: string | null;
    lastError: string | null;
    tokenLabel: string;
  }>,
) {
  await ensureWorkspace(userId);
  const sql = await getSql();
  const current = await getConnector(userId, sourceId);
  if (!current) return;
  const next = { ...current, ...patch };
  await sql`
    update connectors set
      enabled = ${next.enabled},
      token_status = ${next.tokenStatus},
      injected_fault = ${next.injectedFault},
      tools_acl = ${JSON.stringify(next.toolsAcl)},
      fail_count = ${next.failCount},
      circuit_state = ${next.circuitState},
      circuit_opened_at = ${next.circuitOpenedAt},
      last_ok_at = ${next.lastOkAt},
      last_error = ${next.lastError},
      token_label = ${next.tokenLabel},
      updated_at = now()
    where user_id = ${userId} and source_id = ${sourceId}
  `;
  return getConnector(userId, sourceId);
}

export async function writeAudit(
  userId: string,
  entry: {
    tool: string;
    sourceId: SourceId;
    args: JsonObject;
    status: CallStatus;
    latencyMs: number;
    errorClass?: ErrorClass;
    resultPreview?: string;
    caller: string;
  },
) {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into audit_log
      (id, user_id, tool, source_id, args, status, latency_ms, error_class, result_preview, caller)
    values (
      ${id}, ${userId}, ${entry.tool}, ${entry.sourceId},
      ${JSON.stringify(entry.args)}, ${entry.status}, ${entry.latencyMs},
      ${entry.errorClass ?? null}, ${entry.resultPreview ?? null}, ${entry.caller}
    )
  `;
  return id;
}

export async function listAudit(
  userId: string,
  opts: { sourceId?: SourceId; limit?: number } = {},
): Promise<AuditRow[]> {
  const sql = await getSql();
  const limit = opts.limit ?? 80;
  const rows = opts.sourceId
    ? await sql<{
        id: string;
        ts: string | Date;
        tool: string;
        source_id: string;
        args: string;
        status: string;
        latency_ms: number;
        error_class: string | null;
        result_preview: string | null;
        caller: string;
      }>`
        select id, ts, tool, source_id, args, status, latency_ms, error_class, result_preview, caller
        from audit_log
        where user_id = ${userId} and source_id = ${opts.sourceId}
        order by ts desc
        limit ${limit}
      `
    : await sql<{
        id: string;
        ts: string | Date;
        tool: string;
        source_id: string;
        args: string;
        status: string;
        latency_ms: number;
        error_class: string | null;
        result_preview: string | null;
        caller: string;
      }>`
        select id, ts, tool, source_id, args, status, latency_ms, error_class, result_preview, caller
        from audit_log
        where user_id = ${userId}
        order by ts desc
        limit ${limit}
      `;
  return rows.map((r) => ({
    id: r.id,
    ts: iso(r.ts) ?? "",
    tool: r.tool,
    sourceId: r.source_id as SourceId,
    args: parseJson<JsonObject>(r.args, {}),
    status: r.status as CallStatus,
    latencyMs: Number(r.latency_ms),
    errorClass: (r.error_class as ErrorClass) ?? null,
    resultPreview: r.result_preview,
    caller: r.caller,
  }));
}

export async function listApprovals(userId: string): Promise<ApprovalRow[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    tool: string;
    args: string;
    status: string;
    created_at: string | Date;
    resolved_at: string | Date | null;
    result: string | null;
  }>`
    select id, tool, args, status, created_at, resolved_at, result
    from approvals where user_id = ${userId}
    order by created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    tool: r.tool,
    args: parseJson<JsonObject>(r.args, {}),
    status: r.status as ApprovalRow["status"],
    createdAt: iso(r.created_at) ?? "",
    resolvedAt: iso(r.resolved_at),
    result: parseJson<JsonValue>(r.result, null),
  }));
}

export async function insertApproval(
  userId: string,
  tool: string,
  args: JsonObject,
) {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into approvals (id, user_id, tool, args, status)
    values (${id}, ${userId}, ${tool}, ${JSON.stringify(args)}, 'pending')
  `;
  return id;
}

export async function resolveApproval(
  userId: string,
  id: string,
  status: "approved" | "rejected",
  result: JsonValue,
) {
  const sql = await getSql();
  await sql`
    update approvals
    set status = ${status}, resolved_at = now(), result = ${JSON.stringify(result)}
    where id = ${id} and user_id = ${userId}
  `;
}

export async function listCreatedIssues(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ payload: string }>`
    select payload from created_issues where user_id = ${userId}
  `;
  return rows.map((r) => parseJson<JsonObject>(r.payload, {}));
}

export async function saveCreatedIssue(
  userId: string,
  sourceId: SourceId,
  payload: JsonObject,
) {
  const sql = await getSql();
  await sql`
    insert into created_issues (id, user_id, source_id, payload)
    values (${crypto.randomUUID()}, ${userId}, ${sourceId}, ${JSON.stringify(payload)})
  `;
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    title: string;
    created_at: string | Date;
  }>`
    select id, title, created_at from conversations
    where user_id = ${userId}
    order by created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: iso(r.created_at) ?? "",
  }));
}

export async function createConversation(userId: string, title: string) {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into conversations (id, user_id, title)
    values (${id}, ${userId}, ${title})
  `;
  return id;
}

export async function listMessages(
  userId: string,
  conversationId: string,
): Promise<ChatMessage[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    role: string;
    content: string;
    payload: string | null;
    created_at: string | Date;
  }>`
    select id, role, content, payload, created_at
    from messages
    where user_id = ${userId} and conversation_id = ${conversationId}
    order by created_at asc
  `;
  return rows.map((r) => ({
    id: r.id,
    role: r.role as ChatMessage["role"],
    content: r.content,
    payload: parseJson(r.payload, undefined),
    createdAt: iso(r.created_at) ?? "",
  }));
}

export async function addMessage(
  userId: string,
  conversationId: string,
  msg: Omit<ChatMessage, "id" | "createdAt">,
) {
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    insert into messages (id, conversation_id, user_id, role, content, payload)
    values (
      ${id}, ${conversationId}, ${userId}, ${msg.role}, ${msg.content},
      ${msg.payload ? JSON.stringify(msg.payload) : null}
    )
  `;
  return id;
}

export async function pendingApprovalCount(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from approvals
    where user_id = ${userId} and status = 'pending'
  `;
  return Number(rows[0]?.n ?? 0);
}

export { TOOLS };
