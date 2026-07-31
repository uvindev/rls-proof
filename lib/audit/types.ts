export type Severity = "high" | "medium";

export type RuleId =
  | "RLS001"
  | "RLS002"
  | "RLS003"
  | "RLS004"
  | "RLS005"
  | "RLS006";

export interface Finding {
  rule: RuleId;
  severity: Severity;
  title: string;
  detail: string;
  object: string;
  line: number;
  repair: string;
}

export interface PolicyInventory {
  name: string;
  command: "all" | "select" | "insert" | "update" | "delete";
  roles: string[];
  hasUsing: boolean;
  hasWithCheck: boolean;
  line: number;
}

export interface TableInventory {
  schema: string;
  name: string;
  created: boolean;
  rlsEnabled: boolean;
  policies: PolicyInventory[];
  grants: string[];
  grantLine: number | null;
  line: number;
}

export interface AuditReport {
  findings: Finding[];
  tables: TableInventory[];
  functionsReviewed: number;
  statementsReviewed: number;
  pgTap: string;
}

export interface SqlStatement {
  text: string;
  line: number;
}
