import { create } from "zustand";

export type VisibilityFilter = "all" | "global" | "eboard_only";

type CalendarState = {
  visibilityFilter: VisibilityFilter;
  setVisibilityFilter: (v: VisibilityFilter) => void;
};

export const useCalendarStore = create<CalendarState>((set) => ({
  visibilityFilter: "all",
  setVisibilityFilter: (v) => set({ visibilityFilter: v }),
}));
