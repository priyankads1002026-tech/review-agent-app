// ClaimDetail tests — a slide-in drawer that fetches a single claim on mount.
// The service is mocked; "../i18n" is imported so useTranslation() resolves.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClaimDetail from "./ClaimDetail.jsx";
import { fetchClaimById } from "../services/claimService";
import { approvedClaim } from "../../../test/fixtures/claims.mjs";
import "../i18n";

vi.mock("../services/claimService", () => ({
  fetchClaimById: vi.fn(),
}));

describe("ClaimDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("fetches and renders the claim's fields on mount", async () => {
    fetchClaimById.mockResolvedValue(approvedClaim);
    render(<ClaimDetail claimId={approvedClaim.id} onClose={() => {}} />);

    expect(await screen.findByText(approvedClaim.patientName)).toBeInTheDocument();
    expect(screen.getByText(approvedClaim.policyNumber)).toBeInTheDocument();
    expect(screen.getByText(approvedClaim.submittedDate)).toBeInTheDocument();
    expect(fetchClaimById).toHaveBeenCalledWith(approvedClaim.id);
  });

  it("shows an error alert when the fetch fails", async () => {
    fetchClaimById.mockRejectedValue(new Error("network"));
    const { container } = render(
      <ClaimDetail claimId={999} onClose={() => {}} />
    );
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
  });

  it("calls onClose when the close button is clicked", async () => {
    fetchClaimById.mockResolvedValue(approvedClaim);
    const onClose = vi.fn();
    render(<ClaimDetail claimId={approvedClaim.id} onClose={onClose} />);
    await screen.findByText(approvedClaim.patientName);

    // The ✕ close button carries an aria-label from actions.close.
    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the Escape key is pressed", async () => {
    fetchClaimById.mockResolvedValue(approvedClaim);
    const onClose = vi.fn();
    render(<ClaimDetail claimId={approvedClaim.id} onClose={onClose} />);
    await screen.findByText(approvedClaim.patientName);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the backdrop overlay is clicked", async () => {
    fetchClaimById.mockResolvedValue(approvedClaim);
    const onClose = vi.fn();
    const { container } = render(
      <ClaimDetail claimId={approvedClaim.id} onClose={onClose} />
    );
    await screen.findByText(approvedClaim.patientName);

    const overlay = container.querySelector(".drawer-overlay");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("does NOT close when a click occurs inside the drawer (stopPropagation)", async () => {
    fetchClaimById.mockResolvedValue(approvedClaim);
    const onClose = vi.fn();
    const { container } = render(
      <ClaimDetail claimId={approvedClaim.id} onClose={onClose} />
    );
    await screen.findByText(approvedClaim.patientName);

    const drawer = container.querySelector(".drawer");
    fireEvent.click(drawer);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("restores body scroll on unmount", async () => {
    fetchClaimById.mockResolvedValue(approvedClaim);
    const { unmount } = render(
      <ClaimDetail claimId={approvedClaim.id} onClose={() => {}} />
    );
    await screen.findByText(approvedClaim.patientName);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
