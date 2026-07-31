"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="route-error">
      <p className="kicker">Rendering stopped</p>
      <h1>The workbench could not open.</h1>
      <p>
        Your SQL was not sent anywhere. Reload the local interface and paste it
        again.
      </p>
      <button className="button button-primary" type="button" onClick={reset}>
        Reload the workbench
      </button>
    </main>
  );
}
