import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { HardHat, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import './Auth.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Invalid token. Please request a new link.');
      return;
    }

    if (!password || !confirmPassword) {
      toast.warning('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      toast.warning('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({ token, newPassword: password });
      toast.success('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Token is invalid or has expired. Please request a new link.');
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
            <h1 className="auth-title">Innonsh Infra</h1>
            <p className="auth-subtitle">Construction & Infrastructure ERP Platform</p>
          </div>

          {!token ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg) auto',
                color: 'var(--text-danger)'
              }}>
                <ShieldAlert size={28} />
              </div>
              <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '18px', fontWeight: 600 }}>Missing Security Token</h3>
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-xl)', lineHeight: 1.5 }}>
                A valid secure token is required to reset your password. Please check your email or request a new reset link.
              </p>
              <Link to="/forgot-password" className="btn btn-primary w-full" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '18px', fontWeight: 600 }}>Reset Password</h3>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Enter your new secure password below to update your account access.
                </p>
              </div>

              {/* Form */}
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="•••••••• (Min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
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
                  <label className="form-label">Confirm New Password</label>
                  <div className="auth-input-wrapper">
                    <Lock size={16} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
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

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full auth-submit"
                  disabled={loading}
                >
                  <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                  {!loading && <ArrowRight size={18} />}
                </button>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
                  <Link to="/forgot-password" className="auth-forgot-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowLeft size={14} /> Request new link
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
