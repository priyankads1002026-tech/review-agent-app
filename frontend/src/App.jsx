import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ClaimList from "./components/ClaimList";
import ClaimForm from "./components/ClaimForm";
import ClaimSummary from "./components/ClaimSummary";
import HelpGuide from "./components/HelpGuide";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { applyDocumentLang } from "./i18n";

// Resolve the initial theme: saved preference first, else the OS setting, else light.
const getInitialTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("list");
  const [refresh, setRefresh] = useState(0);
  // Bumped on any claim mutation so the Dashboard's aggregates stay fresh,
  // kept separate from `refresh` so mutations don't remount (and reset the
  // filters/search/sort/pagination of) the claims list.
  const [summaryRefresh, setSummaryRefresh] = useState(0);
  const [theme, setTheme] = useState(getInitialTheme);

  // Keep <html lang/dir> in sync with the active language so the layout flips
  // to RTL for Arabic. Runs on mount (for the detected/restored language) and
  // on every switch.
  useEffect(() => {
    applyDocumentLang(i18n.language);
    i18n.on("languageChanged", applyDocumentLang);
    return () => i18n.off("languageChanged", applyDocumentLang);
  }, [i18n]);

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
    setSummaryRefresh((n) => n + 1);
  };

  // Called by ClaimList after an edit/delete/status change so the Dashboard
  // re-fetches its aggregates next time it renders.
  const handleClaimsChanged = () => setSummaryRefresh((n) => n + 1);

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand-mark">🏥</div>
          <div>
            <h1>{t("app.title")}</h1>
            <p>{t("app.subtitle")}</p>
          </div>
          <div className="header-controls">
            <LanguageSwitcher />
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
              title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            >
              {theme === "dark" ? t("theme.light") : t("theme.dark")}
            </button>
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
            {t("nav.dashboard")}
          </button>
          <button
            className={`tab ${activeTab === "list" ? "is-active" : ""}`}
            onClick={() => setActiveTab("list")}
            role="tab"
            aria-selected={activeTab === "list"}
          >
            {t("nav.viewClaims")}
          </button>
          <button
            className={`tab ${activeTab === "new" ? "is-active" : ""}`}
            onClick={() => setActiveTab("new")}
            role="tab"
            aria-selected={activeTab === "new"}
          >
            {t("nav.submitNew")}
          </button>
          <button
            className={`tab ${activeTab === "guide" ? "is-active" : ""}`}
            onClick={() => setActiveTab("guide")}
            role="tab"
            aria-selected={activeTab === "guide"}
          >
            {t("nav.guide")}
          </button>
        </nav>

        {activeTab === "dashboard" && (
          <ClaimSummary key={`${refresh}-${summaryRefresh}`} />
        )}
        {activeTab === "list" && (
          <ClaimList key={refresh} onChanged={handleClaimsChanged} />
        )}
        {activeTab === "new" && <ClaimForm onClaimCreated={handleClaimCreated} />}
        {activeTab === "guide" && <HelpGuide />}
      </main>
    </>
  );
}

export default App;
