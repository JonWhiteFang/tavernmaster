import type { ReactNode } from "react";

type ListCardProps = {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
};

export default function ListCard({ title, subtitle, status, children, footer }: ListCardProps) {
  return (
    <div className="list-card">
      <div className="list-card-header">
        <div>
          <div className="list-card-title">{title}</div>
          {subtitle ? <div className="list-card-subtitle">{subtitle}</div> : null}
        </div>
        {status ? <div className="list-card-status">{status}</div> : null}
      </div>
      {children ? <div className="list-card-body">{children}</div> : null}
      {footer ? <div className="list-card-footer">{footer}</div> : null}
    </div>
  );
}
