import { create } from 'zustand';
import { Section, Loadouts } from './types';
import { fetchSections, fetchLoadouts, submitEntry, fetchCustomLoadouts, createSnapshot, fetchSnapshots, setCartShelved, fetchOverview, fetchCarts, createCartRecord, updateCartRecord, deleteCartRecord, fetchDailyCartStats, fetchEntries, fetchPeriodAnalytics } from './api';

interface AppState {
  date: string;
  sections: Section[];
  loading: boolean;
  loadouts: Loadouts | null;
  entries: Record<number, number>; // sectionId -> rows
  loadEntries: () => Promise<void>;
  cartSize: number;
  setCartSize: (n: number) => void;
  selectedSectionIds: number[];
  toggleSection: (id: number) => void;
  clearSelection: () => void;
  buildCustom: () => Promise<void>;
  snapshots: import('./types').LoadoutSnapshot[];
  loadSnapshots: () => Promise<void>;
  createSnapshot: (initials: string) => Promise<void>;
  toggleShelved: (snapshotId: number, cart: number, shelved: boolean) => Promise<void>;
  selectedGroup: string | null;
  setSelectedGroup: (g: string | null) => void;
  overview: import('./types').OverviewResponse | null;
  loadOverview: () => Promise<void>;
  carts: import('./types').CartRecord[];
  loadCarts: () => Promise<void>;
  addCart: (group: string, initials: string, rows: number) => Promise<void>;
  setCartShelvedState: (id: number, shelved: boolean) => Promise<void>;
  setCartRows: (id: number, rows: number) => Promise<void>;
  removeCart: (id: number) => Promise<void>;
  dailyCartStats: import('./types').DailyStatsResponse | null;
  loadDailyCartStats: () => Promise<void>;
  analytics: import('./types').PeriodAnalytics | null;
  loadAnalytics: (period: 'week'|'month'|'year', dateOverride?: string) => Promise<void>;
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
  loadEntries: async () => {
    const { date } = get();
    const list = await fetchEntries(date);
    const map: Record<number, number> = {};
    list.forEach(e => { map[e.section_id] = e.rows; });
    set({ entries: map });
  },
  init: async () => {
    set({ loading: true });
    const [sections] = await Promise.all([fetchSections()]);
    set({ sections, loading: false });
    await Promise.all([get().refreshLoadouts(), get().loadEntries()]);
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
  },
  snapshots: [],
  selectedGroup: null,
  setSelectedGroup: (g) => set({ selectedGroup: g }),
  overview: null,
  carts: [],
  dailyCartStats: null,
  analytics: null,
  loadOverview: async () => {
    const { date } = get();
    const o = await fetchOverview(date);
    set({ overview: o });
  },
  loadCarts: async () => {
    const { date } = get();
    const carts = await fetchCarts(date);
    set({ carts });
  },
  addCart: async (group, initials, rows) => {
    const { date } = get();
    await createCartRecord({ date, group, initials, rows });
    await get().loadCarts();
    await get().loadDailyCartStats();
  },
  setCartShelvedState: async (id, shelved) => {
    await updateCartRecord(id, { shelved });
    await get().loadCarts();
    await get().loadDailyCartStats();
  },
  setCartRows: async (id, rows) => {
    await updateCartRecord(id, { rows });
    await get().loadCarts();
    await get().loadDailyCartStats();
  },
  removeCart: async (id) => {
    await deleteCartRecord(id);
    await get().loadCarts();
    await get().loadDailyCartStats();
  },
  loadDailyCartStats: async () => {
    const { date } = get();
    const stats = await fetchDailyCartStats(date);
    set({ dailyCartStats: stats });
  },
  loadAnalytics: async (period, dateOverride) => {
    const { date } = get();
    const anchor = dateOverride || date;
    const analytics = await fetchPeriodAnalytics(anchor, period);
    set({ analytics });
  },
  loadSnapshots: async () => {
    const { date } = get();
    const snaps = await fetchSnapshots(date);
    set({ snapshots: snaps });
  },
  createSnapshot: async (initials: string) => {
    const { date, cartSize, selectedSectionIds, selectedGroup } = get();
    await createSnapshot(date, initials, cartSize, selectedSectionIds, selectedGroup || undefined);
    await get().loadSnapshots();
  },
  toggleShelved: async (snapshotId, cart, shelved) => {
    await setCartShelved(snapshotId, cart, shelved);
    await get().loadSnapshots();
  }
}));
