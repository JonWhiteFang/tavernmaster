type NavItem<ScreenKey extends string> = {
  id: ScreenKey;
  label: string;
};

type NavSection<ScreenKey extends string> = {
  title: string;
  items: NavItem<ScreenKey>[];
};

type SidebarNavProps<ScreenKey extends string> = {
  sections: NavSection<ScreenKey>[];
  activeScreen: ScreenKey;
  onNavigate: (screen: ScreenKey) => void;
};

export default function SidebarNav<ScreenKey extends string>({
  sections,
  activeScreen,
  onNavigate
}: SidebarNavProps<ScreenKey>) {
  return (
    <aside className="sidebar">
      {sections.map((section, sectionIndex) => (
        <div key={section.title}>
          <div className="nav-section">{section.title}</div>
          {section.items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeScreen === item.id ? "is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={activeScreen === item.id ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
          {sectionIndex < sections.length - 1 ? <div className="nav-divider" /> : null}
        </div>
      ))}
    </aside>
  );
}
