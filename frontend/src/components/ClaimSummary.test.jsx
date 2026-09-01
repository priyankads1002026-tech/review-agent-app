// Frontend test — ClaimSummary renders the server-computed counts and total.
// The service module is mocked so no real network/backend is needed; importing
// "../i18n" initializes react-i18next so useTranslation() resolves instead of
// suspending. Assertions target the numeric values (which render regardless of
// the active language), keeping the test locale-independent.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ClaimSummary from "./ClaimSummary";
import { fetchClaimSummary } from "../services/claimService";
import "../i18n";

vi.mock("../services/claimService", () => ({
  fetchClaimSummary: vi.fn(),
}));

describe("ClaimSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the counts and total amount from fetchClaimSummary", async () => {
    // Distinct numbers so each count maps unambiguously to its stat tile.
    fetchClaimSummary.mockResolvedValue({
      total: 8,
      byStatus: { PENDING: 5, APPROVED: 2, REJECTED: 1 },
      totalClaimAmount: 1525.5,
    });

    render(<ClaimSummary />);

    // findBy* waits for the async load (spinner -> data) to settle.
    expect(await screen.findByText("8")).toBeInTheDocument(); // total
    expect(screen.getByText("5")).toBeInTheDocument(); // PENDING
    expect(screen.getByText("2")).toBeInTheDocument(); // APPROVED
    expect(screen.getByText("1")).toBeInTheDocument(); // REJECTED
    expect(screen.getByText("$1,525.50")).toBeInTheDocument(); // total amount
    expect(fetchClaimSummary).toHaveBeenCalledTimes(1);
  });

  it("shows an error message when the summary request fails", async () => {
    fetchClaimSummary.mockRejectedValue(new Error("network"));

    const { container } = render(<ClaimSummary />);

    // The error text is locale-dependent, so assert on the error alert's class.
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
  });
});
