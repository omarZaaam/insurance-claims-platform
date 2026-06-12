import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CLAIM_TYPES = [
  { value: 'AUTO_COLLISION', label: 'Auto Collision' },
  { value: 'AUTO_COMPREHENSIVE', label: 'Auto Comprehensive' },
  { value: 'HOME_PROPERTY', label: 'Home Property' },
  { value: 'HOME_LIABILITY', label: 'Home Liability' },
  { value: 'HEALTH_MEDICAL', label: 'Health Medical' },
  { value: 'LIFE', label: 'Life Insurance' },
];

const SAMPLE_POLICIES = [
  'POL-8821',
  'POL-8822',
  'POL-8823',
  'POL-8824',
  'POL-8825',
];

const STATUS_COLORS = {
  'SUBMITTED': '#3498db',
  'UNDER_REVIEW': '#f39c12',
  'AUTO_APPROVED': '#27ae60',
  'APPROVED': '#27ae60',
  'REJECTED': '#e74c3c',
  'PENDING_INFO': '#9b59b6',
  'CLOSED': '#95a5a6',
};

function App() {
  const [view, setView] = useState('submit'); // 'submit' or 'list'
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    policyId: '',
    claimType: '',
    amount: '',
    incidentDate: '',
    description: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  useEffect(() => {
    if (view === 'list') {
      fetchClaims();
    }
  }, [view]);

  const fetchClaims = async () => {
    setLoadingClaims(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/claims`, {
        headers: {
          'Authorization': 'Bearer demo-token',
        },
      });
      setClaims(response.data);
    } catch (err) {
      setError('Failed to load claims. Please try again.');
      console.error('Error fetching claims:', err);
    } finally {
      setLoadingClaims(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const validateStep = () => {
    if (step === 1 && !formData.policyId) {
      setError('Please select a policy');
      return false;
    }
    if (step === 2 && (!formData.claimType || !formData.incidentDate)) {
      setError('Please fill in all required fields');
      return false;
    }
    if (step === 3 && (!formData.amount || parseFloat(formData.amount) <= 0)) {
      setError('Please enter a valid claim amount');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  const submitClaim = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/claims`, {
        policyId: formData.policyId,
        claimType: formData.claimType,
        amount: parseFloat(formData.amount),
        incidentDate: formData.incidentDate,
        description: formData.description,
      }, {
        headers: {
          'Authorization': 'Bearer demo-token',
          'Content-Type': 'application/json',
        },
      });

      setResult(response.data);
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      policyId: '',
      claimType: '',
      amount: '',
      incidentDate: '',
      description: '',
    });
    setResult(null);
    setError(null);
  };

  const switchToSubmit = () => {
    setView('submit');
    resetForm();
    setError(null);
  };

  const switchToList = () => {
    setView('list');
    setError(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🛡️ InsureCo Claims Portal</h1>
          <p>Submit and manage your insurance claims</p>
        </header>

        <div className="nav-tabs">
          <button 
            className={`nav-tab ${view === 'submit' ? 'active' : ''}`}
            onClick={switchToSubmit}
          >
            📝 Submit Claim
          </button>
          <button 
            className={`nav-tab ${view === 'list' ? 'active' : ''}`}
            onClick={switchToList}
          >
            📋 My Claims
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {view === 'submit' && (
          <>
            <div className="progress-bar">
              <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1. Policy</div>
              <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2. Incident</div>
              <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3. Amount</div>
              <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>4. Review</div>
              <div className={`progress-step ${step >= 5 ? 'active' : ''}`}>5. Complete</div>
            </div>

            <div className="form-container">
              {step === 1 && (
                <div className="step">
                  <h2>Select Your Policy</h2>
                  <div className="form-group">
                    <label>Policy Number *</label>
                    <select
                      name="policyId"
                      value={formData.policyId}
                      onChange={handleChange}
                      className="form-control"
                    >
                      <option value="">-- Select Policy --</option>
                      {SAMPLE_POLICIES.map(policy => (
                        <option key={policy} value={policy}>{policy}</option>
                      ))}
                    </select>
                  </div>
                  <div className="button-group">
                    <button onClick={nextStep} className="btn btn-primary">
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="step">
                  <h2>Incident Details</h2>
                  <div className="form-group">
                    <label>Claim Type *</label>
                    <select
                      name="claimType"
                      value={formData.claimType}
                      onChange={handleChange}
                      className="form-control"
                    >
                      <option value="">-- Select Type --</option>
                      {CLAIM_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Incident Date *</label>
                    <input
                      type="date"
                      name="incidentDate"
                      value={formData.incidentDate}
                      onChange={handleChange}
                      className="form-control"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="button-group">
                    <button onClick={prevStep} className="btn btn-secondary">
                      ← Back
                    </button>
                    <button onClick={nextStep} className="btn btn-primary">
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="step">
                  <h2>Claim Amount & Description</h2>
                  <div className="form-group">
                    <label>Claim Amount ($) *</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="form-control"
                      rows="4"
                      placeholder="Describe the incident..."
                    />
                  </div>
                  <div className="button-group">
                    <button onClick={prevStep} className="btn btn-secondary">
                      ← Back
                    </button>
                    <button onClick={nextStep} className="btn btn-primary">
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="step">
                  <h2>Review Your Claim</h2>
                  <div className="review-section">
                    <div className="review-item">
                      <strong>Policy Number:</strong>
                      <span>{formData.policyId}</span>
                    </div>
                    <div className="review-item">
                      <strong>Claim Type:</strong>
                      <span>{CLAIM_TYPES.find(t => t.value === formData.claimType)?.label}</span>
                    </div>
                    <div className="review-item">
                      <strong>Incident Date:</strong>
                      <span>{formData.incidentDate}</span>
                    </div>
                    <div className="review-item">
                      <strong>Claim Amount:</strong>
                      <span>${parseFloat(formData.amount).toFixed(2)}</span>
                    </div>
                    {formData.description && (
                      <div className="review-item">
                        <strong>Description:</strong>
                        <span>{formData.description}</span>
                      </div>
                    )}
                  </div>
                  <div className="button-group">
                    <button onClick={prevStep} className="btn btn-secondary" disabled={loading}>
                      ← Back
                    </button>
                    <button onClick={submitClaim} className="btn btn-success" disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Claim ✓'}
                    </button>
                  </div>
                </div>
              )}

              {step === 5 && result && (
                <div className="step">
                  <div className="success-message">
                    <h2>✅ Claim Submitted Successfully!</h2>
                    <div className="result-box">
                      <div className="result-item">
                        <strong>Claim ID:</strong>
                        <span className="highlight">{result.claimId}</span>
                      </div>
                      <div className="result-item">
                        <strong>Reference Number:</strong>
                        <span className="highlight">{result.ref}</span>
                      </div>
                      <div className="result-item">
                        <strong>Status:</strong>
                        <span className="status-badge">{result.status}</span>
                      </div>
                      <p className="result-message">{result.message}</p>
                    </div>
                    <div className="info-box">
                      <p>📧 A confirmation email has been sent to your registered email address.</p>
                      <p>📱 You will receive SMS updates on your claim status.</p>
                    </div>
                    <div className="button-group">
                      <button onClick={resetForm} className="btn btn-primary">
                        Submit Another Claim
                      </button>
                      <button onClick={switchToList} className="btn btn-secondary">
                        View My Claims
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'list' && (
          <div className="claims-list-container">
            <div className="claims-header">
              <h2>My Claims</h2>
              <button onClick={fetchClaims} className="btn btn-secondary" disabled={loadingClaims}>
                {loadingClaims ? '⟳ Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {loadingClaims ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading claims...</p>
              </div>
            ) : claims.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Claims Found</h3>
                <p>You haven't submitted any claims yet.</p>
                <button onClick={switchToSubmit} className="btn btn-primary">
                  Submit Your First Claim
                </button>
              </div>
            ) : (
              <div className="claims-grid">
                {claims.map(claim => (
                  <div key={claim.id} className="claim-card">
                    <div className="claim-card-header">
                      <div className="claim-id">
                        <strong>Claim ID:</strong>
                        <span className="claim-id-value">{claim.id.split('-')[0]}</span>
                      </div>
                      <span 
                        className="status-badge-small" 
                        style={{ backgroundColor: STATUS_COLORS[claim.status] || '#95a5a6' }}
                      >
                        {claim.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="claim-card-body">
                      <div className="claim-detail">
                        <span className="detail-label">Policy:</span>
                        <span className="detail-value">{claim.policy_id}</span>
                      </div>
                      <div className="claim-detail">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">
                          {CLAIM_TYPES.find(t => t.value === claim.claim_type)?.label || claim.claim_type}
                        </span>
                      </div>
                      <div className="claim-detail">
                        <span className="detail-label">Amount:</span>
                        <span className="detail-value amount">{formatCurrency(claim.amount)}</span>
                      </div>
                      <div className="claim-detail">
                        <span className="detail-label">Incident Date:</span>
                        <span className="detail-value">{formatDate(claim.incident_date)}</span>
                      </div>
                      <div className="claim-detail">
                        <span className="detail-label">Submitted:</span>
                        <span className="detail-value">{formatDate(claim.created_at)}</span>
                      </div>
                      {claim.adjuster_id && (
                        <div className="claim-detail">
                          <span className="detail-label">Adjuster:</span>
                          <span className="detail-value">{claim.adjuster_id}</span>
                        </div>
                      )}
                      {claim.description && (
                        <div className="claim-description">
                          <span className="detail-label">Description:</span>
                          <p>{claim.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="claim-card-footer">
                      <div className="claim-meta">
                        <span>📄 {claim.document_count || 0} documents</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <footer className="footer">
          <p>© 2026 InsureCo. All rights reserved.</p>
          <p className="demo-note">Demo Application - Architecture Showcase</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

// Made with Bob
