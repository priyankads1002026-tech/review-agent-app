import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchOccupationAnalytics } from "../services/claimService";

// Self-contained money() — matches the per-file duplication already in
// ClaimList/ClaimSummary/ClaimDetail rather than extracting a shared helper.
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0
  );

// Analytics dashboard: how insurance claims break down across people's
// occupations. Consumes GET /api/claims/analytics/occupation (server-computed)
// and renders a ranked table with a proportional bar per occupation.
function ClaimAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOccupationAnalytics();
      setData(result);
    } catch (err) {
      setError(t("analytics.error"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="state">
          <div className="spinner" />
          <p>{t("analytics.loading")}</p>
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

  const rows = data?.byOccupation || [];
  // Largest count drives the bar scale so the busiest occupation fills the bar.
  const maxCount = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  return (
    <>
      <div className="list-header">
        <div>
          <h2 className="card__title">{t("analytics.title")}</h2>
          <p className="card__subtitle" style={{ marginBottom: 0 }}>
            {t("analytics.subtitle")}
          </p>
        </div>
        <button className="btn btn--ghost" onClick={loadAnalytics}>
          {t("actions.refresh")}
        </button>
      </div>

      <div className="stats">
        <div className="stat stat--total">
          <div className="stat__label">{t("analytics.totalClaims")}</div>
          <div className="stat__value">{data?.total ?? 0}</div>
        </div>
        <div className="stat stat--approved">
          <div className="stat__label">{t("analytics.totalAmount")}</div>
          <div className="stat__value">{money(data?.totalClaimAmount)}</div>
        </div>
        <div className="stat stat--pending">
          <div className="stat__label">{t("analytics.occupations")}</div>
          <div className="stat__value">{rows.length}</div>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="state">
            <div className="state__emoji">📊</div>
            <h3>{t("analytics.emptyTitle")}</h3>
            <p>{t("analytics.emptyHelp")}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="claims">
              <thead>
                <tr>
                  <th>{t("fields.occupation")}</th>
                  <th>{t("analytics.colClaims")}</th>
                  <th>{t("analytics.colTotal")}</th>
                  <th>{t("analytics.colShare")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.occupation}>
                    <td>{r.occupation}</td>
                    <td className="cell-amount">{r.count}</td>
                    <td className="cell-amount">{money(r.totalClaimAmount)}</td>
                    <td>
                      {/* Proportional bar — width relative to the busiest occupation. */}
                      <div
                        aria-hidden="true"
                        style={{
                          height: 10,
                          borderRadius: 999,
                          background: "var(--brand-600)",
                          width: `${Math.round((r.count / maxCount) * 100)}%`,
                          minWidth: 6,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default ClaimAnalytics;
