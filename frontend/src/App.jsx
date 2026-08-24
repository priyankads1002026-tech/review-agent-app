import React, { useEffect, useState } from "react";
import ClaimList from "./components/ClaimList";
import ClaimForm from "./components/ClaimForm";
import ClaimSummary from "./components/ClaimSummary";
import HelpGuide from "./components/HelpGuide";

// Resolve the initial theme: saved preference first, else the OS setting, else light.
const getInitialTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function App() {
  const [activeTab, setActiveTab] = useState("list");
  const [refresh, setRefresh] = useState(0);
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the theme to the document root and remember the choice.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleClaimCreated = () => {
    setActiveTab("list");
    setRefresh((r) => r + 1);
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand-mark">🏥</div>
          <div>
            <h1>Claim Billing Request System</h1>
            <p>Manage and review insurance claim billing requests</p>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <main className="page">
        <nav className="tabs" role="tablist">
          <button
            className={`tab ${activeTab === "dashboard" ? "is-active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
            role="tab"
            aria-selected={activeTab === "dashboard"}
          >
            Dashboard
          </button>
          <button
            className={`tab ${activeTab === "list" ? "is-active" : ""}`}
            onClick={() => setActiveTab("list")}
            role="tab"
            aria-selected={activeTab === "list"}
          >
            View Claims
          </button>
          <button
            className={`tab ${activeTab === "new" ? "is-active" : ""}`}
            onClick={() => setActiveTab("new")}
            role="tab"
            aria-selected={activeTab === "new"}
          >
            Submit New Claim
          </button>
          <button
            className={`tab ${activeTab === "guide" ? "is-active" : ""}`}
            onClick={() => setActiveTab("guide")}
            role="tab"
            aria-selected={activeTab === "guide"}
          >
            Guide
          </button>
        </nav>

        {activeTab === "dashboard" && <ClaimSummary key={refresh} />}
        {activeTab === "list" && <ClaimList key={refresh} />}
        {activeTab === "new" && <ClaimForm onClaimCreated={handleClaimCreated} />}
        {activeTab === "guide" && <HelpGuide />}
      </main>
    </>
  );
}

export default App;
