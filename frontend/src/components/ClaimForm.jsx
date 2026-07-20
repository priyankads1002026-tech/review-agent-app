import React, { useState } from "react";
import { createClaim } from "../services/claimService";

function ClaimForm({ onClaimCreated }) {
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
      setError("Patient name, policy number and amount are required.");
      return;
    }
    if (Number(form.claimAmount) <= 0) {
      setError("Claim amount must be greater than zero.");
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
      setError("Failed to submit claim. Make sure the backend is running at http://localhost:8080.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2 className="card__title">Submit New Claim</h2>
      <p className="card__subtitle">Fields marked with * are required</p>

      {error && (
        <div className="alert alert--error">
          <span className="alert__icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert--success">
          <span className="alert__icon">✅</span>
          <span>Claim submitted successfully!</span>
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

        <div className="form-actions">
          <button className="btn btn--primary btn--lg" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Claim"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClaimForm;
