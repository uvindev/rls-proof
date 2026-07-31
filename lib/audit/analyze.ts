import {
  maskCommentsAndLiterals,
  splitSqlStatements,
} from "@/lib/audit/sql-scanner";
import type {
  AuditReport,
  Finding,
  PolicyInventory,
  TableInventory,
} from "@/lib/audit/types";
import type { AuditInput } from "@/lib/schemas/audit";

const identifier = String.raw`(?:"(?:[^"]|"")*"|[a-z_][a-z0-9_$]*)`;
const qualifiedName = String.raw`(${identifier})(?:\s*\.\s*(${identifier}))?`;
const exposedRoles = new Set(["anon", "authenticated", "public"]);

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replaceAll('""', '"');
  }
  return trimmed.toLowerCase();
}

function readName(
  match: RegExpMatchArray,
  defaultSchema: string,
): { schema: string; name: string } {
  if (match[2]) {
    return {
      schema: normalizeIdentifier(match[1]),
      name: normalizeIdentifier(match[2]),
    };
  }
  return { schema: defaultSchema, name: normalizeIdentifier(match[1]) };
}

function tableKey(schema: string, name: string): string {
  return `${schema}.${name}`;
}

function lineForMatch(
  text: string,
  statementLine: number,
  matchIndex = 0,
): number {
  return statementLine + (text.slice(0, matchIndex).match(/\n/g)?.length ?? 0);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => normalizeIdentifier(entry))
    .filter(Boolean);
}

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

function buildPgTap(tables: TableInventory[]): string {
  const assertions = tables
    .map((table) => {
      const policies = [...table.policies]
        .map((policy) => policy.name)
        .sort((left, right) => left.localeCompare(right));
      const expected = policies
        .map((policy) => `'${escapeSqlLiteral(policy)}'`)
        .join(", ");
      return `select policies_are('${escapeSqlLiteral(table.schema)}', '${escapeSqlLiteral(table.name)}', array[${expected}]::name[], '${escapeSqlLiteral(`${table.schema}.${table.name} policy inventory`)}');`;
    })
    .join("\n");

  return [
    "begin;",
    tables.length
      ? `select plan(${tables.length});`
      : "select * from no_plan();",
    assertions || "-- No exposed tables were found in this migration.",
    "select * from finish();",
    "rollback;",
  ].join("\n");
}

export function auditMigration(input: AuditInput): AuditReport {
  const statements = splitSqlStatements(input.sql);
  const tables = new Map<string, TableInventory>();
  const findings: Finding[] = [];
  let functionsReviewed = 0;

  const ensureTable = (schema: string, name: string, line: number) => {
    const key = tableKey(schema, name);
    const existing = tables.get(key);
    if (existing) return existing;
    const table: TableInventory = {
      schema,
      name,
      created: false,
      rlsEnabled: false,
      policies: [],
      grants: [],
      grantLine: null,
      line,
    };
    tables.set(key, table);
    return table;
  };

  for (const statement of statements) {
    const code = maskCommentsAndLiterals(statement.text);
    const createTable = code.match(
      new RegExp(
        String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${qualifiedName}`,
        "i",
      ),
    );
    if (createTable) {
      const sourceLine = lineForMatch(code, statement.line, createTable.index);
      const name = readName(createTable, input.exposedSchema);
      if (name.schema === input.exposedSchema) {
        const table = ensureTable(name.schema, name.name, sourceLine);
        table.created = true;
        table.line = sourceLine;
      }
    }

    const enableRls = code.match(
      new RegExp(
        String.raw`\balter\s+table\s+(?:only\s+)?${qualifiedName}\s+enable\s+row\s+level\s+security`,
        "i",
      ),
    );
    if (enableRls) {
      const sourceLine = lineForMatch(code, statement.line, enableRls.index);
      const name = readName(enableRls, input.exposedSchema);
      if (name.schema === input.exposedSchema) {
        ensureTable(name.schema, name.name, sourceLine).rlsEnabled = true;
      }
    }

    const createPolicy = code.match(
      new RegExp(
        String.raw`\bcreate\s+policy\s+(${identifier})\s+on\s+${qualifiedName}`,
        "i",
      ),
    );
    if (createPolicy) {
      const sourceLine = lineForMatch(code, statement.line, createPolicy.index);
      const policyName = normalizeIdentifier(createPolicy[1]);
      const name = createPolicy[3]
        ? {
            schema: normalizeIdentifier(createPolicy[2]),
            name: normalizeIdentifier(createPolicy[3]),
          }
        : {
            schema: input.exposedSchema,
            name: normalizeIdentifier(createPolicy[2]),
          };
      if (name.schema === input.exposedSchema) {
        const command = (code
          .match(/\bfor\s+(all|select|insert|update|delete)\b/i)?.[1]
          ?.toLowerCase() ?? "all") as PolicyInventory["command"];
        const rolesMatch = code.match(
          /\bto\s+([^;]+?)(?=\s+(?:using|with\s+check)\b|;|$)/i,
        );
        const roles = rolesMatch ? splitList(rolesMatch[1]) : ["public"];
        const policy: PolicyInventory = {
          name: policyName,
          command,
          roles,
          hasUsing: /\busing\s*\(/i.test(code),
          hasWithCheck: /\bwith\s+check\s*\(/i.test(code),
          line: sourceLine,
        };
        ensureTable(name.schema, name.name, sourceLine).policies.push(policy);

        if (command === "insert" && !policy.hasWithCheck) {
          findings.push({
            rule: "RLS003",
            severity: "high",
            title: "Insert policy has no WITH CHECK",
            detail: `${policyName} does not state which new rows the role may create.`,
            object: `${name.schema}.${name.name}`,
            line: sourceLine,
            repair:
              "Add a WITH CHECK predicate tied to the authenticated principal or intended role.",
          });
        }

        const publicRole = roles.some((role) => exposedRoles.has(role));
        const unconditional = /\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(
          code,
        );
        if (publicRole && unconditional) {
          findings.push({
            rule: "RLS004",
            severity: "high",
            title: "Exposed role receives an unconditional policy",
            detail: `${policyName} contains a true predicate for ${roles.join(", ")}.`,
            object: `${name.schema}.${name.name}`,
            line: sourceLine,
            repair:
              "Replace true with the narrow row condition this role requires, or remove the exposed role.",
          });
        }
      }
    }

    const grant = code.match(
      new RegExp(
        String.raw`\bgrant\s+([a-z,\s]+)\s+on\s+(?:table\s+)?${qualifiedName}\s+to\s+([^;]+)`,
        "i",
      ),
    );
    if (grant) {
      const sourceLine = lineForMatch(code, statement.line, grant.index);
      const name = grant[3]
        ? {
            schema: normalizeIdentifier(grant[2]),
            name: normalizeIdentifier(grant[3]),
          }
        : { schema: input.exposedSchema, name: normalizeIdentifier(grant[2]) };
      if (name.schema === input.exposedSchema) {
        const roles = splitList(grant[4]);
        const relevant = roles.filter((role) => exposedRoles.has(role));
        if (relevant.length) {
          const table = ensureTable(name.schema, name.name, sourceLine);
          table.grants.push(...relevant);
          table.grantLine ??= sourceLine;
        }
      }
    }

    if (
      /\bcreate\s+(?:or\s+replace\s+)?function\b/i.test(code) &&
      /\bsecurity\s+definer\b/i.test(code)
    ) {
      functionsReviewed += 1;
      if (!/\bset\s+search_path\s*(?:=|to)\s*/i.test(code)) {
        const sourceLine = lineForMatch(
          code,
          statement.line,
          code.search(/\bcreate\s+(?:or\s+replace\s+)?function\b/i),
        );
        const functionName = code.match(
          new RegExp(String.raw`\bfunction\s+${qualifiedName}`, "i"),
        );
        const name = functionName
          ? readName(functionName, input.exposedSchema)
          : null;
        const object = name
          ? `${name.schema}.${name.name}`
          : "security-definer function";
        findings.push({
          rule: "RLS005",
          severity: "medium",
          title: "Security-definer function has a mutable search path",
          detail: `${object} runs with its owner's privileges but does not pin search_path.`,
          object,
          line: sourceLine,
          repair:
            "Add SET search_path = '' and schema-qualify referenced objects.",
        });
      }
    }
  }

  const exposedTables = [...tables.values()]
    .filter((table) => table.schema === input.exposedSchema)
    .sort((left, right) =>
      tableKey(left.schema, left.name).localeCompare(
        tableKey(right.schema, right.name),
      ),
    );

  for (const table of exposedTables) {
    if (table.created && !table.rlsEnabled) {
      findings.push({
        rule: "RLS001",
        severity: "high",
        title: "Exposed table is created without RLS",
        detail: `${table.schema}.${table.name} is created in the exposed schema without an ENABLE ROW LEVEL SECURITY statement.`,
        object: `${table.schema}.${table.name}`,
        line: table.line,
        repair: `Add ALTER TABLE ${table.schema}.${table.name} ENABLE ROW LEVEL SECURITY in this migration.`,
      });
    }
    if (table.rlsEnabled && table.policies.length === 0) {
      findings.push({
        rule: "RLS002",
        severity: "medium",
        title: "RLS is enabled without a policy",
        detail: `${table.schema}.${table.name} will deny API access until an applicable policy exists.`,
        object: `${table.schema}.${table.name}`,
        line: table.line,
        repair:
          "Add the least-privilege policies required by the application, then test each role.",
      });
    }
    if (table.grants.length && !table.rlsEnabled) {
      findings.push({
        rule: "RLS006",
        severity: "medium",
        title: "Exposed role is granted access before RLS",
        detail: `${[...new Set(table.grants)].join(", ")} receives table privileges while this migration does not enable RLS.`,
        object: `${table.schema}.${table.name}`,
        line: table.grantLine ?? table.line,
        repair:
          "Enable RLS in the same migration or remove the exposed-role grant.",
      });
    }
  }

  findings.sort((left, right) => {
    if (left.severity !== right.severity)
      return left.severity === "high" ? -1 : 1;
    return left.line - right.line || left.rule.localeCompare(right.rule);
  });

  return {
    findings,
    tables: exposedTables,
    functionsReviewed,
    statementsReviewed: statements.length,
    pgTap: buildPgTap(exposedTables),
  };
}
