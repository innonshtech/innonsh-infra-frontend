import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HardHat, ArrowUpRight, ArrowRight, LayoutGrid, ShieldCheck, Cloud, Users,
  LayoutDashboard, Briefcase, Package, Banknote, Truck, BarChart3, Bell,
  Settings2, Puzzle, Smartphone, Zap, Activity, TrendingDown, UsersRound,
  Layers, Check, Sparkles, MoreHorizontal, IndianRupee, TrendingUp,
  UserCheck, CheckCircle2, Calendar, CircleDot, Search, Filter,
  FileCheck2, Route, LogIn, Rocket, CalendarCheck, MapPin, Mail, Phone,
  Globe, Share2, ExternalLink
} from 'lucide-react';
import './LandingPage.css';
import buildingLogo from '../../assets/Building_logo.png';

/* ═══════════════════════════════════════════════════════════════════════════
   INNONSH INFRA — Landing Page (React)
   Converted from static HTML · All branding = Innonsh Infra
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  // Scroll-reveal observer
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.lp-reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-page">
      {/* ──────────────────── NAV ──────────────────── */}
      <Header />

      {/* ──────────────────── HERO ──────────────────── */}
      <HeroSection />

      {/* ──────────────────── OVERVIEW ──────────────────── */}
      <OverviewSection />

      {/* ──────────────────── MODULES ──────────────────── */}
      <ModulesSection />

      {/* ──────────────────── FEATURES ──────────────────── */}
      <FeaturesSection />

      {/* ──────────────────── HOW IT WORKS ──────────────────── */}
      <HowItWorksSection />

      {/* ──────────────────── CTA ──────────────────── */}
      <CTASection />

      {/* ──────────────────── FOOTER ──────────────────── */}
      <FooterSection />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════════════════ */
function Header() {
  return (
    <header className="lp-header">
      <div className="lp-glass lp-header-inner">
        <nav className="lp-container lp-nav">
          <a href="#" className="lp-logo">
            <img src={buildingLogo} alt="Innonsh Infra Logo" className="lp-logo-img" />
            <div className="lp-logo-text">
              <div className="lp-logo-title">Innonsh<span>Infra</span></div>
              <div className="lp-logo-subtitle">Build. Track. Deliver.</div>
            </div>
          </a>

          <div className="lp-nav-links">
            <a href="#modules">Modules</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn-ghost lp-nav-signin">Sign in</Link>
            <a href="#cta" className="lp-btn-primary">
              Request Demo
              <ArrowUpRight size={16} />
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="lp-hero">
      {/* Backgrounds */}
      <div className="lp-hero-bg lp-hero-mesh" />
      <div className="lp-hero-bg lp-bg-grid lp-mask-fade" style={{ opacity: 0.7 }} />
      <div className="lp-hero-blob" />

      <div className="lp-container lp-hero-content">
        <div className="lp-hero-grid">
          {/* Copy */}
          <div>
            <h1 className="lp-hero-headline lp-rise-1">
              Smart Construction<br />
              Management, <span className="lp-serif">Simplified.</span>
            </h1>

            <p className="lp-hero-subtitle lp-rise-2">
              One unified platform for your projects, labour, materials, finance, and equipment — built for construction companies that move fast and build big.
            </p>

            <div className="lp-hero-ctas lp-rise-3">
              <a href="#cta" className="lp-btn-primary">
                Request Demo
                <ArrowRight size={16} />
              </a>
              <a href="#modules" className="lp-btn-ghost">
                <LayoutGrid size={16} />
                View Features
              </a>
            </div>

            <div className="lp-hero-trust lp-rise-4">
              <div className="lp-hero-trust-item">
                <ShieldCheck size={16} className="lp-icon-teal-600" />
                ISO 27001 ready
              </div>
              <div className="lp-hero-trust-item">
                <Cloud size={16} className="lp-icon-indigo" />
                Cloud + on-prem
              </div>
              <div className="lp-hero-trust-item">
                <Users size={16} className="lp-icon-ink-500" />
                Unlimited users
              </div>
            </div>
          </div>

          {/* Mock Dashboard */}
          <div className="lp-rise-3">
            <HeroDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <div className="lp-hero-dashboard lp-float">
      <div className="lp-hero-dashboard-glow" />

      <div className="lp-glass-strong lp-hero-dashboard-card">
        {/* Window Chrome */}
        <div className="lp-window-chrome">
          <div className="lp-window-dots">
            <span className="lp-window-dot" style={{ background: '#FCA5A5' }} />
            <span className="lp-window-dot" style={{ background: '#FCD34D' }} />
            <span className="lp-window-dot" style={{ background: '#6EE7B7' }} />
          </div>
          <div className="lp-window-url">app.innonshinfra.io / dashboard</div>
          <MoreHorizontal size={16} className="lp-icon-ink-400" />
        </div>

        {/* KPI row */}
        <div className="lp-kpi-grid">
          <div className="lp-kpi-card">
            <div className="lp-kpi-label"><Briefcase size={14} />Active projects</div>
            <div className="lp-kpi-value">
              <div className="lp-kpi-number">24</div>
              <span className="lp-kpi-change lp-kpi-change-teal">+3</span>
            </div>
          </div>
          <div className="lp-kpi-card">
            <div className="lp-kpi-label"><Users size={14} />Workers on site</div>
            <div className="lp-kpi-value">
              <div className="lp-kpi-number">1,287</div>
              <span className="lp-kpi-change lp-kpi-change-teal">98%</span>
            </div>
          </div>
          <div className="lp-kpi-card">
            <div className="lp-kpi-label"><IndianRupee size={14} />Budget utilised</div>
            <div className="lp-kpi-value">
              <div className="lp-kpi-number">68%</div>
              <span className="lp-kpi-change lp-kpi-change-amber">on track</span>
            </div>
          </div>
        </div>

        {/* Chart + Alerts */}
        <div className="lp-chart-row">
          {/* Chart */}
          <div className="lp-chart-card">
            <div className="lp-chart-header">
              <div>
                <div className="lp-chart-title">Project velocity</div>
                <div className="lp-chart-subtitle">Last 7 days</div>
              </div>
              <div className="lp-chart-legend">
                <span className="lp-chart-legend-label">Planned</span>
                <span className="lp-chart-legend-dot" style={{ background: '#CBD5E1' }} />
                <span className="lp-chart-legend-label" style={{ marginLeft: '8px' }}>Actual</span>
                <span className="lp-chart-legend-dot" style={{ background: '#4F46E5' }} />
              </div>
            </div>
            <div className="lp-bars-container">
              {[
                [40, 55], [55, 62], [60, 72], [48, 58], [70, 84], [65, 90], [75, 96]
              ].map(([planned, actual], i) => (
                <div className="lp-bar-group" key={i}>
                  <div className="lp-bar lp-bar-item" style={{ height: `${planned}%`, background: '#E2E8F0' }} />
                  <div className="lp-bar lp-bar-item" style={{ height: `${actual}%`, background: '#4F46E5' }} />
                </div>
              ))}
            </div>
            <div className="lp-chart-days">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          {/* Alerts */}
          <div className="lp-chart-card">
            <div className="lp-alerts-header">
              <div className="lp-alerts-title">Live alerts</div>
              <span className="lp-chip" style={{ fontSize: 10, padding: '2px 8px' }}>
                <span style={{ width: 6, height: 6, background: '#14B8A6', borderRadius: '50%', display: 'inline-block' }} />
                3 new
              </span>
            </div>
            <ul className="lp-alerts-list">
              <li className="lp-alert-item">
                <Package size={16} className="lp-icon-amber" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div className="lp-alert-title">Cement low at Site B</div>
                  <div className="lp-alert-desc">Reorder 120 bags</div>
                </div>
              </li>
              <li className="lp-alert-item">
                <CheckCircle2 size={16} className="lp-icon-teal-600" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div className="lp-alert-title">Milestone cleared</div>
                  <div className="lp-alert-desc">Tower 4 — Slab 12</div>
                </div>
              </li>
              <li className="lp-alert-item">
                <UserCheck size={16} className="lp-icon-indigo" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div className="lp-alert-title">Payroll approved</div>
                  <div className="lp-alert-desc">₹14.2L · 312 workers</div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Floating side stat: On-time delivery */}
      <div className="lp-floating-stat lp-glass lp-floating-stat-left">
        <div style={{ fontSize: 11, color: '#64748B' }}>On-time delivery</div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>94.2%</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#0D9488', display: 'inline-flex', alignItems: 'center' }}>
            <TrendingUp size={12} style={{ marginRight: 4 }} />+6.1
          </span>
        </div>
        <div className="lp-progress-bar-track">
          <div className="lp-progress-bar-fill" style={{ width: '94%' }} />
        </div>
      </div>

      {/* Floating bottom right: Today's attendance */}
      <div className="lp-floating-stat lp-glass lp-floating-stat-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="lp-module-icon lp-bg-indigo" style={{ width: 28, height: 28, borderRadius: 8 }}>
            <HardHat size={16} className="lp-icon-indigo" />
          </span>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 11, color: '#64748B' }}>Today's attendance</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>412 / 430 present</div>
          </div>
        </div>
        <div className="lp-avatar-stack">
          <span style={{ background: '#C7D2FE' }} />
          <span style={{ background: '#99F6E4' }} />
          <span style={{ background: '#FDE68A' }} />
          <span style={{ background: '#FECDD3' }} />
          <span className="lp-avatar-count">+8</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERVIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function OverviewSection() {
  const benefits = [
    { icon: Activity, color: 'indigo', title: 'Real-time tracking', desc: 'Live progress, attendance and stock — straight from the site to your desk.' },
    { icon: TrendingDown, color: 'teal', title: 'Cost control', desc: 'Catch budget drift early with live variance, smart approvals, and clean audit trails.' },
    { icon: UsersRound, color: 'amber', title: 'Workforce management', desc: 'Roster, attendance and payroll for thousands of workers, across many sites.' },
    { icon: Layers, color: 'rose', title: 'Centralized operations', desc: 'One platform replacing spreadsheets, WhatsApp groups, and disconnected tools.' },
  ];

  return (
    <section className="lp-overview">
      <div className="lp-container">
        <div className="lp-overview-grid">
          <div className="lp-reveal">
            <div className="lp-chip lp-section-chip">
              <Sparkles size={14} className="lp-icon-indigo" />
              <span>Why Innonsh Infra</span>
            </div>
            <h2 className="lp-section-heading">
              Every part of your build, <span className="lp-accent-underline">connected.</span>
            </h2>
            <p className="lp-section-desc">
              Innonsh Infra brings projects, people, materials and money into one system — so site engineers, project managers and finance teams work from the same source of truth.
            </p>
            <a href="#modules" className="lp-section-link">
              Explore modules <ArrowRight size={16} />
            </a>
          </div>

          <div className="lp-benefits-grid">
            {benefits.map((b, i) => (
              <div className="lp-benefit-card lp-reveal" key={i}>
                <div className={`lp-benefit-icon lp-bg-${b.color}`}>
                  <b.icon size={20} className={`lp-icon-${b.color}`} />
                </div>
                <h3 className="lp-benefit-title">{b.title}</h3>
                <p className="lp-benefit-desc">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODULES GRID
   ═══════════════════════════════════════════════════════════════════════════ */
function ModulesSection() {
  const modules = [
    { icon: LayoutDashboard, color: 'indigo', title: 'Dashboard', desc: 'Real-time KPIs, alerts, and quick actions across every project.', tags: ['KPIs', 'Alerts'] },
    { icon: Briefcase, color: 'teal', title: 'Projects', desc: 'Timelines, milestones, status tracking — manage every project end to end.', tags: ['Gantt', 'Milestones'] },
    { icon: HardHat, color: 'amber', title: 'Labour Management', desc: 'Worker database, attendance, payroll — all in one secure place.', tags: ['Attendance', 'Payroll'] },
    { icon: Package, color: 'rose', title: 'Materials', desc: 'Inventory tracking, purchase orders and stock alerts across every site.', tags: ['Inventory', 'POs'] },
    { icon: Banknote, color: 'emerald', title: 'Finance', desc: 'Budgeting, expenses, invoices and reports — full financial visibility.', tags: ['Budgets', 'Invoices'] },
    { icon: Truck, color: 'sky', title: 'Equipment', desc: 'Asset tracking, maintenance schedules and utilisation across the fleet.', tags: ['Assets', 'Maintenance'] },
    { icon: BarChart3, color: 'violet', title: 'Reports', desc: 'Analytics, downloadable reports and custom performance metrics.', tags: ['Analytics', 'Export'] },
    { icon: Bell, color: 'orange', title: 'Notifications', desc: 'Smart alerts for delays, approvals and low stock — never miss the critical signal.', tags: ['Alerts', 'Approvals'] },
    { icon: Settings2, color: 'slate', title: 'Settings', desc: 'User roles, permissions and system configuration tailored to your org.', tags: ['Roles', 'Config'] },
    { icon: ShieldCheck, color: 'cyan', title: 'Authentication', desc: 'Secure login, password recovery and a guided onboarding setup.', tags: ['SSO', 'Onboarding'] },
  ];

  return (
    <section id="modules" className="lp-modules">
      <div className="lp-modules-bg lp-bg-grid-soft lp-mask-fade" />
      <div className="lp-container lp-modules-content">
        <div className="lp-modules-header lp-reveal">
          <div className="lp-chip lp-section-chip">
            <LayoutGrid size={14} className="lp-icon-indigo" />
            <span>10 powerful modules</span>
          </div>
          <h2 className="lp-section-heading">
            A full <span className="lp-serif" style={{ fontStyle: 'italic', fontWeight: 400, color: '#4338CA' }}>construction stack</span>, out of the box.
          </h2>
          <p className="lp-section-desc">From site attendance to financial reports — every module is purpose-built for the way construction actually works.</p>
        </div>

        <div className="lp-modules-grid">
          {modules.map((m, i) => (
            <a href="#" className="lp-module-card lp-reveal" key={i}>
              <div className="lp-module-header">
                <div className={`lp-module-icon lp-bg-${m.color}`}>
                  <m.icon size={20} className={`lp-icon-${m.color}`} />
                </div>
                <ArrowUpRight size={16} className="lp-module-arrow lp-icon-ink-500" />
              </div>
              <h3 className="lp-module-title">{m.title}</h3>
              <p className="lp-module-desc">{m.desc}</p>
              <div className="lp-module-tags">
                {m.tags.map((t) => <span className="lp-code-tag" key={t}>{t}</span>)}
              </div>
            </a>
          ))}

          {/* Integrations accent card */}
          <div className="lp-module-card lp-module-card-accent lp-reveal">
            <div className="lp-module-header">
              <div className="lp-module-icon lp-bg-white-15">
                <Puzzle size={20} className="lp-icon-white" />
              </div>
              <ArrowUpRight size={16} className="lp-module-arrow lp-icon-white-80" />
            </div>
            <h3 className="lp-module-title">+ Integrations</h3>
            <p className="lp-module-desc lp-module-desc-light">Connect Tally, SAP, biometric devices, GPS trackers and more.</p>
            <div className="lp-module-tags">
              <span className="lp-code-tag-light">REST API</span>
              <span className="lp-code-tag-light">Webhooks</span>
            </div>
          </div>

          {/* Mobile card */}
          <a href="#" className="lp-module-card lp-reveal">
            <div className="lp-module-header">
              <div className="lp-module-icon lp-bg-fuchsia">
                <Smartphone size={20} className="lp-icon-fuchsia" />
              </div>
              <ArrowUpRight size={16} className="lp-module-arrow lp-icon-ink-500" />
            </div>
            <h3 className="lp-module-title">Mobile App</h3>
            <p className="lp-module-desc">Site supervisors capture attendance, photos and updates from the field.</p>
            <div className="lp-module-tags">
              <span className="lp-code-tag">iOS</span>
              <span className="lp-code-tag">Android</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE HIGHLIGHTS
   ═══════════════════════════════════════════════════════════════════════════ */
function FeaturesSection() {
  return (
    <section id="features" className="lp-features">
      <div className="lp-container">
        <div className="lp-features-header lp-reveal">
          <div className="lp-chip lp-section-chip">
            <Zap size={14} className="lp-icon-indigo" />
            <span>Built for the field &amp; the boardroom</span>
          </div>
          <h2 className="lp-section-heading">
            Designed for the way construction <span className="lp-serif" style={{ fontStyle: 'italic', fontWeight: 400, color: '#4338CA' }}>actually moves.</span>
          </h2>
        </div>

        {/* Feature 1: Dashboard */}
        <FeatureDashboard />

        {/* Feature 2: Projects (reverse) */}
        <FeatureProjects />

        {/* Feature 3: Materials */}
        <FeatureMaterials />

        {/* Feature 4: Finance (reverse) */}
        <FeatureFinance />
      </div>
    </section>
  );
}

function FeatureDashboard() {
  return (
    <div className="lp-feature-block">
      <div className="lp-reveal">
        <span className="lp-feature-label">01 — Dashboard</span>
        <h3 className="lp-feature-title">Real-time dashboard insights.</h3>
        <p className="lp-feature-desc">A single pane of glass for owners and PMs. Watch progress, manpower, cash burn and risks across all sites — updated the moment things change on the ground.</p>
        <ul className="lp-feature-list">
          {['Custom KPIs & widgets', 'Cross-project drill-down', 'Role-based views (Owner, PM, Site)'].map((t) => (
            <li className="lp-feature-list-item" key={t}>
              <span className="lp-feature-check"><Check size={12} /></span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-reveal">
        <div className="lp-feature-visual">
          <div className="lp-feature-visual-glow" style={{ background: 'linear-gradient(to top right, rgba(224,231,255,.7), rgba(204,251,241,.4))' }} />
          <div className="lp-feature-visual-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Portfolio overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 11, color: '#64748B' }}>
                <span className="lp-chip" style={{ padding: '2px 8px', fontSize: 11 }}><span className="lp-pulse-dot" />Live</span>
                <span className="lp-chip" style={{ padding: '2px 8px', fontSize: 11 }}><Calendar size={12} />Q2 · 2026</span>
              </div>
            </div>

            <div className="lp-portfolio-kpis">
              {[
                { label: 'Revenue', value: '₹128.4 Cr', change: '+8.4% MoM', color: '#0F766E' },
                { label: 'Cash burn', value: '₹42.1 Cr', change: '-2.1% MoM', color: '#92400E' },
                { label: 'Headcount', value: '3,240', change: '17 sites', color: '#64748B' },
                { label: 'Risk index', value: 'Low', change: '3 watch items', color: '#0F766E' },
              ].map((k, i) => (
                <div className="lp-portfolio-kpi" key={i}>
                  <div className="lp-portfolio-kpi-label">{k.label}</div>
                  <div className="lp-portfolio-kpi-value">{k.value}</div>
                  <div className="lp-portfolio-kpi-change" style={{ color: k.color }}>{k.change}</div>
                </div>
              ))}
            </div>

            {/* Line chart */}
            <div className="lp-line-chart-card">
              <div className="lp-line-chart-header">
                <span style={{ fontWeight: 600, color: '#334155' }}>Cash flow vs plan · last 12 weeks</span>
                <span>₹ Crore</span>
              </div>
              <svg viewBox="0 0 600 160" className="lp-line-chart-svg">
                <defs>
                  <linearGradient id="lp-g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity=".25" />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g stroke="#E2E8F0" strokeWidth="1">
                  <line x1="0" x2="600" y1="40" y2="40" />
                  <line x1="0" x2="600" y1="80" y2="80" />
                  <line x1="0" x2="600" y1="120" y2="120" />
                </g>
                <path d="M0,90 C60,85 80,95 130,80 C180,68 220,75 270,68 C320,60 360,68 410,55 C460,42 510,50 600,40" fill="none" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth="2" />
                <path d="M0,100 C60,90 100,110 150,85 C200,60 240,72 290,55 C340,40 380,52 430,38 C480,24 530,30 600,18 L600,160 L0,160 Z" fill="url(#lp-g1)" />
                <path d="M0,100 C60,90 100,110 150,85 C200,60 240,72 290,55 C340,40 380,52 430,38 C480,24 530,30 600,18" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="600" cy="18" r="4" fill="#4F46E5" />
                <circle cx="600" cy="18" r="8" fill="#4F46E5" fillOpacity=".25" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureProjects() {
  return (
    <div className="lp-feature-block-reverse">
      {/* Visual first on lg */}
      <div className="lp-reveal">
        <div className="lp-feature-visual">
          <div className="lp-feature-visual-glow" style={{ background: 'linear-gradient(to bottom left, rgba(204,251,241,.6), rgba(224,231,255,.4))' }} />
          <div className="lp-feature-visual-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Skyline Heights — Tower B</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Started Jan 2026 · Handover Aug 2027</div>
              </div>
              <span className="lp-chip" style={{ fontSize: 11 }}><CircleDot size={12} className="lp-icon-teal-600" />On track</span>
            </div>

            <div className="lp-gantt-bars">
              {[
                { label: 'Foundation', pct: 100, color: 'linear-gradient(to right, #2DD4BF, #0D9488)' },
                { label: 'Structure', pct: 72, color: 'linear-gradient(to right, #6366F1, #4338CA)' },
                { label: 'MEP', pct: 34, color: 'linear-gradient(to right, #6366F1, #4338CA)' },
                { label: 'Finishes', pct: 8, color: 'linear-gradient(to right, #FBBF24, #D97706)' },
              ].map((b, i) => (
                <div key={i}>
                  <div className="lp-gantt-bar-header"><span>{b.label}</span><span>{b.pct}%</span></div>
                  <div className="lp-gantt-bar-track">
                    <div className="lp-gantt-bar-fill" style={{ width: `${b.pct}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-stats-row">
              <div className="lp-stat-mini"><div className="lp-stat-mini-label">Milestones</div><div className="lp-stat-mini-value">14 / 22</div></div>
              <div className="lp-stat-mini"><div className="lp-stat-mini-label">Open RFIs</div><div className="lp-stat-mini-value">7</div></div>
              <div className="lp-stat-mini"><div className="lp-stat-mini-label">Variance</div><div className="lp-stat-mini-value" style={{ color: '#0F766E' }}>-1.4 days</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="lp-reveal">
        <span className="lp-feature-label">02 — Projects</span>
        <h3 className="lp-feature-title">Project lifecycle, fully tracked.</h3>
        <p className="lp-feature-desc">From kickoff to handover, monitor every phase, milestone, and dependency. Spot slippage early and align contractors, vendors and your team on a single timeline.</p>
        <ul className="lp-feature-list">
          {['Visual Gantt & milestone tracking', 'RFIs, change orders & approvals', 'Contractor & vendor coordination'].map((t) => (
            <li className="lp-feature-list-item" key={t}>
              <span className="lp-feature-check"><Check size={12} /></span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FeatureMaterials() {
  const inventory = [
    { item: 'OPC Cement (50kg)', site: 'Skyline B', stock: '240 bags', status: 'healthy' },
    { item: 'TMT Steel 12mm', site: 'NorthGate 1', stock: '3.2 t', status: 'reorder' },
    { item: 'M-Sand', site: 'Vertex Tower', stock: '120 cu·ft', status: 'low' },
    { item: 'Aluminium Shuttering', site: 'Skyline B', stock: '1,200 sq·ft', status: 'healthy' },
    { item: 'Bitumen 60/70', site: 'Hammerhead', stock: '8.4 t', status: 'healthy' },
  ];
  const statusLabels = { healthy: 'Healthy', reorder: 'Reorder soon', low: 'Low stock' };

  return (
    <div className="lp-feature-block">
      <div className="lp-reveal">
        <span className="lp-feature-label">03 — Materials</span>
        <h3 className="lp-feature-title">Smart inventory management.</h3>
        <p className="lp-feature-desc">Know exactly what's on every site, what's coming in, and what's running out — before it stops your work. Auto-reorder rules and supplier ratings keep procurement effortless.</p>
        <ul className="lp-feature-list">
          {['Multi-site stock visibility', 'Auto-reorder thresholds', 'Supplier scorecards'].map((t) => (
            <li className="lp-feature-list-item" key={t}>
              <span className="lp-feature-check"><Check size={12} /></span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="lp-reveal">
        <div className="lp-feature-visual">
          <div className="lp-feature-visual-glow" style={{ background: 'linear-gradient(to top right, rgba(254,243,199,.4), rgba(224,231,255,.5))' }} />
          <div className="lp-feature-visual-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Inventory · all sites</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="lp-chip" style={{ fontSize: 11 }}><Search size={12} />Search</span>
                <span className="lp-chip" style={{ fontSize: 11 }}><Filter size={12} />Filter</span>
              </div>
            </div>
            <table className="lp-inv-table">
              <thead><tr><th>Item</th><th>Site</th><th>In stock</th><th>Status</th></tr></thead>
              <tbody>
                {inventory.map((row, i) => (
                  <tr key={i}>
                    <td className="lp-inv-item">{row.item}</td>
                    <td className="lp-inv-site">{row.site}</td>
                    <td>{row.stock}</td>
                    <td><span className={`lp-status-chip lp-status-${row.status}`}>{statusLabels[row.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureFinance() {
  return (
    <div className="lp-feature-block-reverse">
      <div className="lp-reveal">
        <div className="lp-feature-visual">
          <div className="lp-feature-visual-glow" style={{ background: 'linear-gradient(to bottom right, rgba(167,243,208,.5), rgba(224,231,255,.4))' }} />
          <div className="lp-feature-visual-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Budget vs. spend</div>
              <span className="lp-chip" style={{ fontSize: 11 }}><IndianRupee size={12} />FY 25-26</span>
            </div>

            <div className="lp-donut-grid">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 120 120" className="lp-donut-svg">
                  <circle cx="60" cy="60" r="46" stroke="#E2E8F0" strokeWidth="14" fill="none" />
                  <circle cx="60" cy="60" r="46" stroke="#4F46E5" strokeWidth="14" fill="none"
                    strokeDasharray="289" strokeDashoffset="179" transform="rotate(-90 60 60)" strokeLinecap="round" />
                  <circle cx="60" cy="60" r="46" stroke="#0D9488" strokeWidth="14" fill="none"
                    strokeDasharray="289" strokeDashoffset="208" transform="rotate(40 60 60)" strokeLinecap="round" />
                  <circle cx="60" cy="60" r="46" stroke="#F59E0B" strokeWidth="14" fill="none"
                    strokeDasharray="289" strokeDashoffset="237" transform="rotate(140 60 60)" strokeLinecap="round" />
                  <text x="60" y="58" textAnchor="middle" fontWeight="bold" fontSize="14" fill="#0F172A">68%</text>
                  <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#64748B">utilised</text>
                </svg>
              </div>
              <div className="lp-breakdown-list">
                {[
                  { label: 'Materials', color: '#4F46E5', value: '₹48.6 Cr', total: '/ ₹64 Cr' },
                  { label: 'Labour', color: '#0D9488', value: '₹32.1 Cr', total: '/ ₹46 Cr' },
                  { label: 'Equipment', color: '#F59E0B', value: '₹19.4 Cr', total: '/ ₹28 Cr' },
                  { label: 'Overhead', color: '#CBD5E1', value: '₹8.7 Cr', total: '/ ₹14 Cr' },
                ].map((b, i) => (
                  <div className="lp-breakdown-item" key={i}>
                    <div className="lp-breakdown-label">
                      <span className="lp-breakdown-dot" style={{ background: b.color }} />
                      {b.label}
                    </div>
                    <div className="lp-breakdown-value">{b.value} <span>{b.total}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-invoice-row">
              <div className="lp-invoice-info">
                <span className="lp-invoice-icon lp-bg-emerald">
                  <FileCheck2 size={16} className="lp-icon-emerald" />
                </span>
                <div className="lp-invoice-text">
                  <div className="lp-invoice-title">Invoice #INV-20467 · approved</div>
                  <div className="lp-invoice-desc">Vendor: Ambuja Cement · ₹4,82,300</div>
                </div>
              </div>
              <span className="lp-status-chip lp-status-healthy">Paid</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-reveal">
        <span className="lp-feature-label">04 — Finance</span>
        <h3 className="lp-feature-title">Financial control &amp; reporting.</h3>
        <p className="lp-feature-desc">Tie every rupee to a project, phase or PO. Approvals, invoices, and cost reports flow through one clean system — built for CFOs and audit teams alike.</p>
        <ul className="lp-feature-list">
          {['Project-wise P&L', 'Multi-step approvals & audit trail', 'GST-ready invoices & exports'].map((t) => (
            <li className="lp-feature-list-item" key={t}>
              <span className="lp-feature-check"><Check size={12} /></span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════ */
function HowItWorksSection() {
  const steps = [
    { icon: LogIn, variant: 'indigo', title: 'Login', desc: 'Secure SSO or password login with role-based access.' },
    { icon: LayoutDashboard, variant: 'indigo', title: 'Dashboard', desc: 'Land on a tailored dashboard with the KPIs that matter to your role.' },
    { icon: Briefcase, variant: 'indigo', title: 'Projects', desc: 'Open a project to see timelines, milestones, and live progress.' },
    { icon: Layers, variant: 'teal', title: 'Manage modules', desc: 'Update labour, materials, finance and equipment — all in one place.' },
    { icon: BarChart3, variant: 'teal', title: 'Reports', desc: 'Pull insights, share reports, and close the loop with stakeholders.' },
  ];

  return (
    <section id="how" className="lp-how">
      <div className="lp-how-dots-bg" />
      <div className="lp-how-glow" />

      <div className="lp-container lp-how-content">
        <div className="lp-how-header lp-reveal">
          <div className="lp-how-chip">
            <Route size={14} />
            How it works
          </div>
          <h2 className="lp-how-heading">
            From login to insight, in <span className="lp-serif">five clear steps.</span>
          </h2>
          <p className="lp-how-desc">A clean, predictable flow so your team can adopt the platform fast — no two-week training programs needed.</p>
        </div>

        <div className="lp-steps-container">
          <div className="lp-steps-line lp-step-line" />
          <ol className="lp-steps-grid">
            {steps.map((s, i) => (
              <li className="lp-reveal" key={i}>
                <div className={`lp-step-icon lp-step-icon-${s.variant}`}>
                  <s.icon size={24} color="white" />
                </div>
                <div className="lp-step-number">Step {String(i + 1).padStart(2, '0')}</div>
                <h4 className="lp-step-title">{s.title}</h4>
                <p className="lp-step-desc">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CTA
   ═══════════════════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section id="cta" className="lp-cta">
      <div className="lp-container">
        <div className="lp-cta-card">
          <div className="lp-cta-dots" />
          <div className="lp-cta-blob-1" />
          <div className="lp-cta-blob-2" />

          <div className="lp-cta-inner">
            <div>
              <div className="lp-cta-chip">
                <Rocket size={14} />
                Ready when you are
              </div>
              <h2 className="lp-cta-heading">
                Ready to transform your <span className="lp-serif">construction workflow?</span>
              </h2>
              <p className="lp-cta-desc">Join construction firms across India running tighter projects, leaner sites and cleaner books — with Innonsh Infra.</p>
              <div className="lp-cta-buttons">
                <a href="#contact" className="lp-cta-btn-white">
                  Request Demo <ArrowRight size={16} />
                </a>
                <a href="#contact" className="lp-cta-btn-outline">Contact Sales</a>
              </div>
              <div className="lp-cta-checks">
                <span className="lp-cta-check"><Check size={14} style={{ color: '#5EEAD4' }} />30-day pilot</span>
                <span className="lp-cta-check"><Check size={14} style={{ color: '#5EEAD4' }} />Migration assistance</span>
                <span className="lp-cta-check"><Check size={14} style={{ color: '#5EEAD4' }} />Local support</span>
              </div>
            </div>

            {/* Demo form */}
            <div className="lp-demo-form">
              <div className="lp-demo-form-title">Get a 20-min walkthrough</div>
              <div className="lp-demo-form-subtitle">Tell us a bit about your projects.</div>
              <div className="lp-demo-form-fields">
                <div>
                  <label>Work email</label>
                  <input type="email" placeholder="you@company.com" />
                </div>
                <div>
                  <label>Company</label>
                  <input type="text" placeholder="Apex Build Pvt Ltd" />
                </div>
                <div>
                  <label>Active sites</label>
                  <select>
                    <option>1 – 5 sites</option>
                    <option>6 – 20 sites</option>
                    <option>20+ sites</option>
                  </select>
                </div>
                <button className="lp-demo-form-submit">
                  Book my demo <CalendarCheck size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */
function FooterSection() {
  return (
    <footer id="contact" className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-main">
          <div>
            <div className="lp-logo" style={{ color: 'white' }}>
              <img src={buildingLogo} alt="Innonsh Infra Logo" className="lp-logo-img" />
              <div className="lp-logo-text">
                <div className="lp-logo-title lp-logo-title-light" style={{ color: 'white' }}>Innonsh<span>Infra</span></div>
                <div className="lp-logo-subtitle lp-logo-subtitle-light">Build. Track. Deliver.</div>
              </div>
            </div>
            <p className="lp-footer-desc">A modern, all-in-one ERP designed for construction companies that want to run tighter projects, leaner sites, and cleaner books.</p>
            <div className="lp-footer-contact">
              <div className="lp-footer-contact-item"><MapPin size={16} style={{ color: 'rgba(255,255,255,.5)' }} />Pune</div>
              <div className="lp-footer-contact-item"><Mail size={16} style={{ color: 'rgba(255,255,255,.5)' }} /><a href="mailto:sales@xpertance.in">sales@xpertance.in</a></div>
              <div className="lp-footer-contact-item"><Phone size={16} style={{ color: 'rgba(255,255,255,.5)' }} />+91 84465 44495 &nbsp;/&nbsp; +91 76203 01874</div>
            </div>
          </div>

          <div className="lp-footer-links">
            <div>
              <div className="lp-footer-links-title">Product</div>
              <ul>
                <li><a href="#modules">Modules</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#cta">Request demo</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-container">
        <div className="lp-footer-bottom">
          <div>© 2026 Innonsh Infra. All rights reserved.</div>
          <div className="lp-footer-socials">
            <a href="#"><Globe size={16} />LinkedIn</a>
            <a href="#"><Share2 size={16} />Twitter</a>
            <a href="#"><ExternalLink size={16} />YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
