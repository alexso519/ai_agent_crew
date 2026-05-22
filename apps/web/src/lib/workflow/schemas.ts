import { z } from "zod";

export const agentYamlEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  goal: z.string().optional().default(""),
  backstory: z.string().optional().default(""),
  llm_provider: z.enum(["gpt", "claude", "gemini", "ollama"]).default("ollama"),
  llm_model: z.string().default("llama3"),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().positive().default(4096),
  iterations: z.number().int().positive().default(10),
  rpm_limit: z.number().int().nonnegative().default(60),
  memory: z
    .object({
      short_term: z.boolean().default(false),
      long_term: z.boolean().default(false),
      entity: z.boolean().default(false),
    })
    .default({}),
});

export const agentsYamlSchema = z.object({
  agents: z.array(agentYamlEntrySchema),
});

export const taskYamlEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  expected_output: z.string().optional().default(""),
  timeout_seconds: z.number().int().nonnegative().default(300),
  max_retries: z.number().int().nonnegative().default(0),
  requires_approval: z.boolean().default(false),
  priority: z.number().int().default(0),
  agent_id: z.string().optional(),
});

export const tasksYamlSchema = z.object({
  tasks: z.array(taskYamlEntrySchema),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

export const workflowYamlSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(""),
  layout: z.enum(["hierarchy", "sequential"]).default("hierarchy"),
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["agent", "task", "tool"]),
      position: z.object({ x: z.number(), y: z.number() }),
    }),
  ),
  edges: z.array(workflowEdgeSchema),
});

export type AgentsYaml = z.infer<typeof agentsYamlSchema>;
export type TasksYaml = z.infer<typeof tasksYamlSchema>;
export type WorkflowYaml = z.infer<typeof workflowYamlSchema>;
