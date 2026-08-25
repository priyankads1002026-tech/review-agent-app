import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { createClaim } from "../services/claimService";

function ClaimForm({ onClaimCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    patientName: "",
    policyNumber: "",
    claimAmount: "",
    description: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.patientName || !form.policyNumber || !form.claimAmount) {
      setError(t("form.errors.required"));
      return;
    }
    if (Number(form.claimAmount) <= 0) {
      setError(t("form.errors.amount"));
      return;
    }

    setSubmitting(true);
    try {
      await createClaim({
        ...form,
        claimAmount: parseFloat(form.claimAmount),
      });
      setSuccess(true);
      setForm({ patientName: "", policyNumber: "", claimAmount: "", description: "" });
      if (onClaimCreated) onClaimCreated();
    } catch (err) {
      setError(t("form.errors.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 className="card__title">{t("form.title")}</h2>
      <p className="card__subtitle">{t("form.subtitle")}</p>

      {error && (
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert--success">
          <span className="alert__icon">✅</span>
          <span>{t("form.success")}</span>
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

        <div className="form-actions">
          <button className="btn btn--primary btn--lg" type="submit" disabled={submitting}>
            {submitting ? t("form.submitting") : t("form.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClaimForm;
