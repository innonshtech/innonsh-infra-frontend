import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { HardHat, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword({ email });
      toast.success('Reset link dispatched successfully');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
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

          {!submitted ? (
            <>
              <div style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '18px', fontWeight: 600 }}>Forgot Password?</h3>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
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
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full auth-submit"
                  disabled={loading}
                >
                  <span>{loading ? 'Sending Link...' : 'Send Reset Link'}</span>
                  {!loading && <ArrowRight size={18} />}
                </button>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
                  <Link to="/login" className="auth-forgot-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowLeft size={14} /> Back to Login
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(5, 150, 105, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-lg) auto',
                color: 'var(--accent-primary)'
              }}>
                <Mail size={28} />
              </div>
              <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '18px', fontWeight: 600 }}>Check Your Inbox</h3>
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-xl)', lineHeight: 1.5 }}>
                If an account exists with the email <strong>{email}</strong>, a secure password reset link has been dispatched to it.
              </p>
              <Link to="/login" className="btn btn-primary w-full" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Return to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
