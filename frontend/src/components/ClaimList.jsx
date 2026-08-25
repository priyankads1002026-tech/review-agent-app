import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const key = (status || "").toLowerCase();
  return (
    <span className={`badge badge--${key}`}>
      {key ? t(`status.${key}`) : t("status.unknown")}
    </span>
  );
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

function ClaimList({ onChanged = () => {} }) {
  const { t } = useTranslation();
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
      setError(unreachable ? t("list.errors.unreachable") : t("list.errors.server"));
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
      onChanged();
    } catch (err) {
      setError(t("list.errors.update"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("list.deleteConfirm"))) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteClaim(id);
      await loadClaims();
      onChanged();
    } catch (err) {
      setError(t("list.errors.delete"));
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
      ? t("list.filterStatus", { value: filter.value })
      : filter.type === "policy"
      ? t("list.filterPolicy", { value: filter.value })
      : null;

  if (loading) {
    return (
      <div className="card">
        <div className="state">
          <div className="spinner" />
          <p>{t("list.loading")}</p>
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
          <div className="stat__label">{t("list.stats.total")}</div>
          <div className="stat__value">{claims.length}</div>
        </div>
        <div className="stat stat--pending">
          <div className="stat__label">{t("list.stats.pending")}</div>
          <div className="stat__value">{count("PENDING")}</div>
        </div>
        <div className="stat stat--approved">
          <div className="stat__label">{t("list.stats.approved")}</div>
          <div className="stat__value">{count("APPROVED")}</div>
        </div>
        <div className="stat stat--rejected">
          <div className="stat__label">{t("list.stats.rejected")}</div>
          <div className="stat__value">{count("REJECTED")}</div>
        </div>
        <div className="stat stat--total">
          <div className="stat__label">{t("list.stats.totalAmount")}</div>
          <div className="stat__value">{money(totalAmount)}</div>
        </div>
      </div>

      {filterLabel && (
        <p className="filter-note">
          {t("list.filterNote", { count: claims.length, label: filterLabel })}
        </p>
      )}

      <div className="card">
        <div className="list-header">
          <div>
            <h2 className="card__title">{t("list.title")}</h2>
            <p className="card__subtitle">{t("list.subtitle")}</p>
          </div>
          <button className="btn btn--ghost" onClick={loadClaims}>
            {t("actions.refresh")}
          </button>
        </div>

        <div className="filter-bar">
          <label className="filter-field">
            <span className="filter-field__label">{t("list.searchLabel")}</span>
            <input
              type="text"
              placeholder={t("list.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className="filter-field">
            <span className="filter-field__label">{t("list.statusLabel")}</span>
            <select
              value={filter.type === "status" ? filter.value : ""}
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <option value="">{t("status.all")}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </label>

          <form className="filter-field" onSubmit={handlePolicySearch}>
            <span className="filter-field__label">{t("list.policyLabel")}</span>
            <div className="filter-field__row">
              <input
                type="text"
                placeholder={t("list.policyPlaceholder")}
                value={policyInput}
                onChange={(e) => setPolicyInput(e.target.value)}
              />
              <button type="submit" className="btn btn--sm">
                {t("actions.search")}
              </button>
            </div>
          </form>

          {filter.type !== "all" && (
            <button className="btn btn--sm btn--ghost" onClick={clearFilters}>
              {t("actions.clearFilters")}
            </button>
          )}
        </div>

        {claims.length === 0 ? (
          filterLabel ? (
            <div className="state">
              <div className="state__emoji">🔍</div>
              <h3>{t("list.noMatchFilterTitle", { label: filterLabel })}</h3>
              <p>{t("list.noMatchFilterHelp")}</p>
              <button
                className="btn btn--sm btn--ghost"
                onClick={clearFilters}
                style={{ marginTop: 12 }}
              >
                {t("actions.clearFilters")}
              </button>
            </div>
          ) : (
            <div className="state">
              <div className="state__emoji">📭</div>
              <h3>{t("list.noClaimsTitle")}</h3>
              <p>{t("list.noClaimsHelp")}</p>
            </div>
          )
        ) : (
          <div className="table-wrap">
            <table className="claims">
              <thead>
                <tr>
                  <SortableTh label={t("fields.id")} sortKey="id" sort={sort} onSort={toggleSort} />
                  <SortableTh
                    label={t("fields.patientName")}
                    sortKey="patientName"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>{t("fields.policyNo")}</th>
                  <SortableTh
                    label={t("fields.amount")}
                    sortKey="claimAmount"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label={t("fields.status")}
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <SortableTh
                    label={t("fields.submitted")}
                    sortKey="submittedDate"
                    sort={sort}
                    onSort={toggleSort}
                  />
                  <th>{t("fields.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="state">
                        <div className="state__emoji">🔍</div>
                        <h3>{t("list.noSearchTitle", { term: search.trim() })}</h3>
                        <p>{t("list.noSearchHelp")}</p>
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => setSearch("")}
                          style={{ marginTop: 12 }}
                        >
                          {t("actions.clearSearch")}
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
                        title={t("list.viewDetails")}
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
                          {t("actions.view")}
                        </button>
                        <button
                          className="btn btn--sm btn--approve"
                          disabled={busyId === claim.id || claim.status === "APPROVED"}
                          onClick={() => handleStatusUpdate(claim.id, "APPROVED")}
                        >
                          {t("actions.approve")}
                        </button>
                        <button
                          className="btn btn--sm btn--reject"
                          disabled={busyId === claim.id || claim.status === "REJECTED"}
                          onClick={() => handleStatusUpdate(claim.id, "REJECTED")}
                        >
                          {t("actions.reject")}
                        </button>
                        <button
                          className="btn btn--sm btn--edit"
                          disabled={busyId === claim.id}
                          onClick={() => setEditing(claim)}
                        >
                          {t("actions.edit")}
                        </button>
                        <button
                          className="btn btn--sm btn--delete"
                          disabled={busyId === claim.id}
                          onClick={() => handleDelete(claim.id)}
                        >
                          {t("actions.delete")}
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
                  {t("list.pageInfo", { current: currentPage, total: totalPages })}
                </span>
                <button
                  className="btn btn--sm btn--ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t("actions.prev")}
                </button>
                <button
                  className="btn btn--sm btn--ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("actions.next")}
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
            onChanged();
          }}
        />
      )}
    </>
  );
}

export default ClaimList;
