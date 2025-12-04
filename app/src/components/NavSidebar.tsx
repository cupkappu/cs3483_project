import type { BoardState, GuideSubState } from "../types";

interface NavSectionItem {
  id: BoardState;
  label: string;
  children?: { id: GuideSubState; label: string }[];
}

const navItems: NavSectionItem[] = [
  { id: "home", label: "Home" },
  {
    id: "guide",
    label: "Guide",
    children: [
      { id: "tutorial", label: "Tutorial" },
      { id: "manual", label: "Manual" },
    ],
  },
  { id: "log", label: "Log" },
  { id: "setting", label: "Setting" },
];

interface NavSidebarProps {
  boardState: BoardState;
  guideState: GuideSubState;
  onSelectBoard: (state: BoardState) => void;
  onSelectGuide: (state: GuideSubState) => void;
  onStopAll: () => void;
}

export default function NavSidebar({
  boardState,
  guideState,
  onSelectBoard,
  onSelectGuide,
  onStopAll,
}: NavSidebarProps) {
  return (
    <aside className="nav-pane">
      <div className="nav-brand">ControlBoard</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map((section) => (
          <div key={section.id}>
            <button
              type="button"
              className={
                section.id === boardState ? "nav-item active" : "nav-item"
              }
              onClick={() => onSelectBoard(section.id)}
            >
              {section.label}
            </button>
            {section.children?.map((child) => (
              <button
                key={child.id}
                type="button"
                className={
                  boardState === "guide" && guideState === child.id
                    ? "nav-subitem active"
                    : "nav-subitem"
                }
                onClick={() => onSelectGuide(child.id)}
              >
                {child.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button type="button" className="nav-stop" onClick={onStopAll}>
        Stop All
      </button>
    </aside>
  );
}
