export interface Section {
  id: number;
  code: string; // plain location name
  name: string; // human label
  group?: string; // logical location grouping
  daily_cap: number | null; // null = no cap
  order_index: number; // ordering for loadout allocation
}

export interface Entry {
  id: number;
  section_id: number;
  date: string; // YYYY-MM-DD
  rows: number; // integer rows (future: could extend to decimal)
  created_at: string;
  updated_at: string;
}

export interface LoadoutCartRowUnit {
  cart: number; // cart index starting at 1
  section_id: number;
  section_code: string;
  unit_index_within_section: number; // nth row (1-based) for that section date
}

export interface LoadoutResponse {
  date: string;
  carts: {
    cart: number;
    rows: LoadoutCartRowUnit[];
  }[];
}

export interface LoadoutSnapshotCart {
  cart: number;
  rows: LoadoutCartRowUnit[];
  shelved: boolean;
}

export interface LoadoutSnapshot {
  id: number;
  date: string; // YYYY-MM-DD
  initials: string; // user attribution
  cart_size: number;
  created_at: string;
  carts: LoadoutSnapshotCart[];
  group?: string; // location group this snapshot covers (optional for legacy)
}

// Manual cart record (explicitly created by staff)
export interface CartRecord {
  id: number;
  date: string; // YYYY-MM-DD (cart creation / shelving date)
  group: string; // location group
  initials: string; // staff initials
  rows: number; // rows contained on this physical cart
  shelved: boolean; // whether cart has been fully shelved
  created_at: string;
  updated_at: string;
}

export interface DailyGroupStat {
  group: string;
  totalRows: number;
  cartCount: number;
  shelvedRows: number;
  pendingRows: number;
  shelvedCarts: number;
  pendingCarts: number;
}

export interface DailyStatsResponse {
  date: string;
  groups: DailyGroupStat[];
  totalRows: number;
  totalCarts: number;
}
