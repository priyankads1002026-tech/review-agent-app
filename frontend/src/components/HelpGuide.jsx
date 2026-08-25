import React from "react";
import { useTranslation } from "react-i18next";

// Static, presentational help tab. No props, no state, no API calls — it just
// documents the features that ship on this branch, reusing the existing card /
// typography classes so it stays theme-aware for free. All copy comes from the
// i18n `guide.*` keys; bullet lists are stored as arrays and read with
// returnObjects so a section's items translate as one block.
function HelpGuide() {
  const { t } = useTranslation();

  // Sections whose body is a bullet list (title + subtitle + items[]).
  const listSections = ["submit", "view", "rowActions"];
  // Sections whose body is one or more paragraphs.
  const proseSections = [
    { key: "intro", paras: ["p1", "p2"] },
    { key: "dashboard", paras: ["p1"] },
    { key: "theme", paras: ["p1"] },
    { key: "language", paras: ["p1"] },
  ];

  return (
    <div className="guide">
      {/* Intro first, then the list sections, then the remaining prose sections. */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 className="card__title">{t("guide.intro.title")}</h2>
        <p className="card__subtitle">{t("guide.intro.subtitle")}</p>
        <p>{t("guide.intro.p1")}</p>
        <p>{t("guide.intro.p2")}</p>
      </div>

      {listSections.map((key) => {
        const items = t(`guide.${key}.items`, { returnObjects: true });
        return (
          <div className="card" style={{ marginBottom: 18 }} key={key}>
            <h2 className="card__title">{t(`guide.${key}.title`)}</h2>
            <p className="card__subtitle">{t(`guide.${key}.subtitle`)}</p>
            <ul>
              {(Array.isArray(items) ? items : []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        );
      })}

      {proseSections
        .filter((s) => s.key !== "intro")
        .map((s, idx, arr) => (
          <div
            className="card"
            style={idx < arr.length - 1 ? { marginBottom: 18 } : undefined}
            key={s.key}
          >
            <h2 className="card__title">{t(`guide.${s.key}.title`)}</h2>
            <p className="card__subtitle">{t(`guide.${s.key}.subtitle`)}</p>
            {s.paras.map((p) => (
              <p key={p}>{t(`guide.${s.key}.${p}`)}</p>
            ))}
          </div>
        ))}
    </div>
  );
}

export default HelpGuide;
