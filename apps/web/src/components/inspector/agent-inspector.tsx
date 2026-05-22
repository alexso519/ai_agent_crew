"use client";

import { Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { enhanceAgentPersona } from "@/lib/workflow/enhance-persona";
import { useCanvasStore } from "@/store/canvas-store";
import { useWorkflowStore } from "@/store/workflow-store";
import type { AgentNodeData } from "@/types/workflow";
import type { LlmProvider } from "@crewcc/shared-types";

interface AgentInspectorProps {
  nodeId: string;
  data: AgentNodeData;
}

export function AgentInspector({ nodeId, data }: AgentInspectorProps) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const markDirty = useWorkflowStore((s) => s.markDirty);

  function patch(partial: Partial<AgentNodeData>) {
    updateNodeData(nodeId, partial);
    markDirty();
  }

  return (
    <div className="space-y-4 p-4">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Persona
        </h3>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={data.role}
            onChange={(e) => patch({ role: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Goal</Label>
          <Textarea
            id="goal"
            value={data.goal}
            onChange={(e) => patch({ goal: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="backstory">Backstory</Label>
          <Textarea
            id="backstory"
            value={data.backstory}
            onChange={(e) => patch({ backstory: e.target.value })}
            rows={5}
            className="font-mono text-xs"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full gap-2"
          onClick={() => patch(enhanceAgentPersona(data))}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Enhancer
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Memory Matrix
        </h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="mem-st">Short term</Label>
          <Switch
            id="mem-st"
            checked={data.memoryShortTerm}
            onCheckedChange={(v) => patch({ memoryShortTerm: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="mem-lt">Long term</Label>
          <Switch
            id="mem-lt"
            checked={data.memoryLongTerm}
            onCheckedChange={(v) => patch({ memoryLongTerm: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="mem-en">Entity memory</Label>
          <Switch
            id="mem-en"
            checked={data.memoryEntity}
            onCheckedChange={(v) => patch({ memoryEntity: v })}
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full" disabled>
          Clear DB (Phase 3)
        </Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          LLM Routing
        </h3>
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={data.llmProvider}
            onValueChange={(v) => patch({ llmProvider: v as LlmProvider })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt">GPT</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="ollama">Ollama (local)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={data.llmModel}
            onChange={(e) => patch({ llmModel: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="temp">Temperature</Label>
            <Input
              id="temp"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={data.temperature}
              onChange={(e) => patch({ temperature: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="max-tok">Max tokens</Label>
            <Input
              id="max-tok"
              type="number"
              value={data.maxTokens}
              onChange={(e) => patch({ maxTokens: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="iter">Iterations</Label>
            <Input
              id="iter"
              type="number"
              value={data.iterations}
              onChange={(e) => patch({ iterations: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rpm">RPM limit</Label>
            <Input
              id="rpm"
              type="number"
              value={data.rpmLimit}
              onChange={(e) => patch({ rpmLimit: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full gap-2"
        onClick={() => {
          removeNode(nodeId);
          markDirty();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove node
      </Button>
    </div>
  );
}
