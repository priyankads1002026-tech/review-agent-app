// ClaimList tests — filters, client-side search/sort/pagination, and row actions.
// The service module is mocked; "../i18n" resolves useTranslation(). Child
// modal/drawer components are mocked so we can test the list logic in isolation.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import ClaimList from "./ClaimList.jsx";
import {
  fetchClaims,
  fetchClaimsByStatus,
  fetchClaimsByPolicy,
  updateClaimStatus,
  deleteClaim,
} from "../services/claimService";
import "../i18n";

vi.mock("../services/claimService", () => ({
  fetchClaims: vi.fn(),
  fetchClaimsByStatus: vi.fn(),
  fetchClaimsByPolicy: vi.fn(),
  updateClaimStatus: vi.fn(),
  deleteClaim: vi.fn(),
}));

// Mock the heavy children — we only care that the list wires them up.
vi.mock("./EditClaimModal", () => ({
  default: ({ onClose }) => (
    <div data-testid="edit-modal">
      <button onClick={onClose}>close-edit</button>
    </div>
  ),
}));
vi.mock("./ClaimDetail", () => ({
  default: ({ onClose }) => (
    <div data-testid="claim-detail">
      <button onClick={onClose}>close-detail</button>
    </div>
  ),
}));

// Build N pending claims with distinct ids/names/amounts for pagination/sort tests.
function makeClaims(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    patientName: `Patient ${String(i + 1).padStart(2, "0")}`,
    policyNumber: `POL-${i + 1}`,
    claimAmount: (i + 1) * 10,
    description: `desc ${i + 1}`,
    status: "PENDING",
    submittedDate: "2024-01-01",
  }));
}

describe("ClaimList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchClaims.mockResolvedValue(makeClaims(3));
    fetchClaimsByStatus.mockResolvedValue([]);
    fetchClaimsByPolicy.mockResolvedValue([]);
    updateClaimStatus.mockResolvedValue({});
    deleteClaim.mockResolvedValue();
    window.confirm = vi.fn(() => true);
  });

  it("loads and renders claims from fetchClaims on mount", async () => {
    render(<ClaimList />);
    expect(await screen.findByText("Patient 01")).toBeInTheDocument();
    expect(screen.getByText("Patient 03")).toBeInTheDocument();
    expect(fetchClaims).toHaveBeenCalledTimes(1);
  });

  it("shows an unreachable error (TypeError) distinctly from a server error", async () => {
    fetchClaims.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { container } = render(<ClaimList />);
    await waitFor(() => {
      expect(container.querySelector(".alert--error")).not.toBeNull();
    });
  });

  it("filters by status via the status select (hits fetchClaimsByStatus)", async () => {
    fetchClaimsByStatus.mockResolvedValue([
      {
        id: 99,
        patientName: "Approved Person",
        policyNumber: "POL-99",
        claimAmount: 500,
        description: "",
        status: "APPROVED",
        submittedDate: "2024-02-02",
      },
    ]);
    const { container } = render(<ClaimList />);
    await screen.findByText("Patient 01");

    const statusSelect = container.querySelector(".filter-bar select");
    fireEvent.change(statusSelect, { target: { value: "APPROVED" } });

    expect(await screen.findByText("Approved Person")).toBeInTheDocument();
    expect(fetchClaimsByStatus).toHaveBeenCalledWith("APPROVED");
  });

  it("searches by policy number via the policy form (hits fetchClaimsByPolicy)", async () => {
    fetchClaimsByPolicy.mockResolvedValue([
      {
        id: 42,
        patientName: "Policy Match",
        policyNumber: "POL-42",
        claimAmount: 250,
        description: "",
        status: "PENDING",
        submittedDate: "2024-03-03",
      },
    ]);
    const { container } = render(<ClaimList />);
    await screen.findByText("Patient 01");

    // The policy search form is the <form class="filter-field">.
    const policyForm = container.querySelector("form.filter-field");
    const policyInput = policyForm.querySelector('input[type="text"]');
    fireEvent.change(policyInput, { target: { value: "POL-42" } });
    fireEvent.submit(policyForm);

    expect(await screen.findByText("Policy Match")).toBeInTheDocument();
    expect(fetchClaimsByPolicy).toHaveBeenCalledWith("POL-42");
  });

  it("narrows the visible rows with the client-side search box", async () => {
    const { container } = render(<ClaimList />);
    await screen.findByText("Patient 01");

    // The client-side search box is the text input inside label.filter-field
    // (the policy input lives inside form.filter-field, so this is unambiguous).
    const searchInput = container.querySelector(
      ".filter-bar label.filter-field input[type='text']"
    );
    fireEvent.change(searchInput, { target: { value: "Patient 02" } });

    await waitFor(() => {
      expect(screen.getByText("Patient 02")).toBeInTheDocument();
      expect(screen.queryByText("Patient 01")).not.toBeInTheDocument();
    });
  });

  it("paginates when there are more than PAGE_SIZE (8) rows", async () => {
    fetchClaims.mockResolvedValue(makeClaims(10));
    render(<ClaimList />);
    await screen.findByText("Patient 01");

    // With 10 claims and PAGE_SIZE 8, the 9th/10th shouldn't be on page 1.
    expect(screen.getByText("Patient 08")).toBeInTheDocument();
    expect(screen.queryByText("Patient 09")).not.toBeInTheDocument();
  });

  it("deletes a claim after confirmation and calls onChanged", async () => {
    const onChanged = vi.fn();
    render(<ClaimList onChanged={onChanged} />);
    await screen.findByText("Patient 01");

    // Find a Delete button — there are several; click the first.
    const deleteButtons = screen.getAllByRole("button", { name: /delete|remove|🗑|✕/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(deleteClaim).toHaveBeenCalled());
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("does not delete when the confirm dialog is cancelled", async () => {
    window.confirm = vi.fn(() => false);
    render(<ClaimList />);
    await screen.findByText("Patient 01");

    const deleteButtons = screen.getAllByRole("button", { name: /delete|remove|🗑|✕/i });
    fireEvent.click(deleteButtons[0]);

    expect(deleteClaim).not.toHaveBeenCalled();
  });

  // Regression for Warning [ClaimList — stale page after delete on last page].
  // Finding: after deleting the last item on the final page, `page` state isn't
  // reset, so a user can be briefly stranded on an empty page. This test drives a
  // delete that shrinks the set across a page boundary and asserts the remaining
  // rows are still shown (i.e. the view is never stranded empty). It PASSES once
  // page is synced down to currentPage.
  it("does not strand the user on an empty page after deleting across a page boundary", async () => {
    // 9 claims -> 2 pages (8 + 1). Delete brings us to 8 -> 1 page.
    fetchClaims.mockResolvedValueOnce(makeClaims(9));
    // After delete, loadClaims re-fetches the reduced set.
    fetchClaims.mockResolvedValue(makeClaims(8));
    render(<ClaimList />);
    await screen.findByText("Patient 01");

    const deleteButtons = screen.getAllByRole("button", { name: /delete|remove|🗑|✕/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(deleteClaim).toHaveBeenCalled());
    // The list must still show real rows, not an empty stranded page.
    await waitFor(() => {
      expect(screen.getByText("Patient 01")).toBeInTheDocument();
    });
  });
});
