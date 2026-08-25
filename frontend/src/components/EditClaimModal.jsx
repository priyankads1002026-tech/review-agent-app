import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateClaim } from "../services/claimService";

// Prefilled modal for fully editing a claim's editable fields
// (patientName, policyNumber, claimAmount, description). id/status/
// submittedDate are preserved by the backend and never touched here.
function EditClaimModal({ claim, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    patientName: claim.patientName ?? "",
    policyNumber: claim.policyNumber ?? "",
    claimAmount: claim.claimAmount != null ? String(claim.claimAmount) : "",
    description: claim.description ?? "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.patientName || !form.policyNumber || !form.claimAmount) {
      setError(t("edit.errors.required"));
      return;
    }
    // parseFloat("abc") is NaN, and NaN <= 0 is false — guard it explicitly so
    // a non-numeric amount is rejected here instead of sending NaN to the API.
    const amount = parseFloat(form.claimAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError(t("edit.errors.amount"));
      return;
    }

    setSaving(true);
    try {
      await updateClaim(claim.id, {
        patientName: form.patientName,
        policyNumber: form.policyNumber,
        claimAmount: amount,
        description: form.description,
      });
      onSaved();
    } catch (err) {
      setError(t("edit.errors.save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h2 className="card__title">{t("edit.titleWithId", { id: claim.id })}</h2>
            <p className="card__subtitle">{t("edit.subtitle")}</p>
          </div>
          <button
            className="modal__close btn btn--ghost btn--sm"
            type="button"
            onClick={onClose}
            aria-label={t("actions.close")}
          >
            ✕
          </button>
        </div>

        <div className="modal__body">
          {error && (
            <div className="alert alert--error">
              <span className="alert__icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label>{t("fields.patientName")} <span className="req">*</span></label>
                <input
                  name="patientName"
                  value={form.patientName}
                  onChange={handleChange}
                  placeholder={t("form.patientPlaceholder")}
                />
              </div>
              <div className="field">
                <label>{t("fields.policyNumber")} <span className="req">*</span></label>
                <input
                  name="policyNumber"
                  value={form.policyNumber}
                  onChange={handleChange}
                  placeholder={t("form.policyPlaceholder")}
                />
              </div>
              <div className="field">
                <label>{t("fields.claimAmount")} <span className="req">*</span></label>
                <input
                  name="claimAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.claimAmount}
                  onChange={handleChange}
                  placeholder={t("form.amountPlaceholder")}
                />
              </div>
              <div className="field full">
                <label>{t("fields.description")}</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder={t("form.descPlaceholder")}
                />
              </div>
            </div>

            <div className="modal__footer">
              <button
                className="btn btn--ghost"
                type="button"
                onClick={onClose}
                disabled={saving}
              >
                {t("actions.cancel")}
              </button>
              <button className="btn btn--primary" type="submit" disabled={saving}>
                {saving ? t("edit.saving") : t("edit.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditClaimModal;
