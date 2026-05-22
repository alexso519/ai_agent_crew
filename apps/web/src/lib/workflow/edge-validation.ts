import type { Connection, Edge } from "@xyflow/react";

export function wouldCreateCycle(
  edges: Edge[],
  connection: Connection,
): boolean {
  if (!connection.source || !connection.target) return true;
  if (connection.source === connection.target) return true;

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const list = adjacency.get(connection.source) ?? [];
  list.push(connection.target);
  adjacency.set(connection.source, list);

  const visited = new Set<string>();
  const stack = [connection.target];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node === connection.source) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    const neighbors = adjacency.get(node) ?? [];
    for (const next of neighbors) {
      stack.push(next);
    }
  }

  return false;
}

export function isValidConnection(
  connection: Connection,
  edges: Edge[],
): boolean {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return false;
  const duplicate = edges.some(
    (e) =>
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle,
  );
  if (duplicate) return false;
  return !wouldCreateCycle(edges, connection);
}
