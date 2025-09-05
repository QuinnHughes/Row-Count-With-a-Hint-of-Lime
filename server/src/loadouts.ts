import { LoadoutResponse, LoadoutCartRowUnit } from './models';
import { getSections, getEntriesForDate } from './db';

export function buildLoadouts(date: string, cartSize = 6, sectionFilter?: number[]): LoadoutResponse {
  // Retrieve entries & sections ordered
  let sections = getSections();
  if (sectionFilter && sectionFilter.length) {
    const filterSet = new Set(sectionFilter);
    sections = sections.filter(s => filterSet.has(s.id));
  }
  const entries = getEntriesForDate(date);
  const rowUnits: LoadoutCartRowUnit[] = [];
  for (const s of sections) {
    const entry = entries.find(e => e.section_id === s.id);
    const count = entry ? entry.rows : 0;
    for (let i = 1; i <= count; i++) {
      rowUnits.push({ cart: 0, section_id: s.id, section_code: s.code, unit_index_within_section: i });
    }
  }

  // Allocate sequentially into carts of size cartSize
  if (cartSize <= 0) cartSize = 1;
  rowUnits.forEach((unit, idx) => {
    unit.cart = Math.floor(idx / cartSize) + 1;
  });

  const cartsMap: { [c: number]: LoadoutCartRowUnit[] } = {};
  for (const u of rowUnits) {
    cartsMap[u.cart] = cartsMap[u.cart] || [];
    cartsMap[u.cart].push(u);
  }

  const carts = Object.keys(cartsMap)
    .map(n => ({ cart: Number(n), rows: cartsMap[Number(n)] }))
    .sort((a, b) => a.cart - b.cart);

  return { date, carts };
}
