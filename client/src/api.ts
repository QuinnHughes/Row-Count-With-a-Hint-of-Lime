import axios from 'axios';
import { Section, Loadouts, LoadoutSnapshot, OverviewResponse, CartRecord, DailyStatsResponse, PeriodAnalytics } from './types';

export async function fetchSections(): Promise<Section[]> {
  const { data } = await axios.get('/api/sections');
  return data;
}

export async function submitEntry(sectionId: number, date: string, rows: number) {
  await axios.post('/api/entries', { sectionId, date, rows });
}

// Fetch existing entry rows for a date to prefill inputs
export async function fetchEntries(date: string): Promise<{ section_id: number; rows: number; }[]> {
  const { data } = await axios.get('/api/entries', { params: { date } });
  // server returns { date, entries: [{section_id,..., rows}] }
  if (data && Array.isArray(data.entries)) {
    return data.entries.map((e: any) => ({ section_id: e.section_id, rows: e.rows }));
  }
  return [];
}

export async function fetchLoadouts(date: string, cartSize?: number): Promise<Loadouts> {
  const { data } = await axios.get('/api/loadouts', { params: { date, cartSize } });
  return data;
}

export async function fetchCustomLoadouts(date: string, cartSize: number, sectionIds: number[]): Promise<Loadouts> {
  const { data } = await axios.post('/api/loadouts/custom', { date, cartSize, sectionIds });
  return data;
}

export async function createSnapshot(date: string, initials: string, cartSize: number, sectionIds: number[], group?: string): Promise<LoadoutSnapshot> {
  const { data } = await axios.post('/api/loadout-snapshots', { date, initials, cartSize, sectionIds, group });
  return data;
}

export async function fetchSnapshots(date?: string): Promise<LoadoutSnapshot[]> {
  const { data } = await axios.get('/api/loadout-snapshots', { params: { date } });
  return data;
}

export async function setCartShelved(snapshotId: number, cart: number, shelved: boolean): Promise<void> {
  await axios.patch(`/api/loadout-snapshots/${snapshotId}/carts/${cart}`, { shelved });
}

export async function fetchOverview(date: string): Promise<OverviewResponse> {
  const { data } = await axios.get('/api/overview', { params: { date } });
  return data;
}

// Cart record APIs
export async function fetchCarts(date: string): Promise<CartRecord[]> {
  const { data } = await axios.get('/api/carts', { params: { date } });
  return data;
}
export async function createCartRecord(payload: { date: string; group: string; initials: string; rows: number; }): Promise<CartRecord> {
  const { data } = await axios.post('/api/carts', payload);
  return data;
}
export async function updateCartRecord(id: number, patch: Partial<{ rows: number; shelved: boolean; }>): Promise<CartRecord> {
  const { data } = await axios.patch(`/api/carts/${id}`, patch);
  return data;
}
export async function deleteCartRecord(id: number): Promise<void> {
  await axios.delete(`/api/carts/${id}`);
}
export async function fetchDailyCartStats(date: string): Promise<DailyStatsResponse> {
  const { data } = await axios.get('/api/stats/daily', { params: { date } });
  return data;
}

export async function fetchPeriodAnalytics(date: string, period: 'week'|'month'|'year'): Promise<PeriodAnalytics> {
  const { data } = await axios.get('/api/analytics', { params: { date, period } });
  return data;
}
