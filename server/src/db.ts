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
  let raw: any = {};
  try {
    if (fs.existsSync(DATA_FILE)) {
      raw = fs.readJSONSync(DATA_FILE) || {};
    }
  } catch {
    raw = {};
  }
  // Ensure full shape with sane defaults even if file is empty/partial
  const shaped: DataShape = {
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    // @ts-ignore snapshots exists in DataShape in this repo
    snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
    carts: Array.isArray(raw.carts) ? raw.carts : [],
    _entrySeq: Number.isInteger(raw._entrySeq) ? raw._entrySeq : 1,
    // @ts-ignore _snapshotSeq exists in DataShape in this repo
    _snapshotSeq: Number.isInteger(raw._snapshotSeq) ? raw._snapshotSeq : 1,
    _cartSeq: Number.isInteger(raw._cartSeq) ? raw._cartSeq : 1
  } as DataShape;
  data = shaped;
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    seedSections();
  }
  persist();
  return data;
}

function persist() {
  if (!data) return;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function seedSections() {
  // Per instructions: names with standard common names and ranges in the label; groups/codes canonical.
  const base: Omit<Section, 'id'>[] = [
    { code: 'Third Floor', name: 'Third Floor A-GV', group: 'Third Floor', daily_cap: null, order_index: 1 },
    { code: 'Second Floor', name: 'Second Floor H-HX', group: 'Second Floor', daily_cap: null, order_index: 2 },
    { code: 'South Basement', name: 'South Basement J-P', group: 'South Basement', daily_cap: null, order_index: 3 },
    { code: 'North Basement', name: 'North Basement Q-Z', group: 'North Basement', daily_cap: null, order_index: 4 },
    { code: 'CHYAC', name: 'CHYAC', group: 'CHYAC', daily_cap: null, order_index: 5 },
    { code: 'Elec Media', name: 'Elec Media', group: 'Elec Media', daily_cap: 3, order_index: 6 },
    { code: 'Bound Journals', name: 'Bound Journals', group: 'Bound Journals', daily_cap: null, order_index: 7 },
    { code: 'Documents', name: 'Documents', group: 'Documents', daily_cap: null, order_index: 8 },
    { code: 'Reference', name: 'Reference', group: 'Reference', daily_cap: null, order_index: 9 },
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
    'J–NX':'South Basement', // collapse to South Basement per new naming
    'P–Z':'North Basement',
    'P–QL':'CHYAC',
    'QL–Z':'Elec Media', // move movables/QL–Z into Elec Media per new list
    'A–Z':'Bound Journals',
    'Docs':'Documents',
    'CHYAC/Ref':'Elec Media',
    'Oversize':'Oversize'
  };

  // Desired order
  const order = ['Third Floor','Second Floor','South Basement','North Basement','CHYAC','Elec Media','Bound Journals','Documents','Reference','Oversize'];
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
  const labelByCode: Record<string,string> = {
    'Third Floor': 'Third Floor A-GV',
    'Second Floor': 'Second Floor H-HX',
    'South Basement': 'South Basement J-P',
    'North Basement': 'North Basement Q-Z',
    'CHYAC': 'CHYAC',
    'Elec Media': 'Elec Media',
    'Bound Journals': 'Bound Journals',
    'Documents': 'Documents',
    'Reference': 'Reference',
    'Oversize': 'Oversize'
  };
  const newSections = order.map((code, idx) => ({
    id: idCounter++, code, name: labelByCode[code] || code, group: code, daily_cap: caps[code] ?? null, order_index: idx+1
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
  const order = ['Third Floor','Second Floor','South Basement','North Basement','CHYAC','Elec Media','Bound Journals','Documents','Reference','Oversize'];
  const labelByCode: Record<string,string> = {
    'Third Floor': 'Third Floor A-GV',
    'Second Floor': 'Second Floor H-HX',
    'South Basement': 'South Basement J-P',
    'North Basement': 'North Basement Q-Z',
    'CHYAC': 'CHYAC',
    'Elec Media': 'Elec Media',
    'Bound Journals': 'Bound Journals',
    'Documents': 'Documents',
    'Reference': 'Reference',
    'Oversize': 'Oversize'
  };
  const caps: Record<string, number|null> = { 'Elec Media': 3, 'Oversize': 2 } as any;
  d.sections.forEach(s => {
    // Collapse older codes to new canonical codes
    if (s.code === 'South Basement J-NX') { s.code = 'South Basement'; s.group = 'South Basement'; mutated = true; }
    if (s.code === 'Movables') { s.code = 'Elec Media'; s.group = 'Elec Media'; mutated = true; }
    if (!('group' in s) || !s.group) { s.group = s.code; mutated = true; }
    // Normalize names/order to spec
    if (labelByCode[s.code] && s.name !== labelByCode[s.code]) { s.name = labelByCode[s.code]; mutated = true; }
  });
  // Deduplicate by code: keep first by desired order, merge entries, delete extras
  const firstByCode = new Map<string, Section>();
  // stable sort by current order_index before dedup to keep earliest
  d.sections.sort((a,b)=> a.order_index - b.order_index);
  for (const s of [...d.sections]) {
    const code = s.code;
    const first = firstByCode.get(code);
    if (!first) { firstByCode.set(code, s); continue; }
    // Remap entries from duplicate id to first id
    d.entries.forEach(e => { if (e.section_id === s.id) { e.section_id = first.id; mutated = true; } });
    // Remove duplicate section
    const idx = d.sections.findIndex(x => x.id === s.id);
    if (idx !== -1) { d.sections.splice(idx,1); mutated = true; }
  }
  // Ensure all desired codes exist
  const existingCodes = new Set(d.sections.map(s=>s.code));
  let nextId = d.sections.reduce((m,s)=> Math.max(m, s.id), 0) + 1;
  for (const code of order) {
    if (!existingCodes.has(code)) {
      d.sections.push({ id: nextId++, code, name: labelByCode[code] || code, group: code, daily_cap: caps[code] ?? null, order_index: 999 });
      mutated = true;
    }
  }
  // Ensure ordering matches spec; any unknowns go to end
  d.sections.sort((a,b)=> {
    const ia = order.indexOf(a.code); const ib = order.indexOf(b.code);
    const oa = ia === -1 ? 999 + a.order_index : ia;
    const ob = ib === -1 ? 999 + b.order_index : ib;
    return oa - ob;
  });
  d.sections.forEach((s, idx)=> { if (s.order_index !== idx+1) { s.order_index = idx+1; mutated = true; } });
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
  if (!date) return d.carts.slice().sort((a,b)=> a.created_at.localeCompare(b.created_at));
  // Include previous day's carts as carry-over for context
  const prev = new Date(date); prev.setDate(prev.getDate()-1);
  const prevDate = prev.toISOString().slice(0,10);
  return d.carts
    .filter(c => c.date === date || c.date === prevDate)
    .sort((a,b)=> a.created_at.localeCompare(b.created_at));
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
  const prev = new Date(date); prev.setDate(prev.getDate()-1);
  const prevDate = prev.toISOString().slice(0,10);
  const carts = d.carts.filter(c => c.date === date || c.date === prevDate);
  const byGroup = new Map<string, CartRecord[]>();
  carts.forEach(c => { if(!byGroup.has(c.group)) byGroup.set(c.group, []); byGroup.get(c.group)!.push(c); });
  const groups: DailyGroupStat[] = Array.from(byGroup.entries()).map(([group, list]) => {
    const totalRows = list.reduce((s,c)=> s+c.rows,0);
    const cartCount = list.length;
    const shelvedRows = list.filter(c=>c.shelved).reduce((s,c)=> s+c.rows,0);
    const shelvedCarts = list.filter(c=>c.shelved).length;
    const pendingRows = totalRows - shelvedRows;
    const pendingCarts = cartCount - shelvedCarts;
    // Deduced shelved: use change in entry rows (today vs prev) plus carts marked shelved if needed
    const sections = d.sections.filter(s => (s.group || 'Other') === group);
    const prev = new Date(date); prev.setDate(prev.getDate()-1);
    const prevDate = prev.toISOString().slice(0,10);
    const sumEntries = (dt: string) => d.entries
      .filter(e => e.date === dt && sections.some(s => s.id === e.section_id))
      .reduce((s,e)=> s+e.rows, 0);
    const prevEntryRows = sumEntries(prevDate);
    const todayEntryRows = sumEntries(date);
    const deducedShelvedRows = Math.max(0, todayEntryRows - prevEntryRows) || shelvedRows;
    return { group, totalRows, cartCount, shelvedRows, pendingRows, shelvedCarts, pendingCarts, prevEntryRows, todayEntryRows, deducedShelvedRows };
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
  totals: { entryRows: number; cartRows: number; cartCount: number; shelvedCarts: number; pendingCarts: number; totalRowsCombined: number; };
  dailySeries: { date: string; entryRows: number; cartRows: number; }[];
  aggregatedSeries: { label: string; entryRows: number; cartRows: number; startDate?: string; endDate?: string; }[];
  prevDay?: { date: string; entryRows: number; cartRows: number; totalRowsCombined: number; };
}

function fmt(d: Date) { return d.toISOString().slice(0,10); }

function startOfWeekUTC(date: Date) {
  // Monday as start of week in UTC
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0,0,0,0);
  return d;
}

function startOfMonthUTC(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); }
function startOfYearUTC(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); }

function addDaysUTC(date: Date, days: number) { const d = new Date(date); d.setUTCDate(d.getUTCDate()+days); return d; }

export function computePeriodAnalytics(dateStr: string, period: 'week'|'month'|'year'): PeriodAnalytics {
  const d = load();
  const target = new Date(dateStr + 'T00:00:00Z');
  let start: Date;
  if (period === 'week') start = startOfWeekUTC(target); else if (period === 'month') start = startOfMonthUTC(target); else start = startOfYearUTC(target);
  const end = target; // inclusive
  const sectionsByGroup = d.sections.reduce<Record<string, Section[]>>((acc, s) => { const g = s.group || 'Other'; (acc[g] = acc[g] || []).push(s); return acc; }, {});

  // Pre-index entries by date+section
  const entriesByKey = new Map<string, number>();
  d.entries.forEach(e => { entriesByKey.set(e.section_id + ':' + e.date, e.rows); });
  ensureCartsArray();
  const carts = d.carts;

  const dailySeries: { date: string; entryRows: number; cartRows: number; }[] = [];
  const groupAggMap = new Map<string, PeriodGroupAgg>();
  for (let cursor = new Date(start); cursor <= end; cursor = addDaysUTC(cursor, 1)) {
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
  }, { entryRows:0, cartRows:0, cartCount:0, shelvedCarts:0, pendingCarts:0 } as any);
  (totals as any).totalRowsCombined = totals.entryRows + totals.cartRows;

  // prevDay summary
  const prev = addDaysUTC(start, -1);
  const prevDate = fmt(prev);
  let prevEntryRows = 0; let prevCartRows = 0;
  dailySeries
    .filter(p => p.date === prevDate) // likely none in series since series starts at start
    .forEach(p => { prevEntryRows += p.entryRows; prevCartRows += p.cartRows; });
  // recompute prev day from raw data (out of series bounds)
  if (prevEntryRows === 0 && prevCartRows === 0) {
    const entriesByDate = new Map<string, number>();
    d.entries.forEach(e => { entriesByDate.set(e.date, (entriesByDate.get(e.date)||0) + e.rows); });
    prevEntryRows = entriesByDate.get(prevDate) || 0;
    prevCartRows = d.carts.filter(c => c.date === prevDate).reduce((s,c)=> s+c.rows, 0);
  }
  const prevDay = { date: prevDate, entryRows: prevEntryRows, cartRows: prevCartRows, totalRowsCombined: prevEntryRows + prevCartRows };

  // aggregated series per granularity
  const aggregatedSeries: { label: string; entryRows: number; cartRows: number; startDate?: string; endDate?: string; }[] = [];
  if (period === 'week') {
    // 7 daily buckets labelled MM-DD
    aggregatedSeries.push(...dailySeries.map(p => ({ label: p.date.slice(5), entryRows: p.entryRows, cartRows: p.cartRows, startDate: p.date, endDate: p.date })));
  } else if (period === 'month') {
    // Group by week within month
    const wk = new Map<string, { start: string; end: string; entryRows: number; cartRows: number }>();
    dailySeries.forEach(p => {
      const d0 = new Date(p.date + 'T00:00:00Z');
      const wStart = startOfWeekUTC(d0);
      const key = fmt(wStart);
      const v = wk.get(key) || { start: key, end: key, entryRows: 0, cartRows: 0 };
      v.entryRows += p.entryRows; v.cartRows += p.cartRows; v.end = p.date; wk.set(key, v);
    });
    Array.from(wk.values()).sort((a,b)=> a.start.localeCompare(b.start)).forEach(v => aggregatedSeries.push({ label: 'Week of ' + v.start.slice(5), entryRows: v.entryRows, cartRows: v.cartRows, startDate: v.start, endDate: v.end }));
  } else {
    // Year: group by month
    const mo = new Map<string, { yyyymm: string; entryRows: number; cartRows: number }>();
    dailySeries.forEach(p => {
      const yyyymm = p.date.slice(0,7);
      const v = mo.get(yyyymm) || { yyyymm, entryRows: 0, cartRows: 0 };
      v.entryRows += p.entryRows; v.cartRows += p.cartRows; mo.set(yyyymm, v);
    });
    Array.from(mo.values()).sort((a,b)=> a.yyyymm.localeCompare(b.yyyymm)).forEach(v => aggregatedSeries.push({ label: v.yyyymm, entryRows: v.entryRows, cartRows: v.cartRows }));
  }

  return { period, startDate: fmt(start), endDate: fmt(end), groups, totals: totals as any, dailySeries, aggregatedSeries, prevDay };
}

