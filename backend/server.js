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

// ---------------------------------------------------------------------------
// Routes  (base path: /api/claims)
// ---------------------------------------------------------------------------

// GET /api/claims  -> all claims
app.get("/api/claims", (req, res) => {
  res.json(claims);
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
  const { patientName, policyNumber, claimAmount, description } = req.body;
  const claim = {
    id: nextId++,
    patientName,
    policyNumber,
    claimAmount,
    description,
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

// DELETE /api/claims/:id  -> remove a claim (204 No Content)
app.delete("/api/claims/:id", (req, res) => {
  claims = claims.filter((c) => c.id !== Number(req.params.id));
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Claim Billing API running at http://localhost:${PORT}/api/claims`);
});
