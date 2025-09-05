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
