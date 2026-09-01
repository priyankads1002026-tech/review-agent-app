// Frontend test — ClaimSummary renders the server-computed counts and total.
// The service module is mocked so no real network/backend is needed; importing
// "../i18n" initializes react-i18next so useTranslation() resolves instead of
// suspending. Assertions target the numeric values (which render regardless of
// the active language), keeping the test locale-independent.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

  // Edge: a summary with missing byStatus / totalClaimAmount must not crash and
  // should fall back to zeros ($0.00 for the total amount tile).
  it("renders zero fallbacks when byStatus / totalClaimAmount are absent", async () => {
    fetchClaimSummary.mockResolvedValue({ total: 0 });

    render(<ClaimSummary />);

    // All four count tiles fall back to 0; the amount tile to $0.00.
    expect(await screen.findByText("$0.00")).toBeInTheDocument();
    // At least one "0" is rendered for the seeded status tiles.
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  // Re-fetches when the Refresh button is clicked.
  it("re-fetches the summary when Refresh is clicked", async () => {
    fetchClaimSummary.mockResolvedValue({
      total: 1,
      byStatus: { PENDING: 1, APPROVED: 0, REJECTED: 0 },
      totalClaimAmount: 10,
    });

    render(<ClaimSummary />);
    await screen.findByText("$10.00");
    expect(fetchClaimSummary).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByRole("button");
    fireEvent.click(refreshBtn);

    await waitFor(() => expect(fetchClaimSummary).toHaveBeenCalledTimes(2));
  });
});
