// Plain English location names only (user request: remove call number ranges entirely)
export const GROUP_INFO: Record<string, { label: string; range?: string }> = {
  'Third Floor': { label: 'Third Floor', range: 'A–GV' },
  'Second Floor': { label: 'Second Floor', range: 'H–HX' },
  'South Basement J-NX': { label: 'South Basement J-NX', range: 'J–NX' },
  'North Basement': { label: 'North Basement', range: 'P–Z' },
  'CHYAC': { label: 'CHYAC', range: 'P–QL' },
  'Movables': { label: 'Movables', range: 'QL–Z' },
  'Bound Journals': { label: 'Bound Journals', range: 'A–Z' },
  'Documents': { label: 'Documents', range: 'Documents' },
  'Elec Media': { label: 'Elec Media', range: 'CHYAC/Reference' },
  'Oversize': { label: 'Oversize', range: 'Oversize' }
};

export function displayGroup(group: string): string {
  const info = GROUP_INFO[group];
  if (!info) return group;
  if (!info.range) return info.label;
  // Avoid duplicating when range already part of label (case-insensitive substring)
  const already = info.label.toLowerCase().includes(info.range.toLowerCase());
  if (already) return info.label; // South Basement J-NX already contains J-NX
  if (info.range === info.label) return info.label; // Documents, Oversize
  return info.label + ' ' + info.range; // appended style
}
