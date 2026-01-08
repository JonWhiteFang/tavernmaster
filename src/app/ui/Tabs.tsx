import type { ReactNode } from "react";

type TabItem = {
  id: string;
  label: string;
  badge?: string | number;
  content: ReactNode;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  tutorialPrefix?: string;
};

export default function Tabs({ items, activeId, onChange, tutorialPrefix }: TabsProps) {
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const prefix = tutorialPrefix ?? "tab";

  return (
    <div className="tabs">
      <div className="tab-list" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            className={`tab-button ${item.id === activeId ? "is-active" : ""}`}
            role="tab"
            aria-selected={item.id === activeId}
            onClick={() => onChange(item.id)}
            data-tutorial-id={`${prefix}-${item.id}`}
          >
            <span>{item.label}</span>
            {item.badge !== undefined ? <span className="tab-badge">{item.badge}</span> : null}
          </button>
        ))}
      </div>
      <div className="tab-panel" role="tabpanel">
        {activeItem?.content}
      </div>
    </div>
  );
}
