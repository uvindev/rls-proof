# RLS Proof specification

## User journey

1. A Supabase developer opens the workbench and sees a realistic unsafe migration.
2. They paste or edit SQL and select the exposed schema, defaulting to `public`.
3. They run the audit. The browser reports findings by severity, table, rule, and source line.
4. They inspect the table-policy inventory and copy a generated pgTAP starter test.
5. They can send feedback or request the Team pilot without the migration leaving the browser.

## Functional requirements

- Validate migration input with a shared Zod schema: SQL 1–200,000 characters and a valid unquoted PostgreSQL schema identifier.
- Split SQL statements without treating semicolons inside comments, strings, quoted identifiers, or dollar-quoted blocks as boundaries.
- Inventory `CREATE TABLE`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, exposed-role grants, and `SECURITY DEFINER` functions.
- Report observable rules:
  - `RLS001` high: exposed table created without RLS enabled in the supplied SQL.
  - `RLS002` medium: RLS enabled without a policy in the supplied SQL.
  - `RLS003` high: insert policy lacks `WITH CHECK`.
  - `RLS004` high: a policy for `anon`, `authenticated`, or `public` contains an unconditional `true` predicate.
  - `RLS005` medium: security-definer function lacks an explicit `SET search_path`.
  - `RLS006` medium: exposed roles receive table privileges while RLS is not enabled in the supplied SQL.
- Generate deterministic pgTAP `policies_are` assertions for every inventoried exposed table.
- Provide a sample, clear, copy, feedback, and Team-pilot actions.

## Non-functional constraints

- Process SQL entirely in the browser. Do not send SQL in analytics, URLs, logs, or requests.
- No database credentials, Supabase URL, or service key input.
- Responsive at 320px without horizontal page overflow; code areas may scroll internally.
- Keyboard focus must be visible and interactive targets at least 44px high.
- Findings are static review signals, not a runtime security guarantee.

## Analytics

Emit aggregate event names only: `workbench_viewed`, `migration_audited`, `pgtap_test_copied`, `team_interest`, and `feedback_intent`. When `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is absent, events remain browser events and leave the page through no network path.

## Monetization

The evaluation flow is free. The Team tier is a [TARGET] $19 per team/month hypothesis for repository batch scans, CI annotations, reviewed exceptions, and history. `NEXT_PUBLIC_TEAM_URL` enables a future checkout; the default opens a prefilled pilot email.

## Threat considerations

- Migration text can contain secrets. Keep it client-side and never include it in analytics.
- Avoid executing or formatting SQL as HTML.
- Bound input size to limit browser resource use.
- Apply restrictive browser headers and deny framing, camera, microphone, and geolocation.
- Generated pgTAP is a starter inventory. Users must add behavioral tests using actual roles and fixtures.

## Acceptance checks

- Unsafe sample returns `RLS001`, `RLS003`, `RLS004`, `RLS005`, and `RLS006` where applicable.
- A complete migration with a policy returns no findings for the implemented rule set.
- Quoted identifiers, comments, string literals, and dollar-quoted function bodies do not break statement scanning.
- pgTAP output lists sorted policy names per exposed table.
- Invalid and empty inputs show a specific recovery action.
- Format, lint, typecheck, unit tests, production build, dependency audit, secret scan, and signature gate pass.

## Non-goals

- Connecting to a live database or replacing Supabase Security Advisor.
- Proving policy semantics, testing application code, or detecting every PostgreSQL security issue.
- Executing SQL, accepting credentials, storing reports, or providing compliance certification.
- Shipping repository integrations, accounts, billing, or hosted history in this release.
