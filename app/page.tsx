import { Workbench } from "@/app/_components/workbench";
import { IntentLink } from "@/components/intent-link";

const feedbackEmail = "hello@iamuvin.com";
const configuredTeamUrl = process.env.NEXT_PUBLIC_TEAM_URL;
const teamUrl =
  configuredTeamUrl ||
  `mailto:${feedbackEmail}?subject=${encodeURIComponent("RLS Proof Team pilot")}`;

export default function HomePage() {
  return (
    <main>
      <header className="site-header shell">
        <a className="wordmark" href="#top" aria-label="RLS Proof home">
          <span aria-hidden="true">RLS/</span> Proof
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workbench">Audit</a>
          <a href="#team">Team</a>
          <a href="#limits">Limits</a>
        </nav>
      </header>

      <section id="top" className="hero shell" aria-labelledby="hero-title">
        <div className="hero-index" aria-hidden="true">
          PG / 01
        </div>
        <div className="hero-copy">
          <p className="kicker">Supabase migration review</p>
          <h1 id="hero-title">
            Catch the missing policy before the migration ships.
          </h1>
          <p className="hero-lede">
            Paste SQL. RLS Proof maps exposed tables, flags six concrete policy
            hazards, and writes a pgTAP inventory test. The migration stays in
            this tab.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workbench">
              Review the sample
            </a>
            <a className="text-link" href="#limits">
              Read the boundary
            </a>
          </div>
        </div>
        <aside className="audit-card" aria-label="Review sequence">
          <p>MERGE CHECK / 0.1</p>
          <ol>
            <li>
              <span>01</span> Parse migration statements
            </li>
            <li>
              <span>02</span> Map tables, grants, policies
            </li>
            <li>
              <span>03</span> Generate pgTAP inventory
            </li>
          </ol>
          <strong>SQL network requests: none</strong>
        </aside>
      </section>

      <Workbench />

      <section className="evidence shell" aria-labelledby="evidence-title">
        <div>
          <p className="kicker">Why this check exists</p>
          <h2 id="evidence-title">Raw SQL does not enable RLS for you.</h2>
        </div>
        <div className="evidence-copy">
          <p>
            Supabase requires RLS on tables in exposed schemas and tells SQL
            users to enable it explicitly. Its live Security Advisor remains the
            authority after deployment.
          </p>
          <p>
            RLS Proof reviews the migration earlier and turns its policy
            inventory into a test you can keep. It does not connect to Supabase
            or certify the resulting authorization model.
          </p>
          <a
            href="https://supabase.com/docs/guides/database/postgres/row-level-security"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the Supabase RLS guidance
          </a>
        </div>
      </section>

      <section id="team" className="team shell" aria-labelledby="team-title">
        <div className="team-copy">
          <p className="kicker">Commercial hypothesis</p>
          <h2 id="team-title">
            Free for one migration. Team controls belong in CI.
          </h2>
          <p>
            The proposed Team tier adds repository batch scans, pull-request
            annotations, reviewed exceptions, and policy history. The price and
            demand are targets, not verified sales.
          </p>
        </div>
        <div className="price-docket">
          <span>TEAM / TARGET</span>
          <strong>$19</strong>
          <small>per team / month</small>
          <IntentLink
            className="button button-primary"
            event="team_interest"
            href={teamUrl}
          >
            {configuredTeamUrl
              ? "Open Team checkout"
              : "Request the Team pilot"}
          </IntentLink>
        </div>
      </section>

      <section
        id="limits"
        className="limits shell"
        aria-labelledby="limits-title"
      >
        <p className="kicker">Review boundary</p>
        <h2 id="limits-title">
          A clean static report is not a security proof.
        </h2>
        <div className="limit-grid">
          <p>
            <strong>Parsing is bounded.</strong> Dynamic SQL, generated
            migrations, and uncommon extensions can escape the implemented
            rules.
          </p>
          <p>
            <strong>Behavior needs a database.</strong> Test authenticated,
            anonymous, owner, and cross-tenant cases against disposable data.
          </p>
          <p>
            <strong>Advisor checks still matter.</strong> Run Supabase Security
            Advisor after deployment to inspect the actual catalog.
          </p>
        </div>
      </section>

      <footer className="site-footer shell">
        <div>
          <span>RLS Proof 0.1</span>
          <span>Browser-local SQL review</span>
        </div>
        <IntentLink
          event="feedback_intent"
          href={`mailto:${feedbackEmail}?subject=${encodeURIComponent("RLS Proof feedback")}`}
        >
          Send product feedback
        </IntentLink>
        <span className="built-by">
          Built by{" "}
          <a
            href="https://iamuvin.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uvin Vindula
          </a>
        </span>
      </footer>
    </main>
  );
}
