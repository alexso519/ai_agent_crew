"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvasStore } from "@/store/canvas-store";
import { useWorkflowStore } from "@/store/workflow-store";
import type { YamlFileKey } from "@crewcc/shared-types";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <div className="p-4 text-xs text-muted-foreground">Loading editor…</div> },
);

const FILE_LABELS: Record<YamlFileKey, string> = {
  agents: "agents.yaml",
  tasks: "tasks.yaml",
  workflow: "workflow.yaml",
};

export function YamlEditorPanel() {
  const { workflow } = useWorkflowStore();
  const {
    yaml,
    activeYamlFile,
    yamlSyncError,
    setActiveYamlFile,
    applyYamlEdit,
    syncYamlFromGraph,
  } = useCanvasStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        applyYamlEdit(activeYamlFile, value, {
          name: workflow.name,
          description: workflow.description,
        });
      }, 400);
    },
    [activeYamlFile, applyYamlEdit, workflow.name, workflow.description],
  );

  return (
    <div className="flex h-full flex-col">
      <Tabs
        value={activeYamlFile}
        onValueChange={(v) => {
          setActiveYamlFile(v as YamlFileKey);
          syncYamlFromGraph(workflow.name, workflow.description);
        }}
        className="flex h-full flex-col"
      >
        <div className="flex items-center border-b border-border px-2">
          <TabsList className="h-8 bg-transparent">
            {(Object.keys(FILE_LABELS) as YamlFileKey[]).map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {FILE_LABELS[key]}
              </TabsTrigger>
            ))}
          </TabsList>
          {yamlSyncError && (
            <span className="ml-auto truncate text-[10px] text-destructive">
              {yamlSyncError}
            </span>
          )}
        </div>
        {(Object.keys(FILE_LABELS) as YamlFileKey[]).map((key) => (
          <TabsContent key={key} value={key} className="m-0 flex-1 overflow-hidden">
            <MonacoEditor
              key={key}
              height="100%"
              language="yaml"
              theme="vs-dark"
              value={yaml[key]}
              onChange={activeYamlFile === key ? handleChange : undefined}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
