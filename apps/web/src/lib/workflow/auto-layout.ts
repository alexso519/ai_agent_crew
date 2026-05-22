import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { CrewNodeData } from "@/types/workflow";
import type { CanvasLayoutMode } from "@crewcc/shared-types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

export function applyAutoLayout(
  nodes: Node<CrewNodeData>[],
  edges: Edge[],
  layoutMode: CanvasLayoutMode,
): Node<CrewNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: layoutMode === "sequential" ? "LR" : "TB",
    nodesep: 60,
    ranksep: 80,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const layoutNode = graph.node(node.id);
    if (!layoutNode) return node;
    return {
      ...node,
      position: {
        x: layoutNode.x - NODE_WIDTH / 2,
        y: layoutNode.y - NODE_HEIGHT / 2,
      },
    };
  });
}
