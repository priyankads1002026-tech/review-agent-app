import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory data store (mirrors the H2 in-memory DB from the original POC).
// Data resets every time the server restarts.
// ---------------------------------------------------------------------------
let claims = [];
let nextId = 1;

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// Validate + normalize the editable fields shared by POST and PUT. Returns
// { error } on failure, or { value } with a Number-coerced claimAmount and a
// string description on success. id/status/submittedDate are the caller's job.
function validateClaimInput(body) {
  const { patientName, policyNumber, claimAmount, description } = body || {};
  const amount = Number(claimAmount);
  if (
    typeof patientName !== "string" || patientName.trim() === "" ||
    typeof policyNumber !== "string" || policyNumber.trim() === "" ||
    !Number.isFinite(amount) || amount <= 0
  ) {
    return {
      error:
        "patientName and policyNumber must be non-empty strings and claimAmount must be a positive number",
    };
  }
  return {
    value: {
      patientName,
      policyNumber,
      claimAmount: amount,
      description: typeof description === "string" ? description : "",
    },
  };
}

// ---------------------------------------------------------------------------
// Routes  (base path: /api/claims)
// ---------------------------------------------------------------------------

// GET /api/claims  -> all claims
app.get("/api/claims", (req, res) => {
  res.json(claims);
});

// GET /api/claims/summary  -> aggregate stats across all claims
app.get("/api/claims/summary", (req, res) => {
  // Seed the known statuses to 0 so the response shape is stable and the
  // frontend never has to defensively handle a missing key.
  const byStatus = claims.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0 }
  );

  // NaN-safe: a non-numeric claimAmount (e.g. "1,000") must not poison the sum.
  const totalClaimAmount = claims.reduce((sum, c) => {
    const n = Number(c.claimAmount);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  res.json({
    total: claims.length,
    byStatus,
    totalClaimAmount,
  });
});

// GET /api/claims/status/:status  -> claims filtered by status
app.get("/api/claims/status/:status", (req, res) => {
  const status = req.params.status;
  res.json(claims.filter((c) => c.status === status));
});

// GET /api/claims/policy/:policyNumber  -> claims filtered by policy number
app.get("/api/claims/policy/:policyNumber", (req, res) => {
  const policyNumber = req.params.policyNumber;
  res.json(claims.filter((c) => c.policyNumber === policyNumber));
});

// GET /api/claims/:id  -> single claim (404 if not found)
app.get("/api/claims/:id", (req, res) => {
  const claim = claims.find((c) => c.id === Number(req.params.id));
  if (!claim) return res.status(404).send();
  res.json(claim);
});

// POST /api/claims  -> create a claim (status defaults to PENDING)
app.post("/api/claims", (req, res) => {
  const { error, value } = validateClaimInput(req.body);
  if (error) return res.status(400).json({ error });
  const claim = {
    id: nextId++,
    ...value,
    status: "PENDING",
    submittedDate: today(),
  };
  claims.push(claim);
  res.status(201).json(claim);
});

// PUT /api/claims/:id/status?status=APPROVED  -> update claim status
app.put("/api/claims/:id/status", (req, res) => {
  const claim = claims.find((c) => c.id === Number(req.params.id));
  if (!claim) {
    return res
      .status(404)
      .json({ error: `Claim not found with id: ${req.params.id}` });
  }
  claim.status = req.query.status;
  res.json(claim);
});

// PUT /api/claims/:id  -> update editable fields (id, status, submittedDate preserved)
app.put("/api/claims/:id", (req, res) => {
  const claim = claims.find((c) => c.id === Number(req.params.id));
  if (!claim) {
    return res
      .status(404)
      .json({ error: `Claim not found with id: ${req.params.id}` });
  }
  const { error, value } = validateClaimInput(req.body);
  if (error) return res.status(400).json({ error });
  // Assign only the validated fields; id, status, submittedDate stay untouched.
  Object.assign(claim, value);
  res.json(claim);
});

// DELETE /api/claims/:id  -> remove a claim (204 No Content)
app.delete("/api/claims/:id", (req, res) => {
  claims = claims.filter((c) => c.id !== Number(req.params.id));
  res.status(204).send();
});

// Skip binding a real port under the test runner so Supertest can drive `app`
// directly (in-process) without a port conflict.
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Claim Billing API running at http://localhost:${PORT}/api/claims`);
  });
}

export { app };
