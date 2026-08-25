import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchClaimSummary } from "../services/claimService";

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0
  );

// Server-computed summary (GET /api/claims/summary). Distinct from the client-side
// tallies in ClaimList — this proves the aggregate endpoint end-to-end.
function ClaimSummary() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClaimSummary();
      setSummary(data);
    } catch (err) {
      setError(t("summary.error"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="state">
          <div className="spinner" />
          <p>{t("summary.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert--error">
        <span className="alert__icon">⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  const byStatus = summary?.byStatus || {};

  return (
    <>
      <div className="list-header">
        <div>
          <h2 className="card__title">{t("summary.title")}</h2>
          <p className="card__subtitle" style={{ marginBottom: 0 }}>
            {t("summary.subtitle")}
          </p>
        </div>
        <button className="btn btn--ghost" onClick={loadSummary}>
          {t("actions.refresh")}
        </button>
      </div>

      <div className="stats">
        <div className="stat stat--total">
          <div className="stat__label">{t("list.stats.total")}</div>
          <div className="stat__value">{summary?.total ?? 0}</div>
        </div>
        <div className="stat stat--pending">
          <div className="stat__label">{t("list.stats.pending")}</div>
          <div className="stat__value">{byStatus.PENDING ?? 0}</div>
        </div>
        <div className="stat stat--approved">
          <div className="stat__label">{t("list.stats.approved")}</div>
          <div className="stat__value">{byStatus.APPROVED ?? 0}</div>
        </div>
        <div className="stat stat--rejected">
          <div className="stat__label">{t("list.stats.rejected")}</div>
          <div className="stat__value">{byStatus.REJECTED ?? 0}</div>
        </div>
        <div className="stat stat--total">
          <div className="stat__label">{t("list.stats.totalAmount")}</div>
          <div className="stat__value">{money(summary?.totalClaimAmount)}</div>
        </div>
      </div>
    </>
  );
}

export default ClaimSummary;
