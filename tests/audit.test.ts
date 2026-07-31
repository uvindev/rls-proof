import { describe, expect, it } from "vitest";
import { auditMigration } from "@/lib/audit/analyze";
import { unsafeSample } from "@/lib/audit/sample";
import { splitSqlStatements } from "@/lib/audit/sql-scanner";

const audit = (sql: string, exposedSchema = "public") =>
  auditMigration({ sql, exposedSchema });

describe("SQL statement scanning", () => {
  it("keeps semicolons inside literals, comments, and dollar-quoted bodies", () => {
    const statements = splitSqlStatements(`
      create table public.notes (body text default 'one;two');
      -- this comment has a ; delimiter
      create function public.note_count() returns int language sql as $$
        select count(*)::int from public.notes;
      $$;
      /* nested ; /* block ; */ comment */ alter table public.notes enable row level security;
    `);

    expect(statements).toHaveLength(3);
    expect(statements[1]?.text).toContain("select count(*)::int");
    expect(statements[2]?.text).toContain("enable row level security");
  });

  it("reports the source line where a statement starts", () => {
    const statements = splitSqlStatements(
      "\n\ncreate table public.one(id int);\ncreate table public.two(id int);",
    );
    expect(statements.map((statement) => statement.line)).toEqual([3, 4]);
  });
});

describe("migration audit", () => {
  it("finds all five hazards in the supplied unsafe sample", () => {
    const report = audit(unsafeSample);
    expect(report.findings.map((finding) => finding.rule)).toEqual([
      "RLS001",
      "RLS003",
      "RLS004",
      "RLS006",
      "RLS005",
    ]);
    expect(report.tables).toHaveLength(2);
    expect(report.functionsReviewed).toBe(1);
    expect(
      report.findings.find((finding) => finding.rule === "RLS001")?.line,
    ).toBe(2);
    expect(
      report.findings.find((finding) => finding.rule === "RLS006")?.line,
    ).toBe(8);
  });

  it("returns no findings for an enabled table with a narrow policy", () => {
    const report = audit(`
      create table public.todos (id uuid primary key, user_id uuid not null);
      alter table public.todos enable row level security;
      create policy "Owners read todos" on public.todos
        for select to authenticated using ((select auth.uid()) = user_id);
      create policy "Owners insert todos" on public.todos
        for insert to authenticated with check ((select auth.uid()) = user_id);
    `);

    expect(report.findings).toEqual([]);
    expect(report.tables[0]?.policies).toHaveLength(2);
  });

  it("flags RLS enabled without any policy", () => {
    const report = audit(`
      create table public.audit_log (id bigint primary key);
      alter table public.audit_log enable row level security;
    `);

    expect(report.findings.map((finding) => finding.rule)).toEqual(["RLS002"]);
  });

  it("flags an insert policy without WITH CHECK", () => {
    const report = audit(`
      alter table public.messages enable row level security;
      create policy writer on public.messages for insert to authenticated;
    `);

    expect(report.findings.map((finding) => finding.rule)).toEqual(["RLS003"]);
  });

  it("flags an unconditional predicate granted to an exposed role", () => {
    const report = audit(`
      alter table public.posts enable row level security;
      create policy reader on public.posts for select to anon using ( true );
    `);

    expect(report.findings.map((finding) => finding.rule)).toEqual(["RLS004"]);
  });

  it("does not flag an unconditional predicate for a private database role", () => {
    const report = audit(`
      alter table public.jobs enable row level security;
      create policy worker on public.jobs for select to queue_worker using (true);
    `);

    expect(report.findings).toEqual([]);
  });

  it("requires a fixed search path on security-definer functions", () => {
    const unsafe = audit(`
      create function private.can_read() returns boolean language sql security definer
      as $$ select true; $$;
    `);
    const fixed = audit(`
      create function private.can_read() returns boolean language sql security definer
      set search_path = '' as $$ select true; $$;
    `);

    expect(unsafe.findings.map((finding) => finding.rule)).toEqual(["RLS005"]);
    expect(fixed.findings).toEqual([]);
  });

  it("ignores SQL-looking text inside comments and function bodies", () => {
    const report = audit(`
      -- create table public.fake(id int);
      create function private.fixture() returns text language sql as $$
        select 'create table public.also_fake(id int);';
      $$;
    `);

    expect(report.tables).toEqual([]);
    expect(report.findings).toEqual([]);
  });

  it("audits only the selected exposed schema", () => {
    const report = audit(
      `
      create table public.visible (id int);
      create table api.visible (id int);
      alter table api.visible enable row level security;
      create policy api_reader on api.visible for select to authenticated using (id > 0);
    `,
      "api",
    );

    expect(
      report.tables.map((table) => `${table.schema}.${table.name}`),
    ).toEqual(["api.visible"]);
    expect(report.findings).toEqual([]);
  });

  it("preserves quoted identifiers in inventory and generated pgTAP", () => {
    const report = audit(`
      create table public."Team Notes" (id int);
      alter table public."Team Notes" enable row level security;
      create policy "Member notes" on public."Team Notes" for select to authenticated using (id > 0);
    `);

    expect(report.tables[0]?.name).toBe("Team Notes");
    expect(report.pgTap).toContain("'Team Notes'");
    expect(report.pgTap).toContain("'Member notes'");
  });

  it("sorts pgTAP policy names and matches the assertion count", () => {
    const report = audit(`
      alter table public.docs enable row level security;
      create policy z_reader on public.docs for select to authenticated using (id > 0);
      create policy a_reader on public.docs for select to authenticated using (id > 0);
    `);

    expect(report.pgTap).toContain("select plan(1);");
    expect(report.pgTap.indexOf("a_reader")).toBeLessThan(
      report.pgTap.indexOf("z_reader"),
    );
  });
});
