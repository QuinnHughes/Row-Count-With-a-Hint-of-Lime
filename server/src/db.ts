import fs from 'fs-extra';
import { Entry, Section, LoadoutSnapshot, CartRecord, DailyStatsResponse, DailyGroupStat } from './models';
import { buildLoadouts } from './loadouts';

interface DataShape {
  sections: Section[];
  entries: Entry[];
  snapshots: LoadoutSnapshot[];
  carts: CartRecord[];
  _entrySeq: number; // incremental id
  _snapshotSeq: number;
  _cartSeq: number;
}

const DATA_FILE = process.env.DB_JSON || 'data.json';

let data: DataShape | null = null;

function load(): DataShape {
  if (data) return data;
  if (fs.existsSync(DATA_FILE)) {
    data = fs.readJSONSync(DATA_FILE) as DataShape;
  } else {
    data = {
      sections: [],
      entries: [],
      snapshots: [],
      carts: [],
      _entrySeq: 1,
      _snapshotSeq: 1,
      _cartSeq: 1
    } as DataShape;
  }
  if (data.sections.length === 0) seedSections();
  persist();
  return data;
}

function persist() {
  if (!data) return;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function seedSections() {
  const base: Omit<Section, 'id'>[] = [
    { code: 'Third Floor', name: 'Third Floor', group: 'Third Floor', daily_cap: null, order_index: 1 },
    { code: 'Second Floor', name: 'Second Floor', group: 'Second Floor', daily_cap: null, order_index: 2 },
    { code: 'South Basement J-NX', name: 'South Basement J-NX', group: 'South Basement J-NX', daily_cap: null, order_index: 3 },
    { code: 'North Basement', name: 'North Basement', group: 'North Basement', daily_cap: null, order_index: 4 },
  { code: 'CHYAC', name: 'CHYAC', group: 'CHYAC', daily_cap: null, order_index: 5 },
    { code: 'Movables', name: 'Movables', group: 'Movables', daily_cap: null, order_index: 6 },
    { code: 'Bound Journals', name: 'Bound Journals', group: 'Bound Journals', daily_cap: null, order_index: 7 },
    { code: 'Documents', name: 'Documents', group: 'Documents', daily_cap: null, order_index: 8 },
  { code: 'Elec Media', name: 'Elec Media', group: 'Elec Media', daily_cap: 3, order_index: 9 },
    { code: 'Oversize', name: 'Oversize', group: 'Oversize', daily_cap: 2, order_index: 10 }
  ];
  let id = 1;
  data!.sections = base.map(b => ({ id: id++, ...b }));
}

function migrateLegacyRangeSections() {
  const d = load();
  // Detect legacy pattern presence
  const legacyPatterns = ['A–GV','H–HX','J–NX','P–Z','P–QL','QL–Z','A–Z','CHYAC/Ref','Docs'];
  const hasRange = d.sections.some(s => legacyPatterns.includes(s.code));
  const plainRenameMap: Record<string,string> = { 'New One':'CHYAC', 'Special':'Elec Media', 'CHYAC Reference':'Elec Media' };

  // Always run plain rename for lingering plain names
  let anyPlain = false;
  d.sections.forEach(s => {
    if (plainRenameMap[s.code]) { s.code = plainRenameMap[s.code]; s.name = plainRenameMap[s.code]; s.group = plainRenameMap[s.code]; anyPlain = true; }
  });
  if (anyPlain) {
    // Reassign order indexes after plain rename (keep existing order otherwise)
    let orderIdx = 1; d.sections.sort((a,b)=> a.order_index - b.order_index).forEach(s => { s.order_index = orderIdx++; });
    persist();
  }
  if (!hasRange) return; // no range-style legacy codes left to migrate further

  const map: Record<string,string> = {
    'A–GV':'Third Floor',
    'H–HX':'Second Floor',
    'J–NX':'South Basement J-NX',
    'P–Z':'North Basement',
  'P–QL':'CHYAC',
    'QL–Z':'Movables',
    'A–Z':'Bound Journals',
    'Docs':'Documents',
  'CHYAC/Ref':'Elec Media',
    'Oversize':'Oversize'
  };

  // Desired order
  const order = ['Third Floor','Second Floor','South Basement J-NX','North Basement','CHYAC','Movables','Bound Journals','Documents','Elec Media','Oversize'];
  const caps: Record<string, number|null> = { 'Elec Media':3, 'Oversize':2 } as any;

  // Aggregate entry rows by date + new section name
  const entryAgg = new Map<string, number>();
  d.entries.forEach(e => {
    const oldSection = d.sections.find(s => s.id === e.section_id);
    if (!oldSection) return;
    const newName = map[oldSection.code] || oldSection.code;
    const key = newName + '|' + e.date;
    entryAgg.set(key, (entryAgg.get(key)||0) + e.rows);
  });

  // Rebuild sections list
  let idCounter = 1;
  const newSections = order.map((name, idx) => ({
    id: idCounter++, code: name, name, group: name, daily_cap: caps[name] ?? null, order_index: idx+1
  }));

  // Build index for new section IDs
  const idByName = new Map(newSections.map(s => [s.name, s.id] as const));

  // Rebuild entries list aggregated
  const newEntries: Entry[] = [];
  entryAgg.forEach((rows, key) => {
    const [name, date] = key.split('|');
    const section_id = idByName.get(name);
    if (!section_id) return;
    const now = new Date().toISOString();
    newEntries.push({ id: newEntries.length+1, section_id, date, rows, created_at: now, updated_at: now });
  });

  d.sections = newSections;
  d.entries = newEntries;

  // Update carts group if any legacy groups stored as codes
  if (d.carts) {
    d.carts.forEach(c => { if (map[c.group]) c.group = map[c.group]; });
  }

  persist();
}

export function getSections(): Section[] {
  const d = load();
  migrateLegacyRangeSections();
  // Migration: ensure group field
  let mutated = false;
  d.sections.forEach(s => { if (!('group' in s) || !s.group) { s.group = s.code; mutated = true; } });
  if (mutated) persist();
  return [...d.sections].sort((a, b) => a.order_index - b.order_index);
}

export function upsertEntry(sectionId: number, date: string, rows: number) {
  const d = load();
  const now = new Date().toISOString();
  const existing = d.entries.find(e => e.section_id === sectionId && e.date === date);
  if (existing) {
    existing.rows = rows;
    existing.updated_at = now;
  } else {
    d.entries.push({
      id: d._entrySeq++,
      section_id: sectionId,
      date,
      rows,
      created_at: now,
      updated_at: now
    });
  }
  persist();
}

export function getEntriesForDate(date: string): Entry[] {
  return load().entries.filter(e => e.date === date);
}

export function getSectionById(id: number): Section | undefined {
  return load().sections.find(s => s.id === id);
}

export function seedIfEmpty() {
  load();
}

// SNAPSHOTS
export function createSnapshot(date: string, initials: string, cartSize: number, sectionIds?: number[], group?: string) {
  const d = load();
  const loadout = buildLoadouts(date, cartSize, sectionIds && sectionIds.length ? sectionIds : undefined);
  const now = new Date().toISOString();
  const snapshot: LoadoutSnapshot = {
    id: d._snapshotSeq++,
    date,
    initials: initials.toUpperCase().slice(0,4),
    cart_size: cartSize,
    created_at: now,
  carts: loadout.carts.map(c => ({ cart: c.cart, rows: c.rows, shelved: false })),
  group
  };
  d.snapshots.push(snapshot);
  persist();
  return snapshot;
}

export function getSnapshots(date?: string): LoadoutSnapshot[] {
  const d = load();
  return d.snapshots.filter(s => !date || s.date === date).sort((a,b)=> a.created_at.localeCompare(b.created_at));
}

export function setCartShelved(snapshotId: number, cart: number, shelved: boolean) {
  const d = load();
  const snap = d.snapshots.find(s => s.id === snapshotId);
  if (!snap) return false;
  const target = snap.carts.find(c => c.cart === cart);
  if (!target) return false;
  target.shelved = shelved;
  persist();
  return true;
}

export function getGroupStats(date: string) {
  const d = load();
  const sectionsByGroup = d.sections.reduce<Record<string, Section[]>>((acc, s) => {
    const g = s.group || 'Other';
    (acc[g] = acc[g] || []).push(s); return acc;
  }, {});
  const entriesBySectionDate = new Map<string, number>();
  d.entries.forEach(e => { if (e.date === date) entriesBySectionDate.set(e.section_id+':'+date, e.rows); });
  return Object.entries(sectionsByGroup).map(([group, secs]) => {
    const totalRows = secs.reduce((sum, s) => sum + (entriesBySectionDate.get(s.id+':'+date) || 0), 0);
    return { group, totalRows, sectionCount: secs.length };
  });
}

export function getGroupComparison(date: string, prevDate: string) {
  const d = load();
  const sectionsByGroup = d.sections.reduce<Record<string, Section[]>>((acc, s) => {
    const g = s.group || 'Other'; (acc[g] = acc[g] || []).push(s); return acc;
  }, {});
  function rowsForDate(dt: string, secs: Section[]) {
    return d.entries.filter(e => e.date === dt && secs.some(s => s.id === e.section_id))
      .reduce((sum,e)=> sum + e.rows, 0);
  }
  return Object.entries(sectionsByGroup).map(([group, secs]) => {
    const todayRows = rowsForDate(date, secs);
    const prevRows = rowsForDate(prevDate, secs);
    return { group, todayRows, prevRows, delta: todayRows - prevRows };
  });
}

// ---- Cart Records ----
function ensureCartsArray() { const d = load(); if (!d.carts) { (d as any).carts = []; (d as any)._cartSeq = (d as any)._cartSeq || 1; persist(); } }

export function createCart(date: string, group: string, initials: string, rows: number): CartRecord {
  ensureCartsArray();
  const d = load();
  const now = new Date().toISOString();
  const cart: CartRecord = {
    id: d._cartSeq++,
    date,
    group,
    initials: initials.toUpperCase().slice(0,4),
    rows,
    shelved: false,
    created_at: now,
    updated_at: now
  };
  d.carts.push(cart);
  persist();
  return cart;
}

export function listCarts(date?: string): CartRecord[] {
  ensureCartsArray();
  const d = load();
  return d.carts.filter(c => !date || c.date === date).sort((a,b)=> a.created_at.localeCompare(b.created_at));
}

export function updateCart(id: number, patch: Partial<Pick<CartRecord,'rows'|'shelved'>>) {
  ensureCartsArray();
  const d = load();
  const cart = d.carts.find(c => c.id === id);
  if (!cart) return null;
  if (typeof patch.rows === 'number') cart.rows = patch.rows;
  if (typeof patch.shelved === 'boolean') cart.shelved = patch.shelved;
  cart.updated_at = new Date().toISOString();
  persist();
  return cart;
}

export function deleteCart(id: number): boolean {
  ensureCartsArray();
  const d = load();
  const idx = d.carts.findIndex(c => c.id === id);
  if (idx === -1) return false;
  d.carts.splice(idx,1);
  persist();
  return true;
}

export function dailyCartStats(date: string): DailyStatsResponse {
  ensureCartsArray();
  const d = load();
  const carts = d.carts.filter(c => c.date === date);
  const byGroup = new Map<string, CartRecord[]>();
  carts.forEach(c => { if(!byGroup.has(c.group)) byGroup.set(c.group, []); byGroup.get(c.group)!.push(c); });
  const groups: DailyGroupStat[] = Array.from(byGroup.entries()).map(([group, list]) => {
    const totalRows = list.reduce((s,c)=> s+c.rows,0);
    const cartCount = list.length;
    const shelvedRows = list.filter(c=>c.shelved).reduce((s,c)=> s+c.rows,0);
    const shelvedCarts = list.filter(c=>c.shelved).length;
    const pendingRows = totalRows - shelvedRows;
    const pendingCarts = cartCount - shelvedCarts;
    return { group, totalRows, cartCount, shelvedRows, pendingRows, shelvedCarts, pendingCarts };
  }).sort((a,b)=> a.group.localeCompare(b.group));
  return {
    date,
    groups,
    totalRows: groups.reduce((s,g)=> s+g.totalRows,0),
    totalCarts: groups.reduce((s,g)=> s+g.cartCount,0)
  };
}

// ---- Period Analytics (week/month/year) ----
interface PeriodGroupAgg {
  group: string;
  entryRows: number;
  cartRows: number;
  cartCount: number;
  shelvedCarts: number;
  pendingCarts: number;
}

interface PeriodAnalytics {
  period: string;
  startDate: string;
  endDate: string;
  groups: PeriodGroupAgg[];
  totals: { entryRows: number; cartRows: number; cartCount: number; shelvedCarts: number; pendingCarts: number; };
  dailySeries: { date: string; entryRows: number; cartRows: number; }[];
}

function fmt(d: Date) { return d.toISOString().slice(0,10); }

function startOfWeek(date: Date) {
  const d = new Date(date); const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0); return d;
}

function startOfMonth(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
function startOfYear(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); }

export function computePeriodAnalytics(dateStr: string, period: 'week'|'month'|'year'): PeriodAnalytics {
  const d = load();
  const target = new Date(dateStr + 'T00:00:00Z');
  let start: Date;
  if (period === 'week') start = startOfWeek(target); else if (period === 'month') start = startOfMonth(target); else start = startOfYear(target);
  const end = target; // inclusive to target date
  const sectionsByGroup = d.sections.reduce<Record<string, Section[]>>((acc, s) => { const g = s.group || 'Other'; (acc[g] = acc[g] || []).push(s); return acc; }, {});

  // Pre-index entries by date+section
  const entriesByKey = new Map<string, number>();
  d.entries.forEach(e => { entriesByKey.set(e.section_id + ':' + e.date, e.rows); });
  ensureCartsArray();
  const carts = d.carts;

  const dailySeries: { date: string; entryRows: number; cartRows: number; }[] = [];
  const groupAggMap = new Map<string, PeriodGroupAgg>();
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate()+1)) {
    const ds = fmt(cursor);
    let dayEntryRows = 0; let dayCartRows = 0;
    Object.entries(sectionsByGroup).forEach(([group, secs]) => {
      let groupEntryRowsForDay = 0;
      secs.forEach(sec => { groupEntryRowsForDay += (entriesByKey.get(sec.id + ':' + ds) || 0); });
      if (groupEntryRowsForDay > 0) dayEntryRows += groupEntryRowsForDay;
      let agg = groupAggMap.get(group);
      if (!agg) { agg = { group, entryRows:0, cartRows:0, cartCount:0, shelvedCarts:0, pendingCarts:0 }; groupAggMap.set(group, agg); }
      agg.entryRows += groupEntryRowsForDay;
    });
    const dayCarts = carts.filter(c => c.date === ds);
    dayCarts.forEach(c => {
      dayCartRows += c.rows;
      let agg = groupAggMap.get(c.group);
      if (!agg) { agg = { group: c.group, entryRows:0, cartRows:0, cartCount:0, shelvedCarts:0, pendingCarts:0 }; groupAggMap.set(c.group, agg); }
      agg.cartRows += c.rows;
      agg.cartCount += 1;
      if (c.shelved) agg.shelvedCarts += 1; else agg.pendingCarts += 1;
    });
    dailySeries.push({ date: ds, entryRows: dayEntryRows, cartRows: dayCartRows });
  }

  const groups = Array.from(groupAggMap.values()).sort((a,b)=> a.group.localeCompare(b.group));
  const totals = groups.reduce((acc,g)=> {
    acc.entryRows += g.entryRows; acc.cartRows += g.cartRows; acc.cartCount += g.cartCount; acc.shelvedCarts += g.shelvedCarts; acc.pendingCarts += g.pendingCarts; return acc;
  }, { entryRows:0, cartRows:0, cartCount:0, shelvedCarts:0, pendingCarts:0 });

  return { period, startDate: fmt(start), endDate: fmt(end), groups, totals, dailySeries };
}

