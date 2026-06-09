import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { HardHat, Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const [form, setForm] = useState({
    companyName: '',
    erpType: 'CONTRACTOR',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName || !form.firstName || !form.email || !form.password) {
      toast.warning('Please fill all required fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register({
        companyName: form.companyName,
        erpType: form.erpType,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      toast.success('Registration successful! PENDING APPROVAL.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" />
      <div className="auth-container register-container animate-fade-up">
        <div className="auth-card auth-card-wide">
          <div className="auth-brand">
            <div className="auth-logo">
              <HardHat size={32} />
            </div>
            <h1 className="auth-title">Create Your Company</h1>
            <p className="auth-subtitle">
              Set up your Innonsh Infra ERP in minutes
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Company Info */}
            <div className="auth-section-label">Company Details</div>
            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <div className="auth-input-wrapper">
                  <Building2 size={16} />
                  <input
                    name="companyName"
                    className="form-input"
                    placeholder="Acme Constructions Pvt. Ltd."
                    value={form.companyName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Business Type *</label>
                <select
                  name="erpType"
                  className="form-select"
                  value={form.erpType}
                  onChange={handleChange}
                >
                  <option value="CONTRACTOR">Contractor / Construction</option>
                  <option value="BUILDER">Builder / Real Estate Developer</option>
                </select>
              </div>
            </div>

            {/* Admin User */}
            <div className="auth-section-label">Admin Account</div>
            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <div className="auth-input-wrapper">
                  <User size={16} />
                  <input
                    name="firstName"
                    className="form-input"
                    placeholder="Rajesh"
                    value={form.firstName}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  name="lastName"
                  className="form-input"
                  placeholder="Kumar"
                  value={form.lastName}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div className="auth-input-wrapper">
                <Mail size={16} />
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="auth-form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} />
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full auth-submit"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  Create Company & Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
