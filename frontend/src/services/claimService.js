const BASE_URL = "http://localhost:8080/api/claims";

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

export const deleteClaim = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete claim");
};
