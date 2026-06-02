import './PageWrapper.css';

export default function PageWrapper({ children, title, subtitle, actions }) {
  return (
    <div className="page-wrapper animate-fade-in">
      {(title || actions) && (
        <div className="page-header">
          <div className="page-header-text">
            {title && <h2 className="page-title">{title}</h2>}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </div>
      )}
      <div className="page-content">{children}</div>
    </div>
  );
}
