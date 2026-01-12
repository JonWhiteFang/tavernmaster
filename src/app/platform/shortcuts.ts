import { listen } from "@tauri-apps/api/event";

export type MenuAction =
  | "new_campaign"
  | "undo_turn"
  | "branch"
  | "nav_play"
  | "nav_library"
  | "nav_settings"
  | "toggle_dev";

export interface MenuHandlers {
  onNewCampaign?: () => void;
  onUndoTurn?: () => void;
  onBranch?: () => void;
  onNavigate?: (screen: string) => void;
  onToggleDevMode?: () => void;
}

export async function subscribeMenuEvents(handlers: MenuHandlers): Promise<() => void> {
  const unlisten = await listen<string>("menu-event", (event) => {
    const action = event.payload as MenuAction;

    switch (action) {
      case "new_campaign":
        handlers.onNewCampaign?.();
        break;
      case "undo_turn":
        handlers.onUndoTurn?.();
        break;
      case "branch":
        handlers.onBranch?.();
        break;
      case "nav_play":
        handlers.onNavigate?.("playview");
        break;
      case "nav_library":
        handlers.onNavigate?.("dashboard");
        break;
      case "nav_settings":
        handlers.onNavigate?.("settings");
        break;
      case "toggle_dev":
        handlers.onToggleDevMode?.();
        break;
    }
  });

  return unlisten;
}
