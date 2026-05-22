"use client";

import { GitBranch, LayoutGrid, Rows3, ZoomIn, ZoomOut } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/store/canvas-store";
import type { CanvasLayoutMode } from "@crewcc/shared-types";

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { layoutMode, setLayoutMode, runAutoLayout } = useCanvasStore();

  function toggleLayout(mode: CanvasLayoutMode) {
    setLayoutMode(mode);
    runAutoLayout();
  }

  return (
    <div className="absolute left-3 top-14 z-10 flex flex-col gap-1 rounded-md border border-border bg-card/90 p-1 shadow-lg backdrop-blur">
      <Button variant="ghost" size="icon" onClick={() => zoomIn()} title="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => zoomOut()} title="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => fitView({ padding: 0.2 })} title="Fit view">
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={layoutMode === "hierarchy" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => toggleLayout("hierarchy")}
        title="Hierarchy layout"
      >
        <GitBranch className="h-4 w-4" />
      </Button>
      <Button
        variant={layoutMode === "sequential" ? "secondary" : "ghost"}
        size="icon"
        onClick={() => toggleLayout("sequential")}
        title="Sequential layout"
      >
        <Rows3 className="h-4 w-4" />
      </Button>
    </div>
  );
}
