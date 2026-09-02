// Single source of truth for the API base URL. Override at build/dev time with
// VITE_API_BASE_URL (see .env.example); defaults to the local backend on :8008.
// Keep this port in sync with the backend's PORT (backend/server.js).
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8008/api/claims";

export const fetchClaims = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Failed to fetch claims");
  return response.json();
};

export const fetchClaimSummary = async () => {
  const response = await fetch(`${BASE_URL}/summary`);
  if (!response.ok) throw new Error("Failed to fetch claim summary");
  return response.json();
};

export const fetchOccupationAnalytics = async () => {
  const response = await fetch(`${BASE_URL}/analytics/occupation`);
  if (!response.ok) throw new Error("Failed to fetch occupation analytics");
  return response.json();
};

export const fetchClaimsByStatus = async (status) => {
  const response = await fetch(`${BASE_URL}/status/${encodeURIComponent(status)}`);
  if (!response.ok) throw new Error("Failed to fetch claims by status");
  return response.json();
};

export const fetchClaimsByPolicy = async (policyNumber) => {
  const response = await fetch(
    `${BASE_URL}/policy/${encodeURIComponent(policyNumber)}`
  );
  if (!response.ok) throw new Error("Failed to fetch claims by policy");
  return response.json();
};

export const fetchClaimById = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) throw new Error("Claim not found");
  return response.json();
};

export const createClaim = async (claim) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claim),
  });
  if (!response.ok) throw new Error("Failed to create claim");
  return response.json();
};

export const updateClaimStatus = async (id, status) => {
  const response = await fetch(`${BASE_URL}/${id}/status?status=${status}`, {
    method: "PUT",
  });
  if (!response.ok) throw new Error("Failed to update claim status");
  return response.json();
};

export const updateClaim = async (id, claim) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(claim),
  });
  if (!response.ok) throw new Error("Failed to update claim");
  return response.json();
};

export const deleteClaim = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete claim");
};
