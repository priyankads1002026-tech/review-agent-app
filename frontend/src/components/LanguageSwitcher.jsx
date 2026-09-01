import React from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n";

// Header language dropdown. Changing it calls i18n.changeLanguage(), which both
// re-renders every t() consumer and persists the choice to localStorage (see the
// detector config in src/i18n/index.js). App watches i18n.language to flip <html>
// dir for RTL, so this component only needs to set the language.
function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  // i18n.language can be a region code (e.g. "en-US"); match on the base.
  const current = i18n.language?.split("-")[0];

  return (
    <label className="lang-switcher">
      <span className="sr-only">{t("lang.label")}</span>
      <select
        className="lang-switcher__select"
        value={LANGUAGES.some((l) => l.code === current) ? current : "en"}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        aria-label={t("lang.label")}
        title={t("lang.label")}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
