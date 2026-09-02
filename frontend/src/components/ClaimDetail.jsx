import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchClaimById } from "../services/claimService";

// Self-contained money()/StatusBadge — matches the per-file duplication already
// in ClaimList/ClaimSummary rather than extracting a shared helper (keeps the
// diff small and avoids colliding with the dashboard/filter work on this branch).
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0
  );

// The status value stays canonical (PENDING/APPROVED/REJECTED) for the badge
// class; only its visible label is translated via the status.* keys.
function StatusBadge({ status }) {
  const { t } = useTranslation();
  const key = (status || "").toLowerCase();
  return (
    <span className={`badge badge--${key}`}>
      {key ? t(`status.${key}`) : t("status.unknown")}
    </span>
  );
}

// Slide-in drawer showing every field of a single claim. Owns its own
// loading/error/claim state (like ClaimSummary) and fetches on mount / claimId
// change via GET /api/claims/:id. onClose is fired by the header ✕, backdrop
// click and Escape key.
function ClaimDetail({ claimId, onClose }) {
  const { t } = useTranslation();
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
        if (active) setError(t("detail.error"));
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
        aria-label={t("detail.ariaLabel")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer__header">
          <h2 className="card__title">
            {claim ? t("detail.titleWithId", { id: claim.id }) : t("detail.title")}
          </h2>
          <button
            className="btn btn--ghost drawer__close"
            onClick={onClose}
            aria-label={t("actions.close")}
          >
            ✕
          </button>
        </div>

        <div className="drawer__body">
          {loading ? (
            <div className="state">
              <div className="spinner" />
              <p>{t("detail.loading")}</p>
            </div>
          ) : error ? (
            <div className="alert alert--error">
              <span className="alert__icon">⚠️</span>
              <span>{error}</span>
            </div>
          ) : (
            <dl className="detail-list">
              <div className="detail-row">
                <dt className="detail-row__label">{t("detail.claimId")}</dt>
                <dd className="detail-row__value">#{claim.id}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">{t("fields.patientName")}</dt>
                <dd className="detail-row__value">{claim.patientName}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">{t("fields.policyNo")}</dt>
                <dd className="detail-row__value">{claim.policyNumber}</dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">{t("fields.amount")}</dt>
                <dd className="detail-row__value cell-amount">
                  {money(claim.claimAmount)}
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">{t("fields.occupation")}</dt>
                <dd className="detail-row__value">
                  {claim.occupation || (
                    <span className="cell-muted">{t("status.unknown")}</span>
                  )}
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">{t("fields.status")}</dt>
                <dd className="detail-row__value">
                  <StatusBadge status={claim.status} />
                </dd>
              </div>
              <div className="detail-row">
                <dt className="detail-row__label">{t("fields.submitted")}</dt>
                <dd className="detail-row__value">{claim.submittedDate}</dd>
              </div>
              <div className="detail-row detail-row--stacked">
                <dt className="detail-row__label">{t("fields.description")}</dt>
                <dd className="detail-row__value">
                  {claim.description ? (
                    claim.description
                  ) : (
                    <span className="cell-muted">{t("detail.noDescription")}</span>
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
