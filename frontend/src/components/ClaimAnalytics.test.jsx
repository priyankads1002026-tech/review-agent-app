// ClaimAnalytics tests — the occupation analytics dashboard. The service is
// mocked; "../i18n" is imported so useTranslation() resolves. Assertions target
// occupation names + money amounts (locale-independent where possible).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ClaimAnalytics from "./ClaimAnalytics";
import { fetchOccupationAnalytics } from "../services/claimService";
import "../i18n";

vi.mock("../services/claimService", () => ({
  fetchOccupationAnalytics: vi.fn(),
}));

describe("ClaimAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders occupation rows with their counts and totals", async () => {
    fetchOccupationAnalytics.mockResolvedValue({
      total: 5,
      totalClaimAmount: 800,
      byOccupation: [
        { occupation: "Nurse", count: 3, totalClaimAmount: 500 },
        { occupation: "Teacher", count: 2, totalClaimAmount: 300 },
      ],
    });

    render(<ClaimAnalytics />);

    expect(await screen.findByText("Nurse")).toBeInTheDocument();
    expect(screen.getByText("Teacher")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument(); // Nurse total
    expect(screen.getByText("$300.00")).toBeInTheDocument(); // Teacher total
    expect(screen.getByText("$800.00")).toBeInTheDocument(); // overall total tile
    expect(fetchOccupationAnalytics).toHaveBeenCalledTimes(1);
  });

  it("shows an error alert when the request fails", async () => {
    fetchOccupationAnalytics.mockRejectedValue(new Error("network"));
    const { container } = render(<ClaimAnalytics />);
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
  });

  it("shows an empty state when there are no occupations", async () => {
    fetchOccupationAnalytics.mockResolvedValue({
      total: 0,
      totalClaimAmount: 0,
      byOccupation: [],
    });
    const { container } = render(<ClaimAnalytics />);
    // The empty state renders .state__emoji; the loading state does not, so this
    // distinguishes "loaded but empty" from "still loading".
    await waitFor(() => {
      expect(container.querySelector(".state__emoji")).not.toBeNull();
    });
  });
});
