import type { CSSProperties, PropsWithChildren } from "react";

type PanelProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  delay?: number;
}>;

export default function Panel({ title, subtitle, delay, children }: PanelProps) {
  return (
    <section
      className="panel"
      style={delay ? ({ "--delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      <div className="panel-header">
        <div>
          <div className="panel-title">{title}</div>
          {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
        </div>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
