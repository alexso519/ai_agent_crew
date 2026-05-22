"use client";

import {
  Bot,
  CheckSquare,
  FileStack,
  GripVertical,
  Wrench,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import type { SidebarTab } from "@crewcc/shared-types";

const AGENT_TEMPLATES = [
  "Research Agent",
  "Engineer Agent",
  "QA Agent",
  "PM Agent",
  "Analyst Agent",
] as const;

const TASK_TEMPLATES = [
  "Sequential Task",
  "Conditional Task",
  "Human Approval Task",
  "Retry Task",
] as const;

const TOOL_TEMPLATES = [
  "Web Search",
  "SQL",
  "API Connector",
  "File Reader",
  "Python Executor",
  "Vector Search",
] as const;

function DraggableItem({ label }: { label: string }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/crewcc-template", label);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-card/50 px-2 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-accent/50"
    >
      <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span>{label}</span>
    </button>
  );
}

function TemplateList({ items }: { items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {items.map((item) => (
        <DraggableItem key={item} label={item} />
      ))}
    </div>
  );
}

const TAB_ICONS: Record<SidebarTab, React.ReactNode> = {
  agents: <Bot className="h-3.5 w-3.5" />,
  tasks: <CheckSquare className="h-3.5 w-3.5" />,
  tools: <Wrench className="h-3.5 w-3.5" />,
  templates: <FileStack className="h-3.5 w-3.5" />,
};

export function LeftSidebar() {
  const { sidebarTab, setSidebarTab } = useUiStore();

  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Explorer
        </p>
      </div>
      <Tabs
        value={sidebarTab}
        onValueChange={(v) => setSidebarTab(v as SidebarTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-2 mt-2 grid w-auto grid-cols-4 bg-muted/50">
          {(Object.keys(TAB_ICONS) as SidebarTab[]).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn("px-1 capitalize", sidebarTab === tab && "shadow-sm")}
              title={tab}
            >
              {TAB_ICONS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollArea className="flex-1">
          <TabsContent value="agents" className="m-0">
            <TemplateList items={AGENT_TEMPLATES} />
          </TabsContent>
          <TabsContent value="tasks" className="m-0">
            <TemplateList items={TASK_TEMPLATES} />
          </TabsContent>
          <TabsContent value="tools" className="m-0">
            <TemplateList items={TOOL_TEMPLATES} />
          </TabsContent>
          <TabsContent value="templates" className="m-0 p-3">
            <p className="text-xs text-muted-foreground">
              Saved workflow templates appear here after Phase 2 persistence.
            </p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
