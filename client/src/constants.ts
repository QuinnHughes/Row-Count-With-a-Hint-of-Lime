// Display labels with ranges where specified; codes/groups are canonical keys used by the server.
export const GROUP_INFO: Record<string, { label: string; range?: string }> = {
  'Third Floor': { label: 'Third Floor', range: 'A-GV' },
  'Second Floor': { label: 'Second Floor', range: 'H-HX' },
  'South Basement': { label: 'South Basement', range: 'J-P' },
  'North Basement': { label: 'North Basement', range: 'Q-Z' },
  'CHYAC': { label: 'CHYAC' },
  'Elec Media': { label: 'Elec Media' },
  'Bound Journals': { label: 'Bound Journals' },
  'Documents': { label: 'Documents' },
  'Reference': { label: 'Reference' },
  'Oversize': { label: 'Oversize' }
};

export const ORDERED_GROUPS: string[] = [
  'Third Floor',
  'Second Floor',
  'South Basement',
  'North Basement',
  'CHYAC',
  'Elec Media',
  'Bound Journals',
  'Documents',
  'Reference',
  'Oversize'
];

export function compareGroups(a: string, b: string): number {
  const ia = ORDERED_GROUPS.indexOf(a);
  const ib = ORDERED_GROUPS.indexOf(b);
  const oa = ia === -1 ? 999 : ia;
  const ob = ib === -1 ? 999 : ib;
  return oa - ob;
}

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
