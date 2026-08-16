export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type SourceId = "github" | "linear" | "notion" | "hubspot" | "aegis";

export type CircuitState = "closed" | "open" | "half_open";
export type TokenStatus = "valid" | "expired" | "refreshing";
export type InjectedFault = "none" | "rate_limit" | "timeout" | "schema_drift";
export type CallStatus = "ok" | "error" | "degraded" | "pending_approval";
export type ErrorClass =
  | "transient"
  | "permanent"
  | "rate_limit"
  | "auth"
  | "schema"
  | "circuit_open"
  | "acl"
  | null;

export type JsonSchema = {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      default?: string | number | boolean | null;
    }
  >;
  required?: string[];
};

export type McpTool = {
  name: string;
  sourceId: SourceId;
  description: string;
  write: boolean;
  inputSchema: JsonSchema;
  example: JsonObject;
};

export type McpResource = {
  uri: string;
  name: string;
  sourceId: SourceId;
  mimeType: string;
  description: string;
};

export type McpPrompt = {
  name: string;
  title: string;
  description: string;
  text: string;
};

export type ToolResult = {
  status: CallStatus;
  content: Array<{ type: "text" | "json"; text?: string; json?: JsonValue }>;
  isError: boolean;
  warning?: string;
  errorClass?: ErrorClass;
};

export type ConnectorRow = {
  sourceId: SourceId;
  enabled: boolean;
  tokenStatus: TokenStatus;
  tokenLabel: string;
  injectedFault: InjectedFault;
  toolsAcl: Record<string, boolean>;
  lastOkAt: string | null;
  lastError: string | null;
  failCount: number;
  circuitState: CircuitState;
  circuitOpenedAt: string | null;
};

export type AuditRow = {
  id: string;
  ts: string;
  tool: string;
  sourceId: SourceId;
  args: JsonObject;
  status: CallStatus;
  latencyMs: number;
  errorClass: ErrorClass;
  resultPreview: string | null;
  caller: string;
};

export type ApprovalRow = {
  id: string;
  tool: string;
  args: JsonObject;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt: string | null;
  result: JsonValue;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  payload?: {
    toolCalls?: Array<{
      id: string;
      name: string;
      args: JsonObject;
      result?: ToolResult;
      latencyMs?: number;
    }>;
    citations?: Array<{ sourceId: SourceId; label: string }>;
  };
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
};

export type HealthSnapshot = {
  sources: Array<{
    sourceId: SourceId;
    enabled: boolean;
    circuitState: CircuitState;
    tokenStatus: TokenStatus;
    injectedFault: InjectedFault;
    successRate: number;
    p95: number;
    calls24h: number;
    lastError: string | null;
    lastOkAt: string | null;
  }>;
  overallSuccess: number;
  overallP95: number;
  calls24h: number;
  pendingApprovals: number;
};
