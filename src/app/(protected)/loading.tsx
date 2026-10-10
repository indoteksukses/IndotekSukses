export default function ProtectedLoading() {
  return (
    <div className="page-loading-shell" role="status" aria-label="Memuat halaman">
      <div className="page-loading-header">
        <span className="skeleton-line skeleton-title"/>
        <span className="skeleton-line skeleton-subtitle"/>
      </div>
      <div className="stats-grid page-loading-stats">
        {Array.from({ length: 4 }, (_, index) => <div className="stat-card skeleton-card" key={index}><span className="skeleton-block skeleton-icon"/><div><span className="skeleton-line skeleton-label"/><span className="skeleton-line skeleton-value"/><span className="skeleton-line skeleton-helper"/></div></div>)}
      </div>
      <div className="page-loading-grid">
        <section className="panel skeleton-panel"><span className="skeleton-line skeleton-panel-title"/><span className="skeleton-block skeleton-chart"/></section>
        <section className="panel skeleton-panel"><span className="skeleton-line skeleton-panel-title"/>{Array.from({ length: 5 }, (_, index) => <span className="skeleton-line skeleton-row" key={index}/>)}</section>
      </div>
    </div>
  );
}
