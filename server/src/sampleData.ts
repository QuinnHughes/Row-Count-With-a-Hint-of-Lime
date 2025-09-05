import { upsertEntry, getSections } from './db';

const date = process.argv[2] || new Date().toISOString().slice(0,10);
const sections = getSections();

sections.forEach((s, idx) => {
  const rows = (idx % 5) + 1; // 1..5 rows pattern
  upsertEntry(s.id, date, s.daily_cap != null ? Math.min(rows, s.daily_cap) : rows);
});

console.log(`Seeded sample entries for ${date}`);