import { create } from 'zustand';
import { Section, Loadouts } from './types';
import { fetchSections, fetchLoadouts, submitEntry, fetchCustomLoadouts } from './api';

interface AppState {
  date: string;
  sections: Section[];
  loading: boolean;
  loadouts: Loadouts | null;
  entries: Record<number, number>; // sectionId -> rows
  cartSize: number;
  setCartSize: (n: number) => void;
  selectedSectionIds: number[];
  toggleSection: (id: number) => void;
  clearSelection: () => void;
  buildCustom: () => Promise<void>;
  init: () => Promise<void>;
  setDate: (d: string) => void;
  setEntry: (sectionId: number, rows: number) => void;
  saveEntry: (sectionId: number) => Promise<void>;
  refreshLoadouts: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  date: new Date().toISOString().slice(0, 10),
  sections: [],
  loading: false,
  loadouts: null,
  cartSize: 6,
  setCartSize: (n: number) => set({ cartSize: n }),
  selectedSectionIds: [],
  toggleSection: (id: number) => set(state => {
    const exists = state.selectedSectionIds.includes(id);
    return { selectedSectionIds: exists ? state.selectedSectionIds.filter(x => x !== id) : [...state.selectedSectionIds, id] };
  }),
  clearSelection: () => set({ selectedSectionIds: [] }),
  entries: {},
  init: async () => {
    set({ loading: true });
    const [sections] = await Promise.all([fetchSections()]);
    set({ sections, loading: false });
    await get().refreshLoadouts();
  },
  setDate: (d: string) => set({ date: d }),
  setEntry: (sectionId, rows) => set(state => ({ entries: { ...state.entries, [sectionId]: rows } })),
  saveEntry: async (sectionId) => {
    const { date, entries } = get();
    const rows = entries[sectionId] ?? 0;
    await submitEntry(sectionId, date, rows);
    await get().refreshLoadouts();
  },
  refreshLoadouts: async () => {
    const { date, cartSize } = get();
    const loadouts = await fetchLoadouts(date, cartSize);
    set({ loadouts });
  },
  buildCustom: async () => {
    const { date, cartSize, selectedSectionIds } = get();
    const loadouts = await fetchCustomLoadouts(date, cartSize, selectedSectionIds);
    set({ loadouts });
  }
}));
