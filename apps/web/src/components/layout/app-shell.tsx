"use client";

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

import { BottomPanel } from "@/components/layout/bottom-panel";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { MainCanvas } from "@/components/layout/main-canvas";
import { RightInspector } from "@/components/layout/right-inspector";
import { TopToolbar } from "@/components/layout/top-toolbar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useUiStore } from "@/store/ui-store";

export function AppShell() {
  const { bottomPanelOpen, inspectorOpen, panelSizes } = useUiStore();

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopToolbar />
        <PanelGroup direction="vertical" className="min-h-0 flex-1">
          <Panel defaultSize={bottomPanelOpen ? 100 - panelSizes.bottomPanel : 100} minSize={40}>
            <PanelGroup direction="horizontal">
              <Panel
                defaultSize={panelSizes.leftSidebar}
                minSize={12}
                maxSize={35}
                className="min-w-0"
              >
                <LeftSidebar />
              </Panel>
              <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/50" />
              <Panel minSize={30} className="min-w-0">
                <MainCanvas />
              </Panel>
              {inspectorOpen && (
                <>
                  <PanelResizeHandle className="w-1 bg-border transition-colors hover:bg-primary/50" />
                  <Panel
                    defaultSize={panelSizes.rightInspector}
                    minSize={15}
                    maxSize={40}
                    className="min-w-0"
                  >
                    <RightInspector />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
          {bottomPanelOpen && (
            <>
              <PanelResizeHandle className="h-1 bg-border transition-colors hover:bg-primary/50" />
              <Panel
                defaultSize={panelSizes.bottomPanel}
                minSize={12}
                maxSize={50}
                className="min-h-0"
              >
                <BottomPanel />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </AuthGuard>
  );
}
