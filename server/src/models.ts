export interface Section {
  id: number;
  code: string; // short code or range descriptor (e.g., "A–GV")
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
