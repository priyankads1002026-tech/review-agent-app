// Shared sample Claim data for backend (Vitest + Supertest) and frontend
// (Vitest + React Testing Library) tests. Plain ESM (.mjs) so it loads the
// same way regardless of which package.json is nearest to the importer.
//
// Claim shape (see CLAUDE.md): { id, patientName, policyNumber, claimAmount,
// description, status, submittedDate }

export const pendingClaim = {
  id: 1,
  patientName: "Alice Johnson",
  policyNumber: "POL-1001",
  claimAmount: 250.5,
  description: "Routine dental cleaning",
  status: "PENDING",
  submittedDate: "2026-01-10",
};

export const approvedClaim = {
  id: 2,
  patientName: "Bob Singh",
  policyNumber: "POL-1002",
  claimAmount: 1200,
  description: "Physiotherapy session",
  status: "APPROVED",
  submittedDate: "2026-02-03",
};

export const rejectedClaim = {
  id: 3,
  patientName: "Chen Wei",
  policyNumber: "POL-1003",
  claimAmount: 75,
  description: "Over-the-counter medication",
  status: "REJECTED",
  submittedDate: "2026-02-20",
};

// Non-numeric claimAmount — used to exercise NaN-safety in totals/aggregation.
export const nonNumericAmountClaim = {
  id: 4,
  patientName: "Dana Ruiz",
  policyNumber: "POL-1004",
  claimAmount: "1,000",
  description: "Emergency room visit",
  status: "PENDING",
  submittedDate: "2026-03-01",
};

export const sampleClaims = [pendingClaim, approvedClaim, rejectedClaim];

// A valid payload for POST /api/claims (no id/status/submittedDate — server sets those).
export const newClaimPayload = {
  patientName: "Priya Nair",
  policyNumber: "POL-2001",
  claimAmount: 430,
  description: "Annual eye exam",
};
