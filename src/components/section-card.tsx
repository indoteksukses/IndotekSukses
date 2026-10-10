import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  icon,
  badge,
  actions,
  tone = "default",
  className = "",
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  tone?: "default" | "blue" | "green" | "orange" | "red";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`section-card section-card-${tone} ${className}`.trim()}>
      <header className="section-card-header">
        <div className="section-card-title-wrap">
          {icon ? <span className="section-card-icon">{icon}</span> : null}
          <div>
            <h3>{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        <div className="section-card-header-actions">
          {badge}
          {actions}
        </div>
      </header>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
