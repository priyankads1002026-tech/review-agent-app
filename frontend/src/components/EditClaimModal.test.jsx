// EditClaimModal tests — prefilled edit form with client-side validation. The
// service is mocked; "../i18n" resolves useTranslation().
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditClaimModal from "./EditClaimModal.jsx";
import { updateClaim } from "../services/claimService";
import { approvedClaim } from "../../../test/fixtures/claims.mjs";
import "../i18n";

vi.mock("../services/claimService", () => ({
  updateClaim: vi.fn(),
}));

describe("EditClaimModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills the form from the claim prop", () => {
    const { container } = render(
      <EditClaimModal claim={approvedClaim} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    expect(container.querySelector('input[name="patientName"]').value).toBe(
      approvedClaim.patientName
    );
    expect(container.querySelector('input[name="policyNumber"]').value).toBe(
      approvedClaim.policyNumber
    );
    expect(container.querySelector('input[name="claimAmount"]').value).toBe(
      String(approvedClaim.claimAmount)
    );
  });

  it("saves valid edits (calls updateClaim + onSaved)", async () => {
    updateClaim.mockResolvedValue({ ...approvedClaim, patientName: "New Name" });
    const onSaved = vi.fn();
    const { container } = render(
      <EditClaimModal claim={approvedClaim} onClose={vi.fn()} onSaved={onSaved} />
    );

    fireEvent.change(container.querySelector('input[name="patientName"]'), {
      target: { value: "New Name" },
    });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() =>
      expect(updateClaim).toHaveBeenCalledWith(
        approvedClaim.id,
        expect.objectContaining({ patientName: "New Name" })
      )
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("blocks submit with a required error when a field is cleared", async () => {
    const { container } = render(
      <EditClaimModal claim={approvedClaim} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    fireEvent.change(container.querySelector('input[name="patientName"]'), {
      target: { value: "" },
    });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
    expect(updateClaim).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric claim amount without calling the API", async () => {
    const { container } = render(
      <EditClaimModal claim={approvedClaim} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    fireEvent.change(container.querySelector('input[name="claimAmount"]'), {
      target: { value: "abc" },
    });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
    expect(updateClaim).not.toHaveBeenCalled();
  });

  it("rejects a non-positive (zero) claim amount", async () => {
    const { container } = render(
      <EditClaimModal claim={approvedClaim} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    fireEvent.change(container.querySelector('input[name="claimAmount"]'), {
      target: { value: "0" },
    });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
    expect(updateClaim).not.toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <EditClaimModal claim={approvedClaim} onClose={onClose} onSaved={vi.fn()} />
    );
    const closeBtn = screen.getByRole("button", { name: /close|✕/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error alert when the update API fails", async () => {
    updateClaim.mockRejectedValue(new Error("boom"));
    const { container } = render(
      <EditClaimModal claim={approvedClaim} onClose={vi.fn()} onSaved={vi.fn()} />
    );
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
  });
});
