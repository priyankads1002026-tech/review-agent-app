// App smoke tests — verifies tab wiring, theme toggle, and i18n <html> effects.
// Child components that hit the network are mocked so the App shell can be
// tested in isolation. "../i18n" is imported so useTranslation() resolves.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App.jsx";
import "./i18n";

// Mock the data-fetching children so App renders without a backend.
vi.mock("./components/ClaimList", () => ({
  default: ({ onChanged }) => (
    <div data-testid="claim-list">
      ClaimList
      <button onClick={() => onChanged && onChanged()}>trigger-change</button>
    </div>
  ),
}));
vi.mock("./components/ClaimForm", () => ({
  default: ({ onClaimCreated }) => (
    <div data-testid="claim-form">
      ClaimForm
      <button onClick={() => onClaimCreated && onClaimCreated()}>create</button>
    </div>
  ),
}));
vi.mock("./components/ClaimSummary", () => ({
  default: () => <div data-testid="claim-summary">ClaimSummary</div>,
}));
vi.mock("./components/ClaimAnalytics", () => ({
  default: () => <div data-testid="claim-analytics">ClaimAnalytics</div>,
}));
vi.mock("./components/HelpGuide", () => ({
  default: () => <div data-testid="help-guide">HelpGuide</div>,
}));
vi.mock("./components/LanguageSwitcher", () => ({
  default: () => <div data-testid="lang-switcher">LanguageSwitcher</div>,
}));

describe("App", () => {
  beforeEach(() => {
    // The runner's global localStorage is a broken/partial stub (no clear/
    // removeItem), so install a real in-memory one that App and these assertions
    // can rely on.
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the header and defaults to the claims list tab", () => {
    render(<App />);
    expect(screen.getByTestId("claim-list")).toBeInTheDocument();
    expect(screen.queryByTestId("claim-summary")).not.toBeInTheDocument();
  });

  it("switches to the Dashboard tab and renders ClaimSummary", () => {
    render(<App />);
    // Tab labels come from i18n; find buttons by role and click the dashboard one.
    const tabs = screen.getAllByRole("tab");
    // Dashboard is the first tab in the nav.
    fireEvent.click(tabs[0]);
    expect(screen.getByTestId("claim-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("claim-list")).not.toBeInTheDocument();
  });

  it("switches to the Submit New Claim tab and renders ClaimForm", () => {
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    // Order: dashboard, list, new, guide
    fireEvent.click(tabs[2]);
    expect(screen.getByTestId("claim-form")).toBeInTheDocument();
  });

  it("switches to the Guide tab and renders HelpGuide", () => {
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[3]);
    expect(screen.getByTestId("help-guide")).toBeInTheDocument();
  });

  it("switches to the Analytics tab and renders ClaimAnalytics", () => {
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    // Order: dashboard, list, new, guide, analytics
    fireEvent.click(tabs[4]);
    expect(screen.getByTestId("claim-analytics")).toBeInTheDocument();
  });

  it("returns to the list tab after a claim is created", () => {
    render(<App />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[2]); // go to new
    fireEvent.click(screen.getByText("create")); // fire onClaimCreated
    expect(screen.getByTestId("claim-list")).toBeInTheDocument();
  });

  it("applies a theme to <html> and toggles it, persisting to localStorage", () => {
    render(<App />);
    const initial = document.documentElement.getAttribute("data-theme");
    expect(["light", "dark"]).toContain(initial);

    // The theme toggle button has an aria-label; grab it and click.
    const toggle = screen.getByRole("button", {
      name: /light|dark|Light|Dark/i,
    });
    fireEvent.click(toggle);

    const after = document.documentElement.getAttribute("data-theme");
    expect(after).not.toBe(initial);
    expect(localStorage.getItem("theme")).toBe(after);
  });
});
