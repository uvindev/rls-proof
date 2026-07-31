# RLS Proof opportunity brief

## Selection

RLS Proof targets Supabase developers reviewing SQL migrations before merge. Their recurring job is to confirm that newly exposed tables have RLS, usable policies, narrow grants, and safely configured security-definer functions.

Supabase states that RLS must be enabled on tables in exposed schemas and notes that raw SQL creation does not enable it automatically. Its Security Advisor checks a live database for disabled RLS, missing policies, permissive policies, and mutable function search paths. Supabase separately recommends automated database tests for RLS. RLS Proof adds a browser-local pre-deployment check and produces a pgTAP policy inventory from the migration text.

Sources:

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Performance and Security Advisors](https://supabase.com/docs/guides/database/database-advisors)
- [Supabase database testing](https://supabase.com/docs/guides/database/testing)
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)

## Alternatives considered

| Candidate                          | Existing paid evidence                                                                                                                          | First-release gap                                                          | Decision                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| Supabase migration RLS auditor     | Supabase provides live security checks; team willingness to pay for pre-merge controls is [UNVERIFIED]                                          | Local static review and pgTAP generation before a database exists          | Selected                                  |
| Environment-contract drift checker | Infisical lists a $18/identity/month Pro tier for secrets lifecycle controls                                                                    | A narrow manifest diff risks becoming a partial secrets manager            | Rejected for broader competitive scope    |
| Cron and DST release checker       | Cronitor lists paid monitoring from $2/monitor/month; Vercel documents UTC-only schedules, no failed-run retry, and possible duplicate delivery | Schedule preview alone has a weak paid boundary beside monitoring products | Rejected for weaker monetization boundary |

Pricing sources were accessed on 2026-07-31: [Infisical pricing](https://infisical.com/pricing), [Cronitor pricing](https://cronitor.io/pricing). Product constraints: [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs), [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Commercial boundary

The free workbench audits one pasted migration and generates a pgTAP starter test. The Team hypothesis is [TARGET] $19 per team/month for repository-wide scanning, reviewed exceptions, policy history, and pull-request annotations. No payment path or demand is verified. Until a checkout URL exists, Team interest opens a pilot email.

Distribution starts with GitHub, Supabase search intent, implementation agencies, and security-focused engineering communities. Publishing or outreach is outside this task.

## Risks

- Static parsing can miss dynamic SQL, generated migrations, or dialect extensions.
- A clean static report does not verify policy behavior with real roles and data.
- Supabase already provides live database checks, so the product must win on pre-merge timing and test generation.
- Demand, retention, and willingness to pay remain [UNVERIFIED].
