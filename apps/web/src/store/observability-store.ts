import { create } from "zustand";

import type { LogTag } from "@/types/execution";

const ALL_TAGS: LogTag[] = [
  "Planning",
  "Thought",
  "Action",
  "Observation",
  "Tool",
  "Error",
];

interface ObservabilityState {
  enabledTags: Set<LogTag>;
  searchQuery: string;
  agentFilter: string;
  taskFilter: string;
  pauseScroll: boolean;
  toggleTag: (tag: LogTag) => void;
  setEnabledTags: (tags: LogTag[]) => void;
  setSearchQuery: (q: string) => void;
  setAgentFilter: (id: string) => void;
  setTaskFilter: (id: string) => void;
  setPauseScroll: (pause: boolean) => void;
  resetFilters: () => void;
}

export const useObservabilityStore = create<ObservabilityState>((set) => ({
  enabledTags: new Set(ALL_TAGS),
  searchQuery: "",
  agentFilter: "",
  taskFilter: "",
  pauseScroll: false,
  toggleTag: (tag) =>
    set((state) => {
      const next = new Set(state.enabledTags);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return { enabledTags: next };
    }),
  setEnabledTags: (tags) => set({ enabledTags: new Set(tags) }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setAgentFilter: (agentFilter) => set({ agentFilter }),
  setTaskFilter: (taskFilter) => set({ taskFilter }),
  setPauseScroll: (pauseScroll) => set({ pauseScroll }),
  resetFilters: () =>
    set({
      enabledTags: new Set(ALL_TAGS),
      searchQuery: "",
      agentFilter: "",
      taskFilter: "",
    }),
}));

export { ALL_TAGS };
