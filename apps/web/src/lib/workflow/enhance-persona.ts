import type { AgentNodeData } from "@/types/workflow";

/**
 * Local persona expansion using CrewAI structuring conventions (no external API).
 */
export function enhanceAgentPersona(data: AgentNodeData): Pick<
  AgentNodeData,
  "goal" | "backstory"
> {
  const role = data.role.trim() || "Specialist Agent";
  const goal =
    data.goal.trim() ||
    `As ${role}, deliver accurate, actionable outputs aligned with crew objectives. ` +
      `Break work into verifiable steps, cite assumptions, and escalate blockers early.`;

  const backstory =
    data.backstory.trim() ||
    `## Identity\nYou are a ${role} operating inside an enterprise CrewAI control center.\n\n` +
      `## Expertise\n- Domain depth in your specialty\n- Structured reasoning and clear handoffs\n` +
      `- Tool-aware execution with minimal hallucination\n\n` +
      `## Operating principles\n1. Clarify ambiguous requirements before acting\n` +
      `2. Prefer reproducible, auditable outputs\n3. Respect memory boundaries and RBAC constraints`;

  return { goal, backstory };
}
