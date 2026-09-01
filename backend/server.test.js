// Backend API tests — Vitest + Supertest driving the Express `app` in-process.
// No real port is opened: server.js skips app.listen() when NODE_ENV=test, and
// Supertest talks to the exported `app` directly.
//
// The store is in-memory module state shared across requests, so each test
// creates (and cleans up) its own claim, and the aggregation test asserts on a
// delta rather than an absolute count — keeping tests order-independent.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./server.js";
import { newClaimPayload } from "../test/fixtures/claims.mjs";

// Helper: POST a valid claim and return the created record (with server id).
async function createClaim(overrides = {}) {
  const res = await request(app)
    .post("/api/claims")
    .send({ ...newClaimPayload, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

describe("GET /api/claims", () => {
  it("returns a JSON array", async () => {
    const res = await request(app).get("/api/claims");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/claims", () => {
  it("creates a claim, defaults status to PENDING, and assigns an id + date", async () => {
    const claim = await createClaim();
    expect(claim.id).toEqual(expect.any(Number));
    expect(claim.status).toBe("PENDING");
    expect(claim.patientName).toBe(newClaimPayload.patientName);
    expect(claim.submittedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
    await request(app).delete(`/api/claims/${claim.id}`); // cleanup
  });

  it("rejects invalid input with 400 (missing name / non-positive amount)", async () => {
    const res = await request(app)
      .post("/api/claims")
      .send({ patientName: "", policyNumber: "POL-9", claimAmount: -5 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("GET /api/claims/:id", () => {
  it("returns the requested claim", async () => {
    const claim = await createClaim();
    const res = await request(app).get(`/api/claims/${claim.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(claim.id);
    await request(app).delete(`/api/claims/${claim.id}`);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await request(app).get("/api/claims/999999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/claims/:id/status", () => {
  it("updates status via the query param (not the body)", async () => {
    const claim = await createClaim();
    const res = await request(app).put(`/api/claims/${claim.id}/status?status=APPROVED`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");
    await request(app).delete(`/api/claims/${claim.id}`);
  });
});

describe("GET /api/claims/summary", () => {
  it("reflects a newly created claim in the totals (delta check)", async () => {
    const before = (await request(app).get("/api/claims/summary")).body;
    const claim = await createClaim({ claimAmount: 100 });

    const after = (await request(app).get("/api/claims/summary")).body;
    expect(after.total).toBe(before.total + 1);
    expect(after.byStatus.PENDING).toBe(before.byStatus.PENDING + 1);
    expect(after.totalClaimAmount).toBe(before.totalClaimAmount + 100);

    await request(app).delete(`/api/claims/${claim.id}`);
  });
});

describe("DELETE /api/claims/:id", () => {
  it("removes the claim (204) so a later GET returns 404", async () => {
    const claim = await createClaim();
    const del = await request(app).delete(`/api/claims/${claim.id}`);
    expect(del.status).toBe(204);
    const res = await request(app).get(`/api/claims/${claim.id}`);
    expect(res.status).toBe(404);
  });
});
