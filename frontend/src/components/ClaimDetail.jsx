import React, { useEffect, useState } from "react";
import { fetchClaimById } from "../services/claimService";

// Self-contained money()/StatusBadge — matches the per-file duplication already
// in ClaimList/ClaimSummary rather than extracting a shared helper (keeps the
// diff small and avoids colliding with the dashboard/filter work on this branch).
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0
  );

function StatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  return <span className={`badge badge--${key}`}>{key || "unknown"}</span>;
}

// Slide-in drawer showing every field of a single claim. Owns its own
// loading/error/claim state (like ClaimSummary) and fetches on mount / claimId
// change via GET /api/claims/:id. onClose is fired by the header ✕, backdrop
// click and Escape key.
function ClaimDetail({ claimId, onClose }) {
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true; // guard against a stale fetch resolving after unmount/id change
    setLoading(true);
    setError(null);
    fetchClaimById(claimId)
      .then((data) => {
        if (active) setClaim(data);
      })
      .catch(() => {
        if (active) setError("Could not load this claim. It may have been deleted.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [claimId]);

  // Escape-to-close + lock background scroll while the drawer is open.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    // Clicking the scrim closes; clicks inside the drawer are stopped so they
    // don't bubble up to the overlay handler.
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Claim details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer__header">
          <h2 className="card__title">
            {claim ? `Claim #${claim.id}` : "Claim details"}
          </h2>
          <button
            className="btn btn--ghost drawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="drawer__body">
          {loading ? (
            <div className="state">
              <div className="spinner" />
              <p>Loading claim…</p>
            </div>
          ) : error ? (
            <div className="alert alert--error">
              <span className="alert__icon">⚠️</span>
              <span>{error}</span>
            </div>
          ) : (
            <dl className="detail-list">
              <div className="detail-row">
                <dt className="detail-row__label">Claim ID</dt>
                <dd className="detail-row__value">#{claim.id}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">Patient Name</dt>
                <dd className="detail-row__value">{claim.patientName}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">Policy No.</dt>
                <dd className="detail-row__value">{claim.policyNumber}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">Amount</dt>
                <dd className="detail-row__value cell-amount">
                  {money(claim.claimAmount)}
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">Status</dt>
                <dd className="detail-row__value">
                  <StatusBadge status={claim.status} />
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">Submitted</dt>
                <dd className="detail-row__value">{claim.submittedDate}</dd>
              </div>
              <div className="detail-row detail-row--stacked">
                <dt className="detail-row__label">Description</dt>
                <dd className="detail-row__value">
                  {claim.description ? (
                    claim.description
                  ) : (
                    <span className="cell-muted">No description provided</span>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </aside>
    </div>
  );
}

export default ClaimDetail;
