import React, { useEffect, useState } from "react";
import {
  fetchClaims,
  fetchClaimsByStatus,
  fetchClaimsByPolicy,
  updateClaimStatus,
  deleteClaim,
} from "../services/claimService";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0
  );

function StatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  return <span className={`badge badge--${key}`}>{key || "unknown"}</span>;
}

function ClaimList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // row currently being updated/deleted
  // Active filter drives which endpoint loadClaims() hits: all / by status / by policy.
  const [filter, setFilter] = useState({ type: "all", value: "" });
  const [policyInput, setPolicyInput] = useState("");

  useEffect(() => {
    loadClaims();
  }, [filter]);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (filter.type === "status") {
        data = await fetchClaimsByStatus(filter.value);
      } else if (filter.type === "policy") {
        data = await fetchClaimsByPolicy(filter.value);
      } else {
        data = await fetchClaims();
      }
      setClaims(data);
    } catch (err) {
      // A TypeError from fetch means the backend was unreachable; anything else
      // (a non-2xx response) means the server was reached but rejected the request.
      const unreachable = err instanceof TypeError;
      setError(
        unreachable
          ? "Could not reach the backend API. Make sure it is running at http://localhost:8080."
          : "The request failed on the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setBusyId(id);
    setError(null);
    try {
      await updateClaimStatus(id, status);
      await loadClaims();
    } catch (err) {
      setError("Failed to update status. Is the backend running?");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this claim? This cannot be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteClaim(id);
      await loadClaims();
    } catch (err) {
      setError("Failed to delete claim. Is the backend running?");
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusFilter = (value) => {
    setPolicyInput("");
    setFilter(value ? { type: "status", value } : { type: "all", value: "" });
  };

  const handlePolicySearch = (e) => {
    e.preventDefault();
    const value = policyInput.trim();
    setFilter(value ? { type: "policy", value } : { type: "all", value: "" });
  };

  const clearFilters = () => {
    setPolicyInput("");
    setFilter({ type: "all", value: "" });
  };

  // ---- summary stats ----
  const count = (s) => claims.filter((c) => c.status === s).length;
  const totalAmount = claims.reduce((sum, c) => sum + (Number(c.claimAmount) || 0), 0);

  // Human-readable description of the active filter (null when showing all).
  const filterLabel =
    filter.type === "status"
      ? `status "${filter.value}"`
      : filter.type === "policy"
      ? `policy "${filter.value}"`
      : null;

  if (loading) {
    return (
      <div className="card">
        <div className="state">
          <div className="spinner" />
          <p>Loading claims…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="stats">
        <div className="stat stat--total">
          <div className="stat__label">Total Claims</div>
          <div className="stat__value">{claims.length}</div>
        </div>
        <div className="stat stat--pending">
          <div className="stat__label">Pending</div>
          <div className="stat__value">{count("PENDING")}</div>
        </div>
        <div className="stat stat--approved">
          <div className="stat__label">Approved</div>
          <div className="stat__value">{count("APPROVED")}</div>
        </div>
        <div className="stat stat--rejected">
          <div className="stat__label">Rejected</div>
          <div className="stat__value">{count("REJECTED")}</div>
        </div>
        <div className="stat stat--total">
          <div className="stat__label">Total Amount</div>
          <div className="stat__value">{money(totalAmount)}</div>
        </div>
      </div>

      {filterLabel && (
        <p className="filter-note">
          Showing {claims.length} result{claims.length === 1 ? "" : "s"} for{" "}
          {filterLabel} — the stats above reflect this filter, not all claims.
        </p>
      )}

      <div className="card">
        <div className="list-header">
          <div>
            <h2 className="card__title">All Claims</h2>
            <p className="card__subtitle">Review, approve, reject or remove claims</p>
          </div>
          <button className="btn btn--ghost" onClick={loadClaims}>
            ↻ Refresh
          </button>
        </div>

        <div className="filter-bar">
          <label className="filter-field">
            <span className="filter-field__label">Status</span>
            <select
              value={filter.type === "status" ? filter.value : ""}
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <form className="filter-field" onSubmit={handlePolicySearch}>
            <span className="filter-field__label">Policy No.</span>
            <div className="filter-field__row">
              <input
                type="text"
                placeholder="e.g. POL-1001"
                value={policyInput}
                onChange={(e) => setPolicyInput(e.target.value)}
              />
              <button type="submit" className="btn btn--sm">
                Search
              </button>
            </div>
          </form>

          {filter.type !== "all" && (
            <button className="btn btn--sm btn--ghost" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {claims.length === 0 ? (
          filterLabel ? (
            <div className="state">
              <div className="state__emoji">🔍</div>
              <h3>No claims match {filterLabel}</h3>
              <p>Try a different filter, or clear it to see all claims.</p>
              <button
                className="btn btn--sm btn--ghost"
                onClick={clearFilters}
                style={{ marginTop: 12 }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="state">
              <div className="state__emoji">📭</div>
              <h3>No claims yet</h3>
              <p>Submit a new claim to get started.</p>
            </div>
          )
        ) : (
          <div className="table-wrap">
            <table className="claims">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient Name</th>
                  <th>Policy No.</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="cell-muted">#{claim.id}</td>
                    <td>{claim.patientName}</td>
                    <td className="cell-muted">{claim.policyNumber}</td>
                    <td className="cell-amount">{money(claim.claimAmount)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td className="cell-muted">{claim.submittedDate}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn--sm btn--approve"
                          disabled={busyId === claim.id || claim.status === "APPROVED"}
                          onClick={() => handleStatusUpdate(claim.id, "APPROVED")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn--sm btn--reject"
                          disabled={busyId === claim.id || claim.status === "REJECTED"}
                          onClick={() => handleStatusUpdate(claim.id, "REJECTED")}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn--sm btn--delete"
                          disabled={busyId === claim.id}
                          onClick={() => handleDelete(claim.id)}
                        >
                          Delete
                        </button>
                      </div>
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

export default ClaimList;
