"use client";

import { BarChart3, FileCode2, Terminal } from "lucide-react";

import { MetricsPanel } from "@/components/observability/metrics-panel";
import { TerminalPanel } from "@/components/observability/terminal-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YamlEditorPanel } from "@/components/yaml/yaml-editor-panel";
import { useUiStore } from "@/store/ui-store";
import type { BottomPanelTab } from "@crewcc/shared-types";

export function BottomPanel() {
  const { bottomPanelTab, setBottomPanelTab } = useUiStore();

  return (
    <section className="flex h-full flex-col border-t border-border bg-background">
      <Tabs
        value={bottomPanelTab}
        onValueChange={(v) => setBottomPanelTab(v as BottomPanelTab)}
        className="flex h-full flex-col"
      >
        <div className="flex items-center border-b border-border px-2">
          <TabsList className="h-8 bg-transparent">
            <TabsTrigger value="terminal" className="gap-1 text-xs">
              <Terminal className="h-3 w-3" />
              Observability
            </TabsTrigger>
            <TabsTrigger value="yaml" className="gap-1 text-xs">
              <FileCode2 className="h-3 w-3" />
              YAML
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              Metrics
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="terminal" className="m-0 min-h-0 flex-1 overflow-hidden">
          <TerminalPanel />
        </TabsContent>
        <TabsContent value="yaml" className="m-0 min-h-0 flex-1 overflow-hidden">
          <YamlEditorPanel />
        </TabsContent>
        <TabsContent value="metrics" className="m-0 min-h-0 flex-1 overflow-auto">
          <MetricsPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
