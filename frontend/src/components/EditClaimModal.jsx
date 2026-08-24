import React, { useState } from "react";
import { updateClaim } from "../services/claimService";

// Prefilled modal for fully editing a claim's editable fields
// (patientName, policyNumber, claimAmount, description). id/status/
// submittedDate are preserved by the backend and never touched here.
function EditClaimModal({ claim, onClose, onSaved }) {
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
      setError("Patient name, policy number and amount are required.");
      return;
    }
    if (Number(form.claimAmount) <= 0) {
      setError("Claim amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      await updateClaim(claim.id, {
        patientName: form.patientName,
        policyNumber: form.policyNumber,
        claimAmount: parseFloat(form.claimAmount),
        description: form.description,
      });
      onSaved();
    } catch (err) {
      setError("Failed to save changes. Make sure the backend is running.");
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
            <h2 className="card__title">Edit Claim #{claim.id}</h2>
            <p className="card__subtitle">Fields marked with * are required</p>
          </div>
          <button
            className="modal__close btn btn--ghost btn--sm"
            type="button"
            onClick={onClose}
            aria-label="Close"
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
                <label>Patient Name <span className="req">*</span></label>
                <input
                  name="patientName"
                  value={form.patientName}
                  onChange={handleChange}
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div className="field">
                <label>Policy Number <span className="req">*</span></label>
                <input
                  name="policyNumber"
                  value={form.policyNumber}
                  onChange={handleChange}
                  placeholder="e.g. POL-100234"
                />
              </div>
              <div className="field">
                <label>Claim Amount ($) <span className="req">*</span></label>
                <input
                  name="claimAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.claimAmount}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>
              <div className="field full">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief description of the claim (optional)"
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
                Cancel
              </button>
              <button className="btn btn--primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditClaimModal;
