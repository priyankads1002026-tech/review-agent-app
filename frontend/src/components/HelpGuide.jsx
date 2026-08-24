import React from "react";

// Static, presentational help tab. No props, no state, no API calls — it just
// documents the features that actually ship on this branch, reusing the existing
// card / typography / badge classes so it stays theme-aware for free.
function HelpGuide() {
  return (
    <div className="guide">
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="card__title">What is this app?</h2>
        <p className="card__subtitle">A quick tour of the Claim Billing Request System</p>
        <p>
          This is a proof-of-concept insurance <strong>claim billing</strong> demo:
          submit claims, review them, and watch a small dashboard update. Its real
          purpose is to give the AI PR-review agent realistic code to review — the
          app exists so there is something meaningful to open pull requests against.
        </p>
        <p>
          Data lives in memory on the backend (<code>http://localhost:8080</code>),
          so everything resets when the server restarts. Use the tabs above to move
          between the Dashboard, the claims list, and the submit form.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="card__title">Submit a new claim</h2>
        <p className="card__subtitle">The "Submit New Claim" tab</p>
        <ul>
          <li>
            <strong>Patient Name</strong>, <strong>Policy Number</strong> and{" "}
            <strong>Claim Amount</strong> are required (marked with{" "}
            <span className="req">*</span>); Description is optional.
          </li>
          <li>The amount must be greater than zero.</li>
          <li>
            New claims start as{" "}
            <span className="badge badge--pending">pending</span>. On success you
            are taken back to the claims list and the new row appears at the top.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="card__title">View, filter, search, sort &amp; paginate</h2>
        <p className="card__subtitle">The "View Claims" tab</p>
        <ul>
          <li>
            The table lists every claim with ID, patient, policy number, amount,{" "}
            <span className="badge badge--approved">approved</span> /{" "}
            <span className="badge badge--rejected">rejected</span> /{" "}
            <span className="badge badge--pending">pending</span> status, and
            submitted date. Stat tiles above it show live totals.
          </li>
          <li>
            <strong>Filter by Status</strong> with the dropdown, or{" "}
            <strong>search by Policy No.</strong> using the input plus its Search
            button. These hit the backend; the stat tiles reflect the active filter,
            not the full data set. Use <strong>Clear filters</strong> to reset.
          </li>
          <li>
            <strong>Search</strong> (the free-text box) narrows the loaded rows by
            patient name, policy number or description — this happens in the browser.
          </li>
          <li>
            <strong>Sort</strong> by clicking a column header (ID, Patient, Amount,
            Status, Submitted); click again to flip between ascending and descending.
          </li>
          <li>
            Long lists <strong>paginate</strong> — use Prev / Next when more than one
            page is available.
          </li>
          <li>
            Hit <strong>↻ Refresh</strong> to reload from the backend.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="card__title">Approve, reject, edit, view &amp; delete</h2>
        <p className="card__subtitle">Row actions in the claims table</p>
        <ul>
          <li>
            <strong>View</strong> (or clicking the <code>#id</code>) opens a detail
            drawer with the full claim, including its description.
          </li>
          <li>
            <strong>Approve</strong> / <strong>Reject</strong> set the claim's
            status. The matching button is disabled when the claim is already in that
            state.
          </li>
          <li>
            <strong>Edit</strong> opens a modal to change the claim's fields and save.
          </li>
          <li>
            <strong>Delete</strong> removes the claim after a confirmation prompt —
            this cannot be undone.
          </li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="card__title">Dashboard summary</h2>
        <p className="card__subtitle">The "Dashboard" tab</p>
        <p>
          The Dashboard shows aggregate totals — total claims, counts by status, and
          the summed claim amount. These numbers are computed on the server (via{" "}
          <code>/api/claims/summary</code>), which is different from the client-side
          tallies shown on the claims list. Use <strong>↻ Refresh</strong> to
          recompute after making changes.
        </p>
      </div>

      <div className="card">
        <h2 className="card__title">Light / dark theme</h2>
        <p className="card__subtitle">The toggle in the header</p>
        <p>
          Use the <strong>🌙 Dark</strong> / <strong>☀️ Light</strong> button in the
          top-right to switch themes. Your choice is saved in the browser
          (localStorage), so it sticks between visits. On the very first visit the app
          follows your operating system's preference.
        </p>
      </div>
    </div>
  );
}

export default HelpGuide;
