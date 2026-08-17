import React, { useState } from "react";
import ClaimList from "./components/ClaimList";
import ClaimForm from "./components/ClaimForm";
import ClaimSummary from "./components/ClaimSummary";

function App() {
  const [activeTab, setActiveTab] = useState("list");
  const [refresh, setRefresh] = useState(0);

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
        </nav>

        {activeTab === "dashboard" && <ClaimSummary key={refresh} />}
        {activeTab === "list" && <ClaimList key={refresh} />}
        {activeTab === "new" && <ClaimForm onClaimCreated={handleClaimCreated} />}
      </main>
    </>
  );
}

export default App;
