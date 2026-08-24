import React, { useEffect, useMemo, useState } from "react";
import {
  fetchClaims,
  fetchClaimsByStatus,
  fetchClaimsByPolicy,
  updateClaimStatus,
  deleteClaim,
} from "../services/claimService";
import EditClaimModal from "./EditClaimModal";
import ClaimDetail from "./ClaimDetail";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED"];

const PAGE_SIZE = 8; // rows per page for client-side pagination

// Sortable columns and how to read their value off a claim. Numeric keys are
// coerced with Number() (backend does no validation on claimAmount); date/string
// keys sort lexically — fine for ISO YYYY-MM-DD dates.
const SORT_ACCESSORS = {
  id: (c) => Number(c.id) || 0,
  patientName: (c) => (c.patientName || "").toLowerCase(),
  claimAmount: (c) => Number(c.claimAmount) || 0,
  status: (c) => (c.status || "").toLowerCase(),
  submittedDate: (c) => c.submittedDate || "",
};

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n) || 0
  );

function StatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  return <span className={`badge badge--${key}`}>{key || "unknown"}</span>;
}

// Clickable, keyboard-focusable column header. Shows a ▲/▼ indicator when it is
// the active sort column.
function SortableTh({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  return (
    <th
      className={`sortable${active ? " sortable--active" : ""}`}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className="sortable__btn" onClick={() => onSort(sortKey)}>
        {label}
        <span className="sortable__ind">{active ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}

function ClaimList() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // row currently being updated/deleted
  const [editing, setEditing] = useState(null); // claim being edited, or null
  const [detailId, setDetailId] = useState(null); // claim id shown in the detail drawer, or null
  // Active filter drives which endpoint loadClaims() hits: all / by status / by policy.
  const [filter, setFilter] = useState({ type: "all", value: "" });
  const [policyInput, setPolicyInput] = useState("");
  // Client-side view controls — operate over whatever loadClaims() returned.
  const [search, setSearch] = useState(""); // free-text narrowing
  const [sort, setSort] = useState({ key: "id", dir: "asc" }); // active column + direction
  const [page, setPage] = useState(1); // 1-based current page

  useEffect(() => {
    loadClaims();
  }, [filter]);

  // Any change to the search text or the backend filter should return to page 1
  // so we never sit on a now-out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

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

  // ---- client-side search + sort pipeline (memoized over loaded claims) ----
  const searchedSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    // 1) case-insensitive substring match on the three text fields
    const matched = q
      ? claims.filter((c) =>
          [c.patientName, c.policyNumber, c.description]
            .some((v) => (v || "").toLowerCase().includes(q))
        )
      : claims;

    // 2) stable-ish sort by the active column/direction
    const accessor = SORT_ACCESSORS[sort.key] || SORT_ACCESSORS.id;
    const factor = sort.dir === "desc" ? -1 : 1;
    return [...matched].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
  }, [claims, search, sort]);

  // ---- pagination (clamp page so deletes/narrowing can't strand us past the end) ----
  const totalPages = Math.max(1, Math.ceil(searchedSorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = searchedSorted.slice(pageStart, pageStart + PAGE_SIZE);

  // Set the sort column, or toggle asc/desc when clicking the active one.
  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

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
            <span className="filter-field__label">Search</span>
            <input
              type="text"
              placeholder="Name, policy or description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

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
                  <SortableTh label="ID" sortKey="id" sort={sort} onSort={toggleSort} />
                  <SortableTh
                    label="Patient Name"
                    sortKey="patientName"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>Policy No.</th>
                  <SortableTh
                    label="Amount"
                    sortKey="claimAmount"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label="Submitted"
                    sortKey="submittedDate"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="state">
                        <div className="state__emoji">🔍</div>
                        <h3>No claims match “{search.trim()}”</h3>
                        <p>Try a different search term.</p>
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => setSearch("")}
                          style={{ marginTop: 12 }}
                        >
                          Clear search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((claim) => (
                  <tr key={claim.id}>
                    <td className="cell-muted">
                      <button
                        className="link-id"
                        onClick={() => setDetailId(claim.id)}
                        title="View claim details"
                      >
                        #{claim.id}
                      </button>
                    </td>
                    <td>{claim.patientName}</td>
                    <td className="cell-muted">{claim.policyNumber}</td>
                    <td className="cell-amount">{money(claim.claimAmount)}</td>
                    <td><StatusBadge status={claim.status} /></td>
                    <td className="cell-muted">{claim.submittedDate}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => setDetailId(claim.id)}
                        >
                          View
                        </button>
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
                          className="btn btn--sm btn--edit"
                          disabled={busyId === claim.id}
                          onClick={() => setEditing(claim)}
                        >
                          Edit
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
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination__info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn--sm btn--ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <button
                  className="btn btn--sm btn--ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {detailId != null && (
        <ClaimDetail claimId={detailId} onClose={() => setDetailId(null)} />
      )}

      {editing && (
        <EditClaimModal
          claim={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadClaims();
          }}
        />
      )}
    </>
  );
}

export default ClaimList;
