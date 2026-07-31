import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, helper, icon, tone = "blue" }: { label: string; value: string; helper?: string; icon?: ReactNode; tone?: "blue" | "green" | "orange" | "red" | "purple" }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{icon ?? "•"}</div>
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
    </article>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon">⌁</div><strong>{title}</strong><p>{description}</p></div>;
}
