import { create } from "zustand";

export type VisibilityFilter = "all" | "global" | "eboard_only";

type CalendarState = {
  visibilityFilter: VisibilityFilter;
  /**
   * Category IDs the user has toggled OFF. Default empty = everything visible.
   * Sentinel "__uncategorized" represents events with no category_id.
   */
  hiddenCategories: string[];
  setVisibilityFilter: (v: VisibilityFilter) => void;
  toggleCategory: (id: string) => void;
  showAllCategories: () => void;
  hideAllCategories: (ids: string[]) => void;
};

export const UNCATEGORIZED_FILTER_KEY = "__uncategorized";

export const useCalendarStore = create<CalendarState>((set, get) => ({
  visibilityFilter: "all",
  hiddenCategories: [],
  setVisibilityFilter: (v) => set({ visibilityFilter: v }),
  toggleCategory: (id) => {
    const current = get().hiddenCategories;
    if (current.includes(id)) {
      set({ hiddenCategories: current.filter((c) => c !== id) });
    } else {
      set({ hiddenCategories: [...current, id] });
    }
  },
  showAllCategories: () => set({ hiddenCategories: [] }),
  hideAllCategories: (ids) => set({ hiddenCategories: ids }),
}));
