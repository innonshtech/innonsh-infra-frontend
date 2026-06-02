import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { HardHat, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await login(email, password);
      toast.success('Welcome back!');
      
      const role = response.user?.role?.name || response.user?.role;
      if (role === 'SUPERADMIN') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-pattern" />
      <div className="auth-container animate-fade-up">
        <div className="auth-card">
          {/* Brand */}
          <div className="auth-brand">
            <div className="auth-logo">
              <HardHat size={32} />
            </div>
            <h1 className="auth-title">ConstructERP</h1>
            <p className="auth-subtitle">Construction & Real Estate ERP Platform</p>
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={16} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center">
                <label className="form-label">Password</label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full auth-submit"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register">Create your company</Link>
            </p>
          </div>
        </div>

        {/* Side illustration */}
        <div className="auth-side">
          <div className="auth-side-content">
            <div className="auth-side-graphic">
              <div className="auth-building b1" />
              <div className="auth-building b2" />
              <div className="auth-building b3" />
              <div className="auth-crane" />
            </div>
            <h2>Build Smarter, Manage Better</h2>
            <p>
              End-to-end construction management — from BOQ estimation to unit
              handover. Trusted by contractors and developers.
            </p>
            <div className="auth-side-stats">
              <div className="auth-stat">
                <span className="auth-stat-value">500+</span>
                <span className="auth-stat-label">Projects Managed</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-value">₹200Cr+</span>
                <span className="auth-stat-label">Budget Tracked</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-value">50+</span>
                <span className="auth-stat-label">Companies</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
