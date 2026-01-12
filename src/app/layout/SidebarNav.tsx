import { useDeveloperMode } from "../state/developerMode";

type NavItem<ScreenKey extends string> = {
  id: ScreenKey;
  label: string;
  devOnly?: boolean;
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
  const { developerMode } = useDeveloperMode();

  return (
    <aside className="sidebar">
      {sections.map((section, sectionIndex) => {
        const visibleItems = section.items.filter((item) => !item.devOnly || developerMode);
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.title}>
            <div className="nav-section">{section.title}</div>
            {visibleItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeScreen === item.id ? "is-active" : ""}`}
                onClick={() => onNavigate(item.id)}
                aria-current={activeScreen === item.id ? "page" : undefined}
                data-tutorial-id={`nav-${item.id}`}
              >
                {item.label}
              </button>
            ))}
            {sectionIndex < sections.length - 1 ? <div className="nav-divider" /> : null}
          </div>
        );
      })}
    </aside>
  );
}
