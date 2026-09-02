import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8008;

// CORS_ORIGIN is the FRONTEND's origin (who may call this API) — the Vite dev
// server on :3000 — NOT this backend's port. Don't change it to match PORT.
// Override via env if the frontend is served from somewhere else.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory data store (mirrors the H2 in-memory DB from the original POC).
// Data resets every time the server restarts.
// ---------------------------------------------------------------------------
let claims = [];
let nextId = 1;

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// The only statuses a claim may hold. Used to validate PUT .../status so a
// stray value can't land in the store and desync the summary buckets.
const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

// Reasonable upper bounds so a claim can't store an unbounded blob in the
// in-memory store (and to keep the UI/table sane).
const MAX_NAME_LEN = 120;
const MAX_POLICY_LEN = 60;
const MAX_DESCRIPTION_LEN = 1000;
const MAX_OCCUPATION_LEN = 80;

// Validate + normalize the editable fields shared by POST and PUT. Returns
// { error } on failure, or { value } with trimmed strings and a Number-coerced
// claimAmount on success. id/status/submittedDate are the caller's job.
// occupation is optional — it defaults to "Unknown" so the analytics grouping
// always has a bucket to file a claim under.
function validateClaimInput(body) {
  const { patientName, policyNumber, claimAmount, description, occupation } = body || {};
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
  // Trim before storing so leading/trailing whitespace can't create near-duplicate
  // names/policies or bypass the non-empty check above.
  const name = patientName.trim();
  const policy = policyNumber.trim();
  const desc = typeof description === "string" ? description.trim() : "";
  const occ =
    typeof occupation === "string" && occupation.trim() !== ""
      ? occupation.trim()
      : "Unknown";
  if (
    name.length > MAX_NAME_LEN ||
    policy.length > MAX_POLICY_LEN ||
    desc.length > MAX_DESCRIPTION_LEN ||
    occ.length > MAX_OCCUPATION_LEN
  ) {
    return {
      error: `patientName (max ${MAX_NAME_LEN}), policyNumber (max ${MAX_POLICY_LEN}), description (max ${MAX_DESCRIPTION_LEN}) and occupation (max ${MAX_OCCUPATION_LEN}) must be within their length limits`,
    };
  }
  return {
    value: {
      patientName: name,
      policyNumber: policy,
      claimAmount: amount,
      description: desc,
      occupation: occ,
    },
  };
}

// Seed the store with mock claims that are all "under review" (PENDING), spread
// across a range of occupations so the app — and the occupation analytics — have
// realistic data on a fresh start. Skipped under the test runner so Supertest
// suites keep starting from a clean, empty store.
function seedPendingClaims() {
  const firstNames = [
    "Alice", "Bob", "Chen", "Dana", "Eli", "Farah", "Grace", "Hugo", "Ivan",
    "Julia", "Kofi", "Lena", "Marco", "Nina", "Omar", "Priya", "Quinn", "Ravi",
    "Sara", "Tom", "Uma", "Victor", "Wendy", "Xavier", "Yara", "Zane",
  ];
  const lastNames = [
    "Johnson", "Singh", "Wei", "Ruiz", "Cohen", "Khan", "Miller", "Alvarez",
    "Petrov", "Santos", "Mensah", "Novak", "Rossi", "Haddad", "Nakamura",
    "Nair", "Bailey", "Kumar", "Lopez", "Clark",
  ];
  // [occupation, howMany] — uneven counts so the analytics ranking is meaningful.
  const buckets = [
    ["Software Engineer", 8],
    ["Nurse", 7],
    ["Teacher", 6],
    ["Driver", 6],
    ["Chef", 5],
    ["Accountant", 5],
    ["Doctor", 4],
    ["Farmer", 4],
  ]; // total = 45

  let i = 0;
  for (const [occupation, count] of buckets) {
    for (let k = 0; k < count; k++) {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[(i * 7) % lastNames.length];
      // Deterministic but varied amount (~150–2150) so occupation totals differ.
      const claimAmount = 150 + ((i * 137 + k * 61) % 2000);
      const d = new Date();
      d.setDate(d.getDate() - (i % 30));
      claims.push({
        id: nextId++,
        patientName: `${first} ${last}`,
        policyNumber: `POL-${2000 + i}`,
        claimAmount,
        description: `Pending review — ${occupation.toLowerCase()} claim`,
        occupation,
        status: "PENDING",
        submittedDate: d.toISOString().slice(0, 10),
      });
      i++;
    }
  }
}

// ---------------------------------------------------------------------------
// Routes  (base path: /api/claims)
// ---------------------------------------------------------------------------

// GET /api/claims  -> all claims
app.get("/api/claims", (req, res) => {
  res.json(claims);
});

// ROUTE ORDERING (do not reorder): the literal paths /summary and /status/:status
// MUST be registered before the parameterized /:id route, otherwise Express would
// match "summary"/"status" as an :id. server.test.js has a regression test that
// asserts /summary returns the aggregate shape and is never treated as an id lookup.

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

// GET /api/claims/analytics/occupation  -> claim counts + amount totals grouped
// by occupation (for the Analytics dashboard). Literal path, so it stays ahead
// of /:id per the route-ordering rule above.
app.get("/api/claims/analytics/occupation", (req, res) => {
  const map = new Map();
  for (const c of claims) {
    const key = (c.occupation && String(c.occupation).trim()) || "Unknown";
    const entry = map.get(key) || { occupation: key, count: 0, totalClaimAmount: 0 };
    entry.count += 1;
    const n = Number(c.claimAmount);
    entry.totalClaimAmount += Number.isFinite(n) ? n : 0; // NaN-safe
    map.set(key, entry);
  }
  // Busiest occupations first: by count, then by total amount as a tiebreaker.
  const byOccupation = [...map.values()].sort(
    (a, b) => b.count - a.count || b.totalClaimAmount - a.totalClaimAmount
  );
  const totalClaimAmount = byOccupation.reduce((s, o) => s + o.totalClaimAmount, 0);
  res.json({ total: claims.length, byOccupation, totalClaimAmount });
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
  // Whitelist the status so an arbitrary value can't be persisted (which would
  // render as an unknown badge and desync the /summary byStatus buckets).
  if (!VALID_STATUSES.includes(req.query.status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
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

// Skip binding a real port (and seeding mock data) under the test runner so
// Supertest can drive `app` directly, in-process, from a clean empty store.
if (process.env.NODE_ENV !== "test") {
  seedPendingClaims();
  app.listen(PORT, () => {
    console.log(`Claim Billing API running at http://localhost:${PORT}/api/claims`);
    console.log(`Seeded ${claims.length} mock claims (all PENDING) across occupations.`);
  });
}

export { app };
