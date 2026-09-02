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
import { newClaimPayload, nonNumericAmountClaim } from "../test/fixtures/claims.mjs";

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

  it("rejects a non-numeric claimAmount with 400 (would otherwise poison the summary total)", async () => {
    const res = await request(app).post("/api/claims").send(nonNumericAmountClaim);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("trims surrounding whitespace on patientName / policyNumber before storing", async () => {
    const claim = await createClaim({ patientName: "  Spaced Name  ", policyNumber: "  POL-TRIM  " });
    expect(claim.patientName).toBe("Spaced Name");
    expect(claim.policyNumber).toBe("POL-TRIM");
    await request(app).delete(`/api/claims/${claim.id}`); // cleanup
  });

  it("rejects an over-long patientName with 400", async () => {
    const res = await request(app)
      .post("/api/claims")
      .send({ ...newClaimPayload, patientName: "x".repeat(121) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // Extra edge coverage: description over its 1000-char cap should be rejected.
  it("rejects an over-long description with 400", async () => {
    const res = await request(app)
      .post("/api/claims")
      .send({ ...newClaimPayload, description: "d".repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // Extra edge coverage: omitting description entirely defaults to "" (not undefined).
  // POST directly (not via createClaim, whose spread would re-add the fixture's description).
  it("defaults a missing description to an empty string", async () => {
    const { description, ...noDesc } = newClaimPayload;
    const res = await request(app).post("/api/claims").send(noDesc);
    expect(res.status).toBe(201);
    expect(res.body.description).toBe("");
    await request(app).delete(`/api/claims/${res.body.id}`);
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

  // ---- Regression for Warning: [server.js — status whitelist] ----
  // Finding: "PUT /api/claims/:id/status accepts any status string with no
  // whitelist against PENDING/APPROVED/REJECTED", which lets `total` disagree
  // with the sum of byStatus buckets. This test FAILS on the buggy behavior
  // (an out-of-band status is accepted with 200) and PASSES once the handler
  // rejects unknown statuses with 400.
  it("rejects an out-of-band status value with 400 (keeps summary buckets consistent)", async () => {
    const claim = await createClaim();
    const res = await request(app).put(`/api/claims/${claim.id}/status?status=BOGUS`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    // The claim's status must remain unchanged (still the default PENDING).
    const after = (await request(app).get(`/api/claims/${claim.id}`)).body;
    expect(after.status).toBe("PENDING");
    await request(app).delete(`/api/claims/${claim.id}`);
  });

  it("accepts each of the three whitelisted statuses", async () => {
    const claim = await createClaim();
    for (const s of ["PENDING", "APPROVED", "REJECTED"]) {
      const res = await request(app).put(`/api/claims/${claim.id}/status?status=${s}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(s);
    }
    await request(app).delete(`/api/claims/${claim.id}`);
  });
});

describe("GET /api/claims/summary", () => {
  // Regression guard for route ordering: /summary must resolve to the aggregate
  // endpoint, NOT be captured as GET /api/claims/:id (which would 404 on "summary").
  it("returns the aggregate shape and is never treated as an id lookup", async () => {
    const res = await request(app).get("/api/claims/summary");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total");
    expect(typeof res.body.total).toBe("number");
    expect(typeof res.body.totalClaimAmount).toBe("number");
    expect(Number.isFinite(res.body.totalClaimAmount)).toBe(true); // NaN-safe
    // byStatus is seeded with all three known statuses regardless of data.
    expect(res.body.byStatus).toEqual(
      expect.objectContaining({
        PENDING: expect.any(Number),
        APPROVED: expect.any(Number),
        REJECTED: expect.any(Number),
      })
    );
    // A single-claim lookup would return a claim object (with patientName), not a summary.
    expect(res.body).not.toHaveProperty("patientName");
  });

  it("reflects a newly created claim in the totals (delta check)", async () => {
    const before = (await request(app).get("/api/claims/summary")).body;
    const claim = await createClaim({ claimAmount: 100 });

    const after = (await request(app).get("/api/claims/summary")).body;
    expect(after.total).toBe(before.total + 1);
    expect(after.byStatus.PENDING).toBe(before.byStatus.PENDING + 1);
    expect(after.totalClaimAmount).toBe(before.totalClaimAmount + 100);

    await request(app).delete(`/api/claims/${claim.id}`);
  });

  // Covers Warning [server.js — status whitelist] at the aggregate level: with a
  // proper whitelist, total should always equal the sum of the byStatus buckets.
  it("keeps total consistent with the sum of byStatus buckets", async () => {
    const claim = await createClaim();
    await request(app).put(`/api/claims/${claim.id}/status?status=APPROVED`);
    const summary = (await request(app).get("/api/claims/summary")).body;
    const sum =
      summary.byStatus.PENDING + summary.byStatus.APPROVED + summary.byStatus.REJECTED;
    expect(sum).toBe(summary.total);
    await request(app).delete(`/api/claims/${claim.id}`);
  });
});

describe("GET /api/claims/analytics/occupation", () => {
  it("groups claim counts and totals by occupation, sorted by count desc", async () => {
    const a = await createClaim({ occupation: "QA Engineer", claimAmount: 100 });
    const b = await createClaim({ occupation: "QA Engineer", claimAmount: 200 });
    const c = await createClaim({ occupation: "Radiologist", claimAmount: 50 });

    const res = await request(app).get("/api/claims/analytics/occupation");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.byOccupation)).toBe(true);
    expect(typeof res.body.total).toBe("number");
    expect(typeof res.body.totalClaimAmount).toBe("number");

    const eng = res.body.byOccupation.find((o) => o.occupation === "QA Engineer");
    const rad = res.body.byOccupation.find((o) => o.occupation === "Radiologist");
    expect(eng).toMatchObject({ count: 2, totalClaimAmount: 300 });
    expect(rad).toMatchObject({ count: 1, totalClaimAmount: 50 });

    // Busier occupation must rank before the quieter one (sorted by count desc).
    const idxEng = res.body.byOccupation.findIndex((o) => o.occupation === "QA Engineer");
    const idxRad = res.body.byOccupation.findIndex((o) => o.occupation === "Radiologist");
    expect(idxEng).toBeLessThan(idxRad);

    await request(app).delete(`/api/claims/${a.id}`);
    await request(app).delete(`/api/claims/${b.id}`);
    await request(app).delete(`/api/claims/${c.id}`);
  });

  it("files a claim created without an occupation under 'Unknown'", async () => {
    const claim = await createClaim(); // newClaimPayload carries no occupation
    expect(claim.occupation).toBe("Unknown");

    const res = await request(app).get("/api/claims/analytics/occupation");
    const unknown = res.body.byOccupation.find((o) => o.occupation === "Unknown");
    expect(unknown).toBeTruthy();
    expect(unknown.count).toBeGreaterThanOrEqual(1);

    await request(app).delete(`/api/claims/${claim.id}`);
  });
});

describe("PUT /api/claims/:id", () => {
  it("updates editable fields while preserving id, status, and submittedDate", async () => {
    const claim = await createClaim();
    // Move it off the default status first, so we can prove PUT doesn't reset it.
    await request(app).put(`/api/claims/${claim.id}/status?status=APPROVED`);

    const res = await request(app)
      .put(`/api/claims/${claim.id}`)
      .send({
        patientName: "Updated Name",
        policyNumber: "POL-UPDATED",
        claimAmount: 999,
        description: "Revised description",
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(claim.id); // preserved
    expect(res.body.status).toBe("APPROVED"); // preserved (not reset to PENDING)
    expect(res.body.submittedDate).toBe(claim.submittedDate); // preserved
    expect(res.body.patientName).toBe("Updated Name"); // updated
    expect(res.body.claimAmount).toBe(999); // updated

    await request(app).delete(`/api/claims/${claim.id}`);
  });

  it("rejects an empty patientName with 400 and leaves the claim unchanged", async () => {
    const claim = await createClaim();
    const res = await request(app)
      .put(`/api/claims/${claim.id}`)
      .send({ patientName: "", policyNumber: "POL-X", claimAmount: 10 });
    expect(res.status).toBe(400);

    const after = (await request(app).get(`/api/claims/${claim.id}`)).body;
    expect(after.patientName).toBe(newClaimPayload.patientName); // untouched
    await request(app).delete(`/api/claims/${claim.id}`);
  });

  it("rejects a negative claimAmount with 400", async () => {
    const claim = await createClaim();
    const res = await request(app)
      .put(`/api/claims/${claim.id}`)
      .send({ patientName: "Ok", policyNumber: "POL-X", claimAmount: -1 });
    expect(res.status).toBe(400);
    await request(app).delete(`/api/claims/${claim.id}`);
  });

  it("returns 404 when updating an unknown id", async () => {
    const res = await request(app)
      .put("/api/claims/999999")
      .send({ patientName: "Nobody", policyNumber: "POL-0", claimAmount: 5 });
    expect(res.status).toBe(404);
  });

  // Extra edge coverage: PUT trims whitespace via the same validateClaimInput path.
  it("trims patientName / policyNumber on update", async () => {
    const claim = await createClaim();
    const res = await request(app)
      .put(`/api/claims/${claim.id}`)
      .send({ patientName: "  Trim Me  ", policyNumber: "  POL-TT  ", claimAmount: 5 });
    expect(res.status).toBe(200);
    expect(res.body.patientName).toBe("Trim Me");
    expect(res.body.policyNumber).toBe("POL-TT");
    await request(app).delete(`/api/claims/${claim.id}`);
  });
});

describe("GET /api/claims/status/:status", () => {
  // Route-ordering companion: /status/:status must resolve before /:id.
  it("returns only claims matching the requested status", async () => {
    const pending = await createClaim();
    const approved = await createClaim();
    await request(app).put(`/api/claims/${approved.id}/status?status=APPROVED`);

    const res = await request(app).get("/api/claims/status/APPROVED");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((c) => c.status === "APPROVED")).toBe(true);
    expect(res.body.some((c) => c.id === approved.id)).toBe(true);
    expect(res.body.some((c) => c.id === pending.id)).toBe(false);

    await request(app).delete(`/api/claims/${pending.id}`);
    await request(app).delete(`/api/claims/${approved.id}`);
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
