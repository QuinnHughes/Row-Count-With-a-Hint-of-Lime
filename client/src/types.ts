export interface Section {
  id: number;
  code: string;
  name: string;
  group?: string;
  daily_cap: number | null;
  order_index: number;
}

export interface EntryRow {
  section_id: number;
  date: string;
  rows: number;
}

export interface LoadoutUnit {
  cart: number;
  section_id: number;
  section_code: string;
  unit_index_within_section: number;
}

export interface Loadouts {
  date: string;
  cartSize?: number;
  carts: { cart: number; rows: LoadoutUnit[] }[];
}

export interface LoadoutSnapshotCart {
  cart: number;
  rows: LoadoutUnit[];
  shelved: boolean;
}

export interface LoadoutSnapshot {
  id: number;
  date: string;
  initials: string;
  cart_size: number;
  created_at: string;
  carts: LoadoutSnapshotCart[];
  group?: string;
}

export interface OverviewGroupRow {
  group: string;
  todayRows: number;
  prevRows: number;
  delta: number;
}

export interface OverviewResponse {
  date: string;
  prevDate: string;
  groups: OverviewGroupRow[];
}

export interface CartRecord {
  id: number;
  date: string;
  group: string;
  initials: string;
  rows: number;
  shelved: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyStatsResponse {
  date: string;
  groups: {
    group: string;
    totalRows: number;
    cartCount: number;
    shelvedRows: number;
    pendingRows: number;
    shelvedCarts: number;
    pendingCarts: number;
  prevEntryRows?: number;
  todayEntryRows?: number;
  deducedShelvedRows?: number;
  }[];
  totalRows: number;
  totalCarts: number;
}

export interface PeriodAnalytics {
  period: 'week'|'month'|'year';
  startDate: string;
  endDate: string;
  groups: {
    group: string;
    entryRows: number;
    cartRows: number;
    cartCount: number;
    shelvedCarts: number;
    pendingCarts: number;
  }[];
  totals: { entryRows: number; cartRows: number; cartCount: number; shelvedCarts: number; pendingCarts: number; totalRowsCombined: number; };
  dailySeries: { date: string; entryRows: number; cartRows: number; }[];
  aggregatedSeries: { label: string; entryRows: number; cartRows: number; startDate?: string; endDate?: string; }[];
  prevDay?: { date: string; entryRows: number; cartRows: number; totalRowsCombined: number; };
}
