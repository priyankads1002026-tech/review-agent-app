import React, { useEffect, useState } from "react";
import { fetchClaims, updateClaimStatus, deleteClaim } from "../services/claimService";

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

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (err) {
      setError(
        "Could not reach the backend API. Make sure it is running at http://localhost:8080."
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

  // ---- summary stats ----
  const count = (s) => claims.filter((c) => c.status === s).length;
  const totalAmount = claims.reduce((sum, c) => sum + (Number(c.claimAmount) || 0), 0);

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

        {claims.length === 0 ? (
          <div className="state">
            <div className="state__emoji">📭</div>
            <h3>No claims yet</h3>
            <p>Submit a new claim to get started.</p>
          </div>
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
