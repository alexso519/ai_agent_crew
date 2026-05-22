import type { BottomPanelTab, SidebarTab } from "@crewcc/shared-types";

export interface PanelSizes {
  leftSidebar: number;
  rightInspector: number;
  bottomPanel: number;
}

export interface UiState {
  sidebarTab: SidebarTab;
  bottomPanelTab: BottomPanelTab;
  bottomPanelOpen: boolean;
  inspectorOpen: boolean;
}
