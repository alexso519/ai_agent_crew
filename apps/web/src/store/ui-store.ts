import { create } from "zustand";

import type { PanelSizes, UiState } from "@/types/ui";
import type { BottomPanelTab, SidebarTab } from "@crewcc/shared-types";

interface UiStore extends UiState {
  panelSizes: PanelSizes;
  setSidebarTab: (tab: SidebarTab) => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  toggleBottomPanel: () => void;
  toggleInspector: () => void;
  setPanelSizes: (sizes: Partial<PanelSizes>) => void;
}

const DEFAULT_PANEL_SIZES: PanelSizes = {
  leftSidebar: 18,
  rightInspector: 22,
  bottomPanel: 28,
};

export const useUiStore = create<UiStore>((set) => ({
  sidebarTab: "agents",
  bottomPanelTab: "terminal",
  bottomPanelOpen: true,
  inspectorOpen: true,
  panelSizes: DEFAULT_PANEL_SIZES,
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setBottomPanelTab: (bottomPanelTab) => set({ bottomPanelTab }),
  setBottomPanelOpen: (bottomPanelOpen) => set({ bottomPanelOpen }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  toggleBottomPanel: () =>
    set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
  toggleInspector: () =>
    set((state) => ({ inspectorOpen: !state.inspectorOpen })),
  setPanelSizes: (sizes) =>
    set((state) => ({
      panelSizes: { ...state.panelSizes, ...sizes },
    })),
}));
