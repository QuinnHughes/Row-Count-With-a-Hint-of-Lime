import fs from 'fs-extra';
import { Entry, Section } from './models';

interface DataShape {
  sections: Section[];
  entries: Entry[];
  _entrySeq: number; // incremental id
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
      _entrySeq: 1
    };
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
  { code: 'A–GV', name: 'A–GV (3rd floor, overflow trucks)', group: '3rd Floor', daily_cap: null, order_index: 1 },
  { code: 'H–HX', name: 'H–HX (2nd floor, overflow trucks)', group: '2nd Floor', daily_cap: null, order_index: 2 },
  { code: 'J–NX', name: 'J–NX (basement movable shelves)', group: 'Basement', daily_cap: null, order_index: 3 },
  { code: 'P–Z', name: 'P–Z (movable shelves near study room)', group: 'Study Area', daily_cap: null, order_index: 4 },
  { code: 'A–Z', name: 'A–Z (white stripes carts & shelves)', group: 'White Stripes', daily_cap: null, order_index: 5 },
  { code: 'Docs', name: 'Documents (movable shelves after bound journals)', group: 'Documents', daily_cap: null, order_index: 6 },
  { code: 'CHYAC/Ref', name: 'CHYAC/Reference (N10 wall, special rows)', group: 'Special', daily_cap: 3, order_index: 7 },
  { code: 'Oversize', name: 'Oversize (2nd floor rough shelving area)', group: 'Oversize', daily_cap: 2, order_index: 8 }
  ];
  let id = 1;
  data!.sections = base.map(b => ({ id: id++, ...b }));
}

export function getSections(): Section[] {
  const d = load();
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

