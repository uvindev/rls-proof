"use client";

import { useEffect, useState } from "react";
import { auditMigration } from "@/lib/audit/analyze";
import { unsafeSample } from "@/lib/audit/sample";
import type { AuditReport } from "@/lib/audit/types";
import { trackEvent } from "@/lib/analytics";
import { auditInputSchema } from "@/lib/schemas/audit";

export function Workbench() {
  const [sql, setSql] = useState(unsafeSample);
  const [schema, setSchema] = useState("public");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  useEffect(() => {
    trackEvent("workbench_viewed");
  }, []);

  const runAudit = () => {
    const result = auditInputSchema.safeParse({ sql, exposedSchema: schema });
    if (!result.success) {
      setReport(null);
      setError(result.error.issues[0]?.message ?? "Check the migration input.");
      return;
    }

    setReport(auditMigration(result.data));
    setError(null);
    setCopyState("idle");
    trackEvent("migration_audited");
  };

  const copyPgTap = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.pgTap);
      setCopyState("copied");
      trackEvent("pgtap_test_copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section
      id="workbench"
      className="workbench shell"
      aria-labelledby="workbench-title"
    >
      <div className="workbench-bar">
        <div>
          <p className="kicker">Pre-merge review</p>
          <h2 id="workbench-title">Migration docket</h2>
        </div>
        <p className="privacy-stamp">LOCAL MEMORY / NO SQL ENDPOINT</p>
      </div>

      <div className="workbench-grid">
        <div className="input-column">
          <div className="field-row">
            <label htmlFor="schema">Exposed schema</label>
            <input
              id="schema"
              value={schema}
              onChange={(event) => setSchema(event.target.value)}
              spellCheck={false}
            />
          </div>
          <label className="sql-label" htmlFor="migration-sql">
            SQL migration
            <span>{sql.length.toLocaleString()} / 200,000</span>
          </label>
          <textarea
            id="migration-sql"
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
            aria-describedby="sql-boundary"
          />
          <p id="sql-boundary" className="field-note">
            Static review only. Dynamic SQL and runtime policy behavior require
            separate tests.
          </p>
          <div className="input-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={runAudit}
            >
              Run migration audit
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setSql(unsafeSample);
                setReport(null);
                setError(null);
              }}
            >
              Restore unsafe sample
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setSql("");
                setReport(null);
                setError(null);
              }}
            >
              Clear
            </button>
          </div>
          {error ? (
            <p className="input-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="report-column" aria-live="polite">
          {!report ? (
            <div className="empty-report">
              <span aria-hidden="true">01</span>
              <h3>No review recorded</h3>
              <p>
                Run the supplied migration to see each rule, source line, and
                repair.
              </p>
            </div>
          ) : (
            <>
              <div className="report-summary">
                <div>
                  <strong>{report.findings.length}</strong>
                  <span>findings</span>
                </div>
                <div>
                  <strong>{report.tables.length}</strong>
                  <span>exposed tables</span>
                </div>
                <div>
                  <strong>{report.statementsReviewed}</strong>
                  <span>statements</span>
                </div>
              </div>

              {report.findings.length === 0 ? (
                <div className="clean-report">
                  <p className="kicker">Implemented checks / clear</p>
                  <h3>No static findings in this migration.</h3>
                  <p>
                    This does not prove runtime authorization. Run role-based
                    tests against a disposable database.
                  </p>
                </div>
              ) : (
                <ol className="finding-list">
                  {report.findings.map((finding, index) => (
                    <li key={`${finding.rule}-${finding.line}-${index}`}>
                      <div className="finding-meta">
                        <span
                          className={`severity severity-${finding.severity}`}
                        >
                          {finding.severity}
                        </span>
                        <code>{finding.rule}</code>
                        <span>line {finding.line}</span>
                      </div>
                      <h3>{finding.title}</h3>
                      <p>{finding.detail}</p>
                      <p className="repair">
                        <strong>Repair:</strong> {finding.repair}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              <div className="inventory">
                <div className="section-heading">
                  <h3>Policy inventory</h3>
                  <span>
                    {report.functionsReviewed} definer functions reviewed
                  </span>
                </div>
                {report.tables.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Table</th>
                          <th>RLS</th>
                          <th>Policies</th>
                          <th>Exposed grants</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.tables.map((table) => (
                          <tr key={`${table.schema}.${table.name}`}>
                            <td>
                              <code>
                                {table.schema}.{table.name}
                              </code>
                            </td>
                            <td>{table.rlsEnabled ? "enabled" : "missing"}</td>
                            <td>
                              {table.policies.length
                                ? table.policies
                                    .map((policy) => policy.name)
                                    .join(", ")
                                : "none"}
                            </td>
                            <td>
                              {table.grants.length
                                ? [...new Set(table.grants)].join(", ")
                                : "none"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="field-note">
                    No tables in the selected exposed schema were found.
                  </p>
                )}
              </div>

              <div className="pgtap-output">
                <div className="section-heading">
                  <div>
                    <p className="kicker">Generated starter</p>
                    <h3>pgTAP policy inventory</h3>
                  </div>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={copyPgTap}
                  >
                    Copy test
                  </button>
                </div>
                <pre>
                  <code>{report.pgTap}</code>
                </pre>
                <p
                  className={
                    copyState === "failed" ? "copy-error" : "copy-note"
                  }
                >
                  {copyState === "copied"
                    ? "Copied. Add role-based behavior tests before merge."
                    : copyState === "failed"
                      ? "Clipboard access failed. Select the test text and copy it manually."
                      : "Inventory assertions catch policy-name drift; they do not test row behavior."}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
