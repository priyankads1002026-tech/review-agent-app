// ClaimForm tests — client-side validation + submit flow. The service is mocked;
// "../i18n" is imported so useTranslation() resolves.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClaimForm from "./ClaimForm.jsx";
import { createClaim } from "../services/claimService";
import { newClaimPayload } from "../../../test/fixtures/claims.mjs";
import "../i18n";

vi.mock("../services/claimService", () => ({
  createClaim: vi.fn(),
}));

// Fill the three required inputs by their DOM name attribute.
function fillRequired(container, { name, policy, amount }) {
  fireEvent.change(container.querySelector('input[name="patientName"]'), {
    target: { value: name },
  });
  fireEvent.change(container.querySelector('input[name="policyNumber"]'), {
    target: { value: policy },
  });
  fireEvent.change(container.querySelector('input[name="claimAmount"]'), {
    target: { value: amount },
  });
}

describe("ClaimForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a required-fields error when submitting an empty form", async () => {
    const { container } = render(<ClaimForm onClaimCreated={vi.fn()} />);
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("rejects a non-positive claim amount (edge: zero) without calling the API", async () => {
    const { container } = render(<ClaimForm onClaimCreated={vi.fn()} />);
    fillRequired(container, { name: "Jane", policy: "POL-1", amount: "0" });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("submits a valid claim and calls onClaimCreated", async () => {
    createClaim.mockResolvedValue({ id: 1 });
    const onClaimCreated = vi.fn();
    const { container } = render(<ClaimForm onClaimCreated={onClaimCreated} />);
    fillRequired(container, {
      name: newClaimPayload.patientName,
      policy: newClaimPayload.policyNumber,
      amount: String(newClaimPayload.claimAmount),
    });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(createClaim).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClaimCreated).toHaveBeenCalled());
    // Success alert should appear.
    await waitFor(() => {
      expect(container.querySelector(".alert--success")).not.toBeNull();
    });
  });

  it("shows an error alert when the API rejects the submission", async () => {
    createClaim.mockRejectedValue(new Error("boom"));
    const { container } = render(<ClaimForm onClaimCreated={vi.fn()} />);
    fillRequired(container, { name: "Jane", policy: "POL-1", amount: "100" });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
  });
});
